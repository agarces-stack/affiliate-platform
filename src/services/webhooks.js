const db = require('../models/db');
const crypto = require('crypto');

// Disparar webhooks para un evento
async function triggerWebhooks(companyId, event, payload) {
    try {
        const result = await db.query(
            'SELECT * FROM webhooks WHERE company_id = $1 AND is_active = true AND $2 = ANY(events)',
            [companyId, event]
        );

        for (const hook of result.rows) {
            sendWebhook(hook, event, payload).catch(err => {
                console.error(`Webhook ${hook.id} failed:`, err.message);
            });
        }
    } catch (err) {
        console.error('Webhook trigger error:', err);
    }
}

// Enviar webhook individual (no bloquea)
async function sendWebhook(hook, event, payload) {
    const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload
    });

    const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
    };

    // Firmar payload si hay secret
    if (hook.secret) {
        const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
        headers['X-Webhook-Signature'] = signature;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(hook.url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal
        });
        clearTimeout(timeout);

        await db.query(
            'UPDATE webhooks SET last_triggered_at = NOW(), last_status = $1, fail_count = 0 WHERE id = $2',
            [res.status, hook.id]
        );
    } catch (err) {
        await db.query(
            'UPDATE webhooks SET last_triggered_at = NOW(), last_status = 0, fail_count = fail_count + 1 WHERE id = $1',
            [hook.id]
        );

        // Desactivar después de 10 fallos seguidos
        if (hook.fail_count >= 9) {
            await db.query('UPDATE webhooks SET is_active = false WHERE id = $1', [hook.id]);
            console.log(`Webhook ${hook.id} disabled after 10 consecutive failures`);
        }
    }
}

module.exports = { triggerWebhooks };
