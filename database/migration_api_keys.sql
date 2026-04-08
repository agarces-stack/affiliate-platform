-- ============================================
-- MIGRATION: API Keys para integraciones (n8n, Zapier, GHL)
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL, -- "n8n Production", "GHL Integration"
    key_hash VARCHAR(255) NOT NULL, -- SHA256 del API key
    key_prefix VARCHAR(10), -- Primeros 8 chars para identificar (mr_abc123...)
    permissions TEXT[] DEFAULT '{all}', -- all, read, write, conversions, affiliates
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
