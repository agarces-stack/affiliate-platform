const db = require('../models/db');

// Registrar postback/tracking request
async function logPostback({ companyId, endpoint, method, queryParams, bodyParams, headers, ip,
                             status, statusCode, response, errorMessage, clickId, conversionId,
                             affiliateId, campaignId, processingTimeMs }) {
    try {
        await db.query(
            `INSERT INTO postback_logs (company_id, endpoint, method, query_params, body_params, headers,
             ip_address, status, status_code, response, error_message, click_id, conversion_id,
             affiliate_id, campaign_id, processing_time_ms)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [companyId || null, endpoint, method || 'GET',
             JSON.stringify(queryParams || {}),
             JSON.stringify(bodyParams || {}),
             JSON.stringify({ 'user-agent': headers?.['user-agent'], referer: headers?.referer, origin: headers?.origin }),
             ip || null, status || 'success', statusCode || 200,
             JSON.stringify(response || {}), errorMessage || null,
             clickId || null, conversionId || null, affiliateId || null, campaignId || null,
             processingTimeMs || null]
        );
    } catch (err) {
        console.error('Postback log error:', err.message);
    }
}

// Registrar actividad del admin
async function logActivity({ companyId, userId, affiliateId, action, entityType, entityId, details, req }) {
    try {
        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null;
        await db.query(
            `INSERT INTO activity_logs (company_id, user_id, affiliate_id, action, entity_type,
             entity_id, details, ip_address, user_agent)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [companyId, userId || null, affiliateId || null, action, entityType || null,
             entityId || null, JSON.stringify(details || {}), ip,
             req?.headers?.['user-agent'] || null]
        );
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
}

module.exports = { logPostback, logActivity };
