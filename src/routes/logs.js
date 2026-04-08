const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Postback logs (tracking requests)
router.get('/postbacks', authMiddleware, async (req, res) => {
    try {
        const { status, endpoint, affiliate_id, click_id, start_date, end_date, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM postback_logs WHERE company_id = $1';
        const params = [req.user.company_id];

        if (status) { params.push(status); query += ` AND status = $${params.length}`; }
        if (endpoint) { params.push(endpoint); query += ` AND endpoint = $${params.length}`; }
        if (affiliate_id) { params.push(affiliate_id); query += ` AND affiliate_id = $${params.length}`; }
        if (click_id) { params.push(click_id); query += ` AND click_id = $${params.length}`; }
        if (start_date) { params.push(start_date); query += ` AND created_at >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND created_at <= $${params.length}`; }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [result, count] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, -2))
        ]);

        res.json({ logs: result.rows, total: parseInt(count.rows[0].total), page: parseInt(page) });
    } catch (err) {
        console.error('Error listing postback logs:', err);
        res.status(500).json({ error: 'Failed to list logs' });
    }
});

// Postback log stats
router.get('/postbacks/stats', authMiddleware, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const [total, today, errors, byStatus, byEndpoint, avgTime] = await Promise.all([
            db.query('SELECT COUNT(*) as c FROM postback_logs WHERE company_id = $1', [compId]),
            db.query("SELECT COUNT(*) as c FROM postback_logs WHERE company_id = $1 AND created_at >= CURRENT_DATE", [compId]),
            db.query("SELECT COUNT(*) as c FROM postback_logs WHERE company_id = $1 AND status = 'error'", [compId]),
            db.query("SELECT status, COUNT(*) as c FROM postback_logs WHERE company_id = $1 GROUP BY status ORDER BY c DESC", [compId]),
            db.query("SELECT endpoint, COUNT(*) as c FROM postback_logs WHERE company_id = $1 GROUP BY endpoint ORDER BY c DESC", [compId]),
            db.query("SELECT ROUND(AVG(processing_time_ms)) as avg_ms FROM postback_logs WHERE company_id = $1 AND processing_time_ms IS NOT NULL", [compId]),
        ]);
        res.json({
            total: parseInt(total.rows[0].c),
            today: parseInt(today.rows[0].c),
            errors: parseInt(errors.rows[0].c),
            by_status: byStatus.rows,
            by_endpoint: byEndpoint.rows,
            avg_processing_ms: parseInt(avgTime.rows[0].avg_ms) || 0,
        });
    } catch (err) {
        console.error('Error getting postback stats:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Activity logs (admin audit trail)
router.get('/activity', authMiddleware, async (req, res) => {
    try {
        const { action, entity_type, user_id, start_date, end_date, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let query = `SELECT al.*, u.name as user_name, u.email as user_email
                     FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
                     WHERE al.company_id = $1`;
        const params = [req.user.company_id];

        if (action) { params.push(action); query += ` AND al.action = $${params.length}`; }
        if (entity_type) { params.push(entity_type); query += ` AND al.entity_type = $${params.length}`; }
        if (user_id) { params.push(user_id); query += ` AND al.user_id = $${params.length}`; }
        if (start_date) { params.push(start_date); query += ` AND al.created_at >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND al.created_at <= $${params.length}`; }

        query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing activity logs:', err);
        res.status(500).json({ error: 'Failed to list activity logs' });
    }
});

module.exports = router;
