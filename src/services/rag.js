const db = require('../models/db');

const CHUNK_SIZE = 500; // caracteres por chunk
const CHUNK_OVERLAP = 100; // overlap entre chunks

// ============================================
// EMBEDDINGS - Genera vectores del texto
// ============================================

async function getEmbedding(text) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
        // OpenAI embeddings (1536 dimensiones)
        const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
        });
        if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status}`);
        const data = await res.json();
        return data.data[0].embedding;
    }

    // Fallback: usar Anthropic para generar un "pseudo-embedding" via hashing
    // Para producción real, necesitas OpenAI o Voyage AI
    throw new Error('OPENAI_API_KEY required for embeddings. Add to config/.env');
}

// ============================================
// DOCUMENT PROCESSING
// ============================================

// Dividir texto en chunks con overlap
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // Intentar cortar en un punto natural (párrafo, oración)
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            const lastPeriod = text.lastIndexOf('. ', end);
            if (lastNewline > start + chunkSize * 0.5) end = lastNewline + 1;
            else if (lastPeriod > start + chunkSize * 0.5) end = lastPeriod + 2;
        }

        const chunk = text.substring(start, end).trim();
        if (chunk.length > 20) chunks.push(chunk); // ignorar chunks muy cortos

        start = end - overlap;
        if (start >= text.length) break;
    }

    return chunks;
}

// Procesar documento: dividir en chunks y generar embeddings
async function processDocument(documentId, companyId) {
    try {
        const doc = await db.query('SELECT * FROM kb_documents WHERE id = $1', [documentId]);
        if (doc.rows.length === 0) throw new Error('Document not found');

        const content = doc.rows[0].content;
        if (!content) throw new Error('Document has no content');

        // Dividir en chunks
        const chunks = chunkText(content);

        // Generar embeddings y guardar
        let savedCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            try {
                const embedding = await getEmbedding(chunks[i]);

                await db.query(
                    `INSERT INTO kb_chunks (company_id, document_id, content, chunk_index, embedding, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [companyId, documentId, chunks[i], i,
                     `[${embedding.join(',')}]`,
                     JSON.stringify({ title: doc.rows[0].title, category: doc.rows[0].category })]
                );
                savedCount++;
            } catch (embErr) {
                console.error(`Embedding error for chunk ${i}:`, embErr.message);
            }
        }

        // Actualizar documento
        await db.query(
            "UPDATE kb_documents SET status = 'ready', chunk_count = $1, updated_at = NOW() WHERE id = $2",
            [savedCount, documentId]
        );

        return { chunks: savedCount, total: chunks.length };
    } catch (err) {
        await db.query(
            "UPDATE kb_documents SET status = 'error', updated_at = NOW() WHERE id = $1",
            [documentId]
        );
        throw err;
    }
}

// ============================================
// SEMANTIC SEARCH
// ============================================

async function searchKnowledge(query, companyId, options = {}) {
    const { limit = 5, category, minSimilarity = 0.7 } = options;

    // Generar embedding de la pregunta
    const queryEmbedding = await getEmbedding(query);

    // Búsqueda por similitud coseno
    let sql = `SELECT kc.id, kc.content, kc.metadata,
                      kd.title as doc_title, kd.category,
                      1 - (kc.embedding <=> $1::vector) as similarity
               FROM kb_chunks kc
               JOIN kb_documents kd ON kc.document_id = kd.id
               WHERE kc.company_id = $2 AND kd.status = 'ready'`;
    const params = [`[${queryEmbedding.join(',')}]`, companyId];

    if (category) {
        params.push(category);
        sql += ` AND kd.category = $${params.length}`;
    }

    sql += ` AND 1 - (kc.embedding <=> $1::vector) > $${params.length + 1}`;
    params.push(minSimilarity);

    sql += ` ORDER BY kc.embedding <=> $1::vector ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(sql, params);
    return result.rows;
}

// ============================================
// RAG CHAT - Responder preguntas con contexto
// ============================================

async function ragChat(question, companyId, options = {}) {
    const { affiliateId, userId, category, conversationHistory = [] } = options;

    // 1. Buscar chunks relevantes
    const chunks = await searchKnowledge(question, companyId, { category, limit: 5 });

    // 2. Construir contexto
    const context = chunks.map((c, i) =>
        `[Doc: ${c.doc_title}] (relevancia: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`
    ).join('\n\n---\n\n');

    // 3. Obtener contexto del agente si aplica
    let agentContext = '';
    if (affiliateId) {
        const aff = await db.query(
            `SELECT a.first_name, a.rank, a.total_conversions, a.balance, r.name as rank_name
             FROM affiliates a LEFT JOIN ranks r ON r.company_id = a.company_id AND r.rank_number = a.rank
             WHERE a.id = $1`, [affiliateId]
        );
        if (aff.rows.length > 0) {
            const a = aff.rows[0];
            agentContext = `\nEl agente se llama ${a.first_name}, es ${a.rank_name} (rango ${a.rank}), tiene ${a.total_conversions} ventas y $${a.balance} de balance.`;
        }
    }

    // 4. Llamar a Claude con el contexto RAG
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const messages = [
        ...conversationHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: question }
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            system: `Eres el asistente AI de MagnetRaffic, una plataforma de seguros y ventas multinivel.
Responde basándote SOLO en la información proporcionada en el contexto.
Si no tienes información suficiente, dilo claramente.
Responde en el mismo idioma que la pregunta.
Sé conciso y útil.${agentContext}

CONTEXTO DE LA BASE DE CONOCIMIENTO:
${context || 'No se encontró información relevante.'}`,
            messages
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Claude API error: ${res.status}`);
    }

    const data = await res.json();
    const answer = data.content[0]?.text || 'No pude generar una respuesta.';

    // 5. Guardar conversación
    const chunkIds = chunks.map(c => c.id);

    await db.query(
        `INSERT INTO kb_conversations (company_id, affiliate_id, user_id, role, content)
         VALUES ($1, $2, $3, 'user', $4)`,
        [companyId, affiliateId || null, userId || null, question]
    );

    await db.query(
        `INSERT INTO kb_conversations (company_id, affiliate_id, user_id, role, content, source_chunks, tokens_used)
         VALUES ($1, $2, $3, 'assistant', $4, $5, $6)`,
        [companyId, affiliateId || null, userId || null, answer, chunkIds, data.usage?.output_tokens || 0]
    );

    return {
        answer,
        sources: chunks.map(c => ({ title: c.doc_title, category: c.category, similarity: c.similarity, excerpt: c.content.substring(0, 150) })),
        tokens: data.usage?.output_tokens || 0
    };
}

module.exports = { processDocument, searchKnowledge, ragChat, chunkText, getEmbedding };
