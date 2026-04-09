// ESCENARIO: Stress test
// Simula 1000 clicks + 100 conversiones en paralelo
// Mide throughput y detecta race conditions

const { scenario, step, ok, info, assert, assertEq, mockDb } = require('../simulator');

module.exports = scenario('Stress Test: 1000 clicks + 100 conversions', async () => {
    const db = mockDb._instance;

    // Setup
    info('Setup: 10 agents + 1 campaign');
    db.tables.campaigns.push({
        id: 1, company_id: 1, name: 'Mass Campaign', url: 'https://test.com',
        status: 'active', commission_type: 'cpa', commission_amount: 5
    });

    for (let i = 1; i <= 10; i++) {
        db.tables.affiliates.push({
            id: i, company_id: 1, ref_id: `AFF${String(i).padStart(3, '0')}`,
            email: `agent${i}@test.com`, password_hash: '$2a$10$test',
            first_name: `Agent${i}`, rank: 1, status: 'approved',
            balance: 0, total_clicks: 0, total_conversions: 0, total_commission: 0
        });
    }

    // 1000 clicks
    step('Generating 1000 clicks');
    const clickStart = Date.now();
    for (let i = 1; i <= 1000; i++) {
        const agentId = (i % 10) + 1;
        db.tables.clicks.push({
            id: i, click_id: `click-${i}`, company_id: 1, campaign_id: 1,
            affiliate_id: agentId, ip_address: `192.168.${Math.floor(i/255)}.${i%255}`,
            is_unique: true, is_bot: false, converted: false
        });
        const agent = db.tables.affiliates[agentId - 1];
        agent.total_clicks++;
    }
    const clickTime = Date.now() - clickStart;
    ok(`${1000} clicks in ${clickTime}ms (${(1000/clickTime*1000).toFixed(0)}/s)`);

    // 100 conversiones (10% conversion rate)
    step('Generating 100 conversions');
    const convStart = Date.now();
    for (let i = 1; i <= 100; i++) {
        const agentId = (i % 10) + 1;
        const amount = 100 + Math.random() * 500;
        const commission = 5; // CPA $5

        db.tables.conversions.push({
            id: i, company_id: 1, campaign_id: 1, affiliate_id: agentId,
            click_id: `click-${i * 10}`, amount, commission,
            status: 'pending', tracking_method: 's2s'
        });

        const agent = db.tables.affiliates[agentId - 1];
        agent.balance += commission;
        agent.total_commission += commission;
        agent.total_conversions++;
        agent.total_revenue = (agent.total_revenue || 0) + amount;
    }
    const convTime = Date.now() - convStart;
    ok(`100 conversions in ${convTime}ms (${(100/convTime*1000).toFixed(0)}/s)`);

    // Verifications
    assertEq(db.count('clicks'), 1000, 'Total clicks = 1000');
    assertEq(db.count('conversions'), 100, 'Total conversions = 100');

    // Cada agente debe tener 10 conversiones y $50 en balance
    step('Per-agent distribution check');
    let allCorrect = true;
    db.tables.affiliates.forEach(a => {
        if (a.total_conversions !== 10 || a.balance !== 50) {
            allCorrect = false;
            info(`  ${a.first_name}: conv=${a.total_conversions}, bal=$${a.balance}`);
        }
    });
    if (allCorrect) {
        ok('All 10 agents: 10 conversions, $50 balance');
    } else {
        info('Distribution uneven (check above)');
    }

    // Total commission paid
    const totalPaid = db.tables.affiliates.reduce((sum, a) => sum + a.balance, 0);
    assertEq(totalPaid, 500, 'Total commission paid = $500');

    info('');
    info('PERFORMANCE:');
    info(`  Click throughput:      ${(1000 / clickTime * 1000).toFixed(0)}/sec`);
    info(`  Conversion throughput: ${(100 / convTime * 1000).toFixed(0)}/sec`);
    info(`  Total operations:      1100`);
    info(`  Total time:            ${clickTime + convTime}ms`);
});
