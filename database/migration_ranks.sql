-- ============================================
-- MIGRATION: Sistema de Rangos y Overrides
-- Rangos 1-10 custom por empresa
-- Comisiones por rango (% y fijas)
-- ============================================

-- Rangos por empresa (1-10, nombres custom)
CREATE TABLE IF NOT EXISTS ranks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    rank_number INTEGER NOT NULL CHECK (rank_number >= 1 AND rank_number <= 10),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- Requisitos para este rango (manual por ahora, automático después)
    min_personal_sales INTEGER DEFAULT 0,
    min_team_sales INTEGER DEFAULT 0,
    min_direct_recruits INTEGER DEFAULT 0,
    -- Reclutamiento
    can_recruit BOOLEAN DEFAULT true,
    max_recruit_depth INTEGER DEFAULT 0, -- 0 = sin límite
    -- Visual
    color VARCHAR(7) DEFAULT '#3b82f6',
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, rank_number)
);

-- Comisiones por rango y campaña/producto
CREATE TABLE IF NOT EXISTS rank_commissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    rank_id INTEGER REFERENCES ranks(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    -- Comisión directa (lo que gana por sus propias ventas)
    direct_commission_percent DECIMAL(5,2) DEFAULT 0,
    direct_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Override (lo que gana por ventas de su equipo)
    override_commission_percent DECIMAL(5,2) DEFAULT 0,
    override_commission_fixed DECIMAL(10,2) DEFAULT 0,
    -- Override por nivel de profundidad (JSONB)
    -- Ejemplo: [{"level":1,"percent":5,"fixed":2},{"level":2,"percent":3,"fixed":1}]
    override_by_level JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rank_id, campaign_id)
);

-- Agregar campo rank a affiliates
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 1;

-- Configuración de reclutamiento y override por empresa
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_recruitment_depth INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS recruitment_rules JSONB DEFAULT '{}';
-- override_mode: 'fixed' = override fijo por rango, 'difference' = override por diferencia de % entre rangos
ALTER TABLE companies ADD COLUMN IF NOT EXISTS override_mode VARCHAR(20) DEFAULT 'fixed';

-- Historial de cambios de rango
CREATE TABLE IF NOT EXISTS rank_history (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    old_rank INTEGER,
    new_rank INTEGER,
    changed_by INTEGER, -- user_id del admin que hizo el cambio
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ranks_company ON ranks(company_id);
CREATE INDEX IF NOT EXISTS idx_rank_commissions_rank ON rank_commissions(rank_id);
CREATE INDEX IF NOT EXISTS idx_rank_commissions_campaign ON rank_commissions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_affiliate ON rank_history(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_rank ON affiliates(rank);
CREATE INDEX IF NOT EXISTS idx_affiliates_parent ON affiliates(parent_affiliate_id);

-- Seed: Rangos default para cada empresa existente
DO $$
DECLARE
    comp RECORD;
    default_names TEXT[] := ARRAY['Agente', 'Agente Senior', 'Líder', 'Líder Senior', 'Manager', 'Manager Senior', 'Director', 'Director Senior', 'VP', 'Propietario'];
    default_colors TEXT[] := ARRAY['#64748b', '#3b82f6', '#8b5cf6', '#a855f7', '#22c55e', '#16a34a', '#eab308', '#f97316', '#ef4444', '#dc2626'];
    i INTEGER;
BEGIN
    FOR comp IN SELECT id FROM companies LOOP
        FOR i IN 1..10 LOOP
            INSERT INTO ranks (company_id, rank_number, name, color)
            VALUES (comp.id, i, default_names[i], default_colors[i])
            ON CONFLICT (company_id, rank_number) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
