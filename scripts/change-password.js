#!/usr/bin/env node
require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function changePassword() {
    const [,, email, newPassword, type] = process.argv;

    if (!email || !newPassword) {
        console.log('Usage:');
        console.log('  Admin:     node scripts/change-password.js admin@email.com NewPassword123');
        console.log('  Affiliate: node scripts/change-password.js agent@email.com NewPassword123 affiliate');
        process.exit(1);
    }

    const isAffiliate = type === 'affiliate';
    const table = isAffiliate ? 'affiliates' : 'users';

    try {
        const check = await pool.query(`SELECT id, email FROM ${table} WHERE email = $1`, [email]);
        if (check.rows.length === 0) {
            console.error(`Error: ${email} not found in ${table}`);
            process.exit(1);
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${table} SET password_hash = $1 WHERE email = $2`, [hash, email]);

        console.log(`Password updated for ${email} (${isAffiliate ? 'affiliate' : 'admin'})`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

changePassword();
