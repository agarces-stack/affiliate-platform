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

        // Ejecutar migration de payments
        const paymentsMigration = fs.readFileSync(path.join(__dirname, 'migration_payments.sql'), 'utf8');
        await pool.query(paymentsMigration);
        console.log('Payment tables created!');

        // Ejecutar migration de payout schedule
        const payoutScheduleMigration = fs.readFileSync(path.join(__dirname, 'migration_payout_schedule.sql'), 'utf8');
        await pool.query(payoutScheduleMigration);
        console.log('Payout schedule tables created!');

        // Ejecutar migration de logs
        const logsMigration = fs.readFileSync(path.join(__dirname, 'migration_logs.sql'), 'utf8');
        await pool.query(logsMigration);
        console.log('Log tables created!');

        // Ejecutar migration de products y goals
        const productsGoalsMigration = fs.readFileSync(path.join(__dirname, 'migration_products_goals.sql'), 'utf8');
        await pool.query(productsGoalsMigration);
        console.log('Products & Goals tables created!');

        // Ejecutar migration de commission groups
        const commGroupsMigration = fs.readFileSync(path.join(__dirname, 'migration_commission_groups.sql'), 'utf8');
        await pool.query(commGroupsMigration);
        console.log('Commission groups tables created!');

        // Ejecutar migration de RAG (knowledge base)
        try {
            const ragMigration = fs.readFileSync(path.join(__dirname, 'migration_rag.sql'), 'utf8');
            await pool.query(ragMigration);
            console.log('RAG/Knowledge base tables created!');
        } catch (ragErr) {
            console.log('RAG migration skipped (pgvector may not be installed):', ragErr.message);
        }

        // Ejecutar migration de tiered avanzado
        const tieredMigration = fs.readFileSync(path.join(__dirname, 'migration_tiered_advanced.sql'), 'utf8');
        await pool.query(tieredMigration);
        console.log('Tiered/Progressive tables created!');

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
        const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeOnFirstLogin_' + Date.now();
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const adminPassword = await bcrypt.hash(seedPassword, rounds);
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

        // Crear campañas de ejemplo
        await pool.query(`
            INSERT INTO campaigns (company_id, name, description, url, commission_type, commission_amount, commission_percent, cookie_days)
            VALUES (2, 'Traduce - Referral Program', 'Programa de referidos Traduce', 'https://traduce.com', 'cpa', 25.00, 0, 30)
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
        console.log('Admin emails: admin@magnetraffic.com, admin@traduce.com, admin@trebolife.com');
        console.log('Password: set via SEED_ADMIN_PASSWORD env var (change immediately after first login)');
        console.log('To change password: npm run change-password admin@magnetraffic.com NewSecurePassword');
        console.log('');

    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
