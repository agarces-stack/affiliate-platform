const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
    const result = await db.query(
        `SELECT c.*, a.email as affiliate_email, a.ref_id, ca.name as campaign_name
         FROM coupons c
         LEFT JOIN affiliates a ON c.affiliate_id = a.id
         LEFT JOIN campaigns ca ON c.campaign_id = ca.id
         WHERE c.company_id = $1 ORDER BY c.created_at DESC`,
        [req.user.company_id]
    );
    res.json(result.rows);
});

router.post('/', authMiddleware, async (req, res) => {
    const { campaign_id, affiliate_id, code, discount_type, discount_value, max_usage, expires_at } = req.body;
    const result = await db.query(
        `INSERT INTO coupons (company_id, campaign_id, affiliate_id, code, discount_type, discount_value, max_usage, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.user.company_id, campaign_id, affiliate_id, code.toUpperCase(), discount_type, discount_value, max_usage, expires_at]
    );
    res.json(result.rows[0]);
});

router.delete('/:id', authMiddleware, async (req, res) => {
    await db.query('UPDATE coupons SET is_active = false WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    res.json({ status: 'deactivated' });
});

module.exports = router;
