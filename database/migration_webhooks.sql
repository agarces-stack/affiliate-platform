-- ============================================
-- MIGRATION: Webhooks salientes
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    secret VARCHAR(255), -- Para firmar payloads (HMAC)
    events TEXT[] DEFAULT '{}', -- Array de eventos: new_conversion, new_affiliate, payout_completed, rank_promotion
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    last_status INTEGER, -- HTTP status del último intento
    fail_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
