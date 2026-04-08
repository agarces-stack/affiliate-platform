-- ============================================
-- MIGRATION: Catálogo de Productos + Goals
-- Productos por campaña, goals por producto
-- Comisiones por producto+rango
-- ============================================

-- Catálogo de productos por campaña
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    -- Identificación
    sku VARCHAR(100), -- Código único del producto (ej: VIDA-PREMIUM, SALUD-BASIC)
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- vida, salud, auto, dental, hogar, etc.
    -- Precio
    price DECIMAL(12,2) DEFAULT 0, -- Precio base del producto
    currency VARCHAR(3) DEFAULT 'USD',
    -- Comisión default del producto (si no hay config por rango)
    commission_type VARCHAR(20) DEFAULT 'hybrid', -- cpa, revshare, hybrid
    commission_amount DECIMAL(10,2) DEFAULT 0,
    commission_percent DECIMAL(5,2) DEFAULT 0,
    -- Renovación
    is_recurring BOOLEAN DEFAULT false,
    renewal_period_months INTEGER DEFAULT 12,
    renewal_commission_percent DECIMAL(5,2) DEFAULT 0,
    renewal_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Estado
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
    sort_order INTEGER DEFAULT 0,
    -- Metadata
    image_url TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, sku)
);

-- Goals (etapas/eventos de conversión) por producto
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    -- Identificación
    slug VARCHAR(100) NOT NULL, -- lead, quote, application, policy_bound, first_payment
    name VARCHAR(255) NOT NULL, -- "Lead Generated", "Policy Bound"
    description TEXT,
    -- Orden en el funnel
    step_order INTEGER DEFAULT 1, -- 1=primero, 2=segundo, etc.
    -- Comisión por este goal
    commission_type VARCHAR(20) DEFAULT 'cpa', -- cpa, revshare, hybrid
    commission_amount DECIMAL(10,2) DEFAULT 0, -- monto fijo
    commission_percent DECIMAL(5,2) DEFAULT 0, -- % del monto
    -- Comportamiento
    is_final BOOLEAN DEFAULT false, -- Si este es el goal final (ej: policy_bound)
    triggers_renewal BOOLEAN DEFAULT false, -- Si este goal inicia el ciclo de renovación
    requires_approval BOOLEAN DEFAULT true, -- Necesita aprobación manual?
    -- Solo pagar si el goal anterior fue completado?
    requires_previous_goal BOOLEAN DEFAULT false,
    -- Estado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, slug)
);

-- Comisiones por producto + rango (override del default del producto)
CREATE TABLE IF NOT EXISTS product_rank_commissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    rank_id INTEGER REFERENCES ranks(id) ON DELETE CASCADE,
    -- Comisión directa por venta de este producto
    direct_commission_percent DECIMAL(5,2) DEFAULT 0,
    direct_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Override por ventas del equipo de este producto
    override_commission_percent DECIMAL(5,2) DEFAULT 0,
    override_commission_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, rank_id)
);

-- Comisiones por goal + rango (override)
CREATE TABLE IF NOT EXISTS goal_rank_commissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    rank_id INTEGER REFERENCES ranks(id) ON DELETE CASCADE,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    commission_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(goal_id, rank_id)
);

-- Tracking de goals completados por conversión
CREATE TABLE IF NOT EXISTS conversion_goals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    conversion_id INTEGER REFERENCES conversions(id),
    goal_id INTEGER REFERENCES goals(id),
    product_id INTEGER REFERENCES products(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    -- Datos
    amount DECIMAL(12,2) DEFAULT 0,
    commission DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    -- Metadata
    data JSONB DEFAULT '{}', -- datos extra del goal
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar product_id a conversions
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS goal_slug VARCHAR(100);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_campaign ON products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_goals_product ON goals(product_id);
CREATE INDEX IF NOT EXISTS idx_goals_slug ON goals(slug);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_conversion ON conversion_goals(conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_affiliate ON conversion_goals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_goal ON conversion_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_conversions_product ON conversions(product_id);
