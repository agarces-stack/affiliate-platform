-- ============================================
-- MIGRATION: Calendario de pagos y cuenta del afiliado
-- Balance como cuenta bancaria, retiros por solicitud o automáticos
-- ============================================

-- Config de calendario de pagos por empresa
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payout_schedule VARCHAR(20) DEFAULT 'on_request';
-- on_request = el afiliado solicita cuando quiera
-- weekly = cada lunes
-- biweekly = cada 1 y 15 del mes
-- monthly = el 1 de cada mes
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payout_day INTEGER DEFAULT 1; -- día del mes (1-28) para monthly
ALTER TABLE companies ADD COLUMN IF NOT EXISTS min_payout_amount DECIMAL(10,2) DEFAULT 50; -- mínimo para retirar
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payout_hold_days INTEGER DEFAULT 0; -- días de retención antes de liberar comisión
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_approve_payouts BOOLEAN DEFAULT false;

-- Movimientos de la cuenta del afiliado (como extracto bancario)
CREATE TABLE IF NOT EXISTS account_movements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    -- Tipo de movimiento
    type VARCHAR(30) NOT NULL,
    -- credit: commission_earned, override_earned, renewal_commission, bonus, adjustment_credit
    -- debit: withdrawal, adjustment_debit, chargeback
    direction VARCHAR(10) NOT NULL, -- credit, debit
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL, -- balance después del movimiento
    -- Referencia
    reference_type VARCHAR(30), -- conversion, renewal, mlm_commission, payout, adjustment
    reference_id INTEGER, -- ID de la conversión, renewal, payout, etc.
    -- Disponibilidad
    available_at TIMESTAMP DEFAULT NOW(), -- cuándo se libera (hold days)
    is_available BOOLEAN DEFAULT true,
    -- Metadata
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Solicitudes de retiro del afiliado
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50), -- paypal, wire, zelle
    payment_details JSONB DEFAULT '{}', -- email, bank info, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, processing, completed, rejected
    admin_notes TEXT,
    approved_by INTEGER, -- user_id
    payout_id INTEGER REFERENCES payouts(id), -- se llena cuando se procesa
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    processed_at TIMESTAMP
);

-- Balance disponible vs pendiente
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS available_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_account_movements_affiliate ON account_movements(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_created ON account_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_account_movements_available ON account_movements(available_at, is_available);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_affiliate ON withdrawal_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
