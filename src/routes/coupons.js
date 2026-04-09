const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');

router.get('/', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, a.email as affiliate_email, a.ref_id, ca.name as campaign_name
             FROM coupons c
             LEFT JOIN affiliates a ON c.affiliate_id = a.id
             LEFT JOIN campaigns ca ON c.campaign_id = ca.id
             WHERE c.company_id = $1 ORDER BY c.created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing coupons:', err);
        res.status(500).json({ error: 'Failed to list coupons' });
    }
});

router.post('/', adminAuth, async (req, res) => {
    try {
        const { campaign_id, affiliate_id, code, discount_type, discount_value, max_usage, expires_at } = req.body;
        if (!code || !affiliate_id) return res.status(400).json({ error: 'Code and affiliate ID are required' });
        if (!discount_type || discount_value == null) return res.status(400).json({ error: 'Discount type and value are required' });

        const result = await db.query(
            `INSERT INTO coupons (company_id, campaign_id, affiliate_id, code, discount_type, discount_value, max_usage, expires_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [req.user.company_id, campaign_id, affiliate_id, code.toUpperCase(), discount_type, discount_value, max_usage, expires_at]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating coupon:', err);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

router.delete('/:id', adminAuth, async (req, res) => {
    try {
        await db.query('UPDATE coupons SET is_active = false WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        res.json({ status: 'deactivated' });
    } catch (err) {
        console.error('Error deactivating coupon:', err);
        res.status(500).json({ error: 'Failed to deactivate coupon' });
    }
});

module.exports = router;
