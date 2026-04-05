const db = require('../models/db');

const FRAUD_RULES = {
    // Clicks por IP en 1 hora (click spam)
    CLICK_SPAM_THRESHOLD: 10,
    CLICK_SPAM_WINDOW_HOURS: 1,

    // Clicks por IP en 24h (excessive clicks)
    DAILY_CLICK_THRESHOLD: 50,

    // Conversiones por IP en 24h
    CONVERSION_SPAM_THRESHOLD: 5,

    // Tiempo minimo entre click y conversion (segundos)
    MIN_CLICK_TO_CONV_SECONDS: 3,

    // User agents sospechosos
    BOT_PATTERNS: /bot|crawler|spider|scraper|curl|wget|python-requests|java\/|httpclient|headless|phantom|selenium|puppeteer|playwright|axios|node-fetch|go-http|libwww|mechanize/i,

    // IPs privadas/localhost
    PRIVATE_IP_PATTERNS: /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/,

    // Referers sospechosos
    SUSPICIOUS_REFERERS: /click(farm|bot|fraud)|traffic(bot|exchange)|auto(click|surf)|hit(leap|s\.me)|247autohits/i,
};

async function checkClickFraud(clickData) {
    const { ip, userAgent, referer, affiliateId, campaignId, companyId } = clickData;
    const alerts = [];

    // 1. Bot detection avanzado
    if (FRAUD_RULES.BOT_PATTERNS.test(userAgent || '')) {
        alerts.push({ rule: 'bot_detected', severity: 'high', details: { userAgent } });
    }

    // 2. User agent vacio o muy corto
    if (!userAgent || userAgent.length < 20) {
        alerts.push({ rule: 'empty_user_agent', severity: 'medium', details: { userAgent: userAgent || 'empty' } });
    }

    // 3. Click spam - muchos clicks desde misma IP en 1 hora
    const clickSpam = await db.query(
        `SELECT COUNT(*) as cnt FROM clicks
         WHERE ip_address = $1 AND company_id = $2
         AND created_at > NOW() - INTERVAL '${FRAUD_RULES.CLICK_SPAM_WINDOW_HOURS} hours'`,
        [ip, companyId]
    );
    if (parseInt(clickSpam.rows[0].cnt) >= FRAUD_RULES.CLICK_SPAM_THRESHOLD) {
        alerts.push({ rule: 'click_spam', severity: 'high', details: { clicks_in_window: clickSpam.rows[0].cnt, ip } });
    }

    // 4. Excessive daily clicks desde misma IP
    const dailyClicks = await db.query(
        `SELECT COUNT(*) as cnt FROM clicks
         WHERE ip_address = $1 AND company_id = $2
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [ip, companyId]
    );
    if (parseInt(dailyClicks.rows[0].cnt) >= FRAUD_RULES.DAILY_CLICK_THRESHOLD) {
        alerts.push({ rule: 'excessive_daily_clicks', severity: 'high', details: { daily_clicks: dailyClicks.rows[0].cnt, ip } });
    }

    // 5. IP bloqueada manualmente
    const blocked = await db.query(
        `SELECT id FROM blocked_ips WHERE ip_address = $1 AND company_id = $2 AND is_active = true`,
        [ip, companyId]
    );
    if (blocked.rows.length > 0) {
        alerts.push({ rule: 'blocked_ip', severity: 'critical', details: { ip } });
    }

    // 6. Referer sospechoso
    if (referer && FRAUD_RULES.SUSPICIOUS_REFERERS.test(referer)) {
        alerts.push({ rule: 'suspicious_referer', severity: 'medium', details: { referer } });
    }

    // 7. IP privada/localhost
    if (ip && FRAUD_RULES.PRIVATE_IP_PATTERNS.test(ip)) {
        alerts.push({ rule: 'private_ip', severity: 'low', details: { ip } });
    }

    // 8. Mismo afiliado, misma IP, muchos clicks (self-clicking)
    const selfClick = await db.query(
        `SELECT COUNT(*) as cnt FROM clicks
         WHERE affiliate_id = $1 AND ip_address = $2
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [affiliateId, ip]
    );
    if (parseInt(selfClick.rows[0].cnt) >= 20) {
        alerts.push({ rule: 'self_clicking_suspected', severity: 'high', details: { affiliate_clicks_from_ip: selfClick.rows[0].cnt, ip } });
    }

    // Guardar alertas en fraud_logs
    for (const alert of alerts) {
        const action = alert.severity === 'critical' ? 'blocked' : alert.severity === 'high' ? 'flagged' : 'none';
        await db.query(
            `INSERT INTO fraud_logs (company_id, affiliate_id, rule, severity, details, action_taken)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [companyId, affiliateId, alert.rule, alert.severity, JSON.stringify(alert.details), action]
        );
    }

    const shouldBlock = alerts.some(a => a.severity === 'critical');
    const shouldFlag = alerts.some(a => a.severity === 'high');

    return { alerts, shouldBlock, shouldFlag, isFraud: shouldBlock };
}

async function checkConversionFraud(convData) {
    const { ip, clickId, affiliateId, companyId, amount, orderId } = convData;
    const alerts = [];

    // 1. Conversion spam - muchas conversiones desde misma IP
    const convSpam = await db.query(
        `SELECT COUNT(*) as cnt FROM conversions
         WHERE ip_address = $1 AND company_id = $2
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [ip, companyId]
    );
    if (parseInt(convSpam.rows[0].cnt) >= FRAUD_RULES.CONVERSION_SPAM_THRESHOLD) {
        alerts.push({ rule: 'conversion_spam', severity: 'high', details: { conversions_24h: convSpam.rows[0].cnt, ip } });
    }

    // 2. Click to conversion demasiado rapido
    if (clickId) {
        const click = await db.query('SELECT created_at FROM clicks WHERE click_id = $1', [clickId]);
        if (click.rows.length > 0) {
            const clickTime = new Date(click.rows[0].created_at);
            const diffSeconds = (Date.now() - clickTime.getTime()) / 1000;
            if (diffSeconds < FRAUD_RULES.MIN_CLICK_TO_CONV_SECONDS) {
                alerts.push({ rule: 'too_fast_conversion', severity: 'high', details: { seconds: diffSeconds.toFixed(1) } });
            }
        }
    }

    // 3. Monto sospechosamente alto
    if (amount > 10000) {
        alerts.push({ rule: 'high_amount', severity: 'medium', details: { amount } });
    }

    // 4. Monto de $0 o negativo
    if (amount <= 0) {
        alerts.push({ rule: 'zero_or_negative_amount', severity: 'medium', details: { amount } });
    }

    // 5. IP bloqueada
    const blocked = await db.query(
        `SELECT id FROM blocked_ips WHERE ip_address = $1 AND company_id = $2 AND is_active = true`,
        [ip, companyId]
    );
    if (blocked.rows.length > 0) {
        alerts.push({ rule: 'blocked_ip_conversion', severity: 'critical', details: { ip } });
    }

    // Guardar alertas
    for (const alert of alerts) {
        const action = alert.severity === 'critical' ? 'blocked' : alert.severity === 'high' ? 'flagged' : 'none';
        await db.query(
            `INSERT INTO fraud_logs (company_id, click_id, affiliate_id, rule, severity, details, action_taken)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [companyId, clickId, affiliateId, alert.rule, alert.severity, JSON.stringify(alert.details), action]
        );
    }

    const shouldBlock = alerts.some(a => a.severity === 'critical');
    return { alerts, shouldBlock, isFraud: shouldBlock };
}

module.exports = { checkClickFraud, checkConversionFraud };
