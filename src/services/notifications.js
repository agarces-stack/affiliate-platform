const db = require('../models/db');

// Crear notificación
async function notify({ companyId, affiliateId, userId, type, title, message }) {
    try {
        await db.query(
            `INSERT INTO notifications (company_id, affiliate_id, user_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [companyId, affiliateId || null, userId || null, type, title, message]
        );
    } catch (err) {
        console.error('Notification error:', err);
    }
}

// Notificaciones predefinidas
const Notify = {
    newAffiliate: (companyId, name, email) =>
        notify({
            companyId, type: 'new_affiliate',
            title: 'New agent registered',
            message: `${name} (${email}) registered and is waiting for approval.`
        }),

    affiliateApproved: (companyId, affiliateId, name) =>
        notify({
            companyId, affiliateId, type: 'affiliate_approved',
            title: 'You have been approved!',
            message: `Welcome ${name}! Your account is now active. Start sharing your tracking links.`
        }),

    newConversion: (companyId, affiliateId, amount, commission) =>
        notify({
            companyId, affiliateId, type: 'new_conversion',
            title: 'New sale!',
            message: `You earned $${Number(commission).toFixed(2)} commission on a $${Number(amount).toFixed(2)} sale.`
        }),

    overrideEarned: (companyId, affiliateId, amount, sourceName) =>
        notify({
            companyId, affiliateId, type: 'override_earned',
            title: 'Override commission earned',
            message: `You earned $${Number(amount).toFixed(2)} override from ${sourceName}'s sale.`
        }),

    rankPromotion: (companyId, affiliateId, oldRankName, newRankName) =>
        notify({
            companyId, affiliateId, type: 'rank_promotion',
            title: 'Rank promotion!',
            message: `Congratulations! You've been promoted from ${oldRankName} to ${newRankName}.`
        }),

    newRecruit: (companyId, affiliateId, recruitName) =>
        notify({
            companyId, affiliateId, type: 'new_recruit',
            title: 'New team member!',
            message: `${recruitName} joined your team.`
        }),

    payoutCreated: (companyId, affiliateId, amount, method) =>
        notify({
            companyId, affiliateId, type: 'payout_created',
            title: 'Payout initiated',
            message: `A payout of $${Number(amount).toFixed(2)} via ${method} has been created.`
        }),

    payoutCompleted: (companyId, affiliateId, amount) =>
        notify({
            companyId, affiliateId, type: 'payout_completed',
            title: 'Payout completed!',
            message: `Your payout of $${Number(amount).toFixed(2)} has been processed.`
        }),

    fraudAlert: (companyId, rule, severity, ip) =>
        notify({
            companyId, type: 'fraud_alert',
            title: `Fraud alert: ${rule}`,
            message: `${severity.toUpperCase()} severity fraud detected from IP ${ip}.`
        }),

    conversionRejected: (companyId, affiliateId, amount) =>
        notify({
            companyId, affiliateId, type: 'conversion_rejected',
            title: 'Conversion rejected',
            message: `A conversion of $${Number(amount).toFixed(2)} was rejected. Commission has been reverted.`
        }),
};

module.exports = { notify, Notify };
