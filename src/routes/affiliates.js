const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');

// Listar afiliados
router.get('/', adminAuth, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM affiliates WHERE company_id = $1';
        const params = [req.user.company_id];

        if (status) { params.push(status); query += ` AND status = $${params.length}`; }
        if (search) { params.push(`%${search}%`); query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length})`; }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        const count = await db.query('SELECT COUNT(*) FROM affiliates WHERE company_id = $1', [req.user.company_id]);
        res.json({ affiliates: result.rows, total: parseInt(count.rows[0].count), page: parseInt(page) });
    } catch (err) {
        console.error('Error listing affiliates:', err);
        res.status(500).json({ error: 'Failed to list affiliates' });
    }
});

// Obtener afiliado por ID
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM affiliates WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting affiliate:', err);
        res.status(500).json({ error: 'Failed to get affiliate' });
    }
});

// Aprobar/Rechazar afiliado
router.patch('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });
        await db.query('UPDATE affiliates SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [status, req.params.id, req.user.company_id]);

        if (status === 'approved') {
            const { Notify } = require('../services/notifications');
            const { triggerWebhooks } = require('../services/webhooks');
            const aff = await db.query('SELECT first_name, email FROM affiliates WHERE id = $1', [req.params.id]);
            if (aff.rows.length) {
                Notify.affiliateApproved(req.user.company_id, req.params.id, aff.rows[0].first_name || aff.rows[0].email);
                triggerWebhooks(req.user.company_id, 'affiliate_approved', { affiliate_id: req.params.id, email: aff.rows[0].email, name: aff.rows[0].first_name });
            }
        }

        res.json({ status: 'updated' });
    } catch (err) {
        console.error('Error updating affiliate status:', err);
        res.status(500).json({ error: 'Failed to update affiliate status' });
    }
});

// Estadisticas de un afiliado (con verificación multi-tenant y balance)
router.get('/:id/stats', adminAuth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const affId = req.params.id;

        // Verificar que el afiliado pertenece a la empresa del usuario
        const affCheck = await db.query('SELECT id, balance FROM affiliates WHERE id = $1 AND company_id = $2', [affId, req.user.company_id]);
        if (affCheck.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        const clicks = await db.query(
            `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_unique) as unique_clicks
             FROM clicks WHERE affiliate_id = $1 AND created_at >= $2 AND created_at <= $3`,
            [affId, start_date || '2020-01-01', end_date || '2030-01-01']
        );

        const conversions = await db.query(
            `SELECT COUNT(*) as total, SUM(amount) as revenue, SUM(commission) as commission
             FROM conversions WHERE affiliate_id = $1 AND created_at >= $2 AND created_at <= $3`,
            [affId, start_date || '2020-01-01', end_date || '2030-01-01']
        );

        res.json({
            balance: parseFloat(affCheck.rows[0].balance) || 0,
            clicks: clicks.rows[0],
            conversions: conversions.rows[0],
            conversion_rate: clicks.rows[0].total > 0
                ? ((conversions.rows[0].total / clicks.rows[0].total) * 100).toFixed(2) + '%'
                : '0%'
        });
    } catch (err) {
        console.error('Error getting affiliate stats:', err);
        res.status(500).json({ error: 'Failed to get affiliate stats' });
    }
});

module.exports = router;
