-- ============================================
-- AFFILIATE PLATFORM - Database Schema
-- PostgreSQL
-- ============================================

-- Empresas/Tenants (multi-empresa: Traduce, Trebolife, etc.)
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios admin
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- admin, manager, viewer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Afiliados
CREATE TABLE affiliates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    ref_id VARCHAR(50) UNIQUE NOT NULL, -- ID publico del afiliado
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    payment_method VARCHAR(50), -- paypal, bank_transfer, crypto
    payment_details JSONB DEFAULT '{}',
    parent_affiliate_id INTEGER REFERENCES affiliates(id), -- MLM: quien lo refirio
    mlm_level INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, suspended
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    total_commission DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campañas/Ofertas
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(1000) NOT NULL, -- Landing page URL
    status VARCHAR(20) DEFAULT 'active', -- active, paused, archived
    commission_type VARCHAR(20) NOT NULL, -- cpa, revshare, hybrid, cpc, cpm
    commission_amount DECIMAL(10,2), -- Monto fijo para CPA
    commission_percent DECIMAL(5,2), -- Porcentaje para RevShare
    recurring BOOLEAN DEFAULT false,
    recurring_months INTEGER, -- Cuantos meses de comision recurrente
    cookie_days INTEGER DEFAULT 30, -- Dias que dura la cookie
    -- MLM settings
    mlm_enabled BOOLEAN DEFAULT false,
    mlm_levels INTEGER DEFAULT 0,
    mlm_commissions JSONB DEFAULT '[]', -- [{level: 1, percent: 10}, {level: 2, percent: 5}]
    -- Tiered settings
    tiered_enabled BOOLEAN DEFAULT false,
    tiered_rules JSONB DEFAULT '[]', -- [{min_conversions: 10, commission: 15}, ...]
    -- Limits
    daily_click_cap INTEGER,
    daily_conversion_cap INTEGER,
    total_budget DECIMAL(12,2),
    spent_budget DECIMAL(12,2) DEFAULT 0,
    -- Tracking
    allowed_countries TEXT[] DEFAULT '{}',
    blocked_countries TEXT[] DEFAULT '{}',
    custom_params JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campañas asignadas a afiliados
CREATE TABLE campaign_affiliates (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    custom_commission_type VARCHAR(20), -- Override por afiliado
    custom_commission_amount DECIMAL(10,2),
    custom_commission_percent DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(campaign_id, affiliate_id)
);

-- Cupones
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(20), -- percent, fixed
    discount_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clicks (tabla principal de tracking)
CREATE TABLE clicks (
    id SERIAL PRIMARY KEY,
    click_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    -- Datos del visitante
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    city VARCHAR(100),
    device VARCHAR(20), -- desktop, mobile, tablet
    browser VARCHAR(50),
    os VARCHAR(50),
    -- Parametros custom
    sub_id1 VARCHAR(255),
    sub_id2 VARCHAR(255),
    sub_id3 VARCHAR(255),
    -- Landing
    landing_url TEXT,
    -- Estado
    is_unique BOOLEAN DEFAULT true,
    is_bot BOOLEAN DEFAULT false,
    converted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversiones
CREATE TABLE conversions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    click_id UUID REFERENCES clicks(click_id),
    coupon_id INTEGER REFERENCES coupons(id),
    -- Datos de la conversion
    order_id VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_type VARCHAR(20),
    currency VARCHAR(3) DEFAULT 'USD',
    -- Cliente
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    customer_id VARCHAR(255),
    is_new_customer BOOLEAN DEFAULT true,
    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, paid
    -- Tracking
    ip_address INET,
    tracking_method VARCHAR(20), -- s2s, pixel_js, pixel_image, coupon
    -- MLM
    mlm_parent_commission DECIMAL(12,2) DEFAULT 0,
    -- Metadata
    custom_params JSONB DEFAULT '{}',
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comisiones MLM (cuando un sub-afiliado genera conversion)
CREATE TABLE mlm_commissions (
    id SERIAL PRIMARY KEY,
    conversion_id INTEGER REFERENCES conversions(id),
    affiliate_id INTEGER REFERENCES affiliates(id), -- El afiliado que recibe la comision
    source_affiliate_id INTEGER REFERENCES affiliates(id), -- El sub-afiliado que genero la venta
    level INTEGER NOT NULL,
    commission DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_details JSONB DEFAULT '{}',
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    notes TEXT,
    period_start DATE,
    period_end DATE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud logs
CREATE TABLE fraud_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    click_id UUID,
    affiliate_id INTEGER REFERENCES affiliates(id),
    rule VARCHAR(100), -- duplicate_ip, bot_detected, click_spam, geo_mismatch
    severity VARCHAR(20), -- low, medium, high
    details JSONB DEFAULT '{}',
    action_taken VARCHAR(50), -- blocked, flagged, none
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER,
    user_id INTEGER,
    type VARCHAR(50), -- new_affiliate, new_conversion, payout_processed, fraud_alert
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX idx_clicks_click_id ON clicks(click_id);
CREATE INDEX idx_clicks_affiliate ON clicks(affiliate_id);
CREATE INDEX idx_clicks_campaign ON clicks(campaign_id);
CREATE INDEX idx_clicks_created ON clicks(created_at);
CREATE INDEX idx_clicks_ip ON clicks(ip_address);
CREATE INDEX idx_conversions_click_id ON conversions(click_id);
CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id);
CREATE INDEX idx_conversions_campaign ON conversions(campaign_id);
CREATE INDEX idx_conversions_status ON conversions(status);
CREATE INDEX idx_conversions_created ON conversions(created_at);
CREATE INDEX idx_affiliates_ref_id ON affiliates(ref_id);
CREATE INDEX idx_affiliates_company ON affiliates(company_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_fraud_affiliate ON fraud_logs(affiliate_id);
