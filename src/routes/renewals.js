const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');
const { Notify } = require('../services/notifications');

// Listar renovaciones con filtros
router.get('/', adminAuth, async (req, res) => {
    try {
        const { status, affiliate_id, campaign_id, policy_number, period_start, period_end, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let query = `SELECT r.*, a.email as affiliate_email, a.ref_id, a.first_name as affiliate_name,
                     c.name as campaign_name
                     FROM renewals r
                     LEFT JOIN affiliates a ON r.affiliate_id = a.id
                     LEFT JOIN campaigns c ON r.campaign_id = c.id
                     WHERE r.company_id = $1`;
        const params = [req.user.company_id];

        if (status) { params.push(status); query += ` AND r.status = $${params.length}`; }
        if (affiliate_id) { params.push(affiliate_id); query += ` AND r.affiliate_id = $${params.length}`; }
        if (campaign_id) { params.push(campaign_id); query += ` AND r.campaign_id = $${params.length}`; }
        if (policy_number) { params.push(policy_number); query += ` AND r.policy_number = $${params.length}`; }
        if (period_start) { params.push(period_start); query += ` AND r.period_start >= $${params.length}`; }
        if (period_end) { params.push(period_end); query += ` AND r.period_end <= $${params.length}`; }

        const countParams = [...params];
        const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');

        query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [result, count] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, countParams)
        ]);

        res.json({ renewals: result.rows, total: parseInt(count.rows[0].total), page: parseInt(page) });
    } catch (err) {
        console.error('Error listing renewals:', err);
        res.status(500).json({ error: 'Failed to list renewals' });
    }
});

// Stats de renovaciones
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const compId = req.user.company_id;
        const [total, pending, approved, thisMonth, revenue] = await Promise.all([
            db.query('SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as amount, COALESCE(SUM(commission),0) as commission FROM renewals WHERE company_id = $1', [compId]),
            db.query("SELECT COUNT(*) as c, COALESCE(SUM(commission),0) as commission FROM renewals WHERE company_id = $1 AND status = 'pending'", [compId]),
            db.query("SELECT COUNT(*) as c FROM renewals WHERE company_id = $1 AND status = 'approved'", [compId]),
            db.query("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as amount, COALESCE(SUM(commission),0) as commission FROM renewals WHERE company_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)", [compId]),
            db.query("SELECT COALESCE(SUM(amount),0) as total FROM renewals WHERE company_id = $1 AND status IN ('approved','paid')", [compId]),
        ]);
        res.json({
            total_renewals: parseInt(total.rows[0].c),
            total_amount: parseFloat(total.rows[0].amount),
            total_commission: parseFloat(total.rows[0].commission),
            pending_count: parseInt(pending.rows[0].c),
            pending_commission: parseFloat(pending.rows[0].commission),
            approved_count: parseInt(approved.rows[0].c),
            this_month_count: parseInt(thisMonth.rows[0].c),
            this_month_amount: parseFloat(thisMonth.rows[0].amount),
            this_month_commission: parseFloat(thisMonth.rows[0].commission),
            approved_revenue: parseFloat(revenue.rows[0].total),
        });
    } catch (err) {
        console.error('Error getting renewal stats:', err);
        res.status(500).json({ error: 'Failed to get renewal stats' });
    }
});

// Crear renovación manual
router.post('/', adminAuth, async (req, res) => {
    try {
        const { original_conversion_id, affiliate_id, ref_id, campaign_id,
                amount, policy_number, customer_email, customer_name,
                period_start, period_end, order_id, notes } = req.body;

        // Resolver affiliate
        let affId = affiliate_id;
        if (!affId && ref_id) {
            const aff = await db.query('SELECT id FROM affiliates WHERE ref_id = $1 AND company_id = $2', [ref_id, req.user.company_id]);
            if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });
            affId = aff.rows[0].id;
        }
        if (!affId) return res.status(400).json({ error: 'affiliate_id or ref_id required' });
        if (!amount) return res.status(400).json({ error: 'amount required' });

        // Contar renovaciones anteriores
        let renewalNumber = 1;
        if (original_conversion_id) {
            const prevCount = await db.query(
                'SELECT COUNT(*) as c FROM renewals WHERE original_conversion_id = $1',
                [original_conversion_id]
            );
            renewalNumber = parseInt(prevCount.rows[0].c) + 1;
        }

        // Calcular comisión de renovación
        let commission = 0;
        const affRank = await db.query('SELECT rank FROM affiliates WHERE id = $1', [affId]);
        const agentRank = affRank.rows[0]?.rank || 1;

        // Buscar comisión de renovación por rango
        const rankRenewal = await db.query(
            `SELECT rrc.* FROM rank_renewal_commissions rrc
             JOIN ranks r ON r.id = rrc.rank_id
             WHERE r.company_id = $1 AND r.rank_number = $2 AND rrc.campaign_id = $3`,
            [req.user.company_id, agentRank, campaign_id]
        );

        if (rankRenewal.rows.length > 0) {
            const rc = rankRenewal.rows[0];
            commission = (parseFloat(amount) * (parseFloat(rc.renewal_commission_percent) || 0) / 100)
                       + (parseFloat(rc.renewal_commission_fixed) || 0);
        } else if (campaign_id) {
            // Fallback: usar config de renovación de la campaña
            const camp = await db.query('SELECT renewal_commission_percent, renewal_commission_fixed FROM campaigns WHERE id = $1', [campaign_id]);
            if (camp.rows.length > 0) {
                const c = camp.rows[0];
                commission = (parseFloat(amount) * (parseFloat(c.renewal_commission_percent) || 0) / 100)
                           + (parseFloat(c.renewal_commission_fixed) || 0);
            }
        }

        const result = await db.query(
            `INSERT INTO renewals (company_id, original_conversion_id, affiliate_id, campaign_id,
             renewal_number, amount, commission, policy_number, customer_email, customer_name,
             order_id, period_start, period_end, notes, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
            [req.user.company_id, original_conversion_id || null, affId, campaign_id || null,
             renewalNumber, parseFloat(amount), commission, policy_number || null,
             customer_email || null, customer_name || null, order_id || null,
             period_start || null, period_end || null, notes || null, 'manual']
        );

        // Actualizar balance del agente
        if (commission > 0) {
            await db.query(
                'UPDATE affiliates SET balance = balance + $1, total_commission = total_commission + $1 WHERE id = $2',
                [commission, affId]
            );
            Notify.newConversion(req.user.company_id, affId, parseFloat(amount), commission);
        }

        res.json({ status: 'ok', renewal_id: result.rows[0].id, commission, renewal_number: renewalNumber });
    } catch (err) {
        console.error('Error creating renewal:', err);
        res.status(500).json({ error: 'Failed to create renewal' });
    }
});

// Aprobar renovación
router.patch('/:id/approve', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            "UPDATE renewals SET status = 'approved', approved_at = NOW() WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING id",
            [req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Renewal not found or already processed' });
        res.json({ status: 'approved' });
    } catch (err) {
        console.error('Error approving renewal:', err);
        res.status(500).json({ error: 'Failed to approve renewal' });
    }
});

// Cancelar renovación (revertir comisión)
router.patch('/:id/cancel', adminAuth, async (req, res) => {
    try {
        const renewal = await db.query(
            "SELECT * FROM renewals WHERE id = $1 AND company_id = $2 AND status IN ('pending','approved')",
            [req.params.id, req.user.company_id]
        );
        if (renewal.rows.length === 0) return res.status(404).json({ error: 'Renewal not found or already processed' });

        const r = renewal.rows[0];
        await db.query("UPDATE renewals SET status = 'cancelled' WHERE id = $1", [req.params.id]);

        if (parseFloat(r.commission) > 0) {
            await db.query(
                'UPDATE affiliates SET balance = GREATEST(balance - $1, 0), total_commission = GREATEST(total_commission - $1, 0) WHERE id = $2',
                [parseFloat(r.commission), r.affiliate_id]
            );
        }

        res.json({ status: 'cancelled', reverted_commission: parseFloat(r.commission) });
    } catch (err) {
        console.error('Error cancelling renewal:', err);
        res.status(500).json({ error: 'Failed to cancel renewal' });
    }
});

// Upcoming renewals (pólizas que vencen pronto)
router.get('/upcoming', adminAuth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        // Buscar conversiones con renewal_enabled que no tienen renovación reciente
        const result = await db.query(
            `SELECT c.id as conversion_id, c.order_id, c.amount, c.customer_email, c.customer_name,
                    c.created_at as original_date, a.email as affiliate_email, a.ref_id, a.first_name,
                    ca.name as campaign_name, ca.renewal_months,
                    (SELECT MAX(r.created_at) FROM renewals r WHERE r.original_conversion_id = c.id) as last_renewal,
                    (SELECT COUNT(*) FROM renewals r WHERE r.original_conversion_id = c.id) as renewal_count
             FROM conversions c
             JOIN campaigns ca ON c.campaign_id = ca.id AND ca.renewal_enabled = true
             JOIN affiliates a ON c.affiliate_id = a.id
             WHERE c.company_id = $1 AND c.status IN ('approved','paid')
             AND (
                 -- Nunca renovada y ya pasó el período
                 (NOT EXISTS (SELECT 1 FROM renewals r WHERE r.original_conversion_id = c.id)
                  AND c.created_at + (ca.renewal_months || ' months')::INTERVAL <= NOW() + ($2 || ' days')::INTERVAL)
                 OR
                 -- Última renovación + período está próxima
                 (EXISTS (SELECT 1 FROM renewals r WHERE r.original_conversion_id = c.id)
                  AND (SELECT MAX(r.created_at) FROM renewals r WHERE r.original_conversion_id = c.id)
                      + (ca.renewal_months || ' months')::INTERVAL <= NOW() + ($2 || ' days')::INTERVAL)
             )
             ORDER BY c.created_at ASC
             LIMIT 100`,
            [req.user.company_id, days]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting upcoming renewals:', err);
        res.status(500).json({ error: 'Failed to get upcoming renewals' });
    }
});

module.exports = router;
