const db = require('../models/db');

// Evaluar tier de un afiliado para una campaña
async function evaluateTier(affiliateId, campaignId, companyId) {
    try {
        // Obtener tiers de la campaña
        const tiers = await db.query(
            'SELECT * FROM commission_tiers WHERE company_id = $1 AND campaign_id = $2 AND is_active = true ORDER BY tier_number ASC',
            [companyId, campaignId]
        );
        if (tiers.rows.length === 0) return null;

        const timeframe = tiers.rows[0].timeframe || 'all_time';
        const { startDate, endDate } = getTimeframeDates(timeframe);

        // Obtener stats del afiliado para el período
        let statsQuery = `SELECT
            COUNT(*) as conversions,
            COALESCE(SUM(amount), 0) as revenue,
            COALESCE(SUM(commission), 0) as commission
            FROM conversions
            WHERE affiliate_id = $1 AND campaign_id = $2 AND status IN ('approved', 'pending')`;
        const params = [affiliateId, campaignId];

        if (startDate) {
            params.push(startDate);
            statsQuery += ` AND created_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            statsQuery += ` AND created_at <= $${params.length}`;
        }

        const stats = await db.query(statsQuery, params);
        const s = stats.rows[0];

        // Clicks
        let clicksQuery = 'SELECT COUNT(*) as clicks FROM clicks WHERE affiliate_id = $1 AND campaign_id = $2';
        const clickParams = [affiliateId, campaignId];
        if (startDate) { clickParams.push(startDate); clicksQuery += ` AND created_at >= $${clickParams.length}`; }
        const clicks = await db.query(clicksQuery, clickParams);

        // Reclutas
        const recruits = await db.query(
            "SELECT COUNT(*) as total FROM affiliates WHERE parent_affiliate_id = $1 AND status = 'approved'",
            [affiliateId]
        );

        const performance = {
            conversions: parseInt(s.conversions),
            revenue: parseFloat(s.revenue),
            commission: parseFloat(s.commission),
            clicks: parseInt(clicks.rows[0].clicks),
            recruits: parseInt(recruits.rows[0].total)
        };

        // Encontrar el tier más alto al que califica
        let qualifiedTier = null;
        for (const tier of tiers.rows) {
            const meets =
                performance.conversions >= (tier.min_conversions || 0) &&
                performance.revenue >= parseFloat(tier.min_revenue || 0) &&
                performance.commission >= parseFloat(tier.min_commission_earned || 0) &&
                performance.clicks >= (tier.min_clicks || 0) &&
                performance.recruits >= (tier.min_recruits || 0);

            if (meets) qualifiedTier = tier;
            else break;
        }

        if (!qualifiedTier) return { tier: null, performance };

        // Actualizar tier del afiliado
        await db.query(
            `INSERT INTO affiliate_tiers (company_id, affiliate_id, campaign_id, tier_id, tier_number,
             conversions_count, revenue_total, commission_total, period_start, period_end, assigned_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
             ON CONFLICT (affiliate_id, campaign_id) DO UPDATE SET
             tier_id=$4, tier_number=$5, conversions_count=$6, revenue_total=$7,
             commission_total=$8, period_start=$9, period_end=$10, assigned_at=NOW()`,
            [companyId, affiliateId, campaignId, qualifiedTier.id, qualifiedTier.tier_number,
             performance.conversions, performance.revenue, performance.commission,
             startDate || null, endDate || null]
        );

        return { tier: qualifiedTier, performance };
    } catch (err) {
        console.error('Tier evaluation error:', err);
        return null;
    }
}

function getTimeframeDates(timeframe) {
    const now = new Date();
    switch (timeframe) {
        case 'this_month':
            return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: null };
        case 'last_month':
            return {
                startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                endDate: new Date(now.getFullYear(), now.getMonth(), 0)
            };
        case 'this_year':
            return { startDate: new Date(now.getFullYear(), 0, 1), endDate: null };
        case 'last_year':
            return {
                startDate: new Date(now.getFullYear() - 1, 0, 1),
                endDate: new Date(now.getFullYear() - 1, 11, 31)
            };
        default: // all_time
            return { startDate: null, endDate: null };
    }
}

// Evaluar todos los afiliados de una campaña
async function evaluateAllTiers(campaignId, companyId) {
    const affiliates = await db.query(
        "SELECT DISTINCT affiliate_id FROM conversions WHERE campaign_id = $1 AND company_id = $2",
        [campaignId, companyId]
    );
    const results = [];
    for (const a of affiliates.rows) {
        const r = await evaluateTier(a.affiliate_id, campaignId, companyId);
        if (r?.tier) results.push({ affiliate_id: a.affiliate_id, tier: r.tier.name, performance: r.performance });
    }
    return { evaluated: affiliates.rows.length, promoted: results.length, results };
}

// Calcular comisión progressive (escalonada por monto)
async function calculateProgressiveCommission(amount, campaignId, productId, companyId) {
    const rules = await db.query(
        `SELECT * FROM progressive_rules
         WHERE company_id = $1 AND (campaign_id = $2 OR product_id = $3)
         ORDER BY min_amount ASC`,
        [companyId, campaignId, productId]
    );
    if (rules.rows.length === 0) return null;

    let totalCommission = 0;
    let remaining = parseFloat(amount);

    for (const rule of rules.rows) {
        const min = parseFloat(rule.min_amount);
        const max = rule.max_amount ? parseFloat(rule.max_amount) : Infinity;
        const rangeAmount = Math.min(remaining, max - min);

        if (rangeAmount <= 0) continue;

        totalCommission += rangeAmount * (parseFloat(rule.commission_percent) || 0) / 100;
        totalCommission += parseFloat(rule.commission_fixed) || 0;
        remaining -= rangeAmount;

        if (remaining <= 0) break;
    }

    return totalCommission;
}

module.exports = { evaluateTier, evaluateAllTiers, calculateProgressiveCommission, getTimeframeDates };
