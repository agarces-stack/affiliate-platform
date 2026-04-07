const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// Árbol de equipo de un agente (recursivo)
router.get('/:id/tree', authMiddleware, async (req, res) => {
    try {
        const affId = req.params.id;
        const maxDepth = parseInt(req.query.depth) || 10;

        // Verificar que el agente pertenece a la empresa
        const aff = await db.query(
            'SELECT id FROM affiliates WHERE id = $1 AND company_id = $2',
            [affId, req.user.company_id]
        );
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        // Query recursiva para obtener todo el árbol
        const tree = await db.query(
            `WITH RECURSIVE team_tree AS (
                -- Base: directos del agente
                SELECT a.id, a.ref_id, a.email, a.first_name, a.last_name,
                       a.rank, a.status, a.total_clicks, a.total_conversions,
                       a.total_revenue, a.total_commission, a.balance,
                       a.parent_affiliate_id, a.created_at,
                       1 as depth
                FROM affiliates a
                WHERE a.parent_affiliate_id = $1 AND a.company_id = $2

                UNION ALL

                -- Recursivo: sub-equipos
                SELECT a.id, a.ref_id, a.email, a.first_name, a.last_name,
                       a.rank, a.status, a.total_clicks, a.total_conversions,
                       a.total_revenue, a.total_commission, a.balance,
                       a.parent_affiliate_id, a.created_at,
                       tt.depth + 1
                FROM affiliates a
                INNER JOIN team_tree tt ON a.parent_affiliate_id = tt.id
                WHERE a.company_id = $2 AND tt.depth < $3
            )
            SELECT tt.*, r.name as rank_name, r.color as rank_color
            FROM team_tree tt
            LEFT JOIN ranks r ON r.company_id = $2 AND r.rank_number = tt.rank
            ORDER BY tt.depth ASC, tt.created_at ASC`,
            [affId, req.user.company_id, maxDepth]
        );

        // Construir árbol jerárquico
        const flat = tree.rows;
        const nodeMap = {};
        const roots = [];

        flat.forEach(node => {
            nodeMap[node.id] = { ...node, children: [] };
        });

        flat.forEach(node => {
            if (node.parent_affiliate_id === parseInt(affId)) {
                roots.push(nodeMap[node.id]);
            } else if (nodeMap[node.parent_affiliate_id]) {
                nodeMap[node.parent_affiliate_id].children.push(nodeMap[node.id]);
            }
        });

        res.json({ team: roots, total_members: flat.length });
    } catch (err) {
        console.error('Error getting team tree:', err);
        res.status(500).json({ error: 'Failed to get team tree' });
    }
});

// Stats del equipo por nivel
router.get('/:id/stats', authMiddleware, async (req, res) => {
    try {
        const affId = req.params.id;

        // Verificar pertenencia
        const aff = await db.query(
            'SELECT id, rank, balance, total_commission FROM affiliates WHERE id = $1 AND company_id = $2',
            [affId, req.user.company_id]
        );
        if (aff.rows.length === 0) return res.status(404).json({ error: 'Affiliate not found' });

        // Stats por nivel de profundidad
        const levelStats = await db.query(
            `WITH RECURSIVE team_tree AS (
                SELECT a.id, a.status, a.total_conversions, a.total_revenue, a.total_commission,
                       1 as depth
                FROM affiliates a
                WHERE a.parent_affiliate_id = $1 AND a.company_id = $2

                UNION ALL

                SELECT a.id, a.status, a.total_conversions, a.total_revenue, a.total_commission,
                       tt.depth + 1
                FROM affiliates a
                INNER JOIN team_tree tt ON a.parent_affiliate_id = tt.id
                WHERE a.company_id = $2 AND tt.depth < 10
            )
            SELECT depth as level,
                   COUNT(*) as members,
                   COUNT(*) FILTER (WHERE status = 'approved') as active_members,
                   COALESCE(SUM(total_conversions), 0) as total_conversions,
                   COALESCE(SUM(total_revenue), 0) as total_revenue,
                   COALESCE(SUM(total_commission), 0) as total_commission
            FROM team_tree
            GROUP BY depth
            ORDER BY depth`,
            [affId, req.user.company_id]
        );

        // Totales generales del equipo
        const totals = await db.query(
            `WITH RECURSIVE team_tree AS (
                SELECT a.id, a.total_conversions, a.total_revenue, a.total_commission
                FROM affiliates a
                WHERE a.parent_affiliate_id = $1 AND a.company_id = $2
                UNION ALL
                SELECT a.id, a.total_conversions, a.total_revenue, a.total_commission
                FROM affiliates a
                INNER JOIN team_tree tt ON a.parent_affiliate_id = tt.id
                WHERE a.company_id = $2
            )
            SELECT COUNT(*) as total_members,
                   COALESCE(SUM(total_conversions), 0) as team_conversions,
                   COALESCE(SUM(total_revenue), 0) as team_revenue,
                   COALESCE(SUM(total_commission), 0) as team_commission
            FROM team_tree`,
            [affId, req.user.company_id]
        );

        // Comisiones MLM recibidas
        const mlmEarnings = await db.query(
            `SELECT COALESCE(SUM(commission), 0) as total_mlm_earnings,
                    COUNT(*) as total_mlm_transactions
             FROM mlm_commissions WHERE affiliate_id = $1`,
            [affId]
        );

        // Reclutas directos
        const directRecruits = await db.query(
            `SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'approved') as active
             FROM affiliates WHERE parent_affiliate_id = $1 AND company_id = $2`,
            [affId, req.user.company_id]
        );

        res.json({
            personal: {
                rank: aff.rows[0].rank,
                balance: parseFloat(aff.rows[0].balance) || 0,
                total_commission: parseFloat(aff.rows[0].total_commission) || 0,
            },
            direct_recruits: {
                total: parseInt(directRecruits.rows[0].total),
                active: parseInt(directRecruits.rows[0].active),
            },
            team_totals: {
                total_members: parseInt(totals.rows[0].total_members),
                team_conversions: parseInt(totals.rows[0].team_conversions),
                team_revenue: parseFloat(totals.rows[0].team_revenue) || 0,
                team_commission: parseFloat(totals.rows[0].team_commission) || 0,
            },
            mlm_earnings: {
                total: parseFloat(mlmEarnings.rows[0].total_mlm_earnings) || 0,
                transactions: parseInt(mlmEarnings.rows[0].total_mlm_transactions),
            },
            levels: levelStats.rows,
        });
    } catch (err) {
        console.error('Error getting team stats:', err);
        res.status(500).json({ error: 'Failed to get team stats' });
    }
});

// Top performers del equipo
router.get('/:id/top', authMiddleware, async (req, res) => {
    try {
        const affId = req.params.id;
        const limit = parseInt(req.query.limit) || 10;

        const result = await db.query(
            `WITH RECURSIVE team_tree AS (
                SELECT a.id FROM affiliates a
                WHERE a.parent_affiliate_id = $1 AND a.company_id = $2
                UNION ALL
                SELECT a.id FROM affiliates a
                INNER JOIN team_tree tt ON a.parent_affiliate_id = tt.id
                WHERE a.company_id = $2
            )
            SELECT a.id, a.ref_id, a.email, a.first_name, a.last_name,
                   a.rank, a.total_conversions, a.total_revenue, a.total_commission,
                   r.name as rank_name, r.color as rank_color
            FROM affiliates a
            INNER JOIN team_tree tt ON a.id = tt.id
            LEFT JOIN ranks r ON r.company_id = $2 AND r.rank_number = a.rank
            WHERE a.status = 'approved'
            ORDER BY a.total_revenue DESC
            LIMIT $3`,
            [affId, req.user.company_id, limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting top performers:', err);
        res.status(500).json({ error: 'Failed to get top performers' });
    }
});

module.exports = router;
