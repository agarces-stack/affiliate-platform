const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const VALID_EVENTS = ['new_conversion', 'new_affiliate', 'affiliate_approved', 'payout_completed', 'rank_promotion', 'fraud_alert'];

// Listar webhooks
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM webhooks WHERE company_id = $1 ORDER BY created_at DESC',
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing webhooks:', err);
        res.status(500).json({ error: 'Failed to list webhooks' });
    }
});

// Crear webhook
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, url, secret, events } = req.body;
        if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
        if (!events || !events.length) return res.status(400).json({ error: 'At least one event is required' });

        const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
        if (invalidEvents.length) return res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}`, valid_events: VALID_EVENTS });

        const result = await db.query(
            `INSERT INTO webhooks (company_id, name, url, secret, events)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [req.user.company_id, name, url, secret || null, events]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating webhook:', err);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

// Actualizar webhook
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, url, secret, events, is_active } = req.body;
        const result = await db.query(
            `UPDATE webhooks SET name = COALESCE($1, name), url = COALESCE($2, url),
             secret = COALESCE($3, secret), events = COALESCE($4, events),
             is_active = COALESCE($5, is_active)
             WHERE id = $6 AND company_id = $7 RETURNING *`,
            [name, url, secret, events, is_active, req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Webhook not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating webhook:', err);
        res.status(500).json({ error: 'Failed to update webhook' });
    }
});

// Eliminar webhook
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM webhooks WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        res.json({ status: 'deleted' });
    } catch (err) {
        console.error('Error deleting webhook:', err);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

// Test webhook
router.post('/:id/test', authMiddleware, async (req, res) => {
    try {
        const hook = await db.query('SELECT * FROM webhooks WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        if (hook.rows.length === 0) return res.status(404).json({ error: 'Webhook not found' });

        const { triggerWebhooks } = require('../services/webhooks');
        await triggerWebhooks(req.user.company_id, 'test', { message: 'This is a test webhook', timestamp: new Date().toISOString() });
        res.json({ status: 'test_sent' });
    } catch (err) {
        console.error('Error testing webhook:', err);
        res.status(500).json({ error: 'Failed to test webhook' });
    }
});

module.exports = router;
