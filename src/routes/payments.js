const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { getPayPalService } = require('../services/paypal');
const { Notify } = require('../services/notifications');

// ============================================
// PAYMENT PROVIDERS CONFIG
// ============================================

// Listar proveedores configurados
router.get('/providers', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, provider, name, is_active, is_default, min_payout, max_payout,
                    fee_percent, fee_fixed, total_sent, total_transactions, last_used_at,
                    config->>'mode' as mode
             FROM payment_providers WHERE company_id = $1 ORDER BY is_default DESC, created_at ASC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing providers:', err);
        res.status(500).json({ error: 'Failed to list providers' });
    }
});

// Configurar proveedor de pago
router.post('/providers', authMiddleware, async (req, res) => {
    try {
        const { provider, name, config, min_payout, max_payout, fee_percent, fee_fixed, is_default } = req.body;
        if (!provider || !name) return res.status(400).json({ error: 'Provider and name required' });

        const validProviders = ['paypal', 'wire', 'zelle', 'crypto', 'manual'];
        if (!validProviders.includes(provider)) return res.status(400).json({ error: `Valid providers: ${validProviders.join(', ')}` });

        // Si es default, quitar default a los demás
        if (is_default) {
            await db.query('UPDATE payment_providers SET is_default = false WHERE company_id = $1', [req.user.company_id]);
        }

        const result = await db.query(
            `INSERT INTO payment_providers (company_id, provider, name, config, min_payout, max_payout, fee_percent, fee_fixed, is_default)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, provider, name`,
            [req.user.company_id, provider, name, JSON.stringify(config || {}),
             min_payout || 10, max_payout || 10000, fee_percent || 0, fee_fixed || 0, is_default || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating provider:', err);
        res.status(500).json({ error: 'Failed to create provider' });
    }
});

// Actualizar proveedor
router.put('/providers/:id', authMiddleware, async (req, res) => {
    try {
        const { name, config, is_active, is_default, min_payout, max_payout, fee_percent, fee_fixed } = req.body;
        if (is_default) {
            await db.query('UPDATE payment_providers SET is_default = false WHERE company_id = $1', [req.user.company_id]);
        }
        const result = await db.query(
            `UPDATE payment_providers SET name=COALESCE($1,name), config=COALESCE($2,config),
             is_active=COALESCE($3,is_active), is_default=COALESCE($4,is_default),
             min_payout=COALESCE($5,min_payout), max_payout=COALESCE($6,max_payout),
             fee_percent=COALESCE($7,fee_percent), fee_fixed=COALESCE($8,fee_fixed)
             WHERE id=$9 AND company_id=$10 RETURNING *`,
            [name, config ? JSON.stringify(config) : null, is_active, is_default,
             min_payout, max_payout, fee_percent, fee_fixed, req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating provider:', err);
        res.status(500).json({ error: 'Failed to update provider' });
    }
});

// ============================================
// PROCESS PAYMENTS
// ============================================

// Procesar pago individual via PayPal
router.post('/send-paypal/:payoutId', authMiddleware, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener payout
        const payout = await client.query(
            "SELECT p.*, a.email, a.payment_email, a.first_name FROM payouts p JOIN affiliates a ON p.affiliate_id = a.id WHERE p.id = $1 AND p.company_id = $2 AND p.status = 'pending'",
            [req.params.payoutId, req.user.company_id]
        );
        if (payout.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payout not found or already processed' });
        }
        const p = payout.rows[0];
        const recipientEmail = p.payment_email || p.email;

        if (!recipientEmail) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Affiliate has no payment email configured' });
        }

        // Obtener servicio PayPal
        const paypal = await getPayPalService(req.user.company_id);
        if (!paypal) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'PayPal not configured. Go to Payments > Providers to set up.' });
        }

        // Calcular fee
        const provider = await client.query(
            "SELECT * FROM payment_providers WHERE company_id = $1 AND provider = 'paypal' AND is_active = true",
            [req.user.company_id]
        );
        const prov = provider.rows[0];
        const fee = (parseFloat(p.amount) * (parseFloat(prov?.fee_percent) || 0) / 100) + (parseFloat(prov?.fee_fixed) || 0);
        const netAmount = parseFloat(p.amount) - fee;

        // Enviar pago
        const result = await paypal.sendPayout(
            recipientEmail, netAmount, 'USD',
            `Commission payout - ${p.first_name || recipientEmail}`,
            `payout_${p.id}`
        );

        // Registrar transacción
        await client.query(
            `INSERT INTO payment_transactions (company_id, payout_id, provider_id, affiliate_id,
             amount, fee, net_amount, recipient_email, status, provider_batch_id, provider_response, sent_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
            [req.user.company_id, p.id, prov?.id, p.affiliate_id,
             p.amount, fee, netAmount, recipientEmail,
             'processing', result.batch_id, JSON.stringify(result.response)]
        );

        // Marcar payout como processing
        await client.query(
            "UPDATE payouts SET status = 'processing', payment_method = 'paypal', transaction_id = $1 WHERE id = $2",
            [result.batch_id, p.id]
        );

        // Actualizar stats del provider
        await client.query(
            'UPDATE payment_providers SET total_sent = total_sent + $1, total_transactions = total_transactions + 1, last_used_at = NOW() WHERE id = $2',
            [netAmount, prov?.id]
        );

        await client.query('COMMIT');

        Notify.payoutCreated(req.user.company_id, p.affiliate_id, netAmount, 'PayPal');

        res.json({
            status: 'processing',
            batch_id: result.batch_id,
            amount: parseFloat(p.amount),
            fee, net_amount: netAmount,
            recipient: recipientEmail
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PayPal payout error:', err);
        res.status(500).json({ error: 'PayPal payout failed: ' + err.message });
    } finally {
        client.release();
    }
});

// Procesar pago como Wire/ACH (registrar datos bancarios)
router.post('/send-wire/:payoutId', authMiddleware, async (req, res) => {
    try {
        const { bank_name, account_number, routing_number, swift_code, account_holder, notes } = req.body;

        const payout = await db.query(
            "SELECT p.*, a.email, a.first_name FROM payouts p JOIN affiliates a ON p.affiliate_id = a.id WHERE p.id = $1 AND p.company_id = $2 AND p.status = 'pending'",
            [req.params.payoutId, req.user.company_id]
        );
        if (payout.rows.length === 0) return res.status(404).json({ error: 'Payout not found or already processed' });
        const p = payout.rows[0];

        // Registrar transacción wire
        await db.query(
            `INSERT INTO payment_transactions (company_id, payout_id, affiliate_id,
             amount, fee, net_amount, recipient_account, status, sent_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
            [req.user.company_id, p.id, p.affiliate_id,
             p.amount, 0, p.amount,
             JSON.stringify({ bank_name, account_number, routing_number, swift_code, account_holder, notes }),
             'processing']
        );

        await db.query(
            "UPDATE payouts SET status = 'processing', payment_method = 'wire' WHERE id = $1",
            [p.id]
        );

        Notify.payoutCreated(req.user.company_id, p.affiliate_id, parseFloat(p.amount), 'Wire Transfer');

        res.json({ status: 'processing', amount: parseFloat(p.amount), method: 'wire' });
    } catch (err) {
        console.error('Wire payout error:', err);
        res.status(500).json({ error: 'Failed to process wire transfer' });
    }
});

// Confirmar que un wire/manual fue completado
router.patch('/confirm/:transactionId', authMiddleware, async (req, res) => {
    try {
        const { transaction_id_external } = req.body;
        const txn = await db.query(
            "SELECT * FROM payment_transactions WHERE id = $1 AND company_id = $2 AND status = 'processing'",
            [req.params.transactionId, req.user.company_id]
        );
        if (txn.rows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

        await db.query(
            "UPDATE payment_transactions SET status = 'completed', provider_transaction_id = $1, completed_at = NOW() WHERE id = $2",
            [transaction_id_external || null, req.params.transactionId]
        );

        // Marcar payout como completado
        await db.query(
            "UPDATE payouts SET status = 'completed', transaction_id = $1, processed_at = NOW() WHERE id = $2",
            [transaction_id_external || 'confirmed', txn.rows[0].payout_id]
        );

        Notify.payoutCompleted(req.user.company_id, txn.rows[0].affiliate_id, parseFloat(txn.rows[0].amount));

        res.json({ status: 'completed' });
    } catch (err) {
        console.error('Confirm payment error:', err);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

// Verificar estado de batch PayPal
router.get('/check-paypal/:batchId', authMiddleware, async (req, res) => {
    try {
        const paypal = await getPayPalService(req.user.company_id);
        if (!paypal) return res.status(400).json({ error: 'PayPal not configured' });

        const status = await paypal.checkBatchStatus(req.params.batchId);

        // Actualizar transacciones locales
        if (status.batch_header?.batch_status === 'SUCCESS') {
            await db.query(
                "UPDATE payment_transactions SET status = 'completed', completed_at = NOW(), provider_response = $1 WHERE provider_batch_id = $2 AND company_id = $3",
                [JSON.stringify(status), req.params.batchId, req.user.company_id]
            );
            // Marcar payouts como completados
            const txns = await db.query(
                "SELECT payout_id, affiliate_id, amount FROM payment_transactions WHERE provider_batch_id = $1 AND company_id = $2",
                [req.params.batchId, req.user.company_id]
            );
            for (const t of txns.rows) {
                await db.query("UPDATE payouts SET status = 'completed', processed_at = NOW() WHERE id = $1", [t.payout_id]);
                Notify.payoutCompleted(req.user.company_id, t.affiliate_id, parseFloat(t.amount));
            }
        }

        res.json(status);
    } catch (err) {
        console.error('PayPal check error:', err);
        res.status(500).json({ error: 'Failed to check PayPal status' });
    }
});

// Historial de transacciones
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = `SELECT pt.*, a.email as affiliate_email, a.first_name, pp.provider, pp.name as provider_name
                     FROM payment_transactions pt
                     LEFT JOIN affiliates a ON pt.affiliate_id = a.id
                     LEFT JOIN payment_providers pp ON pt.provider_id = pp.id
                     WHERE pt.company_id = $1`;
        const params = [req.user.company_id];
        if (status) { params.push(status); query += ` AND pt.status = $${params.length}`; }
        query += ` ORDER BY pt.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing transactions:', err);
        res.status(500).json({ error: 'Failed to list transactions' });
    }
});

module.exports = router;
