const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Listar payouts
router.get('/', authMiddleware, async (req, res) => {
    const result = await db.query(
        `SELECT p.*, a.email as affiliate_email, a.ref_id, a.first_name
         FROM payouts p JOIN affiliates a ON p.affiliate_id = a.id
         WHERE p.company_id = $1 ORDER BY p.created_at DESC`,
        [req.user.company_id]
    );
    res.json(result.rows);
});

// Crear payout
router.post('/', authMiddleware, async (req, res) => {
    const { affiliate_id, amount, payment_method, notes } = req.body;

    // Verificar balance
    const aff = await db.query('SELECT balance FROM affiliates WHERE id = $1', [affiliate_id]);
    if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });
    if (parseFloat(aff.rows[0].balance) < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const result = await db.query(
        `INSERT INTO payouts (company_id, affiliate_id, amount, payment_method, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.user.company_id, affiliate_id, amount, payment_method, notes, 'pending']
    );

    // Descontar del balance
    await db.query('UPDATE affiliates SET balance = balance - $1 WHERE id = $2', [amount, affiliate_id]);

    res.json(result.rows[0]);
});

// Marcar payout como completado
router.patch('/:id/complete', authMiddleware, async (req, res) => {
    const { transaction_id } = req.body;
    await db.query(
        `UPDATE payouts SET status = 'completed', transaction_id = $1, processed_at = NOW()
         WHERE id = $2 AND company_id = $3`,
        [transaction_id, req.params.id, req.user.company_id]
    );
    res.json({ status: 'completed' });
});

module.exports = router;
