const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');
const { Notify } = require('../services/notifications');
const { triggerWebhooks } = require('../services/webhooks');

// Listar payouts
router.get('/', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.*, a.email as affiliate_email, a.ref_id, a.first_name
             FROM payouts p JOIN affiliates a ON p.affiliate_id = a.id
             WHERE p.company_id = $1 ORDER BY p.created_at DESC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing payouts:', err);
        res.status(500).json({ error: 'Failed to list payouts' });
    }
});

// Crear payout (con transacción atómica)
router.post('/', adminAuth, async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { affiliate_id, amount, payment_method, notes } = req.body;
        if (!affiliate_id || !amount) return res.status(400).json({ error: 'Affiliate ID and amount are required' });
        if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
        if (!payment_method) return res.status(400).json({ error: 'Payment method is required' });

        await client.query('BEGIN');

        // Verificar balance (con lock para evitar race conditions)
        const aff = await client.query('SELECT balance FROM affiliates WHERE id = $1 AND company_id = $2 FOR UPDATE', [affiliate_id, req.user.company_id]);
        if (aff.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Affiliate not found' });
        }
        if (parseFloat(aff.rows[0].balance) < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const result = await client.query(
            `INSERT INTO payouts (company_id, affiliate_id, amount, payment_method, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [req.user.company_id, affiliate_id, amount, payment_method, notes, 'pending']
        );

        // Descontar del balance
        await client.query('UPDATE affiliates SET balance = balance - $1 WHERE id = $2', [amount, affiliate_id]);

        await client.query('COMMIT');
        Notify.payoutCreated(req.user.company_id, affiliate_id, amount, payment_method);
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating payout:', err);
        res.status(500).json({ error: 'Failed to create payout' });
    } finally {
        client.release();
    }
});

// Marcar payout como completado
router.patch('/:id/complete', adminAuth, async (req, res) => {
    try {
        const { transaction_id } = req.body;
        await db.query(
            `UPDATE payouts SET status = 'completed', transaction_id = $1, processed_at = NOW()
             WHERE id = $2 AND company_id = $3`,
            [transaction_id, req.params.id, req.user.company_id]
        );
        const p = await db.query('SELECT affiliate_id, amount, payment_method FROM payouts WHERE id = $1', [req.params.id]);
        if (p.rows.length) {
            Notify.payoutCompleted(req.user.company_id, p.rows[0].affiliate_id, p.rows[0].amount);
            triggerWebhooks(req.user.company_id, 'payout_completed', { payout_id: req.params.id, affiliate_id: p.rows[0].affiliate_id, amount: parseFloat(p.rows[0].amount), payment_method: p.rows[0].payment_method, transaction_id });
        }
        res.json({ status: 'completed' });
    } catch (err) {
        console.error('Error completing payout:', err);
        res.status(500).json({ error: 'Failed to complete payout' });
    }
});

module.exports = router;
