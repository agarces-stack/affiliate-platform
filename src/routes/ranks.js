const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { evaluateAllRanks } = require('../services/rank-evaluator');

// Listar rangos de la empresa
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM ranks WHERE company_id = $1 ORDER BY rank_number ASC',
            [req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing ranks:', err);
        res.status(500).json({ error: 'Failed to list ranks' });
    }
});

// Actualizar nombre/config de un rango
router.put('/:rankNumber', authMiddleware, async (req, res) => {
    try {
        const { name, description, color, icon, can_recruit, max_recruit_depth,
                min_personal_sales, min_team_sales, min_direct_recruits } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await db.query(
            `UPDATE ranks SET name = $1, description = $2, color = $3, icon = $4,
             can_recruit = $5, max_recruit_depth = $6,
             min_personal_sales = $7, min_team_sales = $8, min_direct_recruits = $9
             WHERE company_id = $10 AND rank_number = $11 RETURNING *`,
            [name, description, color, icon,
             can_recruit !== undefined ? can_recruit : true,
             max_recruit_depth || 0,
             min_personal_sales || 0, min_team_sales || 0, min_direct_recruits || 0,
             req.user.company_id, req.params.rankNumber]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rank not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating rank:', err);
        res.status(500).json({ error: 'Failed to update rank' });
    }
});

// Configurar comisiones de un rango para una campaña
router.put('/:rankNumber/commissions/:campaignId', authMiddleware, async (req, res) => {
    try {
        const { direct_commission_percent, direct_commission_fixed,
                override_commission_percent, override_commission_fixed,
                override_by_level } = req.body;

        // Buscar rank_id
        const rank = await db.query(
            'SELECT id FROM ranks WHERE company_id = $1 AND rank_number = $2',
            [req.user.company_id, req.params.rankNumber]
        );
        if (rank.rows.length === 0) return res.status(404).json({ error: 'Rank not found' });

        // Verificar que la campaña pertenece a la empresa
        const camp = await db.query(
            'SELECT id FROM campaigns WHERE id = $1 AND company_id = $2',
            [req.params.campaignId, req.user.company_id]
        );
        if (camp.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

        const result = await db.query(
            `INSERT INTO rank_commissions (company_id, rank_id, campaign_id,
             direct_commission_percent, direct_commission_fixed,
             override_commission_percent, override_commission_fixed, override_by_level, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (rank_id, campaign_id) DO UPDATE SET
             direct_commission_percent = $4, direct_commission_fixed = $5,
             override_commission_percent = $6, override_commission_fixed = $7,
             override_by_level = $8, updated_at = NOW()
             RETURNING *`,
            [req.user.company_id, rank.rows[0].id, req.params.campaignId,
             direct_commission_percent || 0, direct_commission_fixed || 0,
             override_commission_percent || 0, override_commission_fixed || 0,
             JSON.stringify(override_by_level || [])]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error setting rank commissions:', err);
        res.status(500).json({ error: 'Failed to set rank commissions' });
    }
});

// Ver comisiones de todos los rangos para una campaña
router.get('/commissions/:campaignId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT r.rank_number, r.name, r.color, rc.*
             FROM ranks r
             LEFT JOIN rank_commissions rc ON r.id = rc.rank_id AND rc.campaign_id = $1
             WHERE r.company_id = $2
             ORDER BY r.rank_number ASC`,
            [req.params.campaignId, req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting rank commissions:', err);
        res.status(500).json({ error: 'Failed to get rank commissions' });
    }
});

// Asignar rango a un agente
router.patch('/assign/:affiliateId', authMiddleware, async (req, res) => {
    try {
        const { rank_number, reason } = req.body;
        if (!rank_number || rank_number < 1 || rank_number > 10) {
            return res.status(400).json({ error: 'Rank must be between 1 and 10' });
        }

        // Verificar que el agente pertenece a la empresa
        const aff = await db.query(
            'SELECT id, rank FROM affiliates WHERE id = $1 AND company_id = $2',
            [req.params.affiliateId, req.user.company_id]
        );
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        const oldRank = aff.rows[0].rank || 1;

        // Actualizar rango
        await db.query(
            'UPDATE affiliates SET rank = $1, updated_at = NOW() WHERE id = $2',
            [rank_number, req.params.affiliateId]
        );

        // Registrar en historial
        await db.query(
            `INSERT INTO rank_history (company_id, affiliate_id, old_rank, new_rank, changed_by, reason)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.user.company_id, req.params.affiliateId, oldRank, rank_number, req.user.id, reason || null]
        );

        res.json({ status: 'updated', old_rank: oldRank, new_rank: rank_number });
    } catch (err) {
        console.error('Error assigning rank:', err);
        res.status(500).json({ error: 'Failed to assign rank' });
    }
});

// Historial de rangos de un agente
router.get('/history/:affiliateId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT rh.*, u.name as changed_by_name,
             r_old.name as old_rank_name, r_new.name as new_rank_name
             FROM rank_history rh
             LEFT JOIN users u ON rh.changed_by = u.id
             LEFT JOIN ranks r_old ON r_old.company_id = rh.company_id AND r_old.rank_number = rh.old_rank
             LEFT JOIN ranks r_new ON r_new.company_id = rh.company_id AND r_new.rank_number = rh.new_rank
             WHERE rh.affiliate_id = $1 AND rh.company_id = $2
             ORDER BY rh.created_at DESC`,
            [req.params.affiliateId, req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting rank history:', err);
        res.status(500).json({ error: 'Failed to get rank history' });
    }
});

// Evaluar ascensos automáticos para toda la empresa
router.post('/evaluate', authMiddleware, async (req, res) => {
    try {
        const result = await evaluateAllRanks(req.user.company_id);
        res.json(result);
    } catch (err) {
        console.error('Error evaluating ranks:', err);
        res.status(500).json({ error: 'Failed to evaluate ranks' });
    }
});

// Obtener configuración de override de la empresa
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT override_mode, max_recruitment_depth FROM companies WHERE id = $1',
            [req.user.company_id]
        );
        res.json(result.rows[0] || { override_mode: 'fixed', max_recruitment_depth: 0 });
    } catch (err) {
        console.error('Error getting rank settings:', err);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Actualizar configuración de override
router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const { override_mode, max_recruitment_depth } = req.body;
        if (override_mode && !['fixed', 'difference'].includes(override_mode)) {
            return res.status(400).json({ error: 'Override mode must be "fixed" or "difference"' });
        }
        const result = await db.query(
            `UPDATE companies SET
             override_mode = COALESCE($1, override_mode),
             max_recruitment_depth = COALESCE($2, max_recruitment_depth)
             WHERE id = $3 RETURNING override_mode, max_recruitment_depth`,
            [override_mode, max_recruitment_depth, req.user.company_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating rank settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
