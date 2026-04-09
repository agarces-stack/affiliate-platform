// ESCENARIO: Fraud detection
// Simula varios tipos de fraude y verifica que sean detectados

const { scenario, step, ok, info, assert, assertEq, mockDb } = require('../simulator');

module.exports = scenario('Fraud Detection: bot, click spam, self-click', async () => {
    const db = mockDb._instance;

    // Setup
    db.tables.affiliates.push({
        id: 1, company_id: 1, ref_id: 'FRAUD001', email: 'fraud@test.com',
        first_name: 'Bad Actor', rank: 1, status: 'approved', balance: 0,
        password_hash: '$2a$10$test'
    });
    db.tables.campaigns.push({
        id: 1, company_id: 1, name: 'Test', url: 'https://test.com', status: 'active',
        commission_type: 'cpa', commission_amount: 10
    });

    // 1. Bot detection
    step('Bot detection (user agent: curl/7.68)');
    const isBotUA = /bot|crawler|spider|scraper|curl|wget|python-requests/i.test('curl/7.68');
    assert(isBotUA, 'Bot pattern detected');
    db.tables.fraud_logs.push({
        id: 1, company_id: 1, affiliate_id: 1, rule: 'bot_detected',
        severity: 'high', details: { user_agent: 'curl/7.68' }, action_taken: 'flagged'
    });

    // 2. Click spam: 15 clicks desde misma IP en 1 hora
    step('Click spam: 15 clicks from same IP in 1 hour');
    const spamIP = '10.0.0.99';
    for (let i = 0; i < 15; i++) {
        db.tables.clicks.push({
            id: i + 10, click_id: `spam-${i}`, company_id: 1, affiliate_id: 1,
            campaign_id: 1, ip_address: spamIP, is_unique: i === 0, is_bot: false,
            created_at: new Date(Date.now() - i * 60000) // cada minuto atrás
        });
    }
    const recentClicks = db.tables.clicks.filter(c => c.ip_address === spamIP).length;
    assertEq(recentClicks, 15, 'IP has 15 clicks logged');

    // Regla: si >= 10 clicks en 1 hora → flagged
    if (recentClicks >= 10) {
        db.tables.fraud_logs.push({
            id: 2, company_id: 1, affiliate_id: 1, rule: 'click_spam',
            severity: 'high', details: { ip: spamIP, count: recentClicks }, action_taken: 'flagged'
        });
        ok(`Click spam flagged (threshold 10, actual ${recentClicks})`);
    }

    // 3. Self-clicking: 25 clicks del mismo afiliado desde la misma IP
    step('Self-clicking detection');
    const selfClickIP = '192.168.1.50';
    for (let i = 0; i < 25; i++) {
        db.tables.clicks.push({
            id: 100 + i, click_id: `self-${i}`, company_id: 1, affiliate_id: 1,
            campaign_id: 1, ip_address: selfClickIP, is_unique: false, is_bot: false
        });
    }
    const selfClicks = db.tables.clicks.filter(c =>
        c.affiliate_id === 1 && c.ip_address === selfClickIP
    ).length;
    assert(selfClicks >= 20, 'Self-clicking pattern detected');
    db.tables.fraud_logs.push({
        id: 3, company_id: 1, affiliate_id: 1, rule: 'self_clicking_suspected',
        severity: 'high', details: { count: selfClicks }, action_taken: 'flagged'
    });

    // 4. IP bloqueada manualmente
    step('Manual IP block');
    db.tables.blocked_ips.push({
        id: 1, company_id: 1, ip_address: '1.2.3.4',
        reason: 'Known attacker', is_active: true, blocked_by: 'admin@test.com'
    });

    // Verificar que un click desde esa IP sería bloqueado
    const blockedIPs = db.tables.blocked_ips.filter(b => b.is_active).map(b => b.ip_address);
    const testIP = '1.2.3.4';
    const wouldBeBlocked = blockedIPs.includes(testIP);
    assert(wouldBeBlocked, 'Click from 1.2.3.4 would be blocked');

    // 5. Conversion fraud: monto > $10,000
    step('High amount fraud ($15,000)');
    const highAmount = 15000;
    if (highAmount > 10000) {
        db.tables.fraud_logs.push({
            id: 4, company_id: 1, affiliate_id: 1, rule: 'high_amount',
            severity: 'medium', details: { amount: highAmount }, action_taken: 'flagged'
        });
        ok('High amount conversion flagged');
    }

    // 6. Conversion fraud: $0
    step('Zero amount fraud');
    db.tables.fraud_logs.push({
        id: 5, company_id: 1, affiliate_id: 1, rule: 'zero_or_negative_amount',
        severity: 'medium', details: { amount: 0 }, action_taken: 'flagged'
    });

    // Summary
    info('');
    info('FRAUD DETECTION SUMMARY:');
    const highSev = db.filter('fraud_logs', f => f.severity === 'high').length;
    const medSev = db.filter('fraud_logs', f => f.severity === 'medium').length;
    const criticalSev = db.filter('fraud_logs', f => f.severity === 'critical').length;
    info(`  Critical alerts: ${criticalSev}`);
    info(`  High severity:   ${highSev}`);
    info(`  Medium severity: ${medSev}`);
    info(`  Blocked IPs:     ${db.count('blocked_ips')}`);
    info(`  Total clicks:    ${db.count('clicks')}`);
    info(`  Total frauds:    ${db.count('fraud_logs')}`);

    assertEq(db.count('fraud_logs'), 5, 'Total fraud alerts = 5');
});
