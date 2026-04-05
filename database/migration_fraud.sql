-- Tabla de IPs bloqueadas
CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    ip_address INET NOT NULL,
    reason TEXT,
    blocked_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_company ON blocked_ips(company_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
