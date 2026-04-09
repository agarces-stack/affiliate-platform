const db = require('../models/db');
const { Notify } = require('./notifications');
const { triggerWebhooks } = require('./webhooks');

// Evalúa si un agente califica para subir de rango
// Se llama después de cada conversión y se puede llamar en batch
async function evaluateRankUp(affiliateId, companyId) {
    try {
        // Obtener data actual del agente
        const affResult = await db.query(
            'SELECT id, rank, total_conversions FROM affiliates WHERE id = $1 AND company_id = $2',
            [affiliateId, companyId]
        );
        if (affResult.rows.length === 0) return null;
        const aff = affResult.rows[0];
        const currentRank = aff.rank || 1;

        // Obtener todos los rangos de la empresa ordenados
        const ranksResult = await db.query(
            'SELECT * FROM ranks WHERE company_id = $1 ORDER BY rank_number ASC',
            [companyId]
        );
        const ranks = ranksResult.rows;

        // Obtener stats del agente
        const personalSales = aff.total_conversions || 0;

        // Contar reclutas directos activos
        const recruitsResult = await db.query(
            "SELECT COUNT(*) as total FROM affiliates WHERE parent_affiliate_id = $1 AND status = 'approved'",
            [affiliateId]
        );
        const directRecruits = parseInt(recruitsResult.rows[0].total);

        // Contar ventas totales del equipo
        const teamSalesResult = await db.query(
            `WITH RECURSIVE team AS (
                SELECT id FROM affiliates WHERE parent_affiliate_id = $1 AND company_id = $2
                UNION ALL
                SELECT a.id FROM affiliates a JOIN team t ON a.parent_affiliate_id = t.id WHERE a.company_id = $2
            )
            SELECT COALESCE(SUM(a.total_conversions), 0) as total
            FROM affiliates a JOIN team t ON a.id = t.id`,
            [affiliateId, companyId]
        );
        const teamSales = parseInt(teamSalesResult.rows[0].total);

        // Buscar el rango más alto al que califica
        let newRank = currentRank;
        for (const rank of ranks) {
            if (rank.rank_number <= currentRank) continue; // Solo subir, no bajar

            const meetsPersonal = !rank.min_personal_sales || personalSales >= rank.min_personal_sales;
            const meetsTeam = !rank.min_team_sales || teamSales >= rank.min_team_sales;
            const meetsRecruits = !rank.min_direct_recruits || directRecruits >= rank.min_direct_recruits;

            if (meetsPersonal && meetsTeam && meetsRecruits) {
                newRank = rank.rank_number;
            } else {
                break; // Si no califica para este, no califica para los superiores
            }
        }

        // Si subió de rango, actualizar
        if (newRank > currentRank) {
            await db.query(
                'UPDATE affiliates SET rank = $1, updated_at = NOW() WHERE id = $2',
                [newRank, affiliateId]
            );

            // Registrar en historial
            await db.query(
                `INSERT INTO rank_history (company_id, affiliate_id, old_rank, new_rank, reason)
                 VALUES ($1, $2, $3, $4, $5)`,
                [companyId, affiliateId, currentRank, newRank,
                 `Auto-promotion: ${personalSales} personal sales, ${teamSales} team sales, ${directRecruits} recruits`]
            );

            // Notificar al agente
            const oldRankData = ranks.find(r => r.rank_number === currentRank);
            const newRankData = ranks.find(r => r.rank_number === newRank);
            Notify.rankPromotion(companyId, affiliateId, oldRankData?.name || `Rank ${currentRank}`, newRankData?.name || `Rank ${newRank}`);
            triggerWebhooks(companyId, 'rank_promotion', { affiliate_id: affiliateId, old_rank: oldRankData?.name || `Rank ${currentRank}`, new_rank: newRankData?.name || `Rank ${newRank}`, old_rank_number: currentRank, new_rank_number: newRank });

            return { promoted: true, oldRank: currentRank, newRank, affiliateId };
        }

        return { promoted: false, currentRank, affiliateId };
    } catch (err) {
        console.error('Rank evaluation error:', err);
        return null;
    }
}

// Evaluar todos los agentes de una empresa (batch job)
async function evaluateAllRanks(companyId) {
    try {
        const affiliates = await db.query(
            "SELECT id FROM affiliates WHERE company_id = $1 AND status = 'approved'",
            [companyId]
        );

        const results = [];
        for (const aff of affiliates.rows) {
            const result = await evaluateRankUp(aff.id, companyId);
            if (result?.promoted) results.push(result);
        }

        return { evaluated: affiliates.rows.length, promoted: results.length, promotions: results };
    } catch (err) {
        console.error('Batch rank evaluation error:', err);
        return { error: err.message };
    }
}

module.exports = { evaluateRankUp, evaluateAllRanks };
