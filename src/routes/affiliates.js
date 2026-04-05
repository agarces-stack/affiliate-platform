const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Listar afiliados
router.get('/', authMiddleware, async (req, res) => {
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
});

// Obtener afiliado por ID
router.get('/:id', authMiddleware, async (req, res) => {
    const result = await db.query('SELECT * FROM affiliates WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
});

// Aprobar/Rechazar afiliado
router.patch('/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;
    await db.query('UPDATE affiliates SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [status, req.params.id, req.user.company_id]);
    res.json({ status: 'updated' });
});

// Estadisticas de un afiliado
router.get('/:id/stats', authMiddleware, async (req, res) => {
    const { start_date, end_date } = req.query;
    const affId = req.params.id;

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
        clicks: clicks.rows[0],
        conversions: conversions.rows[0],
        conversion_rate: clicks.rows[0].total > 0
            ? ((conversions.rows[0].total / clicks.rows[0].total) * 100).toFixed(2) + '%'
            : '0%'
    });
});

module.exports = router;
