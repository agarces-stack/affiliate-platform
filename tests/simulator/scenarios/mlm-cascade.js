// ESCENARIO: Cadena MLM con 4 niveles
// CEO → Director → Manager → Lider → Agente
// Agente vende $1000, override sube por la cadena
// Modo DIFFERENCE (estándar seguros)

const { scenario, step, ok, info, assert, assertEq, assertClose, mockDb } = require('../simulator');

module.exports = scenario('MLM Override Cascade (4 niveles, modo difference)', async () => {
    const db = mockDb._instance;

    // Setup: 5 agentes en cadena
    info('Setup: MLM chain of 5 agents');
    const agents = [
        { id: 1, ref_id: 'CEO001', first_name: 'CEO', rank: 10, parent_affiliate_id: null },  // CEO 15%
        { id: 2, ref_id: 'DIR001', first_name: 'Director', rank: 7, parent_affiliate_id: 1 }, // Director 12%
        { id: 3, ref_id: 'MGR001', first_name: 'Manager', rank: 5, parent_affiliate_id: 2 },  // Manager 10%
        { id: 4, ref_id: 'LDR001', first_name: 'Lider', rank: 3, parent_affiliate_id: 3 },    // Lider 9%
        { id: 5, ref_id: 'AGT001', first_name: 'Agente', rank: 1, parent_affiliate_id: 4 },   // Agente 7%
    ];
    agents.forEach(a => {
        db.tables.affiliates.push({
            ...a, company_id: 1, email: `${a.ref_id}@test.com`,
            password_hash: '$2a$10$test', status: 'approved',
            balance: 0, available_balance: 0, total_commission: 0, total_conversions: 0
        });
    });

    // Campaña
    db.tables.campaigns.push({
        id: 1, company_id: 1, name: 'Seguro Vida', url: 'https://test.com',
        status: 'active', commission_type: 'revshare', commission_percent: 7
    });

    // Comisiones por rango (modo difference: cada rango tiene su % directo)
    const rankPercents = { 1: 7, 3: 9, 5: 10, 7: 12, 10: 15 };
    Object.entries(rankPercents).forEach(([rank, pct], i) => {
        db.tables.rank_commissions.push({
            id: i + 1, company_id: 1, rank_id: parseInt(rank), campaign_id: 1,
            direct_commission_percent: pct, direct_commission_fixed: 0,
            override_commission_percent: 0, override_commission_fixed: 0,
            override_by_level: []
        });
    });

    // VENTA: Agente (rank 1, 7%) vende $1000
    step('Agent sells $1000 policy');
    const saleAmount = 1000;
    const agentCommission = saleAmount * 0.07; // $70
    const agent = db.tables.affiliates[4]; // agente

    db.tables.conversions.push({
        id: 1, company_id: 1, campaign_id: 1, affiliate_id: 5,
        amount: saleAmount, commission: agentCommission,
        status: 'pending', tracking_method: 's2s'
    });
    agent.balance += agentCommission;
    agent.total_commission += agentCommission;
    agent.total_conversions++;
    ok(`Agent earned $${agentCommission}`);

    // OVERRIDE CASCADE (modo difference)
    info('');
    info('Calculating override cascade (difference mode)...');

    // Lider gana la diferencia entre su 9% y el 7% del agente = 2%
    step('Lider override (9% - 7% = 2%)');
    const liderOverride = saleAmount * (9 - 7) / 100;
    db.tables.affiliates[3].balance += liderOverride;
    db.tables.affiliates[3].total_commission += liderOverride;
    db.tables.mlm_commissions.push({
        id: 1, conversion_id: 1, affiliate_id: 4, source_affiliate_id: 5,
        level: 1, commission: liderOverride
    });
    assertClose(liderOverride, 20, 'Lider override = $20');

    // Manager gana la diferencia entre su 10% y el 9% del lider = 1%
    step('Manager override (10% - 9% = 1%)');
    const managerOverride = saleAmount * (10 - 9) / 100;
    db.tables.affiliates[2].balance += managerOverride;
    db.tables.affiliates[2].total_commission += managerOverride;
    db.tables.mlm_commissions.push({
        id: 2, conversion_id: 1, affiliate_id: 3, source_affiliate_id: 5,
        level: 2, commission: managerOverride
    });
    assertClose(managerOverride, 10, 'Manager override = $10');

    // Director gana la diferencia entre su 12% y el 10% del manager = 2%
    step('Director override (12% - 10% = 2%)');
    const directorOverride = saleAmount * (12 - 10) / 100;
    db.tables.affiliates[1].balance += directorOverride;
    db.tables.affiliates[1].total_commission += directorOverride;
    db.tables.mlm_commissions.push({
        id: 3, conversion_id: 1, affiliate_id: 2, source_affiliate_id: 5,
        level: 3, commission: directorOverride
    });
    assertClose(directorOverride, 20, 'Director override = $20');

    // CEO gana la diferencia entre su 15% y el 12% del director = 3%
    step('CEO override (15% - 12% = 3%)');
    const ceoOverride = saleAmount * (15 - 12) / 100;
    db.tables.affiliates[0].balance += ceoOverride;
    db.tables.affiliates[0].total_commission += ceoOverride;
    db.tables.mlm_commissions.push({
        id: 4, conversion_id: 1, affiliate_id: 1, source_affiliate_id: 5,
        level: 4, commission: ceoOverride
    });
    assertClose(ceoOverride, 30, 'CEO override = $30');

    // VERIFICACIÓN: total pagado debe ser 15% del monto (el rango más alto)
    step('Total commission paid check');
    const totalPaid = agentCommission + liderOverride + managerOverride + directorOverride + ceoOverride;
    assertClose(totalPaid, 150, 'Total paid = $150 (15% of $1000)');

    info('');
    info('COMMISSION BREAKDOWN:');
    info(`  Agent (7%):    $${agentCommission}`);
    info(`  Lider (+2%):   $${liderOverride}`);
    info(`  Manager (+1%): $${managerOverride}`);
    info(`  Director (+2%):$${directorOverride}`);
    info(`  CEO (+3%):     $${ceoOverride}`);
    info(`  ─────────────────────────`);
    info(`  TOTAL:         $${totalPaid} (15% of sale)`);
    info('');
    info('Balance de cada agente:');
    db.tables.affiliates.forEach(a => {
        info(`  ${a.first_name} (rank ${a.rank}): $${a.balance.toFixed(2)}`);
    });

    // Verify count
    assertEq(db.count('mlm_commissions'), 4, 'MLM commissions recorded = 4');
});
