-- ============================================
-- MIGRATION: RAG - Base de conocimiento con pgvector
-- Requiere: CREATE EXTENSION vector; (ejecutar como superuser)
-- ============================================

-- Activar pgvector (requiere que esté instalado en PostgreSQL)
CREATE EXTENSION IF NOT EXISTS vector;

-- Documentos/archivos subidos
CREATE TABLE IF NOT EXISTS kb_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    -- Metadata del documento
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- products, training, compliance, faq, scripts
    file_type VARCHAR(20), -- pdf, txt, md, html, url
    file_url TEXT, -- URL del archivo original (si aplica)
    -- Contenido raw
    content TEXT, -- Texto completo del documento
    -- Estado
    status VARCHAR(20) DEFAULT 'processing', -- processing, ready, error
    chunk_count INTEGER DEFAULT 0,
    -- Acceso
    visibility VARCHAR(20) DEFAULT 'all', -- all, admin_only, agents_only
    tags TEXT[] DEFAULT '{}',
    -- Metadata
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chunks (fragmentos) con embeddings vectoriales
CREATE TABLE IF NOT EXISTS kb_chunks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    document_id INTEGER REFERENCES kb_documents(id) ON DELETE CASCADE,
    -- Contenido del chunk
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL, -- Posición en el documento
    -- Vector embedding (1536 dimensiones para OpenAI, 1024 para Voyage)
    embedding vector(1536),
    -- Metadata para filtrado
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Historial de conversaciones del chat AI
CREATE TABLE IF NOT EXISTS kb_conversations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER,
    user_id INTEGER,
    -- Mensaje
    role VARCHAR(20) NOT NULL, -- user, assistant
    content TEXT NOT NULL,
    -- Chunks usados para la respuesta
    source_chunks INTEGER[] DEFAULT '{}', -- IDs de chunks usados
    -- Metadata
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_kb_documents_company ON kb_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_category ON kb_documents(category);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_company ON kb_chunks(company_id);
CREATE INDEX IF NOT EXISTS idx_kb_conversations_company ON kb_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_kb_conversations_affiliate ON kb_conversations(affiliate_id);

-- Índice vectorial para búsqueda semántica (IVFFlat - rápido para <1M vectores)
-- Se crea después de tener datos: CREATE INDEX ON kb_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
