const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { processDocument, ragChat, searchKnowledge } = require('../services/rag');

// ============================================
// DOCUMENTS (Admin - gestionar base de conocimiento)
// ============================================

// Listar documentos
router.get('/documents', authMiddleware, async (req, res) => {
    try {
        const { category, status } = req.query;
        let query = 'SELECT id, title, description, category, file_type, status, chunk_count, visibility, tags, created_at FROM kb_documents WHERE company_id = $1';
        const params = [req.user.company_id];
        if (category) { params.push(category); query += ` AND category = $${params.length}`; }
        if (status) { params.push(status); query += ` AND status = $${params.length}`; }
        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing documents:', err);
        res.status(500).json({ error: 'Failed to list documents' });
    }
});

// Subir documento (texto directo)
router.post('/documents', authMiddleware, async (req, res) => {
    try {
        const { title, content, description, category, visibility, tags } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

        const result = await db.query(
            `INSERT INTO kb_documents (company_id, title, description, category, file_type, content, visibility, tags, uploaded_by, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'processing') RETURNING id`,
            [req.user.company_id, title, description || null, category || 'general', 'text',
             content, visibility || 'all', tags || '{}', req.user.id]
        );

        const docId = result.rows[0].id;

        // Procesar en background (no bloquea la respuesta)
        processDocument(docId, req.user.company_id)
            .then(r => console.log(`Document ${docId} processed: ${r.chunks} chunks`))
            .catch(e => console.error(`Document ${docId} processing failed:`, e.message));

        res.json({ status: 'processing', document_id: docId, message: 'Document is being processed. Embeddings will be generated.' });
    } catch (err) {
        console.error('Error creating document:', err);
        res.status(500).json({ error: 'Failed to create document' });
    }
});

// Eliminar documento
router.delete('/documents/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM kb_documents WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        res.json({ status: 'deleted' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// Re-procesar documento
router.post('/documents/:id/reprocess', authMiddleware, async (req, res) => {
    try {
        // Borrar chunks existentes
        await db.query('DELETE FROM kb_chunks WHERE document_id = $1', [req.params.id]);
        await db.query("UPDATE kb_documents SET status = 'processing' WHERE id = $1", [req.params.id]);

        processDocument(req.params.id, req.user.company_id)
            .then(r => console.log(`Document ${req.params.id} reprocessed: ${r.chunks} chunks`))
            .catch(e => console.error(`Document ${req.params.id} reprocessing failed:`, e.message));

        res.json({ status: 'reprocessing' });
    } catch (err) {
        console.error('Error reprocessing document:', err);
        res.status(500).json({ error: 'Failed to reprocess' });
    }
});

// Stats de la knowledge base
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const [docs, chunks, convos] = await Promise.all([
            db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='ready') as ready FROM kb_documents WHERE company_id = $1", [compId]),
            db.query('SELECT COUNT(*) as total FROM kb_chunks WHERE company_id = $1', [compId]),
            db.query('SELECT COUNT(*) as total FROM kb_conversations WHERE company_id = $1', [compId]),
        ]);
        res.json({
            documents: parseInt(docs.rows[0].total),
            ready_documents: parseInt(docs.rows[0].ready),
            total_chunks: parseInt(chunks.rows[0].total),
            total_conversations: parseInt(convos.rows[0].total),
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ============================================
// SEARCH & CHAT (Admin + Afiliados)
// ============================================

// Búsqueda semántica
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q, category, limit } = req.query;
        if (!q) return res.status(400).json({ error: 'Query (q) required' });

        const results = await searchKnowledge(q, req.user.company_id, {
            category, limit: parseInt(limit) || 5
        });
        res.json(results);
    } catch (err) {
        console.error('Knowledge search error:', err);
        res.status(500).json({ error: 'Search failed: ' + err.message });
    }
});

// Chat con RAG
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { question, category } = req.body;
        if (!question) return res.status(400).json({ error: 'Question required' });

        // Obtener historial reciente
        const historyResult = await db.query(
            `SELECT role, content FROM kb_conversations
             WHERE company_id = $1 AND (affiliate_id = $2 OR user_id = $3)
             ORDER BY created_at DESC LIMIT 10`,
            [req.user.company_id,
             req.user.role === 'affiliate' ? req.user.id : null,
             req.user.role !== 'affiliate' ? req.user.id : null]
        );

        const result = await ragChat(question, req.user.company_id, {
            affiliateId: req.user.role === 'affiliate' ? req.user.id : null,
            userId: req.user.role !== 'affiliate' ? req.user.id : null,
            category,
            conversationHistory: historyResult.rows.reverse()
        });

        res.json(result);
    } catch (err) {
        console.error('Knowledge chat error:', err);
        res.status(500).json({ error: 'Chat failed: ' + err.message });
    }
});

// Historial de conversaciones
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        let query = 'SELECT * FROM kb_conversations WHERE company_id = $1';
        const params = [req.user.company_id];

        if (req.user.role === 'affiliate') {
            params.push(req.user.id);
            query += ` AND affiliate_id = $${params.length}`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get history' });
    }
});

module.exports = router;
