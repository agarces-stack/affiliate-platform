const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Listar notificaciones (admin ve todas, afiliado ve las suyas)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { unread_only, limit = 50 } = req.query;
        let query, params;

        if (req.user.role === 'affiliate') {
            query = `SELECT * FROM notifications WHERE company_id = $1 AND (affiliate_id = $2 OR affiliate_id IS NULL)`;
            params = [req.user.company_id, req.user.id];
        } else {
            query = `SELECT * FROM notifications WHERE company_id = $1 AND affiliate_id IS NULL`;
            params = [req.user.company_id];
        }

        if (unread_only === 'true') query += ' AND is_read = false';
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        // Count unread
        let unreadQuery;
        if (req.user.role === 'affiliate') {
            unreadQuery = await db.query(
                'SELECT COUNT(*) as c FROM notifications WHERE company_id = $1 AND (affiliate_id = $2 OR affiliate_id IS NULL) AND is_read = false',
                [req.user.company_id, req.user.id]
            );
        } else {
            unreadQuery = await db.query(
                'SELECT COUNT(*) as c FROM notifications WHERE company_id = $1 AND affiliate_id IS NULL AND is_read = false',
                [req.user.company_id]
            );
        }

        res.json({
            notifications: result.rows,
            unread: parseInt(unreadQuery.rows[0].c)
        });
    } catch (err) {
        console.error('Error listing notifications:', err);
        res.status(500).json({ error: 'Failed to list notifications' });
    }
});

// Marcar como leída
router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND company_id = $2',
            [req.params.id, req.user.company_id]
        );
        res.json({ status: 'read' });
    } catch (err) {
        console.error('Error marking notification:', err);
        res.status(500).json({ error: 'Failed to mark notification' });
    }
});

// Marcar todas como leídas
router.patch('/read-all', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'affiliate') {
            await db.query(
                'UPDATE notifications SET is_read = true WHERE company_id = $1 AND (affiliate_id = $2 OR affiliate_id IS NULL) AND is_read = false',
                [req.user.company_id, req.user.id]
            );
        } else {
            await db.query(
                'UPDATE notifications SET is_read = true WHERE company_id = $1 AND affiliate_id IS NULL AND is_read = false',
                [req.user.company_id]
            );
        }
        res.json({ status: 'all_read' });
    } catch (err) {
        console.error('Error marking all notifications:', err);
        res.status(500).json({ error: 'Failed to mark all notifications' });
    }
});

module.exports = router;
