require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Connecting to database...');
        await pool.query('SELECT NOW()');
        console.log('Connected!');

        // Leer y ejecutar schema
        console.log('Creating tables...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('Tables created!');

        // Ejecutar migration de fraud (blocked_ips table)
        const fraudMigration = fs.readFileSync(path.join(__dirname, 'migration_fraud.sql'), 'utf8');
        await pool.query(fraudMigration);
        console.log('Fraud tables created!');

        // Ejecutar migration de rangos
        const ranksMigration = fs.readFileSync(path.join(__dirname, 'migration_ranks.sql'), 'utf8');
        await pool.query(ranksMigration);
        console.log('Ranks tables created!');

        // Ejecutar migration de webhooks
        const webhooksMigration = fs.readFileSync(path.join(__dirname, 'migration_webhooks.sql'), 'utf8');
        await pool.query(webhooksMigration);
        console.log('Webhooks table created!');

        // Ejecutar migration de API keys
        const apiKeysMigration = fs.readFileSync(path.join(__dirname, 'migration_api_keys.sql'), 'utf8');
        await pool.query(apiKeysMigration);
        console.log('API keys table created!');

        // Ejecutar migration de renewals
        const renewalsMigration = fs.readFileSync(path.join(__dirname, 'migration_renewals.sql'), 'utf8');
        await pool.query(renewalsMigration);
        console.log('Renewals tables created!');

        // Crear empresas
        console.log('Creating seed data...');
        await pool.query(`
            INSERT INTO companies (name, slug, domain) VALUES
            ('MagnetRaffic', 'magnetraffic', 'magnetraffic.com'),
            ('Traduce', 'traduce', 'traduce.com'),
            ('Trebolife', 'trebolife', 'trebolife.com')
            ON CONFLICT (slug) DO NOTHING
        `);

        // Crear admin user
        const adminPassword = await bcrypt.hash('admin2026', 10);
        await pool.query(`
            INSERT INTO users (company_id, email, password_hash, name, role)
            VALUES (1, 'admin@magnetraffic.com', $1, 'Admin MagnetRaffic', 'admin')
            ON CONFLICT (email) DO NOTHING
        `, [adminPassword]);

        await pool.query(`
            INSERT INTO users (company_id, email, password_hash, name, role)
            VALUES (2, 'admin@traduce.com', $1, 'Admin Traduce', 'admin')
            ON CONFLICT (email) DO NOTHING
        `, [adminPassword]);

        await pool.query(`
            INSERT INTO users (company_id, email, password_hash, name, role)
            VALUES (3, 'admin@trebolife.com', $1, 'Admin Trebolife', 'admin')
            ON CONFLICT (email) DO NOTHING
        `, [adminPassword]);

        // Crear campañas
        await pool.query(`
            INSERT INTO campaigns (company_id, name, description, url, commission_type, commission_amount, commission_percent, cookie_days)
            VALUES (2, 'Traduce - Referral Program', 'Refiere abogados de inmigracion a Traduce y gana comision por cada traduccion', 'https://traduce.com', 'cpa', 25.00, 0, 30)
            ON CONFLICT DO NOTHING
        `);

        await pool.query(`
            INSERT INTO campaigns (company_id, name, description, url, commission_type, commission_amount, commission_percent, cookie_days)
            VALUES (3, 'Trebolife - Affiliate Program', 'Programa de afiliados Trebolife', 'https://trebolife.com', 'revshare', 0, 15, 30)
            ON CONFLICT DO NOTHING
        `);

        console.log('Seed data created!');
        console.log('');
        console.log('=== MIGRATION COMPLETE ===');
        console.log('Admin login: admin@magnetraffic.com / admin2026');
        console.log('Admin login: admin@traduce.com / admin2026');
        console.log('Admin login: admin@trebolife.com / admin2026');
        console.log('');

    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
