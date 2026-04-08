const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Reporte de ventas por agente
router.get('/by-agent', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, campaign_id, limit = 50 } = req.query;
        const compId = req.user.company_id;
        const sd = start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const ed = end_date || new Date().toISOString().split('T')[0];

        let query = `SELECT a.id, a.ref_id, a.email, a.first_name, a.last_name, a.rank,
                     r.name as rank_name, r.color as rank_color,
                     COUNT(c.id) as sales_count,
                     COALESCE(SUM(c.amount),0) as total_revenue,
                     COALESCE(SUM(c.commission),0) as total_commission,
                     COUNT(c.id) FILTER (WHERE c.status = 'approved') as approved_sales,
                     COUNT(c.id) FILTER (WHERE c.status = 'pending') as pending_sales,
                     COUNT(c.id) FILTER (WHERE c.status = 'rejected') as rejected_sales,
                     -- Renewals
                     (SELECT COUNT(*) FROM renewals rn WHERE rn.affiliate_id = a.id AND rn.created_at >= $2 AND rn.created_at <= $3) as renewal_count,
                     (SELECT COALESCE(SUM(rn.amount),0) FROM renewals rn WHERE rn.affiliate_id = a.id AND rn.created_at >= $2 AND rn.created_at <= $3) as renewal_revenue,
                     (SELECT COALESCE(SUM(rn.commission),0) FROM renewals rn WHERE rn.affiliate_id = a.id AND rn.created_at >= $2 AND rn.created_at <= $3) as renewal_commission
                     FROM affiliates a
                     LEFT JOIN conversions c ON c.affiliate_id = a.id AND c.created_at >= $2 AND c.created_at <= $3`;
        const params = [compId, sd, ed];

        if (campaign_id) {
            params.push(campaign_id);
            query += ` AND c.campaign_id = $${params.length}`;
        }

        query += ` LEFT JOIN ranks r ON r.company_id = $1 AND r.rank_number = a.rank
                   WHERE a.company_id = $1 AND a.status = 'approved'
                   GROUP BY a.id, a.ref_id, a.email, a.first_name, a.last_name, a.rank, r.name, r.color
                   ORDER BY total_revenue DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json({ agents: result.rows, period: { start: sd, end: ed } });
    } catch (err) {
        console.error('Error in sales by agent report:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Reporte de ventas por campaña/producto
router.get('/by-campaign', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const compId = req.user.company_id;
        const sd = start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const ed = end_date || new Date().toISOString().split('T')[0];

        const result = await db.query(
            `SELECT ca.id, ca.name, ca.commission_type, ca.renewal_enabled,
                    COUNT(c.id) as sales_count,
                    COALESCE(SUM(c.amount),0) as total_revenue,
                    COALESCE(SUM(c.commission),0) as total_commission,
                    COUNT(DISTINCT c.affiliate_id) as active_agents,
                    -- Renewals
                    (SELECT COUNT(*) FROM renewals rn WHERE rn.campaign_id = ca.id AND rn.created_at >= $2 AND rn.created_at <= $3) as renewal_count,
                    (SELECT COALESCE(SUM(rn.amount),0) FROM renewals rn WHERE rn.campaign_id = ca.id AND rn.created_at >= $2 AND rn.created_at <= $3) as renewal_revenue
             FROM campaigns ca
             LEFT JOIN conversions c ON c.campaign_id = ca.id AND c.created_at >= $2 AND c.created_at <= $3
             WHERE ca.company_id = $1
             GROUP BY ca.id, ca.name, ca.commission_type, ca.renewal_enabled
             ORDER BY total_revenue DESC`,
            [compId, sd, ed]
        );
        res.json({ campaigns: result.rows, period: { start: sd, end: ed } });
    } catch (err) {
        console.error('Error in sales by campaign report:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Reporte de ventas por rango
router.get('/by-rank', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const compId = req.user.company_id;
        const sd = start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const ed = end_date || new Date().toISOString().split('T')[0];

        const result = await db.query(
            `SELECT r.rank_number, r.name, r.color,
                    COUNT(DISTINCT a.id) as agent_count,
                    COUNT(c.id) as sales_count,
                    COALESCE(SUM(c.amount),0) as total_revenue,
                    COALESCE(SUM(c.commission),0) as total_commission,
                    CASE WHEN COUNT(DISTINCT a.id) > 0
                         THEN ROUND(COALESCE(SUM(c.amount),0) / COUNT(DISTINCT a.id), 2)
                         ELSE 0 END as avg_revenue_per_agent
             FROM ranks r
             LEFT JOIN affiliates a ON a.rank = r.rank_number AND a.company_id = $1 AND a.status = 'approved'
             LEFT JOIN conversions c ON c.affiliate_id = a.id AND c.created_at >= $2 AND c.created_at <= $3
             WHERE r.company_id = $1
             GROUP BY r.rank_number, r.name, r.color
             ORDER BY r.rank_number ASC`,
            [compId, sd, ed]
        );
        res.json({ ranks: result.rows, period: { start: sd, end: ed } });
    } catch (err) {
        console.error('Error in sales by rank report:', err);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Resumen comparativo (este mes vs mes anterior)
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

        const [thisMonth, lastMonth, thisRenewals, lastRenewals] = await Promise.all([
            db.query(
                `SELECT COUNT(*) as sales, COALESCE(SUM(amount),0) as revenue, COALESCE(SUM(commission),0) as commission,
                        COUNT(DISTINCT affiliate_id) as active_agents
                 FROM conversions WHERE company_id = $1 AND created_at >= $2`,
                [compId, thisMonthStart]
            ),
            db.query(
                `SELECT COUNT(*) as sales, COALESCE(SUM(amount),0) as revenue, COALESCE(SUM(commission),0) as commission,
                        COUNT(DISTINCT affiliate_id) as active_agents
                 FROM conversions WHERE company_id = $1 AND created_at >= $2 AND created_at <= $3`,
                [compId, lastMonthStart, lastMonthEnd]
            ),
            db.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as revenue, COALESCE(SUM(commission),0) as commission
                 FROM renewals WHERE company_id = $1 AND created_at >= $2`,
                [compId, thisMonthStart]
            ),
            db.query(
                `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as revenue, COALESCE(SUM(commission),0) as commission
                 FROM renewals WHERE company_id = $1 AND created_at >= $2 AND created_at <= $3`,
                [compId, lastMonthStart, lastMonthEnd]
            ),
        ]);

        const tm = thisMonth.rows[0];
        const lm = lastMonth.rows[0];
        const tr = thisRenewals.rows[0];
        const lr = lastRenewals.rows[0];

        const pctChange = (curr, prev) => prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : curr > 0 ? 100 : 0;

        res.json({
            this_month: {
                sales: parseInt(tm.sales), revenue: parseFloat(tm.revenue), commission: parseFloat(tm.commission),
                active_agents: parseInt(tm.active_agents),
                renewals: parseInt(tr.count), renewal_revenue: parseFloat(tr.revenue), renewal_commission: parseFloat(tr.commission),
            },
            last_month: {
                sales: parseInt(lm.sales), revenue: parseFloat(lm.revenue), commission: parseFloat(lm.commission),
                active_agents: parseInt(lm.active_agents),
                renewals: parseInt(lr.count), renewal_revenue: parseFloat(lr.revenue), renewal_commission: parseFloat(lr.commission),
            },
            changes: {
                sales: pctChange(parseInt(tm.sales), parseInt(lm.sales)),
                revenue: pctChange(parseFloat(tm.revenue), parseFloat(lm.revenue)),
                commission: pctChange(parseFloat(tm.commission), parseFloat(lm.commission)),
                renewals: pctChange(parseInt(tr.count), parseInt(lr.count)),
            }
        });
    } catch (err) {
        console.error('Error in summary report:', err);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

module.exports = router;
