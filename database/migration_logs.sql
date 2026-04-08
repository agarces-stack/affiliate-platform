-- ============================================
-- MIGRATION: Logs de actividad y postbacks
-- Auditoría completa tipo TrackNow
-- ============================================

-- Log de postbacks recibidos (cada request al /postback y /track)
CREATE TABLE IF NOT EXISTS postback_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    -- Request data
    endpoint VARCHAR(20) NOT NULL, -- track, postback, hooks
    method VARCHAR(10) DEFAULT 'GET',
    query_params JSONB DEFAULT '{}',
    body_params JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    ip_address INET,
    -- Resultado
    status VARCHAR(20) DEFAULT 'success', -- success, error, duplicate, fraud_blocked, not_found
    status_code INTEGER DEFAULT 200,
    response JSONB DEFAULT '{}',
    error_message TEXT,
    -- Referencia
    click_id UUID,
    conversion_id INTEGER,
    affiliate_id INTEGER,
    campaign_id INTEGER,
    -- Timing
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log de actividad del admin (auditoría)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER, -- admin user
    affiliate_id INTEGER, -- si la acción es sobre un afiliado
    -- Acción
    action VARCHAR(100) NOT NULL, -- affiliate.approve, rank.change, payout.create, conversion.reject, etc.
    entity_type VARCHAR(50), -- affiliate, campaign, conversion, payout, rank, webhook, etc.
    entity_id INTEGER,
    -- Detalles
    details JSONB DEFAULT '{}', -- { old_value, new_value, reason, etc. }
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postback_logs_company ON postback_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_postback_logs_created ON postback_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_postback_logs_status ON postback_logs(status);
CREATE INDEX IF NOT EXISTS idx_postback_logs_click ON postback_logs(click_id);
CREATE INDEX IF NOT EXISTS idx_postback_logs_affiliate ON postback_logs(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
