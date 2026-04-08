-- ============================================
-- MIGRATION: Sistema de pagos integrado
-- PayPal Payouts, Wise, Zelle, Manual
-- ============================================

-- Configuración de procesadores de pago por empresa
CREATE TABLE IF NOT EXISTS payment_providers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    provider VARCHAR(50) NOT NULL, -- paypal, wise, zelle, manual, crypto
    name VARCHAR(255) NOT NULL, -- "PayPal Business", "Wise Production"
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    -- Credenciales (encriptadas en producción)
    config JSONB DEFAULT '{}', -- { "client_id": "...", "client_secret": "...", "mode": "sandbox|live" }
    -- Límites
    min_payout DECIMAL(10,2) DEFAULT 10,
    max_payout DECIMAL(10,2) DEFAULT 10000,
    fee_percent DECIMAL(5,2) DEFAULT 0,
    fee_fixed DECIMAL(10,2) DEFAULT 0,
    -- Stats
    total_sent DECIMAL(12,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Historial detallado de transacciones de pago
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    payout_id INTEGER REFERENCES payouts(id),
    provider_id INTEGER REFERENCES payment_providers(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    -- Datos del pago
    amount DECIMAL(12,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL, -- amount - fee
    currency VARCHAR(3) DEFAULT 'USD',
    -- Destino
    recipient_email VARCHAR(255),
    recipient_account JSONB DEFAULT '{}', -- bank details, wallet, etc.
    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
    provider_transaction_id VARCHAR(255), -- ID del procesador externo
    provider_batch_id VARCHAR(255), -- Para PayPal batch payouts
    provider_response JSONB DEFAULT '{}', -- Respuesta completa del procesador
    error_message TEXT,
    -- Timestamps
    sent_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar payment_email a affiliates (para PayPal/Wise)
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payment_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payment_providers_company ON payment_providers(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payout ON payment_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_affiliate ON payment_transactions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
