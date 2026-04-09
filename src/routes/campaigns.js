const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');

// Listar campañas
router.get('/', adminAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM campaigns WHERE company_id = $1 ORDER BY created_at DESC', [req.user.company_id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing campaigns:', err);
        res.status(500).json({ error: 'Failed to list campaigns' });
    }
});

// Crear campaña
router.post('/', adminAuth, async (req, res) => {
    try {
        const { name, description, url, commission_type, commission_amount, commission_percent,
                recurring, recurring_months, cookie_days, mlm_enabled, mlm_levels, mlm_commissions,
                tiered_enabled, tiered_rules } = req.body;

        if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
        if (!commission_type) return res.status(400).json({ error: 'Commission type is required' });

        const result = await db.query(
            `INSERT INTO campaigns (company_id, name, description, url, commission_type, commission_amount,
             commission_percent, recurring, recurring_months, cookie_days, mlm_enabled, mlm_levels, mlm_commissions,
             tiered_enabled, tiered_rules)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
            [req.user.company_id, name, description, url, commission_type, commission_amount || 0,
             commission_percent || 0, recurring || false, recurring_months || 0, cookie_days || 30,
             mlm_enabled || false, mlm_levels || 0, JSON.stringify(mlm_commissions || []),
             tiered_enabled || false, JSON.stringify(tiered_rules || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating campaign:', err);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

// Asignar afiliado a campaña
router.post('/:id/affiliates', adminAuth, async (req, res) => {
    try {
        const { affiliate_id, custom_commission_type, custom_commission_amount, custom_commission_percent } = req.body;
        if (!affiliate_id) return res.status(400).json({ error: 'Affiliate ID is required' });

        // Verificar que la campaña pertenece a la empresa
        const camp = await db.query('SELECT id FROM campaigns WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        if (camp.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

        await db.query(
            `INSERT INTO campaign_affiliates (campaign_id, affiliate_id, custom_commission_type, custom_commission_amount, custom_commission_percent)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (campaign_id, affiliate_id) DO UPDATE SET
             custom_commission_type = $3, custom_commission_amount = $4, custom_commission_percent = $5`,
            [req.params.id, affiliate_id, custom_commission_type, custom_commission_amount, custom_commission_percent]
        );
        res.json({ status: 'assigned' });
    } catch (err) {
        console.error('Error assigning affiliate:', err);
        res.status(500).json({ error: 'Failed to assign affiliate' });
    }
});

// Stats de campaña (con verificación multi-tenant)
router.get('/:id/stats', adminAuth, async (req, res) => {
    try {
        const campId = req.params.id;

        // Verificar que la campaña pertenece a la empresa del usuario
        const camp = await db.query('SELECT id FROM campaigns WHERE id = $1 AND company_id = $2', [campId, req.user.company_id]);
        if (camp.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

        const clicks = await db.query('SELECT COUNT(*) as total FROM clicks WHERE campaign_id = $1', [campId]);
        const conversions = await db.query(
            'SELECT COUNT(*) as total, SUM(amount) as revenue, SUM(commission) as commission FROM conversions WHERE campaign_id = $1',
            [campId]
        );
        const affiliates = await db.query('SELECT COUNT(*) as total FROM campaign_affiliates WHERE campaign_id = $1', [campId]);
        res.json({ clicks: clicks.rows[0], conversions: conversions.rows[0], affiliates: affiliates.rows[0] });
    } catch (err) {
        console.error('Error getting campaign stats:', err);
        res.status(500).json({ error: 'Failed to get campaign stats' });
    }
});

module.exports = router;
