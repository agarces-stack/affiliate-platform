const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// ============================================
// PRODUCTS (Catálogo)
// ============================================

// Listar productos (opcionalmente por campaña)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { campaign_id, category, status, include_goals } = req.query;
        let query = `SELECT p.*, c.name as campaign_name
                     FROM products p LEFT JOIN campaigns c ON p.campaign_id = c.id
                     WHERE p.company_id = $1`;
        const params = [req.user.company_id];

        if (campaign_id) { params.push(campaign_id); query += ` AND p.campaign_id = $${params.length}`; }
        if (category) { params.push(category); query += ` AND p.category = $${params.length}`; }
        if (status) { params.push(status); query += ` AND p.status = $${params.length}`; }
        else query += " AND p.status = 'active'";

        query += ' ORDER BY p.sort_order ASC, p.name ASC';
        const result = await db.query(query, params);

        let products = result.rows;

        // Opcionalmente incluir goals de cada producto
        if (include_goals === 'true') {
            for (let prod of products) {
                const goals = await db.query(
                    'SELECT * FROM goals WHERE product_id = $1 AND is_active = true ORDER BY step_order ASC',
                    [prod.id]
                );
                prod.goals = goals.rows;
            }
        }

        res.json(products);
    } catch (err) {
        console.error('Error listing products:', err);
        res.status(500).json({ error: 'Failed to list products' });
    }
});

// Obtener producto con goals
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const prod = await db.query(
            'SELECT p.*, c.name as campaign_name FROM products p LEFT JOIN campaigns c ON p.campaign_id = c.id WHERE p.id = $1 AND p.company_id = $2',
            [req.params.id, req.user.company_id]
        );
        if (prod.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

        const goals = await db.query(
            'SELECT * FROM goals WHERE product_id = $1 ORDER BY step_order ASC',
            [req.params.id]
        );

        res.json({ ...prod.rows[0], goals: goals.rows });
    } catch (err) {
        console.error('Error getting product:', err);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// Crear producto
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { campaign_id, sku, name, description, category, price, commission_type,
                commission_amount, commission_percent, is_recurring, renewal_period_months,
                renewal_commission_percent, renewal_commission_fixed, image_url, custom_fields } = req.body;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await db.query(
            `INSERT INTO products (company_id, campaign_id, sku, name, description, category, price,
             commission_type, commission_amount, commission_percent, is_recurring, renewal_period_months,
             renewal_commission_percent, renewal_commission_fixed, image_url, custom_fields)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
            [req.user.company_id, campaign_id || null, sku || null, name, description || null,
             category || null, price || 0, commission_type || 'hybrid',
             commission_amount || 0, commission_percent || 0,
             is_recurring || false, renewal_period_months || 12,
             renewal_commission_percent || 0, renewal_commission_fixed || 0,
             image_url || null, JSON.stringify(custom_fields || {})]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Actualizar producto
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, description, category, sku, price, commission_type, commission_amount,
                commission_percent, is_recurring, renewal_period_months, renewal_commission_percent,
                renewal_commission_fixed, status, image_url, sort_order } = req.body;

        const result = await db.query(
            `UPDATE products SET name=COALESCE($1,name), description=COALESCE($2,description),
             category=COALESCE($3,category), sku=COALESCE($4,sku), price=COALESCE($5,price),
             commission_type=COALESCE($6,commission_type), commission_amount=COALESCE($7,commission_amount),
             commission_percent=COALESCE($8,commission_percent), is_recurring=COALESCE($9,is_recurring),
             renewal_period_months=COALESCE($10,renewal_period_months),
             renewal_commission_percent=COALESCE($11,renewal_commission_percent),
             renewal_commission_fixed=COALESCE($12,renewal_commission_fixed),
             status=COALESCE($13,status), image_url=COALESCE($14,image_url),
             sort_order=COALESCE($15,sort_order), updated_at=NOW()
             WHERE id=$16 AND company_id=$17 RETURNING *`,
            [name, description, category, sku, price, commission_type, commission_amount,
             commission_percent, is_recurring, renewal_period_months,
             renewal_commission_percent, renewal_commission_fixed, status, image_url, sort_order,
             req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Categorías existentes
router.get('/meta/categories', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT DISTINCT category FROM products WHERE company_id = $1 AND category IS NOT NULL ORDER BY category',
            [req.user.company_id]
        );
        res.json(result.rows.map(r => r.category));
    } catch (err) {
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// ============================================
// GOALS (Etapas/Eventos de Conversión)
// ============================================

// Listar goals de un producto
router.get('/:productId/goals', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM goals WHERE product_id = $1 AND company_id = $2 ORDER BY step_order ASC',
            [req.params.productId, req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing goals:', err);
        res.status(500).json({ error: 'Failed to list goals' });
    }
});

// Crear goal
router.post('/:productId/goals', authMiddleware, async (req, res) => {
    try {
        const { slug, name, description, step_order, commission_type, commission_amount,
                commission_percent, is_final, triggers_renewal, requires_approval, requires_previous_goal } = req.body;

        if (!slug || !name) return res.status(400).json({ error: 'Slug and name are required' });

        const result = await db.query(
            `INSERT INTO goals (company_id, product_id, slug, name, description, step_order,
             commission_type, commission_amount, commission_percent, is_final, triggers_renewal,
             requires_approval, requires_previous_goal)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [req.user.company_id, req.params.productId, slug, name, description || null,
             step_order || 1, commission_type || 'cpa', commission_amount || 0, commission_percent || 0,
             is_final || false, triggers_renewal || false, requires_approval !== false, requires_previous_goal || false]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Goal slug already exists for this product' });
        console.error('Error creating goal:', err);
        res.status(500).json({ error: 'Failed to create goal' });
    }
});

// Actualizar goal
router.put('/:productId/goals/:goalId', authMiddleware, async (req, res) => {
    try {
        const { name, description, step_order, commission_type, commission_amount,
                commission_percent, is_final, triggers_renewal, requires_approval,
                requires_previous_goal, is_active } = req.body;

        const result = await db.query(
            `UPDATE goals SET name=COALESCE($1,name), description=COALESCE($2,description),
             step_order=COALESCE($3,step_order), commission_type=COALESCE($4,commission_type),
             commission_amount=COALESCE($5,commission_amount), commission_percent=COALESCE($6,commission_percent),
             is_final=COALESCE($7,is_final), triggers_renewal=COALESCE($8,triggers_renewal),
             requires_approval=COALESCE($9,requires_approval), requires_previous_goal=COALESCE($10,requires_previous_goal),
             is_active=COALESCE($11,is_active)
             WHERE id=$12 AND product_id=$13 AND company_id=$14 RETURNING *`,
            [name, description, step_order, commission_type, commission_amount, commission_percent,
             is_final, triggers_renewal, requires_approval, requires_previous_goal, is_active,
             req.params.goalId, req.params.productId, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating goal:', err);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// ============================================
// GOAL TRACKING - Registrar que un goal fue completado
// ============================================

// Registrar goal completado (POST desde postback o admin)
router.post('/track-goal', authMiddleware, async (req, res) => {
    try {
        const { conversion_id, product_id, goal_slug, affiliate_id, amount, data } = req.body;

        if (!goal_slug || !product_id) return res.status(400).json({ error: 'product_id and goal_slug required' });

        // Buscar goal
        const goal = await db.query(
            'SELECT * FROM goals WHERE product_id = $1 AND slug = $2 AND company_id = $3 AND is_active = true',
            [product_id, goal_slug, req.user.company_id]
        );
        if (goal.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
        const g = goal.rows[0];

        // Verificar si requiere goal anterior
        if (g.requires_previous_goal && conversion_id) {
            const prevGoal = await db.query(
                `SELECT id FROM conversion_goals WHERE conversion_id = $1 AND product_id = $2
                 AND status = 'approved'
                 AND goal_id IN (SELECT id FROM goals WHERE product_id = $2 AND step_order = $3)`,
                [conversion_id, product_id, g.step_order - 1]
            );
            if (prevGoal.rows.length === 0) {
                return res.status(400).json({ error: `Previous goal (step ${g.step_order - 1}) must be completed first` });
            }
        }

        // Calcular comisión del goal
        let commission = 0;
        const saleAmount = parseFloat(amount) || 0;

        // Buscar comisión por rango si hay affiliate
        if (affiliate_id) {
            const affRank = await db.query('SELECT rank FROM affiliates WHERE id = $1', [affiliate_id]);
            const rankNum = affRank.rows[0]?.rank || 1;

            const goalRankComm = await db.query(
                `SELECT grc.* FROM goal_rank_commissions grc
                 JOIN ranks r ON r.id = grc.rank_id
                 WHERE grc.goal_id = $1 AND r.rank_number = $2 AND r.company_id = $3`,
                [g.id, rankNum, req.user.company_id]
            );

            if (goalRankComm.rows.length > 0) {
                const rc = goalRankComm.rows[0];
                commission = saleAmount * (parseFloat(rc.commission_percent) || 0) / 100 + (parseFloat(rc.commission_amount) || 0);
            } else {
                // Fallback: usar comisión default del goal
                commission = saleAmount * (parseFloat(g.commission_percent) || 0) / 100 + (parseFloat(g.commission_amount) || 0);
            }
        } else {
            commission = saleAmount * (parseFloat(g.commission_percent) || 0) / 100 + (parseFloat(g.commission_amount) || 0);
        }

        // Registrar goal completado
        const result = await db.query(
            `INSERT INTO conversion_goals (company_id, conversion_id, goal_id, product_id, affiliate_id, amount, commission, data, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [req.user.company_id, conversion_id || null, g.id, product_id, affiliate_id || null,
             saleAmount, commission, JSON.stringify(data || {}),
             g.requires_approval ? 'pending' : 'approved']
        );

        // Si no requiere aprobación y hay comisión, actualizar balance
        if (!g.requires_approval && commission > 0 && affiliate_id) {
            await db.query(
                'UPDATE affiliates SET balance = balance + $1, available_balance = available_balance + $1, total_commission = total_commission + $1 WHERE id = $2',
                [commission, affiliate_id]
            );
        }

        res.json({
            status: 'ok',
            conversion_goal_id: result.rows[0].id,
            goal: g.name,
            commission,
            requires_approval: g.requires_approval
        });
    } catch (err) {
        console.error('Error tracking goal:', err);
        res.status(500).json({ error: 'Failed to track goal' });
    }
});

// Ver goals completados de una conversión
router.get('/conversion-goals/:conversionId', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cg.*, g.name as goal_name, g.slug, g.step_order, g.is_final,
                    p.name as product_name
             FROM conversion_goals cg
             JOIN goals g ON cg.goal_id = g.id
             JOIN products p ON cg.product_id = p.id
             WHERE cg.conversion_id = $1 AND cg.company_id = $2
             ORDER BY g.step_order ASC`,
            [req.params.conversionId, req.user.company_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting conversion goals:', err);
        res.status(500).json({ error: 'Failed to get conversion goals' });
    }
});

module.exports = router;
