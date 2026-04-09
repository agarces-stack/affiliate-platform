-- ============================================
-- MIGRATION: Tiered Commissions avanzadas
-- Timeframes, progressive, relative commission MLM
-- ============================================

-- Tiers de comisión con timeframes y auto-promotion
CREATE TABLE IF NOT EXISTS commission_tiers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    -- Tier info
    tier_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL, -- "Bronze", "Silver", "Gold"
    -- Comisiones de este tier
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Requisitos para calificar
    min_conversions INTEGER DEFAULT 0,
    min_revenue DECIMAL(12,2) DEFAULT 0, -- transaction volume
    min_commission_earned DECIMAL(12,2) DEFAULT 0,
    min_clicks INTEGER DEFAULT 0,
    min_recruits INTEGER DEFAULT 0,
    -- Timeframe de evaluación
    timeframe VARCHAR(20) DEFAULT 'all_time',
    -- all_time: acumulado total, nunca baja
    -- this_month: evalúa este mes, reset al inicio del siguiente
    -- last_month: tier basado en el mes anterior
    -- this_year: evalúa este año, reset en enero
    -- last_year: tier basado en el año anterior
    -- custom: período custom definido en la empresa
    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, campaign_id, tier_number)
);

-- Historial de tier por afiliado
CREATE TABLE IF NOT EXISTS affiliate_tiers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    tier_id INTEGER REFERENCES commission_tiers(id),
    tier_number INTEGER,
    -- Performance al momento de la evaluación
    conversions_count INTEGER DEFAULT 0,
    revenue_total DECIMAL(12,2) DEFAULT 0,
    commission_total DECIMAL(12,2) DEFAULT 0,
    -- Período evaluado
    period_start DATE,
    period_end DATE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(affiliate_id, campaign_id)
);

-- Progressive commission: rangos escalonados por monto
-- Ejemplo: primeros $1000 al 5%, de $1000 a $5000 al 7%, más de $5000 al 10%
CREATE TABLE IF NOT EXISTS progressive_rules (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    product_id INTEGER REFERENCES products(id),
    -- Rango de monto
    min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_amount DECIMAL(12,2), -- NULL = sin límite
    -- Comisión para este rango
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar campos MLM a companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS mlm_commission_type VARCHAR(30) DEFAULT 'amount_based';
-- commission_based: % de la comisión del afiliado
-- fixed: monto fijo por nivel
-- amount_based: % del monto de la venta
-- relative: % de la comisión del nivel anterior (cadena)
-- split: se descuenta del afiliado (solo 1 nivel)

CREATE INDEX IF NOT EXISTS idx_commission_tiers_company ON commission_tiers(company_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_affiliate ON affiliate_tiers(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_progressive_rules_campaign ON progressive_rules(company_id, campaign_id);
