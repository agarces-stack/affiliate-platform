const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Dashboard general
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const today = new Date().toISOString().split('T')[0];

        const [totalAff, totalClicks, totalConv, todayClicks, todayConv, revenue, pending] = await Promise.all([
            db.query('SELECT COUNT(*) as c FROM affiliates WHERE company_id = $1 AND status = $2', [compId, 'approved']),
            db.query('SELECT COUNT(*) as c FROM clicks WHERE company_id = $1', [compId]),
            db.query('SELECT COUNT(*) as c, SUM(amount) as rev, SUM(commission) as comm FROM conversions WHERE company_id = $1', [compId]),
            db.query('SELECT COUNT(*) as c FROM clicks WHERE company_id = $1 AND created_at::date = $2', [compId, today]),
            db.query('SELECT COUNT(*) as c, SUM(amount) as rev FROM conversions WHERE company_id = $1 AND created_at::date = $2', [compId, today]),
            db.query('SELECT SUM(amount) as total FROM conversions WHERE company_id = $1 AND status = $2', [compId, 'approved']),
            db.query('SELECT SUM(commission) as total FROM conversions WHERE company_id = $1 AND status = $2', [compId, 'pending']),
        ]);

        res.json({
            affiliates: parseInt(totalAff.rows[0].c),
            total_clicks: parseInt(totalClicks.rows[0].c),
            total_conversions: parseInt(totalConv.rows[0].c),
            total_revenue: parseFloat(totalConv.rows[0].rev) || 0,
            total_commission: parseFloat(totalConv.rows[0].comm) || 0,
            today_clicks: parseInt(todayClicks.rows[0].c),
            today_conversions: parseInt(todayConv.rows[0].c),
            today_revenue: parseFloat(todayConv.rows[0].rev) || 0,
            approved_revenue: parseFloat(revenue.rows[0].total) || 0,
            pending_commission: parseFloat(pending.rows[0].total) || 0,
        });
    } catch (err) {
        console.error('Error getting dashboard:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Reporte por fecha
router.get('/by-date', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, group_by = 'day' } = req.query;
        const compId = req.user.company_id;

        const dateFormat = group_by === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

        const result = await db.query(
            `SELECT TO_CHAR(c.created_at, $1) as date,
             COUNT(DISTINCT cl.id) as clicks,
             COUNT(DISTINCT c.id) as conversions,
             COALESCE(SUM(c.amount), 0) as revenue,
             COALESCE(SUM(c.commission), 0) as commission
             FROM conversions c
             LEFT JOIN clicks cl ON cl.company_id = c.company_id AND TO_CHAR(cl.created_at, $1) = TO_CHAR(c.created_at, $1)
             WHERE c.company_id = $2 AND c.created_at >= $3 AND c.created_at <= $4
             GROUP BY TO_CHAR(c.created_at, $1)
             ORDER BY date`,
            [dateFormat, compId, start_date || '2020-01-01', end_date || '2030-01-01']
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting date report:', err);
        res.status(500).json({ error: 'Failed to load report' });
    }
});

// Top afiliados
router.get('/top-affiliates', authMiddleware, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const result = await db.query(
            `SELECT a.id, a.ref_id, a.email, a.first_name, a.last_name,
             a.total_clicks, a.total_conversions, a.total_revenue, a.total_commission
             FROM affiliates a WHERE a.company_id = $1 AND a.status = 'approved'
             ORDER BY a.total_revenue DESC LIMIT $2`,
            [req.user.company_id, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting top affiliates:', err);
        res.status(500).json({ error: 'Failed to load top affiliates' });
    }
});

// Búsqueda global
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ affiliates: [], campaigns: [], conversions: [] });

        const search = `%${q}%`;
        const compId = req.user.company_id;

        const [affiliates, campaigns, conversions] = await Promise.all([
            db.query(
                `SELECT id, ref_id, email, first_name, last_name, rank, status
                 FROM affiliates WHERE company_id = $1 AND (email ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR ref_id ILIKE $2)
                 LIMIT 5`,
                [compId, search]
            ),
            db.query(
                `SELECT id, name, url, status, commission_type
                 FROM campaigns WHERE company_id = $1 AND (name ILIKE $2 OR url ILIKE $2)
                 LIMIT 5`,
                [compId, search]
            ),
            db.query(
                `SELECT c.id, c.order_id, c.amount, c.commission, c.status, c.tracking_method, a.email as affiliate_email
                 FROM conversions c LEFT JOIN affiliates a ON c.affiliate_id = a.id
                 WHERE c.company_id = $1 AND (c.order_id ILIKE $2 OR c.customer_email ILIKE $2 OR a.email ILIKE $2)
                 LIMIT 5`,
                [compId, search]
            ),
        ]);

        res.json({
            affiliates: affiliates.rows,
            campaigns: campaigns.rows,
            conversions: conversions.rows
        });
    } catch (err) {
        console.error('Error searching:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
