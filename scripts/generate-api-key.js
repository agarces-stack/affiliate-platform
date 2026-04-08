#!/usr/bin/env node
require('dotenv').config({ path: './config/.env' });
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function generateKey() {
    const [,, companyId, name] = process.argv;

    if (!companyId || !name) {
        console.log('Usage: node scripts/generate-api-key.js <company_id> <name>');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/generate-api-key.js 1 "n8n Production"');
        console.log('  node scripts/generate-api-key.js 2 "GHL Integration"');
        console.log('  node scripts/generate-api-key.js 1 "Zapier"');
        process.exit(1);
    }

    try {
        const apiKey = 'mr_' + crypto.randomBytes(32).toString('hex');
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const keyPrefix = apiKey.substring(0, 10);

        await pool.query(
            'INSERT INTO api_keys (company_id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4)',
            [companyId, name, keyHash, keyPrefix]
        );

        console.log('');
        console.log('API Key generated successfully!');
        console.log('================================');
        console.log(`Name:    ${name}`);
        console.log(`Company: ${companyId}`);
        console.log(`Key:     ${apiKey}`);
        console.log('');
        console.log('SAVE THIS KEY - it cannot be retrieved later.');
        console.log('');
        console.log('Use in n8n/GHL/Zapier:');
        console.log(`  Header: X-API-Key: ${apiKey}`);
        console.log(`  Or query: ?api_key=${apiKey}`);
        console.log('');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

generateKey();
