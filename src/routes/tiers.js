const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');
const { evaluateAllTiers, calculateProgressiveCommission } = require('../services/tier-evaluator');

// ============================================
// COMMISSION TIERS
// ============================================

// Listar tiers de una campaña
router.get('/campaign/:campaignId', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM commission_tiers WHERE company_id = $1 AND campaign_id = $2 ORDER BY tier_number ASC',
            [req.user.company_id, req.params.campaignId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list tiers' });
    }
});

// Crear tier
router.post('/', adminAuth, async (req, res) => {
    try {
        const { campaign_id, tier_number, name, commission_percent, commission_fixed,
                min_conversions, min_revenue, min_commission_earned, min_clicks, min_recruits,
                timeframe } = req.body;
        if (!campaign_id || !name) return res.status(400).json({ error: 'campaign_id and name required' });

        const result = await db.query(
            `INSERT INTO commission_tiers (company_id, campaign_id, tier_number, name,
             commission_percent, commission_fixed, min_conversions, min_revenue,
             min_commission_earned, min_clicks, min_recruits, timeframe)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [req.user.company_id, campaign_id, tier_number || 1, name,
             commission_percent || 0, commission_fixed || 0,
             min_conversions || 0, min_revenue || 0, min_commission_earned || 0,
             min_clicks || 0, min_recruits || 0, timeframe || 'all_time']
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Tier number already exists for this campaign' });
        res.status(500).json({ error: 'Failed to create tier' });
    }
});

// Actualizar tier
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { name, commission_percent, commission_fixed, min_conversions, min_revenue,
                min_commission_earned, min_clicks, min_recruits, timeframe, is_active } = req.body;
        const result = await db.query(
            `UPDATE commission_tiers SET name=COALESCE($1,name), commission_percent=COALESCE($2,commission_percent),
             commission_fixed=COALESCE($3,commission_fixed), min_conversions=COALESCE($4,min_conversions),
             min_revenue=COALESCE($5,min_revenue), min_commission_earned=COALESCE($6,min_commission_earned),
             min_clicks=COALESCE($7,min_clicks), min_recruits=COALESCE($8,min_recruits),
             timeframe=COALESCE($9,timeframe), is_active=COALESCE($10,is_active)
             WHERE id=$11 AND company_id=$12 RETURNING *`,
            [name, commission_percent, commission_fixed, min_conversions, min_revenue,
             min_commission_earned, min_clicks, min_recruits, timeframe, is_active,
             req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tier not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update tier' });
    }
});

// Evaluar todos los afiliados de una campaña
router.post('/evaluate/:campaignId', adminAuth, async (req, res) => {
    try {
        const result = await evaluateAllTiers(req.params.campaignId, req.user.company_id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Evaluation failed' });
    }
});

// Ver tier actual de un afiliado
router.get('/affiliate/:affiliateId', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT at.*, ct.name as tier_name, ct.commission_percent, ct.commission_fixed,
                    c.name as campaign_name
             FROM affiliate_tiers at
             JOIN commission_tiers ct ON at.tier_id = ct.id
             JOIN campaigns c ON at.campaign_id = c.id
             WHERE at.affiliate_id = $1 AND at.company_id = $2`,
            [req.params.affiliateId, req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get affiliate tiers' });
    }
});

// ============================================
// PROGRESSIVE COMMISSIONS
// ============================================

// Listar reglas progressive
router.get('/progressive/:campaignId', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM progressive_rules WHERE company_id = $1 AND campaign_id = $2 ORDER BY min_amount ASC',
            [req.user.company_id, req.params.campaignId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list progressive rules' });
    }
});

// Crear regla progressive
router.post('/progressive', adminAuth, async (req, res) => {
    try {
        const { campaign_id, product_id, min_amount, max_amount, commission_percent, commission_fixed } = req.body;
        const result = await db.query(
            `INSERT INTO progressive_rules (company_id, campaign_id, product_id, min_amount, max_amount, commission_percent, commission_fixed)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [req.user.company_id, campaign_id, product_id || null,
             min_amount || 0, max_amount || null, commission_percent || 0, commission_fixed || 0]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create progressive rule' });
    }
});

// ============================================
// CSV IMPORT
// ============================================

// Import products via CSV (texto)
router.post('/import/products', adminAuth, async (req, res) => {
    try {
        const { csv, campaign_id } = req.body;
        if (!csv) return res.status(400).json({ error: 'CSV data required' });

        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let imported = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((h, idx) => row[h] = values[idx]);

            try {
                await db.query(
                    `INSERT INTO products (company_id, campaign_id, sku, name, category, price,
                     commission_type, commission_amount, commission_percent)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                     ON CONFLICT (company_id, sku) DO UPDATE SET
                     name=$4, category=$5, price=$6, commission_amount=$8, commission_percent=$9`,
                    [req.user.company_id, campaign_id || null,
                     row.sku || null, row.name || row.product || 'Unnamed',
                     row.category || null, parseFloat(row.price) || 0,
                     row.commission_type || 'hybrid',
                     parseFloat(row.commission_amount || row.commission_fixed) || 0,
                     parseFloat(row.commission_percent) || 0]
                );
                imported++;
            } catch (e) { /* skip bad rows */ }
        }

        res.json({ status: 'ok', imported, total_rows: lines.length - 1 });
    } catch (err) {
        res.status(500).json({ error: 'Import failed: ' + err.message });
    }
});

// Import payouts via CSV
router.post('/import/payouts', adminAuth, async (req, res) => {
    try {
        const { csv } = req.body;
        if (!csv) return res.status(400).json({ error: 'CSV data required' });

        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let imported = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((h, idx) => row[h] = values[idx]);

            // Resolver afiliado por email o ref_id
            let affId = row.affiliate_id;
            if (!affId && row.email) {
                const aff = await db.query('SELECT id FROM affiliates WHERE email = $1 AND company_id = $2', [row.email, req.user.company_id]);
                if (aff.rows.length > 0) affId = aff.rows[0].id;
            }
            if (!affId && row.ref_id) {
                const aff = await db.query('SELECT id FROM affiliates WHERE ref_id = $1 AND company_id = $2', [row.ref_id, req.user.company_id]);
                if (aff.rows.length > 0) affId = aff.rows[0].id;
            }
            if (!affId) continue;

            try {
                await db.query(
                    `INSERT INTO payouts (company_id, affiliate_id, amount, payment_method, notes, status)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [req.user.company_id, affId, parseFloat(row.amount) || 0,
                     row.payment_method || 'manual', row.notes || 'CSV import', row.status || 'pending']
                );
                imported++;
            } catch (e) { /* skip bad rows */ }
        }

        res.json({ status: 'ok', imported, total_rows: lines.length - 1 });
    } catch (err) {
        res.status(500).json({ error: 'Import failed: ' + err.message });
    }
});

module.exports = router;
