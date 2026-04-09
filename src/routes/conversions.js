const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');
const { checkConversionFraud } = require('../services/fraud');
const { evaluateRankUp } = require('../services/rank-evaluator');
const { Notify } = require('../services/notifications');
const { triggerWebhooks } = require('../services/webhooks');
const { logPostback, logActivity } = require('../services/audit-log');
const { evaluateTier } = require('../services/tier-evaluator');

// ============================================
// POSTBACK - Registrar conversion
// GET /postback?click_id=xxx&amount=150&order_id=123
// (publico - llamado desde el servidor del cliente)
// ============================================
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const { click_id, ref_id, campaign_id, order_id, amount,
                email, first_name, customer_id, new_customer, coupon,
                product_id, product_sku, goal } = req.query;

        let affiliate_id, company_id, camp_id, tracking_method;

        // Metodo 1: Tracking por click_id
        if (click_id) {
            const clickResult = await db.query(
                'SELECT affiliate_id, company_id, campaign_id FROM clicks WHERE click_id = $1',
                [click_id]
            );
            if (clickResult.rows.length === 0) return res.status(404).json({ error: 'click_id not found' });

            const click = clickResult.rows[0];
            affiliate_id = click.affiliate_id;
            company_id = click.company_id;
            camp_id = click.campaign_id;
            tracking_method = 's2s';

            // Marcar click como convertido
            await db.query('UPDATE clicks SET converted = true WHERE click_id = $1', [click_id]);
        }
        // Metodo 2: Tracking por ref_id (sin click_id)
        else if (ref_id) {
            const affResult = await db.query(
                'SELECT id, company_id FROM affiliates WHERE ref_id = $1',
                [ref_id]
            );
            if (affResult.rows.length === 0) return res.status(404).json({ error: 'ref_id not found' });

            affiliate_id = affResult.rows[0].id;
            company_id = affResult.rows[0].company_id;
            camp_id = campaign_id || null;
            tracking_method = 's2s_ref';
        }
        // Metodo 3: Tracking por cupon
        else if (coupon) {
            const couponResult = await db.query(
                'SELECT affiliate_id, company_id, campaign_id FROM coupons WHERE code = $1 AND is_active = true',
                [coupon]
            );
            if (couponResult.rows.length === 0) return res.status(404).json({ error: 'coupon not found' });

            const c = couponResult.rows[0];
            affiliate_id = c.affiliate_id;
            company_id = c.company_id;
            camp_id = c.campaign_id;
            tracking_method = 'coupon';

            // Incrementar uso del cupon
            await db.query('UPDATE coupons SET usage_count = usage_count + 1 WHERE code = $1', [coupon]);
        }
        else {
            return res.status(400).json({ error: 'click_id, ref_id, or coupon required' });
        }

        // Resolver producto (por ID o SKU)
        let resolved_product_id = product_id ? parseInt(product_id) : null;
        if (!resolved_product_id && product_sku) {
            const prodResult = await db.query(
                'SELECT id, campaign_id FROM products WHERE sku = $1 AND company_id = $2 AND status = $3',
                [product_sku, company_id, 'active']
            );
            if (prodResult.rows.length > 0) {
                resolved_product_id = prodResult.rows[0].id;
                if (!camp_id) camp_id = prodResult.rows[0].campaign_id;
            }
        }

        // Buscar campaña para calcular comision
        const campResult = await db.query('SELECT * FROM campaigns WHERE id = $1', [camp_id]);
        const campaign = campResult.rows[0];

        // Calcular comisión: Producto > Rango > Campaña (orden de prioridad)
        let commission = 0;
        let commission_type = 'rank_based';

        if (campaign || resolved_product_id) {
            // Buscar rango del agente
            const affRank = await db.query(
                'SELECT rank FROM affiliates WHERE id = $1', [affiliate_id]
            );
            const agentRank = affRank.rows[0]?.rank || 1;

            // PRIORIDAD 1: Comisión por producto + rango
            let productCommFound = false;
            if (resolved_product_id) {
                const prodRankComm = await db.query(
                    `SELECT prc.* FROM product_rank_commissions prc
                     JOIN ranks r ON r.id = prc.rank_id
                     WHERE prc.product_id = $1 AND r.rank_number = $2 AND r.company_id = $3`,
                    [resolved_product_id, agentRank, company_id]
                );
                if (prodRankComm.rows.length > 0) {
                    const prc = prodRankComm.rows[0];
                    commission = (parseFloat(amount) || 0) * (parseFloat(prc.direct_commission_percent) || 0) / 100
                               + (parseFloat(prc.direct_commission_fixed) || 0);
                    commission_type = 'product_rank';
                    productCommFound = true;
                }
                // Fallback: comisión default del producto
                if (!productCommFound) {
                    const prodDefault = await db.query('SELECT * FROM products WHERE id = $1', [resolved_product_id]);
                    if (prodDefault.rows.length > 0) {
                        const pd = prodDefault.rows[0];
                        switch (pd.commission_type) {
                            case 'cpa': commission = parseFloat(pd.commission_amount) || 0; break;
                            case 'revshare': commission = (parseFloat(amount) || 0) * (parseFloat(pd.commission_percent) || 0) / 100; break;
                            default: commission = (parseFloat(pd.commission_amount) || 0) + (parseFloat(amount) || 0) * (parseFloat(pd.commission_percent) || 0) / 100;
                        }
                        commission_type = 'product_default';
                        productCommFound = true;
                    }
                }
            }

            // PRIORIDAD 2: Comisión por rango + campaña
            if (!productCommFound) {
                const rankComm = await db.query(
                    `SELECT rc.* FROM rank_commissions rc
                     JOIN ranks r ON r.id = rc.rank_id
                     WHERE r.company_id = $1 AND r.rank_number = $2 AND rc.campaign_id = $3`,
                    [company_id, agentRank, camp_id]
                );

                if (rankComm.rows.length > 0) {
                    const rc = rankComm.rows[0];
                    commission = (parseFloat(amount) || 0) * (parseFloat(rc.direct_commission_percent) || 0) / 100
                               + (parseFloat(rc.direct_commission_fixed) || 0);
                } else if (campaign) {
                    // PRIORIDAD 3: Comisión de la campaña (retrocompatibilidad)
                    const overrideResult = await db.query(
                        'SELECT * FROM campaign_affiliates WHERE campaign_id = $1 AND affiliate_id = $2',
                        [camp_id, affiliate_id]
                    );
                    const override = overrideResult.rows[0];
                    const commType = override?.custom_commission_type || campaign.commission_type;
                    const commAmount = override?.custom_commission_amount || campaign.commission_amount;
                    const commPercent = override?.custom_commission_percent || campaign.commission_percent;
                    commission_type = commType;
                    switch (commType) {
                        case 'cpa': commission = commAmount || 0; break;
                        case 'revshare': commission = (parseFloat(amount) || 0) * (commPercent || 0) / 100; break;
                        case 'hybrid': commission = (commAmount || 0) + ((parseFloat(amount) || 0) * (commPercent || 0) / 100); break;
                        default: commission = commAmount || 0;
                    }
                }
            } // end !productCommFound
        }

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

        // FRAUD DETECTION - verificar antes de procesar
        const fraudCheck = await checkConversionFraud({
            ip,
            clickId: click_id || null,
            affiliateId: affiliate_id,
            companyId: company_id,
            amount: parseFloat(amount) || 0,
            orderId: order_id || null
        });
        if (fraudCheck.isFraud) {
            console.log(`[FRAUD BLOCKED] Conversion from IP: ${ip}, Affiliate: ${affiliate_id}`);
            return res.status(403).json({ error: 'Conversion blocked by fraud detection' });
        }

        // Verificar duplicado por order_id
        if (order_id) {
            const dupeCheck = await db.query(
                'SELECT id FROM conversions WHERE order_id = $1 AND company_id = $2',
                [order_id, company_id]
            );
            if (dupeCheck.rows.length > 0) {
                return res.json({ status: 'duplicate', order_id });
            }
        }

        // Insertar conversion y actualizar balance en transacción atómica
        const client = await db.pool.connect();
        let convResult;
        try {
            await client.query('BEGIN');

            convResult = await client.query(
                `INSERT INTO conversions (company_id, campaign_id, affiliate_id, click_id,
                 order_id, amount, commission, commission_type, customer_email, customer_name,
                 customer_id, is_new_customer, ip_address, tracking_method, status,
                 product_id, goal_slug)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                 RETURNING id`,
                [company_id, camp_id, affiliate_id, click_id || null,
                 order_id || null, parseFloat(amount) || 0, commission, commission_type,
                 email || null, first_name || null, customer_id || null,
                 new_customer === '1' || new_customer === 'true',
                 ip, tracking_method, fraudCheck.shouldFlag ? 'flagged' : 'pending',
                 resolved_product_id || null, goal || null]
            );

            // Actualizar totales del afiliado
            await client.query(
                `UPDATE affiliates SET
                 total_conversions = total_conversions + 1,
                 total_revenue = total_revenue + $1,
                 total_commission = total_commission + $2,
                 balance = balance + $2
                 WHERE id = $3`,
                [parseFloat(amount) || 0, commission, affiliate_id]
            );

            await client.query('COMMIT');
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

        // Calcular comisiones de override (cadena hacia arriba)
        await calculateOverrideCommissions(convResult.rows[0].id, affiliate_id, company_id, camp_id, parseFloat(amount) || 0);

        // Notificar al agente de la nueva venta
        Notify.newConversion(company_id, affiliate_id, parseFloat(amount) || 0, commission);

        // Disparar webhooks
        triggerWebhooks(company_id, 'new_conversion', {
            conversion_id: convResult.rows[0].id, affiliate_id, amount: parseFloat(amount) || 0,
            commission, tracking_method, order_id: order_id || null
        });

        // Evaluar ascenso de rango y tier automático (no bloquea la respuesta)
        evaluateRankUp(affiliate_id, company_id).catch(err => console.error('Rank eval error:', err));
        if (camp_id) evaluateTier(affiliate_id, camp_id, company_id).catch(err => console.error('Tier eval error:', err));

        const responseData = { status: 'ok', conversion_id: convResult.rows[0].id, commission, tracking_method };
        logPostback({ companyId: company_id, endpoint: 'postback', queryParams: req.query, headers: req.headers, ip, status: 'success', statusCode: 200, response: responseData, conversionId: convResult.rows[0].id, affiliateId: affiliate_id, campaignId: camp_id, processingTimeMs: Date.now() - startTime });
        res.json(responseData);

    } catch (err) {
        console.error('Conversion error:', err);
        logPostback({ endpoint: 'postback', queryParams: req.query, headers: req.headers, ip: req.ip, status: 'error', statusCode: 500, errorMessage: err.message, processingTimeMs: Date.now() - startTime });
        res.status(500).json({ error: 'Conversion tracking error' });
    }
});

// Calcular comisiones de override (sube por la cadena de padres)
// Soporta 4 modos:
//   'fixed'      - Override fijo por rango (% + fijo configurado independiente)
//   'difference' - Override por diferencia (estándar seguros)
//   'relative'   - % de la comisión del nivel anterior (cadena)
//   'split'      - Se descuenta del afiliado (solo 1 nivel)
async function calculateOverrideCommissions(conversionId, affiliateId, companyId, campaignId, saleAmount) {
    try {
        // Obtener config de la empresa
        const compResult = await db.query(
            'SELECT max_recruitment_depth, override_mode, mlm_commission_type FROM companies WHERE id = $1', [companyId]
        );
        const maxDepth = compResult.rows[0]?.max_recruitment_depth || 10;
        const overrideMode = compResult.rows[0]?.override_mode || 'fixed';
        const mlmType = compResult.rows[0]?.mlm_commission_type || 'amount_based';

        // Para modo 'relative', trackear la comisión del nivel anterior
        let previousLevelCommission = 0;

        // Para modo 'difference', necesitamos el % del subordinado inmediato
        let previousDirectPercent = 0;
        if (overrideMode === 'difference') {
            // Obtener el % directo del agente que hizo la venta
            const sellerRank = await db.query('SELECT rank FROM affiliates WHERE id = $1', [affiliateId]);
            const sellerRankNum = sellerRank.rows[0]?.rank || 1;
            const sellerComm = await db.query(
                `SELECT rc.direct_commission_percent FROM rank_commissions rc
                 JOIN ranks r ON r.id = rc.rank_id
                 WHERE r.company_id = $1 AND r.rank_number = $2 AND rc.campaign_id = $3`,
                [companyId, sellerRankNum, campaignId]
            );
            previousDirectPercent = parseFloat(sellerComm.rows[0]?.direct_commission_percent) || 0;
        }

        let currentAffiliateId = affiliateId;
        let level = 1;

        while (level <= maxDepth) {
            // Buscar parent
            const parentResult = await db.query(
                'SELECT id, parent_affiliate_id, rank FROM affiliates WHERE id = $1',
                [currentAffiliateId]
            );
            const current = parentResult.rows[0];
            if (!current?.parent_affiliate_id) break;

            const parentId = current.parent_affiliate_id;

            // Obtener rango del parent
            const parentData = await db.query(
                'SELECT id, rank FROM affiliates WHERE id = $1', [parentId]
            );
            if (parentData.rows.length === 0) break;
            const parentRank = parentData.rows[0].rank || 1;

            // Buscar comisión configurada para el rango del parent
            const rankComm = await db.query(
                `SELECT rc.* FROM rank_commissions rc
                 JOIN ranks r ON r.id = rc.rank_id
                 WHERE r.company_id = $1 AND r.rank_number = $2 AND rc.campaign_id = $3`,
                [companyId, parentRank, campaignId]
            );

            let overrideCommission = 0;

            if (rankComm.rows.length > 0) {
                const rc = rankComm.rows[0];

                if (overrideMode === 'difference') {
                    // MODO DIFERENCIA (estándar seguros)
                    const parentDirectPercent = parseFloat(rc.direct_commission_percent) || 0;
                    const diffPercent = parentDirectPercent - previousDirectPercent;
                    if (diffPercent > 0) {
                        overrideCommission = saleAmount * diffPercent / 100 + (parseFloat(rc.override_commission_fixed) || 0);
                    }
                    previousDirectPercent = parentDirectPercent;

                } else if (mlmType === 'relative') {
                    // MODO RELATIVE: % de la comisión del nivel anterior
                    const overridePercent = parseFloat(rc.override_commission_percent) || 0;
                    if (level === 1) {
                        // Primer nivel: % de la comisión directa del agente
                        const sellerComm = await db.query('SELECT commission FROM conversions WHERE id = $1', [conversionId]);
                        previousLevelCommission = parseFloat(sellerComm.rows[0]?.commission) || 0;
                    }
                    overrideCommission = previousLevelCommission * overridePercent / 100;
                    previousLevelCommission = overrideCommission; // Para el siguiente nivel

                } else if (mlmType === 'split' && level === 1) {
                    // MODO SPLIT: se descuenta del afiliado (solo 1 nivel)
                    const splitPercent = parseFloat(rc.override_commission_percent) || 0;
                    const sellerComm = await db.query('SELECT commission FROM conversions WHERE id = $1', [conversionId]);
                    const originalComm = parseFloat(sellerComm.rows[0]?.commission) || 0;
                    overrideCommission = originalComm * splitPercent / 100;
                    // Descontar del afiliado original
                    if (overrideCommission > 0) {
                        await db.query('UPDATE affiliates SET balance = GREATEST(balance - $1, 0), total_commission = GREATEST(total_commission - $1, 0) WHERE id = $2', [overrideCommission, affiliateId]);
                    }

                } else if (mlmType === 'commission_based') {
                    // MODO COMMISSION BASED: % de la comisión del afiliado
                    const sellerComm = await db.query('SELECT commission FROM conversions WHERE id = $1', [conversionId]);
                    const originalComm = parseFloat(sellerComm.rows[0]?.commission) || 0;
                    overrideCommission = originalComm * (parseFloat(rc.override_commission_percent) || 0) / 100;

                } else {
                    // MODO FIJO (default) / AMOUNT BASED
                    const byLevel = rc.override_by_level || [];
                    const levelConfig = byLevel.find(l => l.level === level);
                    if (levelConfig) {
                        overrideCommission = saleAmount * (parseFloat(levelConfig.percent) || 0) / 100 + (parseFloat(levelConfig.fixed) || 0);
                    } else {
                        overrideCommission = saleAmount * (parseFloat(rc.override_commission_percent) || 0) / 100 + (parseFloat(rc.override_commission_fixed) || 0);
                    }
                }
            }

            // Para split, solo 1 nivel
            if (mlmType === 'split' && level > 1) break;

            if (overrideCommission > 0) {
                // Registrar comisión MLM
                await db.query(
                    `INSERT INTO mlm_commissions (conversion_id, affiliate_id, source_affiliate_id, level, commission)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [conversionId, parentId, affiliateId, level, overrideCommission]
                );

                // Actualizar balance del parent
                await db.query(
                    'UPDATE affiliates SET balance = balance + $1, total_commission = total_commission + $1 WHERE id = $2',
                    [overrideCommission, parentId]
                );

                // Notificar override
                const sourceAff = await db.query('SELECT first_name, email FROM affiliates WHERE id = $1', [affiliateId]);
                const sourceName = sourceAff.rows[0]?.first_name || sourceAff.rows[0]?.email || 'team member';
                Notify.overrideEarned(companyId, parentId, overrideCommission, sourceName);
            }

            currentAffiliateId = parentId;
            level++;
        }
    } catch (err) {
        console.error('Override commission error:', err);
    }
}

// ============================================
// ADMIN ENDPOINTS (requieren auth)
// ============================================

// Listar conversiones con filtros
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const { status, affiliate_id, campaign_id, start_date, end_date, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let query = `SELECT c.*, a.email as affiliate_email, a.ref_id, a.first_name as affiliate_name,
                     ca.name as campaign_name
                     FROM conversions c
                     LEFT JOIN affiliates a ON c.affiliate_id = a.id
                     LEFT JOIN campaigns ca ON c.campaign_id = ca.id
                     WHERE c.company_id = $1`;
        const params = [req.user.company_id];

        if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
        if (affiliate_id) { params.push(affiliate_id); query += ` AND c.affiliate_id = $${params.length}`; }
        if (campaign_id) { params.push(campaign_id); query += ` AND c.campaign_id = $${params.length}`; }
        if (start_date) { params.push(start_date); query += ` AND c.created_at >= $${params.length}`; }
        if (end_date) { params.push(end_date); query += ` AND c.created_at <= $${params.length}`; }

        const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
        const count = await db.query(countQuery, params);

        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json({
            conversions: result.rows,
            total: parseInt(count.rows[0].total),
            page: parseInt(page)
        });
    } catch (err) {
        console.error('Error listing conversions:', err);
        res.status(500).json({ error: 'Failed to list conversions' });
    }
});

// Aprobar conversión
router.patch('/:id/approve', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE conversions SET status = 'approved', approved_at = NOW()
             WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING id`,
            [req.params.id, req.user.company_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conversion not found or already processed' });
        res.json({ status: 'approved' });
    } catch (err) {
        console.error('Error approving conversion:', err);
        res.status(500).json({ error: 'Failed to approve conversion' });
    }
});

// Rechazar conversión (y revertir comisión)
router.patch('/:id/reject', authMiddleware, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const conv = await client.query(
            'SELECT * FROM conversions WHERE id = $1 AND company_id = $2 AND status IN ($3, $4)',
            [req.params.id, req.user.company_id, 'pending', 'flagged']
        );
        if (conv.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Conversion not found or already processed' });
        }

        const c = conv.rows[0];

        // Revertir comisión del afiliado
        await client.query(
            `UPDATE affiliates SET
             total_conversions = GREATEST(total_conversions - 1, 0),
             total_revenue = GREATEST(total_revenue - $1, 0),
             total_commission = GREATEST(total_commission - $2, 0),
             balance = GREATEST(balance - $2, 0)
             WHERE id = $3`,
            [parseFloat(c.amount), parseFloat(c.commission), c.affiliate_id]
        );

        // Revertir comisiones MLM
        const mlmComms = await client.query(
            'SELECT affiliate_id, commission FROM mlm_commissions WHERE conversion_id = $1',
            [req.params.id]
        );
        for (const mlm of mlmComms.rows) {
            await client.query(
                'UPDATE affiliates SET balance = GREATEST(balance - $1, 0), total_commission = GREATEST(total_commission - $1, 0) WHERE id = $2',
                [parseFloat(mlm.commission), mlm.affiliate_id]
            );
        }
        await client.query("UPDATE mlm_commissions SET status = 'rejected' WHERE conversion_id = $1", [req.params.id]);

        // Marcar conversión como rechazada
        await client.query(
            "UPDATE conversions SET status = 'rejected' WHERE id = $1",
            [req.params.id]
        );

        await client.query('COMMIT');
        Notify.conversionRejected(req.user.company_id, c.affiliate_id, c.amount);
        res.json({ status: 'rejected', reverted_commission: parseFloat(c.commission) });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error rejecting conversion:', err);
        res.status(500).json({ error: 'Failed to reject conversion' });
    } finally {
        client.release();
    }
});

module.exports = router;
