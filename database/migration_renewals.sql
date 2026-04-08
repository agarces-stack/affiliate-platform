-- ============================================
-- MIGRATION: Renovaciones de pólizas
-- Tracking de renewals con comisiones recurrentes
-- ============================================

-- Renovaciones vinculadas a conversiones originales
CREATE TABLE IF NOT EXISTS renewals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    original_conversion_id INTEGER REFERENCES conversions(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    -- Datos de la renovación
    renewal_number INTEGER NOT NULL DEFAULT 1, -- 1ra renovación, 2da, etc.
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_type VARCHAR(20) DEFAULT 'renewal',
    -- Período
    period_start DATE,
    period_end DATE,
    -- Cliente
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    order_id VARCHAR(255),
    policy_number VARCHAR(255),
    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
    -- Tracking
    source VARCHAR(50) DEFAULT 'manual', -- manual, automatic, webhook, import
    notes TEXT,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Config de renovación por campaña
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS renewal_enabled BOOLEAN DEFAULT false;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS renewal_commission_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS renewal_commission_fixed DECIMAL(10,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS renewal_months INTEGER DEFAULT 12; -- cada cuántos meses se renueva
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_renewals INTEGER DEFAULT 0; -- 0 = sin límite

-- Config de renovación por rango
CREATE TABLE IF NOT EXISTS rank_renewal_commissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    rank_id INTEGER REFERENCES ranks(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Comisión de renovación directa
    renewal_commission_percent DECIMAL(5,2) DEFAULT 0,
    renewal_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Override de renovación (lo que gana por renovaciones de su equipo)
    renewal_override_percent DECIMAL(5,2) DEFAULT 0,
    renewal_override_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rank_id, campaign_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_renewals_company ON renewals(company_id);
CREATE INDEX IF NOT EXISTS idx_renewals_affiliate ON renewals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_renewals_original ON renewals(original_conversion_id);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON renewals(status);
CREATE INDEX IF NOT EXISTS idx_renewals_period ON renewals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_renewals_policy ON renewals(policy_number);
