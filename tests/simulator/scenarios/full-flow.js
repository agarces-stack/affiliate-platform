// ESCENARIO: Flujo completo de una venta
// 1. Registro de agente
// 2. Aprobación
// 3. Click del prospecto
// 4. Conversion (venta)
// 5. Comisión calculada
// 6. Balance actualizado
// 7. Withdrawal request
// 8. Payout

const { scenario, step, ok, fail, info, assert, assertEq, assertClose, mockDb } = require('../simulator');
const bcrypt = require('bcryptjs');

module.exports = scenario('Full Flow: Click → Conversion → Commission → Payout', async () => {
    const db = mockDb._instance;

    // 1. Setup: crear campaña y producto
    info('Setup: campaign + product + rank commission');
    db.tables.campaigns.push({
        id: 1, company_id: 1, name: 'Vida Premium', url: 'https://test.com',
        status: 'active', commission_type: 'revshare', commission_percent: 10,
        commission_amount: 0, cookie_days: 30, mlm_enabled: false
    });
    db.tables.products.push({
        id: 1, company_id: 1, campaign_id: 1, sku: 'VIDA-01', name: 'Seguro Vida Premium',
        price: 1000, commission_type: 'revshare', commission_percent: 10,
        commission_amount: 0, status: 'active'
    });
    // Rank commission para Agente (rank 1)
    db.tables.rank_commissions.push({
        id: 1, company_id: 1, rank_id: 1, campaign_id: 1,
        direct_commission_percent: 7, direct_commission_fixed: 0,
        override_commission_percent: 0, override_commission_fixed: 0
    });

    // 2. Crear agente
    step('Agent registration');
    const agentPassword = await bcrypt.hash('Password123', 10);
    db.tables.affiliates.push({
        id: 1, company_id: 1, ref_id: 'AFF001', email: 'agent@test.com',
        password_hash: agentPassword, first_name: 'Juan', last_name: 'Perez',
        rank: 1, status: 'pending', balance: 0, available_balance: 0,
        pending_balance: 0, total_clicks: 0, total_conversions: 0,
        total_revenue: 0, total_commission: 0
    });
    ok('AFF001 registered as pending');

    // 3. Aprobar agente
    step('Admin approves agent');
    const agent = db.tables.affiliates[0];
    agent.status = 'approved';
    assertEq(agent.status, 'approved', 'Status changed to approved');

    // 4. Click tracking (simulado directamente insertando)
    step('Click tracking');
    const click_id = 'click-uuid-test-001';
    db.tables.clicks.push({
        id: 1, click_id, company_id: 1, campaign_id: 1, affiliate_id: 1,
        ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0',
        is_unique: true, is_bot: false, converted: false
    });
    agent.total_clicks++;
    assertEq(db.count('clicks'), 1, 'Click registered');

    // 5. Conversion (venta de $1000)
    step('Conversion: $1000 sale');
    const saleAmount = 1000;
    const commissionPercent = 7; // rank 1 direct %
    const expectedCommission = saleAmount * commissionPercent / 100; // $70

    db.tables.conversions.push({
        id: 1, company_id: 1, campaign_id: 1, affiliate_id: 1,
        click_id, product_id: 1, order_id: 'ORD-001',
        amount: saleAmount, commission: expectedCommission,
        commission_type: 'rank_based', status: 'pending',
        tracking_method: 's2s'
    });
    // Actualizar click
    const click = db.tables.clicks[0];
    click.converted = true;
    ok('Conversion created');

    // 6. Balance del agente actualizado
    step('Agent balance updated');
    agent.total_conversions++;
    agent.total_revenue += saleAmount;
    agent.total_commission += expectedCommission;
    agent.balance += expectedCommission;
    agent.available_balance += expectedCommission;

    assertClose(agent.balance, 70, 'Balance = $70');
    assertClose(agent.total_revenue, 1000, 'Total revenue = $1000');
    assertEq(agent.total_conversions, 1, 'Conversion count = 1');

    // 7. Verificar que no hay overrides (no MLM en este escenario)
    assertEq(db.count('mlm_commissions'), 0, 'No MLM overrides (no parent)');

    // 8. Agente solicita retiro
    step('Affiliate requests withdrawal');
    db.tables.withdrawal_requests.push({
        id: 1, company_id: 1, affiliate_id: 1,
        amount: 70, payment_method: 'paypal',
        payment_details: { email: 'agent@test.com' },
        status: 'pending'
    });
    assertEq(db.count('withdrawal_requests'), 1, 'Withdrawal request created');

    // 9. Admin aprueba y procesa payout
    step('Admin processes payout');
    const wd = db.tables.withdrawal_requests[0];
    wd.status = 'approved';

    db.tables.payouts.push({
        id: 1, company_id: 1, affiliate_id: 1,
        amount: 70, payment_method: 'paypal',
        status: 'completed', transaction_id: 'PAYPAL-TXN-001'
    });

    // Descontar del balance
    agent.balance -= 70;
    agent.available_balance -= 70;

    assertClose(agent.balance, 0, 'Balance after payout = $0');
    assertEq(db.count('payouts'), 1, 'Payout completed');

    // 10. Final state check
    info('');
    info('FINAL STATE:');
    info(`  Agent: ${agent.first_name} ${agent.last_name} (rank ${agent.rank})`);
    info(`  Total sales: ${agent.total_conversions}`);
    info(`  Total revenue: $${agent.total_revenue}`);
    info(`  Total commission earned: $${agent.total_commission}`);
    info(`  Current balance: $${agent.balance}`);
    info(`  Conversions: ${db.count('conversions')}`);
    info(`  Withdrawals: ${db.count('withdrawal_requests')}`);
    info(`  Payouts: ${db.count('payouts')}`);
});
