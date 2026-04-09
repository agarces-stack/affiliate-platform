const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { adminAuth } = require('../middleware/auth');

// Listar grupos
router.get('/', adminAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cg.*,
                    a.email as manager_email, a.first_name as manager_name, a.ref_id as manager_ref_id,
                    (SELECT COUNT(*) FROM affiliates WHERE commission_group_id = cg.id) as member_count
             FROM commission_groups cg
             LEFT JOIN affiliates a ON cg.manager_id = a.id
             WHERE cg.company_id = $1 ORDER BY cg.name ASC`,
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing groups:', err);
        res.status(500).json({ error: 'Failed to list groups' });
    }
});

// Obtener grupo con miembros
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const group = await db.query(
            'SELECT * FROM commission_groups WHERE id = $1 AND company_id = $2',
            [req.params.id, req.user.company_id]
        );
        if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        const members = await db.query(
            `SELECT id, ref_id, email, first_name, last_name, rank, status, balance,
                    total_conversions, total_revenue, total_commission
             FROM affiliates WHERE commission_group_id = $1 AND company_id = $2
             ORDER BY total_revenue DESC`,
            [req.params.id, req.user.company_id]
        );

        const commissions = await db.query(
            `SELECT gc.*, c.name as campaign_name, p.name as product_name
             FROM group_commissions gc
             LEFT JOIN campaigns c ON gc.campaign_id = c.id
             LEFT JOIN products p ON gc.product_id = p.id
             WHERE gc.group_id = $1`,
            [req.params.id]
        );

        res.json({ ...group.rows[0], members: members.rows, commissions: commissions.rows });
    } catch (err) {
        console.error('Error getting group:', err);
        res.status(500).json({ error: 'Failed to get group' });
    }
});

// Crear grupo
router.post('/', adminAuth, async (req, res) => {
    try {
        const { name, description, default_commission_percent, default_commission_fixed,
                override_commission_percent, override_commission_fixed, manager_id,
                manager_commission_type, manager_commission_value, payout_schedule,
                min_payout_amount, color } = req.body;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await db.query(
            `INSERT INTO commission_groups (company_id, name, description,
             default_commission_percent, default_commission_fixed,
             override_commission_percent, override_commission_fixed,
             manager_id, manager_commission_type, manager_commission_value,
             payout_schedule, min_payout_amount, color)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [req.user.company_id, name, description || null,
             default_commission_percent || 0, default_commission_fixed || 0,
             override_commission_percent || 0, override_commission_fixed || 0,
             manager_id || null, manager_commission_type || 'commission_based',
             manager_commission_value || 0, payout_schedule || null,
             min_payout_amount || null, color || '#3b82f6']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// Actualizar grupo
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { name, description, default_commission_percent, default_commission_fixed,
                override_commission_percent, override_commission_fixed, manager_id,
                manager_commission_type, manager_commission_value, payout_schedule,
                min_payout_amount, color, is_active } = req.body;

        const result = await db.query(
            `UPDATE commission_groups SET
             name=COALESCE($1,name), description=COALESCE($2,description),
             default_commission_percent=COALESCE($3,default_commission_percent),
             default_commission_fixed=COALESCE($4,default_commission_fixed),
             override_commission_percent=COALESCE($5,override_commission_percent),
             override_commission_fixed=COALESCE($6,override_commission_fixed),
             manager_id=COALESCE($7,manager_id),
             manager_commission_type=COALESCE($8,manager_commission_type),
             manager_commission_value=COALESCE($9,manager_commission_value),
             payout_schedule=$10, min_payout_amount=$11,
             color=COALESCE($12,color), is_active=COALESCE($13,is_active)
             WHERE id=$14 AND company_id=$15 RETURNING *`,
            [name, description, default_commission_percent, default_commission_fixed,
             override_commission_percent, override_commission_fixed, manager_id,
             manager_commission_type, manager_commission_value, payout_schedule,
             min_payout_amount, color, is_active, req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating group:', err);
        res.status(500).json({ error: 'Failed to update group' });
    }
});

// Asignar afiliado a grupo
router.post('/:id/members', adminAuth, async (req, res) => {
    try {
        const { affiliate_ids } = req.body;
        if (!affiliate_ids?.length) return res.status(400).json({ error: 'affiliate_ids array required' });

        // Verificar que el grupo pertenece a la empresa
        const group = await db.query('SELECT id FROM commission_groups WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        if (group.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        const updated = await db.query(
            'UPDATE affiliates SET commission_group_id = $1 WHERE id = ANY($2) AND company_id = $3 RETURNING id',
            [req.params.id, affiliate_ids, req.user.company_id]
        );
        res.json({ assigned: updated.rowCount });
    } catch (err) {
        console.error('Error assigning members:', err);
        res.status(500).json({ error: 'Failed to assign members' });
    }
});

// Remover afiliado del grupo
router.delete('/:id/members/:affiliateId', adminAuth, async (req, res) => {
    try {
        await db.query(
            'UPDATE affiliates SET commission_group_id = NULL WHERE id = $1 AND commission_group_id = $2 AND company_id = $3',
            [req.params.affiliateId, req.params.id, req.user.company_id]
        );
        res.json({ status: 'removed' });
    } catch (err) {
        console.error('Error removing member:', err);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// Configurar comisión del grupo por campaña/producto
router.post('/:id/commissions', adminAuth, async (req, res) => {
    try {
        const { campaign_id, product_id, commission_percent, commission_fixed } = req.body;

        // Verify group belongs to company
        const groupCheck = await db.query('SELECT id FROM commission_groups WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
        if (groupCheck.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        const result = await db.query(
            `INSERT INTO group_commissions (group_id, campaign_id, product_id, commission_percent, commission_fixed)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (group_id, campaign_id, product_id) DO UPDATE SET
             commission_percent = $4, commission_fixed = $5
             RETURNING *`,
            [req.params.id, campaign_id || null, product_id || null,
             commission_percent || 0, commission_fixed || 0]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error setting group commission:', err);
        res.status(500).json({ error: 'Failed to set commission' });
    }
});

// Stats del grupo
router.get('/:id/stats', adminAuth, async (req, res) => {
    try {
        const gid = req.params.id;
        // Verify group belongs to company
        const groupCheck = await db.query('SELECT id FROM commission_groups WHERE id = $1 AND company_id = $2', [gid, req.user.company_id]);
        if (groupCheck.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        const [members, revenue, commissions] = await Promise.all([
            db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='approved') as active FROM affiliates WHERE commission_group_id = $1 AND company_id = $2", [gid, req.user.company_id]),
            db.query("SELECT COALESCE(SUM(c.amount),0) as revenue, COALESCE(SUM(c.commission),0) as commission, COUNT(*) as sales FROM conversions c JOIN affiliates a ON c.affiliate_id = a.id WHERE a.commission_group_id = $1 AND a.company_id = $2", [gid, req.user.company_id]),
            db.query("SELECT COALESCE(SUM(balance),0) as total_balance FROM affiliates WHERE commission_group_id = $1 AND company_id = $2", [gid, req.user.company_id]),
        ]);
        res.json({
            members: parseInt(members.rows[0].total),
            active_members: parseInt(members.rows[0].active),
            total_revenue: parseFloat(revenue.rows[0].revenue),
            total_commission: parseFloat(revenue.rows[0].commission),
            total_sales: parseInt(revenue.rows[0].sales),
            total_balance: parseFloat(commissions.rows[0].total_balance),
        });
    } catch (err) {
        console.error('Error getting group stats:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
