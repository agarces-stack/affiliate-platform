const db = require('../models/db');

// PayPal Payouts API
// Docs: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/

class PayPalService {
    constructor(clientId, clientSecret, mode = 'sandbox') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseUrl = mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    // Obtener access token
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
        const data = await res.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
        return this.accessToken;
    }

    // Enviar pago individual
    async sendPayout(recipientEmail, amount, currency = 'USD', note = '', senderId = '') {
        const token = await this.getAccessToken();
        const batchId = 'MR_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        const res = await fetch(`${this.baseUrl}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender_batch_header: {
                    sender_batch_id: batchId,
                    email_subject: `You have a payment from ${process.env.APP_NAME || 'MagnetRaffic'}`,
                    email_message: note || 'Your commission payout has been processed.',
                    recipient_type: 'EMAIL'
                },
                items: [{
                    recipient_type: 'EMAIL',
                    amount: { value: amount.toFixed(2), currency },
                    receiver: recipientEmail,
                    note: note || 'Commission payout',
                    sender_item_id: senderId || batchId
                }]
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || data.error_description || `PayPal error: ${res.status}`);
        }

        return {
            success: true,
            batch_id: data.batch_header?.payout_batch_id || batchId,
            status: data.batch_header?.batch_status || 'PENDING',
            response: data
        };
    }

    // Enviar pagos en batch (múltiples agentes a la vez)
    async sendBatchPayout(items, note = '') {
        const token = await this.getAccessToken();
        const batchId = 'MR_BATCH_' + Date.now();

        const payoutItems = items.map((item, i) => ({
            recipient_type: 'EMAIL',
            amount: { value: item.amount.toFixed(2), currency: item.currency || 'USD' },
            receiver: item.email,
            note: item.note || note || 'Commission payout',
            sender_item_id: `${batchId}_${i}`
        }));

        const res = await fetch(`${this.baseUrl}/v1/payments/payouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender_batch_header: {
                    sender_batch_id: batchId,
                    email_subject: `You have a payment from ${process.env.APP_NAME || 'MagnetRaffic'}`,
                    email_message: note || 'Your commission payout has been processed.',
                    recipient_type: 'EMAIL'
                },
                items: payoutItems
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `PayPal batch error: ${res.status}`);

        return {
            success: true,
            batch_id: data.batch_header?.payout_batch_id || batchId,
            status: data.batch_header?.batch_status,
            items_count: payoutItems.length,
            response: data
        };
    }

    // Verificar estado de un batch
    async checkBatchStatus(batchId) {
        const token = await this.getAccessToken();
        const res = await fetch(`${this.baseUrl}/v1/payments/payouts/${batchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`PayPal status check failed: ${res.status}`);
        return res.json();
    }
}

// Factory: crear instancia desde config de la DB
async function getPayPalService(companyId) {
    const result = await db.query(
        "SELECT config FROM payment_providers WHERE company_id = $1 AND provider = 'paypal' AND is_active = true",
        [companyId]
    );
    if (result.rows.length === 0) return null;

    const config = result.rows[0].config;
    if (!config.client_id || !config.client_secret) return null;

    return new PayPalService(config.client_id, config.client_secret, config.mode || 'sandbox');
}

module.exports = { PayPalService, getPayPalService };
