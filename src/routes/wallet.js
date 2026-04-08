const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { Notify } = require('../services/notifications');

// ============================================
// WALLET - Cuenta del afiliado (bank-like UX)
// ============================================

// Mi balance y resumen
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const affId = req.user.role === 'affiliate' ? req.user.id : req.query.affiliate_id;
        if (!affId) return res.status(400).json({ error: 'affiliate_id required' });

        const aff = await db.query(
            'SELECT balance, available_balance, pending_balance, total_commission FROM affiliates WHERE id = $1 AND company_id = $2',
            [affId, req.user.company_id]
        );
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        // Obtener config de payout de la empresa
        const comp = await db.query(
            'SELECT payout_schedule, min_payout_amount, payout_hold_days FROM companies WHERE id = $1',
            [req.user.company_id]
        );

        // Total retirado
        const withdrawn = await db.query(
            "SELECT COALESCE(SUM(amount),0) as total FROM payouts WHERE affiliate_id = $1 AND status IN ('completed','processing')",
            [affId]
        );

        // Retiros pendientes
        const pendingWithdrawals = await db.query(
            "SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM withdrawal_requests WHERE affiliate_id = $1 AND status IN ('pending','approved','processing')",
            [affId]
        );

        const a = aff.rows[0];
        const c = comp.rows[0] || {};

        res.json({
            balance: parseFloat(a.balance) || 0,
            available_balance: parseFloat(a.available_balance) || 0,
            pending_balance: parseFloat(a.pending_balance) || 0,
            total_earned: parseFloat(a.total_commission) || 0,
            total_withdrawn: parseFloat(withdrawn.rows[0].total) || 0,
            pending_withdrawals: parseFloat(pendingWithdrawals.rows[0].total) || 0,
            pending_withdrawal_count: parseInt(pendingWithdrawals.rows[0].count),
            can_withdraw: (parseFloat(a.available_balance) || 0) >= (parseFloat(c.min_payout_amount) || 50),
            min_withdrawal: parseFloat(c.min_payout_amount) || 50,
            payout_schedule: c.payout_schedule || 'on_request',
            hold_days: c.payout_hold_days || 0,
        });
    } catch (err) {
        console.error('Error getting balance:', err);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// Historial de movimientos (extracto bancario)
router.get('/movements', authMiddleware, async (req, res) => {
    try {
        const affId = req.user.role === 'affiliate' ? req.user.id : req.query.affiliate_id;
        if (!affId) return res.status(400).json({ error: 'affiliate_id required' });

        const { page = 1, limit = 30, type } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM account_movements WHERE affiliate_id = $1 AND company_id = $2';
        const params = [affId, req.user.company_id];

        if (type) { params.push(type); query += ` AND type = $${params.length}`; }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [result, count] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, type ? 3 : 2))
        ]);

        res.json({
            movements: result.rows,
            total: parseInt(count.rows[0].total),
            page: parseInt(page)
        });
    } catch (err) {
        console.error('Error getting movements:', err);
        res.status(500).json({ error: 'Failed to get movements' });
    }
});

// Solicitar retiro (el afiliado pide su dinero)
router.post('/withdraw', authMiddleware, async (req, res) => {
    try {
        const affId = req.user.role === 'affiliate' ? req.user.id : req.body.affiliate_id;
        if (!affId) return res.status(400).json({ error: 'affiliate_id required' });

        const { amount, payment_method, payment_details } = req.body;
        if (!amount || !payment_method) return res.status(400).json({ error: 'amount and payment_method required' });

        // Verificar config de la empresa
        const comp = await db.query(
            'SELECT min_payout_amount, payout_schedule FROM companies WHERE id = $1',
            [req.user.company_id]
        );
        const minAmount = parseFloat(comp.rows[0]?.min_payout_amount) || 50;

        if (parseFloat(amount) < minAmount) {
            return res.status(400).json({ error: `Minimum withdrawal is $${minAmount}` });
        }

        // Verificar balance disponible
        const aff = await db.query(
            'SELECT available_balance, payment_email FROM affiliates WHERE id = $1 AND company_id = $2',
            [affId, req.user.company_id]
        );
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        const available = parseFloat(aff.rows[0].available_balance) || 0;
        if (parseFloat(amount) > available) {
            return res.status(400).json({ error: `Insufficient available balance. Available: $${available.toFixed(2)}` });
        }

        // Verificar que no tenga retiros pendientes excesivos
        const pendingReqs = await db.query(
            "SELECT COALESCE(SUM(amount),0) as total FROM withdrawal_requests WHERE affiliate_id = $1 AND status IN ('pending','approved')",
            [affId]
        );
        const pendingTotal = parseFloat(pendingReqs.rows[0].total) || 0;
        if (parseFloat(amount) + pendingTotal > available) {
            return res.status(400).json({ error: `You have $${pendingTotal.toFixed(2)} in pending withdrawals. Available for new withdrawal: $${(available - pendingTotal).toFixed(2)}` });
        }

        // Crear solicitud
        const details = payment_details || {};
        if (payment_method === 'paypal' && !details.email) {
            details.email = aff.rows[0].payment_email;
        }

        const result = await db.query(
            `INSERT INTO withdrawal_requests (company_id, affiliate_id, amount, payment_method, payment_details)
             VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [req.user.company_id, affId, parseFloat(amount), payment_method, JSON.stringify(details)]
        );

        // Notificar al admin
        Notify.payoutCreated(req.user.company_id, affId, parseFloat(amount), payment_method);

        // Auto-approve si está configurado
        const autoApprove = comp.rows[0]?.auto_approve_payouts || false;
        if (autoApprove) {
            await db.query(
                "UPDATE withdrawal_requests SET status = 'approved', approved_at = NOW() WHERE id = $1",
                [result.rows[0].id]
            );
        }

        res.json({
            status: autoApprove ? 'approved' : 'pending',
            withdrawal_id: result.rows[0].id,
            amount: parseFloat(amount),
            payment_method
        });
    } catch (err) {
        console.error('Error creating withdrawal:', err);
        res.status(500).json({ error: 'Failed to create withdrawal request' });
    }
});

// Listar solicitudes de retiro (admin)
router.get('/withdrawals', authMiddleware, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = `SELECT wr.*, a.email, a.first_name, a.last_name, a.ref_id, a.payment_email,
                     a.available_balance
                     FROM withdrawal_requests wr
                     JOIN affiliates a ON wr.affiliate_id = a.id
                     WHERE wr.company_id = $1`;
        const params = [req.user.company_id];

        if (req.user.role === 'affiliate') {
            params.push(req.user.id);
            query += ` AND wr.affiliate_id = $${params.length}`;
        }
        if (status) { params.push(status); query += ` AND wr.status = $${params.length}`; }

        query += ` ORDER BY wr.requested_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing withdrawals:', err);
        res.status(500).json({ error: 'Failed to list withdrawals' });
    }
});

// Aprobar solicitud de retiro (admin)
router.patch('/withdrawals/:id/approve', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            "UPDATE withdrawal_requests SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2 AND company_id = $3 AND status = 'pending' RETURNING *",
            [req.user.id, req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found or already processed' });
        res.json({ status: 'approved' });
    } catch (err) {
        console.error('Error approving withdrawal:', err);
        res.status(500).json({ error: 'Failed to approve' });
    }
});

// Rechazar solicitud de retiro (admin)
router.patch('/withdrawals/:id/reject', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await db.query(
            "UPDATE withdrawal_requests SET status = 'rejected', admin_notes = $1 WHERE id = $2 AND company_id = $3 AND status = 'pending' RETURNING affiliate_id, amount",
            [reason || 'Rejected by admin', req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
        res.json({ status: 'rejected' });
    } catch (err) {
        console.error('Error rejecting withdrawal:', err);
        res.status(500).json({ error: 'Failed to reject' });
    }
});

// Config de payout schedule (admin)
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT payout_schedule, payout_day, min_payout_amount, payout_hold_days, auto_approve_payouts FROM companies WHERE id = $1',
            [req.user.company_id]
        );
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error('Error getting payout settings:', err);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const { payout_schedule, payout_day, min_payout_amount, payout_hold_days, auto_approve_payouts } = req.body;

        const validSchedules = ['on_request', 'weekly', 'biweekly', 'monthly'];
        if (payout_schedule && !validSchedules.includes(payout_schedule)) {
            return res.status(400).json({ error: `Valid schedules: ${validSchedules.join(', ')}` });
        }

        const result = await db.query(
            `UPDATE companies SET
             payout_schedule = COALESCE($1, payout_schedule),
             payout_day = COALESCE($2, payout_day),
             min_payout_amount = COALESCE($3, min_payout_amount),
             payout_hold_days = COALESCE($4, payout_hold_days),
             auto_approve_payouts = COALESCE($5, auto_approve_payouts)
             WHERE id = $6
             RETURNING payout_schedule, payout_day, min_payout_amount, payout_hold_days, auto_approve_payouts`,
            [payout_schedule, payout_day, min_payout_amount, payout_hold_days, auto_approve_payouts, req.user.company_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating payout settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
