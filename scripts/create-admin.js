#!/usr/bin/env node
require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createAdmin() {
    const [,, email, password, name, companyId] = process.argv;

    if (!email || !password) {
        console.log('Usage: node scripts/create-admin.js email password [name] [company_id]');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/create-admin.js boss@company.com SecurePass123 "John Boss" 1');
        console.log('  node scripts/create-admin.js new@traduce.com MyPass456 "Maria Admin" 2');
        process.exit(1);
    }

    try {
        const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (exists.rows.length > 0) {
            console.error(`Error: ${email} already exists`);
            process.exit(1);
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (company_id, email, password_hash, name, role)
             VALUES ($1, $2, $3, $4, 'admin') RETURNING id, email`,
            [companyId || 1, email, hash, name || email.split('@')[0]]
        );

        console.log(`Admin created: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

createAdmin();
