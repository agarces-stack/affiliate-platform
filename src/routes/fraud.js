const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');

// Listar fraud logs
router.get('/logs', adminAuth, async (req, res) => {
    try {
        const { severity, limit = 100 } = req.query;
        let query = `SELECT f.*, a.email as affiliate_email, a.ref_id
                     FROM fraud_logs f
                     LEFT JOIN affiliates a ON f.affiliate_id = a.id
                     WHERE f.company_id = $1`;
        const params = [req.user.company_id];

        if (severity) { params.push(severity); query += ` AND f.severity = $${params.length}`; }
        query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing fraud logs:', err);
        res.status(500).json({ error: 'Failed to list fraud logs' });
    }
});

// Stats de fraude
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const [total, today, critical, high, blocked] = await Promise.all([
            db.query('SELECT COUNT(*) as c FROM fraud_logs WHERE company_id = $1', [compId]),
            db.query("SELECT COUNT(*) as c FROM fraud_logs WHERE company_id = $1 AND created_at::date = CURRENT_DATE", [compId]),
            db.query("SELECT COUNT(*) as c FROM fraud_logs WHERE company_id = $1 AND severity = 'critical'", [compId]),
            db.query("SELECT COUNT(*) as c FROM fraud_logs WHERE company_id = $1 AND severity = 'high'", [compId]),
            db.query('SELECT COUNT(*) as c FROM blocked_ips WHERE company_id = $1 AND is_active = true', [compId]),
        ]);
        res.json({
            total_alerts: parseInt(total.rows[0].c),
            today_alerts: parseInt(today.rows[0].c),
            critical_alerts: parseInt(critical.rows[0].c),
            high_alerts: parseInt(high.rows[0].c),
            blocked_ips: parseInt(blocked.rows[0].c),
        });
    } catch (err) {
        console.error('Error getting fraud stats:', err);
        res.status(500).json({ error: 'Failed to get fraud stats' });
    }
});

// Listar IPs bloqueadas
router.get('/blocked-ips', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM blocked_ips WHERE company_id = $1 ORDER BY created_at DESC',
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing blocked IPs:', err);
        res.status(500).json({ error: 'Failed to list blocked IPs' });
    }
});

// Bloquear IP
router.post('/block-ip', adminAuth, async (req, res) => {
    try {
        const { ip_address, reason } = req.body;
        if (!ip_address) return res.status(400).json({ error: 'IP address is required' });

        await db.query(
            `INSERT INTO blocked_ips (company_id, ip_address, reason, blocked_by)
             VALUES ($1, $2, $3, $4) ON CONFLICT (company_id, ip_address) DO UPDATE SET is_active = true, reason = $3`,
            [req.user.company_id, ip_address, reason || 'Manual block', req.user.email]
        );
        res.json({ status: 'blocked', ip: ip_address });
    } catch (err) {
        console.error('Error blocking IP:', err);
        res.status(500).json({ error: 'Failed to block IP' });
    }
});

// Desbloquear IP
router.delete('/unblock-ip/:ip', adminAuth, async (req, res) => {
    try {
        await db.query(
            'UPDATE blocked_ips SET is_active = false WHERE company_id = $1 AND ip_address = $2',
            [req.user.company_id, req.params.ip]
        );
        res.json({ status: 'unblocked' });
    } catch (err) {
        console.error('Error unblocking IP:', err);
        res.status(500).json({ error: 'Failed to unblock IP' });
    }
});

// Top IPs sospechosas
router.get('/suspicious-ips', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT details->>'ip' as ip, COUNT(*) as alert_count,
             MAX(severity) as max_severity, MAX(created_at) as last_alert
             FROM fraud_logs WHERE company_id = $1 AND details->>'ip' IS NOT NULL
             GROUP BY details->>'ip' ORDER BY alert_count DESC LIMIT 20`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting suspicious IPs:', err);
        res.status(500).json({ error: 'Failed to get suspicious IPs' });
    }
});

module.exports = router;
