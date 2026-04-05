const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

// ============================================
// POSTBACK - Registrar conversion
// GET /postback?click_id=xxx&amount=150&order_id=123
// (publico - llamado desde el servidor del cliente)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { click_id, ref_id, campaign_id, order_id, amount,
                email, first_name, customer_id, new_customer, coupon } = req.query;

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

        // Buscar campaña para calcular comision
        const campResult = await db.query('SELECT * FROM campaigns WHERE id = $1', [camp_id]);
        const campaign = campResult.rows[0];

        // Calcular comision
        let commission = 0;
        let commission_type = 'cpa';

        if (campaign) {
            // Verificar override por afiliado
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
                case 'cpa':
                    commission = commAmount || 0;
                    break;
                case 'revshare':
                    commission = (parseFloat(amount) || 0) * (commPercent || 0) / 100;
                    break;
                case 'hybrid':
                    commission = (commAmount || 0) + ((parseFloat(amount) || 0) * (commPercent || 0) / 100);
                    break;
                default:
                    commission = commAmount || 0;
            }
        }

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

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

        // Insertar conversion
        const convResult = await db.query(
            `INSERT INTO conversions (company_id, campaign_id, affiliate_id, click_id,
             order_id, amount, commission, commission_type, customer_email, customer_name,
             customer_id, is_new_customer, ip_address, tracking_method, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING id`,
            [company_id, camp_id, affiliate_id, click_id || null,
             order_id || null, parseFloat(amount) || 0, commission, commission_type,
             email || null, first_name || null, customer_id || null,
             new_customer === '1' || new_customer === 'true',
             ip, tracking_method, 'pending']
        );

        // Actualizar totales del afiliado
        await db.query(
            `UPDATE affiliates SET
             total_conversions = total_conversions + 1,
             total_revenue = total_revenue + $1,
             total_commission = total_commission + $2,
             balance = balance + $2
             WHERE id = $3`,
            [parseFloat(amount) || 0, commission, affiliate_id]
        );

        // Calcular comisiones MLM si aplica
        if (campaign?.mlm_enabled) {
            await calculateMLMCommissions(convResult.rows[0].id, affiliate_id, commission, campaign);
        }

        res.json({
            status: 'ok',
            conversion_id: convResult.rows[0].id,
            commission: commission,
            tracking_method
        });

    } catch (err) {
        console.error('Conversion error:', err);
        res.status(500).json({ error: 'Conversion tracking error' });
    }
});

// Calcular comisiones MLM (multi-nivel)
async function calculateMLMCommissions(conversionId, affiliateId, baseCommission, campaign) {
    try {
        const mlmLevels = campaign.mlm_commissions || [];
        let currentAffiliateId = affiliateId;

        for (const levelConfig of mlmLevels) {
            // Buscar parent
            const parentResult = await db.query(
                'SELECT id, parent_affiliate_id FROM affiliates WHERE id = $1',
                [currentAffiliateId]
            );
            const parent = parentResult.rows[0];
            if (!parent?.parent_affiliate_id) break;

            const mlmCommission = baseCommission * (levelConfig.percent || 0) / 100;

            if (mlmCommission > 0) {
                await db.query(
                    `INSERT INTO mlm_commissions (conversion_id, affiliate_id, source_affiliate_id, level, commission)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [conversionId, parent.parent_affiliate_id, affiliateId, levelConfig.level, mlmCommission]
                );

                // Actualizar balance del parent
                await db.query(
                    'UPDATE affiliates SET balance = balance + $1, total_commission = total_commission + $1 WHERE id = $2',
                    [mlmCommission, parent.parent_affiliate_id]
                );
            }

            currentAffiliateId = parent.parent_affiliate_id;
        }
    } catch (err) {
        console.error('MLM commission error:', err);
    }
}

module.exports = router;
