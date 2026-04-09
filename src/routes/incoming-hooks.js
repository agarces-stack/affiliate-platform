const express = require('express');
const router = express.Router();
const db = require('../models/db');
const crypto = require('crypto');

// ============================================
// INCOMING WEBHOOKS - Para n8n, Zapier, etc.
// Autenticación via API key en header o query
// ============================================

// Middleware de autenticación por API key
async function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key required. Send via X-API-Key header or api_key query param.' });

    try {
        const result = await db.query(
            'SELECT id, company_id, name FROM api_keys WHERE key_hash = $1 AND is_active = true',
            [crypto.createHash('sha256').update(apiKey).digest('hex')]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid API key' });

        req.apiKey = result.rows[0];
        req.companyId = result.rows[0].company_id;
        next();
    } catch (err) {
        console.error('API key auth error:', err);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

// POST /hooks/conversion - Registrar conversión desde n8n/Zapier
router.post('/conversion', apiKeyAuth, async (req, res) => {
    try {
        const { ref_id, affiliate_id, campaign_id, order_id, amount,
                commission, customer_email, customer_name, status } = req.body;

        if (!ref_id && !affiliate_id) return res.status(400).json({ error: 'ref_id or affiliate_id required' });

        // Resolver affiliate
        let affId = affiliate_id;
        if (!affId && ref_id) {
            const aff = await db.query('SELECT id FROM affiliates WHERE ref_id = $1 AND company_id = $2', [ref_id, req.companyId]);
            if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });
            affId = aff.rows[0].id;
        }

        // Transacción atómica para conversion + balance
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `INSERT INTO conversions (company_id, campaign_id, affiliate_id, order_id, amount,
                 commission, customer_email, customer_name, tracking_method, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
                [req.companyId, campaign_id || null, affId, order_id || null,
                 parseFloat(amount) || 0, parseFloat(commission) || 0,
                 customer_email || null, customer_name || null, 'webhook', status || 'pending']
            );

            if (parseFloat(commission) > 0) {
                await client.query(
                    `UPDATE affiliates SET total_conversions = total_conversions + 1,
                     total_revenue = total_revenue + $1, total_commission = total_commission + $2,
                     balance = balance + $2 WHERE id = $3`,
                    [parseFloat(amount) || 0, parseFloat(commission) || 0, affId]
                );
            }
            await client.query('COMMIT');
            res.json({ status: 'ok', conversion_id: result.rows[0].id });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Hook conversion error:', err);
        res.status(500).json({ error: 'Failed to create conversion' });
    }
});

// POST /hooks/affiliate - Crear afiliado desde n8n/Zapier
router.post('/affiliate', apiKeyAuth, async (req, res) => {
    try {
        const { email, first_name, last_name, phone, company_name,
                parent_ref_id, status, rank } = req.body;

        if (!email || !first_name) return res.status(400).json({ error: 'email and first_name required' });

        const exists = await db.query('SELECT id FROM affiliates WHERE email = $1', [email]);
        if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered', affiliate_id: exists.rows[0].id });

        // Resolver parent
        let parentId = null;
        if (parent_ref_id) {
            const parent = await db.query('SELECT id FROM affiliates WHERE ref_id = $1', [parent_ref_id]);
            if (parent.rows.length > 0) parentId = parent.rows[0].id;
        }

        const ref_id = 'AFF' + Date.now().toString(36).toUpperCase();
        const result = await db.query(
            `INSERT INTO affiliates (company_id, ref_id, email, password_hash, first_name, last_name,
             phone, company_name, parent_affiliate_id, rank, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, ref_id`,
            [req.companyId, ref_id, email, '$2a$10$webhook_created_needs_password_reset_' + Date.now(),
             first_name, last_name || null, phone || null, company_name || null,
             parentId, rank || 1, status || 'pending']
        );

        res.json({ status: 'ok', affiliate_id: result.rows[0].id, ref_id: result.rows[0].ref_id });
    } catch (err) {
        console.error('Hook affiliate error:', err);
        res.status(500).json({ error: 'Failed to create affiliate' });
    }
});

// POST /hooks/payout - Registrar payout desde n8n/Zapier
router.post('/payout', apiKeyAuth, async (req, res) => {
    try {
        const { affiliate_id, ref_id, amount, payment_method, transaction_id, notes, status } = req.body;

        let affId = affiliate_id;
        if (!affId && ref_id) {
            const aff = await db.query('SELECT id FROM affiliates WHERE ref_id = $1 AND company_id = $2', [ref_id, req.companyId]);
            if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });
            affId = aff.rows[0].id;
        }
        if (!affId || !amount) return res.status(400).json({ error: 'affiliate_id/ref_id and amount required' });

        const result = await db.query(
            `INSERT INTO payouts (company_id, affiliate_id, amount, payment_method, transaction_id, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [req.companyId, affId, parseFloat(amount), payment_method || 'external',
             transaction_id || null, notes || 'Created via webhook', status || 'completed']
        );

        if (status === 'completed' || !status) {
            await db.query('UPDATE affiliates SET balance = GREATEST(balance - $1, 0) WHERE id = $2',
                [parseFloat(amount), affId]);
        }

        res.json({ status: 'ok', payout_id: result.rows[0].id });
    } catch (err) {
        console.error('Hook payout error:', err);
        res.status(500).json({ error: 'Failed to create payout' });
    }
});

// POST /hooks/rank - Cambiar rango desde n8n/Zapier
router.post('/rank', apiKeyAuth, async (req, res) => {
    try {
        const { affiliate_id, ref_id, rank_number, reason } = req.body;

        let affId = affiliate_id;
        if (!affId && ref_id) {
            const aff = await db.query('SELECT id FROM affiliates WHERE ref_id = $1 AND company_id = $2', [ref_id, req.companyId]);
            if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });
            affId = aff.rows[0].id;
        }
        if (!affId || !rank_number) return res.status(400).json({ error: 'affiliate_id/ref_id and rank_number required' });

        const aff = await db.query('SELECT rank FROM affiliates WHERE id = $1 AND company_id = $2', [affId, req.companyId]);
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        const oldRank = aff.rows[0].rank;
        await db.query('UPDATE affiliates SET rank = $1, updated_at = NOW() WHERE id = $2', [rank_number, affId]);
        await db.query(
            `INSERT INTO rank_history (company_id, affiliate_id, old_rank, new_rank, reason)
             VALUES ($1,$2,$3,$4,$5)`,
            [req.companyId, affId, oldRank, rank_number, reason || 'Changed via webhook']
        );

        res.json({ status: 'ok', old_rank: oldRank, new_rank: rank_number });
    } catch (err) {
        console.error('Hook rank error:', err);
        res.status(500).json({ error: 'Failed to change rank' });
    }
});

// GET /hooks/affiliates - Listar afiliados (para n8n polling)
router.get('/affiliates', apiKeyAuth, async (req, res) => {
    try {
        const { status, since, limit = 50 } = req.query;
        let query = 'SELECT id, ref_id, email, first_name, last_name, rank, status, balance, total_conversions, total_revenue, total_commission, created_at FROM affiliates WHERE company_id = $1';
        const params = [req.companyId];

        if (status) { params.push(status); query += ` AND status = $${params.length}`; }
        if (since) { params.push(since); query += ` AND created_at >= $${params.length}`; }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Hook list affiliates error:', err);
        res.status(500).json({ error: 'Failed to list affiliates' });
    }
});

// GET /hooks/conversions - Listar conversiones (para n8n polling)
router.get('/conversions', apiKeyAuth, async (req, res) => {
    try {
        const { status, since, limit = 50 } = req.query;
        let query = `SELECT c.*, a.email as affiliate_email, a.ref_id
                     FROM conversions c LEFT JOIN affiliates a ON c.affiliate_id = a.id
                     WHERE c.company_id = $1`;
        const params = [req.companyId];

        if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
        if (since) { params.push(since); query += ` AND c.created_at >= $${params.length}`; }
        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Hook list conversions error:', err);
        res.status(500).json({ error: 'Failed to list conversions' });
    }
});

module.exports = router;
