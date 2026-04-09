-- ============================================
-- MIGRATION: Grupos de comisión
-- Agrupación de afiliados con comisiones por grupo
-- Managers por grupo con override commissions
-- ============================================

-- Grupos de comisión
CREATE TABLE IF NOT EXISTS commission_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Comisiones default del grupo (aplican a todos los miembros)
    default_commission_type VARCHAR(20) DEFAULT 'hybrid',
    default_commission_percent DECIMAL(5,2) DEFAULT 0,
    default_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Override del grupo sobre ventas de sus miembros
    override_commission_percent DECIMAL(5,2) DEFAULT 0,
    override_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Manager del grupo
    manager_id INTEGER REFERENCES affiliates(id),
    -- Comisión del manager sobre ventas de afiliados del grupo
    manager_commission_type VARCHAR(20) DEFAULT 'commission_based',
    -- commission_based: % de la comisión del afiliado
    -- fixed: monto fijo por venta
    -- amount_based: % del monto de la venta
    -- split: % de la comisión del afiliado (se descuenta del afiliado)
    manager_commission_value DECIMAL(10,2) DEFAULT 0,
    -- Payout schedule del grupo (override del de la empresa)
    payout_schedule VARCHAR(20), -- null = usa el de la empresa
    min_payout_amount DECIMAL(10,2), -- null = usa el de la empresa
    -- Estado
    is_active BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comisiones por grupo + campaña/producto (override específico)
CREATE TABLE IF NOT EXISTS group_commissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES commission_groups(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id),
    product_id INTEGER REFERENCES products(id),
    -- Comisión para miembros de este grupo en esta campaña/producto
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_fixed DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, campaign_id, product_id)
);

-- Asignar afiliado a grupo
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS commission_group_id INTEGER REFERENCES commission_groups(id);

CREATE INDEX IF NOT EXISTS idx_commission_groups_company ON commission_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_groups_manager ON commission_groups(manager_id);
CREATE INDEX IF NOT EXISTS idx_group_commissions_group ON group_commissions(group_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_group ON affiliates(commission_group_id);
