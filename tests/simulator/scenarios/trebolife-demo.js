// ESCENARIO: Demo completo de Trebolife
// Simula una semana típica de operaciones de una agencia de seguros multinivel
//
// Catálogo real de Trebolife: 18 productos en 5 categorías
// - 4 productos de Vida
// - 4 productos de Salud
// - 4 productos de Auto
// - 3 productos de Dental
// - 3 productos de Hogar
//
// Estructura de agencia: 15 agentes en 4 niveles de jerarquía
// Override mode: "difference" (estándar de seguros)

const { scenario, step, ok, info, assert, assertEq, assertClose, mockDb, c, log } = require('../simulator');

module.exports = scenario('Trebolife: Semana Típica de Operaciones', async () => {
    const db = mockDb._instance;

    // Actualizar empresa a Trebolife
    db.tables.companies[0].name = 'Trebolife';
    db.tables.companies[0].slug = 'trebolife';
    db.tables.companies[0].domain = 'trebolife.com';
    db.tables.companies[0].override_mode = 'difference';

    // ============================================
    // PASO 1: CATÁLOGO - 18 productos de Trebolife
    // ============================================
    log('\n▸ PASO 1: Cargando catálogo de Trebolife (18 productos)', 'cyan');

    // Campaña principal
    db.tables.campaigns.push({
        id: 1, company_id: 1, name: 'Trebolife - Affiliate Program',
        url: 'https://trebolife.com', status: 'active',
        commission_type: 'revshare', commission_percent: 15, cookie_days: 30
    });

    // 18 productos reales
    const trebolifeProducts = [
        // Vida (4)
        { sku: 'VIDA-TERM10', name: 'Seguro de Vida Temporal 10 años', category: 'vida', price: 35 },
        { sku: 'VIDA-TERM20', name: 'Seguro de Vida Temporal 20 años', category: 'vida', price: 55 },
        { sku: 'VIDA-WHOLE', name: 'Seguro de Vida Entera', category: 'vida', price: 150 },
        { sku: 'VIDA-PREMIUM', name: 'Seguro de Vida Premium (Universal)', category: 'vida', price: 250 },
        // Salud (4)
        { sku: 'SALUD-BASIC', name: 'Plan de Salud Básico', category: 'salud', price: 80 },
        { sku: 'SALUD-FAMILY', name: 'Plan de Salud Familiar', category: 'salud', price: 180 },
        { sku: 'SALUD-PREMIUM', name: 'Plan de Salud Premium', category: 'salud', price: 320 },
        { sku: 'SALUD-CRITICAL', name: 'Seguro de Enfermedades Críticas', category: 'salud', price: 95 },
        // Auto (4)
        { sku: 'AUTO-BASIC', name: 'Seguro Auto Básico', category: 'auto', price: 65 },
        { sku: 'AUTO-FULL', name: 'Seguro Auto Cobertura Completa', category: 'auto', price: 135 },
        { sku: 'AUTO-COMMERCIAL', name: 'Seguro Auto Comercial', category: 'auto', price: 220 },
        { sku: 'AUTO-MOTO', name: 'Seguro de Motocicleta', category: 'auto', price: 45 },
        // Dental (3)
        { sku: 'DENTAL-BASIC', name: 'Plan Dental Básico', category: 'dental', price: 25 },
        { sku: 'DENTAL-FAMILY', name: 'Plan Dental Familiar', category: 'dental', price: 55 },
        { sku: 'DENTAL-ORTHO', name: 'Plan Dental con Ortodoncia', category: 'dental', price: 95 },
        // Hogar (3)
        { sku: 'HOGAR-RENTER', name: 'Seguro de Inquilino', category: 'hogar', price: 30 },
        { sku: 'HOGAR-HOMEOWNER', name: 'Seguro de Propietario', category: 'hogar', price: 120 },
        { sku: 'HOGAR-PREMIUM', name: 'Seguro de Hogar Premium', category: 'hogar', price: 200 },
    ];

    trebolifeProducts.forEach((p, i) => {
        db.tables.products.push({
            id: i + 1, company_id: 1, campaign_id: 1,
            sku: p.sku, name: p.name, category: p.category, price: p.price,
            commission_type: 'revshare', commission_percent: 15, commission_amount: 0,
            is_recurring: true, renewal_period_months: 12,
            renewal_commission_percent: 3, status: 'active'
        });
    });

    ok(`18 productos cargados en catálogo`);
    info('Categorías: Vida (4), Salud (4), Auto (4), Dental (3), Hogar (3)');
    info('Todos con renovación anual y 3% comisión recurrente');

    // ============================================
    // PASO 2: COMISIONES POR RANGO (modo difference)
    // ============================================
    log('\n▸ PASO 2: Configurando comisiones por rango (modo difference)', 'cyan');

    const rankCommissions = [
        { rank: 1, name: 'Agente', direct: 7 },
        { rank: 2, name: 'Agente Senior', direct: 8.5 },
        { rank: 3, name: 'Líder', direct: 10 },
        { rank: 4, name: 'Líder Senior', direct: 11 },
        { rank: 5, name: 'Manager', direct: 12 },
        { rank: 6, name: 'Manager Senior', direct: 13 },
        { rank: 7, name: 'Director', direct: 14 },
        { rank: 8, name: 'Director Senior', direct: 15 },
        { rank: 9, name: 'VP', direct: 16 },
        { rank: 10, name: 'Propietario', direct: 17 },
    ];

    rankCommissions.forEach((rc, i) => {
        db.tables.rank_commissions.push({
            id: i + 1, company_id: 1, rank_id: rc.rank, campaign_id: 1,
            direct_commission_percent: rc.direct, direct_commission_fixed: 0,
            override_commission_percent: 0, override_commission_fixed: 0,
            override_by_level: []
        });
        // Actualizar nombres de rangos
        const rank = db.tables.ranks.find(r => r.rank_number === rc.rank);
        if (rank) rank.name = rc.name;
    });

    ok('Comisiones configuradas del 7% (Agente) al 17% (Propietario)');
    info('Override se calcula por diferencia entre rangos (compresión automática)');

    // ============================================
    // PASO 3: ESTRUCTURA DE AGENCIA (15 agentes)
    // ============================================
    log('\n▸ PASO 3: Creando estructura de agencia', 'cyan');

    // CEO → 2 Directores → 4 Managers → 8 Agentes
    const hierarchy = [
        { id: 1, name: 'Carlos Rodríguez', role: 'CEO', rank: 10, parent: null },
        // Directores
        { id: 2, name: 'María García', role: 'Director Norte', rank: 7, parent: 1 },
        { id: 3, name: 'Juan Hernández', role: 'Director Sur', rank: 7, parent: 1 },
        // Managers bajo María
        { id: 4, name: 'Ana Martínez', role: 'Manager Miami', rank: 5, parent: 2 },
        { id: 5, name: 'Luis Pérez', role: 'Manager Orlando', rank: 5, parent: 2 },
        // Managers bajo Juan
        { id: 6, name: 'Sofía López', role: 'Manager Houston', rank: 5, parent: 3 },
        { id: 7, name: 'Roberto Díaz', role: 'Manager Dallas', rank: 5, parent: 3 },
        // Agentes bajo Ana
        { id: 8, name: 'Pedro Ramírez', role: 'Agente Senior', rank: 2, parent: 4 },
        { id: 9, name: 'Laura Torres', role: 'Agente', rank: 1, parent: 4 },
        // Agentes bajo Luis
        { id: 10, name: 'Miguel Sánchez', role: 'Agente Senior', rank: 2, parent: 5 },
        { id: 11, name: 'Carmen Ruiz', role: 'Agente', rank: 1, parent: 5 },
        // Agentes bajo Sofía
        { id: 12, name: 'Jorge Castillo', role: 'Agente Senior', rank: 2, parent: 6 },
        { id: 13, name: 'Elena Morales', role: 'Agente', rank: 1, parent: 6 },
        // Agentes bajo Roberto
        { id: 14, name: 'Diego Flores', role: 'Agente Senior', rank: 2, parent: 7 },
        { id: 15, name: 'Patricia Vega', role: 'Agente', rank: 1, parent: 7 },
    ];

    hierarchy.forEach(h => {
        db.tables.affiliates.push({
            id: h.id, company_id: 1, ref_id: `TRB${String(h.id).padStart(3, '0')}`,
            email: `${h.name.toLowerCase().replace(' ', '.')}@trebolife.com`,
            password_hash: '$2a$10$test', first_name: h.name.split(' ')[0],
            last_name: h.name.split(' ')[1], rank: h.rank, status: 'approved',
            parent_affiliate_id: h.parent, balance: 0, available_balance: 0,
            total_clicks: 0, total_conversions: 0, total_revenue: 0, total_commission: 0
        });
    });

    ok(`15 agentes creados en 4 niveles`);
    info('CEO → 2 Directores → 4 Managers → 8 Agentes');

    // ============================================
    // PASO 4: UNA SEMANA DE VENTAS (25 ventas simuladas)
    // ============================================
    log('\n▸ PASO 4: Simulando una semana de ventas', 'cyan');

    // Cada venta: agente, producto, monto (= price * 12 meses primer año)
    const salesWeek = [
        // Lunes
        { agent: 9, product: 2, day: 'Lun' },   // Laura vende Vida Term 20
        { agent: 13, product: 5, day: 'Lun' },  // Elena vende Salud Family
        { agent: 15, product: 9, day: 'Lun' },  // Patricia vende Auto Básico
        // Martes
        { agent: 11, product: 3, day: 'Mar' },  // Carmen vende Vida Entera
        { agent: 9, product: 10, day: 'Mar' },  // Laura vende Auto Full
        { agent: 8, product: 4, day: 'Mar' },   // Pedro vende Vida Premium
        { agent: 14, product: 7, day: 'Mar' },  // Diego vende Salud Premium
        // Miércoles
        { agent: 13, product: 13, day: 'Mié' }, // Elena vende Dental Family
        { agent: 15, product: 1, day: 'Mié' },  // Patricia vende Vida Term 10
        { agent: 10, product: 11, day: 'Mié' }, // Miguel vende Auto Comercial
        { agent: 12, product: 8, day: 'Mié' },  // Jorge vende Salud Critical
        // Jueves
        { agent: 9, product: 6, day: 'Jue' },   // Laura vende Plan Salud Básico
        { agent: 11, product: 17, day: 'Jue' }, // Carmen vende Hogar Homeowner
        { agent: 8, product: 18, day: 'Jue' },  // Pedro vende Hogar Premium
        { agent: 14, product: 2, day: 'Jue' },  // Diego vende Vida Term 20
        { agent: 15, product: 14, day: 'Jue' }, // Patricia vende Dental Ortho
        // Viernes
        { agent: 13, product: 16, day: 'Vie' }, // Elena vende Hogar Inquilino
        { agent: 9, product: 3, day: 'Vie' },   // Laura vende Vida Entera
        { agent: 10, product: 5, day: 'Vie' },  // Miguel vende Salud Family
        { agent: 12, product: 12, day: 'Vie' }, // Jorge vende Auto Moto
        // Sábado (top day)
        { agent: 8, product: 4, day: 'Sáb' },   // Pedro vende Vida Premium ★
        { agent: 14, product: 7, day: 'Sáb' },  // Diego vende Salud Premium ★
        { agent: 9, product: 10, day: 'Sáb' },  // Laura vende Auto Full
        { agent: 13, product: 2, day: 'Sáb' },  // Elena vende Vida Term 20
        { agent: 11, product: 15, day: 'Sáb' }, // Carmen vende Dental Ortho
    ];

    let totalRevenue = 0;
    let totalDirectCommission = 0;
    let totalOverrideCommission = 0;
    let conversionId = 1;
    let mlmCommissionId = 1;

    for (const sale of salesWeek) {
        const product = db.tables.products[sale.product - 1];
        const agent = db.tables.affiliates.find(a => a.id === sale.agent);
        const amount = product.price * 12; // prima anual

        // Comisión directa = % del rango del agente
        const agentRankPct = rankCommissions.find(r => r.rank === agent.rank).direct;
        const directCommission = amount * agentRankPct / 100;

        db.tables.conversions.push({
            id: conversionId, company_id: 1, campaign_id: 1, affiliate_id: agent.id,
            product_id: product.id, order_id: `TRB-${conversionId.toString().padStart(5, '0')}`,
            amount, commission: directCommission, commission_type: 'rank_based',
            status: 'approved', tracking_method: 's2s'
        });

        agent.balance += directCommission;
        agent.total_commission += directCommission;
        agent.total_revenue += amount;
        agent.total_conversions++;

        totalRevenue += amount;
        totalDirectCommission += directCommission;

        // CÁLCULO DE OVERRIDE POR DIFERENCIA (cadena ascendente)
        let currentAgentId = agent.id;
        let previousPct = agentRankPct;
        let currentParent = db.tables.affiliates.find(a => a.id === agent.parent_affiliate_id);

        while (currentParent) {
            const parentPct = rankCommissions.find(r => r.rank === currentParent.rank).direct;
            const diffPct = parentPct - previousPct;

            if (diffPct > 0) {
                const overrideAmount = amount * diffPct / 100;
                currentParent.balance += overrideAmount;
                currentParent.total_commission += overrideAmount;
                totalOverrideCommission += overrideAmount;

                db.tables.mlm_commissions.push({
                    id: mlmCommissionId++, conversion_id: conversionId,
                    affiliate_id: currentParent.id, source_affiliate_id: agent.id,
                    level: 1, commission: overrideAmount
                });
            }

            previousPct = parentPct;
            currentParent = db.tables.affiliates.find(a => a.id === currentParent.parent_affiliate_id);
        }

        conversionId++;
    }

    ok(`25 ventas registradas`);
    info(`Revenue total de la semana: $${totalRevenue.toFixed(2)}`);
    info(`Comisiones directas: $${totalDirectCommission.toFixed(2)}`);
    info(`Overrides distribuidos: $${totalOverrideCommission.toFixed(2)}`);
    info(`Total comisiones: $${(totalDirectCommission + totalOverrideCommission).toFixed(2)}`);
    info(`% del revenue: ${((totalDirectCommission + totalOverrideCommission) / totalRevenue * 100).toFixed(1)}%`);

    // ============================================
    // PASO 5: ANÁLISIS POR AGENTE
    // ============================================
    log('\n▸ PASO 5: Top performers de la semana', 'cyan');

    const sortedAgents = [...db.tables.affiliates].sort((a, b) => b.balance - a.balance);

    info('');
    info('RANKING DE GANANCIAS:');
    info('─────────────────────────────────────────────────────────');
    sortedAgents.slice(0, 10).forEach((a, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
        const rankName = db.tables.ranks.find(r => r.rank_number === a.rank)?.name || `R${a.rank}`;
        info(`  ${medal} ${(i + 1).toString().padStart(2)}. ${a.first_name.padEnd(10)} ${a.last_name.padEnd(12)} [${rankName.padEnd(12)}] $${a.balance.toFixed(2).padStart(10)}`);
    });

    // ============================================
    // PASO 6: ANÁLISIS POR RANGO
    // ============================================
    log('\n▸ PASO 6: Distribución de comisiones por rango', 'cyan');

    const byRank = {};
    db.tables.affiliates.forEach(a => {
        if (!byRank[a.rank]) byRank[a.rank] = { count: 0, totalComm: 0, totalSales: 0 };
        byRank[a.rank].count++;
        byRank[a.rank].totalComm += a.total_commission;
        byRank[a.rank].totalSales += a.total_conversions;
    });

    info('');
    info('COMISIONES POR RANGO:');
    info('─────────────────────────────────────────────────────────');
    Object.entries(byRank).sort((a, b) => b[0] - a[0]).forEach(([rank, data]) => {
        const name = db.tables.ranks.find(r => r.rank_number === parseInt(rank))?.name || `R${rank}`;
        const avg = data.count > 0 ? data.totalComm / data.count : 0;
        info(`  ${name.padEnd(15)} ${data.count} personas · ${data.totalSales} ventas · $${data.totalComm.toFixed(2)} total · $${avg.toFixed(2)} promedio`);
    });

    // ============================================
    // PASO 7: PRODUCTOS MÁS VENDIDOS
    // ============================================
    log('\n▸ PASO 7: Productos más vendidos', 'cyan');

    const productStats = {};
    db.tables.conversions.forEach(c => {
        const p = db.tables.products[c.product_id - 1];
        if (!productStats[p.category]) productStats[p.category] = { count: 0, revenue: 0, items: {} };
        productStats[p.category].count++;
        productStats[p.category].revenue += parseFloat(c.amount);
        productStats[p.category].items[p.name] = (productStats[p.category].items[p.name] || 0) + 1;
    });

    info('');
    info('VENTAS POR CATEGORÍA:');
    info('─────────────────────────────────────────────────────────');
    Object.entries(productStats).sort((a, b) => b[1].revenue - a[1].revenue).forEach(([cat, data]) => {
        info(`  ${cat.toUpperCase().padEnd(10)} ${data.count.toString().padStart(3)} ventas · $${data.revenue.toFixed(2).padStart(10)}`);
    });

    // ============================================
    // PASO 8: VERIFICACIONES FINALES
    // ============================================
    log('\n▸ PASO 8: Verificaciones del sistema', 'cyan');

    step('Total de conversiones');
    assertEq(db.count('conversions'), 25, '25 conversiones registradas');

    step('Total de comisiones MLM');
    assert(db.count('mlm_commissions') > 0, 'Overrides distribuidos correctamente');

    step('Balance del CEO');
    const ceo = db.tables.affiliates.find(a => a.rank === 10);
    assert(ceo.balance > 0, `CEO ganó $${ceo.balance.toFixed(2)} en overrides`);

    step('Balance total del equipo');
    const totalBalance = db.tables.affiliates.reduce((sum, a) => sum + a.balance, 0);
    assertClose(totalBalance, totalDirectCommission + totalOverrideCommission,
        'Suma de balances = total comisiones', 0.5);

    step('Cada venta tiene una conversión');
    assertEq(db.count('conversions'), salesWeek.length, 'Conversiones = ventas');

    // ============================================
    // RESUMEN EJECUTIVO
    // ============================================
    log('\n╔══════════════════════════════════════════════════════════╗', 'green');
    log('║            TREBOLIFE - RESUMEN SEMANAL                   ║', 'green');
    log('╚══════════════════════════════════════════════════════════╝', 'green');
    log('', 'reset');
    log(`  Productos en catálogo:    18`, 'blue');
    log(`  Agentes activos:          ${db.count('affiliates')}`, 'blue');
    log(`  Ventas esta semana:       ${salesWeek.length}`, 'blue');
    log(`  Revenue generado:         $${totalRevenue.toFixed(2)}`, 'green');
    log(`  Comisiones directas:      $${totalDirectCommission.toFixed(2)}`, 'green');
    log(`  Overrides (MLM):          $${totalOverrideCommission.toFixed(2)}`, 'green');
    log(`  ─────────────────────────────────────`, 'gray');
    log(`  TOTAL PAGADO:             $${(totalDirectCommission + totalOverrideCommission).toFixed(2)}`, 'bold');
    log(`  % del revenue:            ${((totalDirectCommission + totalOverrideCommission) / totalRevenue * 100).toFixed(1)}%`, 'bold');
    log('', 'reset');
    log(`  Ventas promedio por día:  ${(salesWeek.length / 6).toFixed(1)}`, 'gray');
    log(`  Revenue promedio/venta:   $${(totalRevenue / salesWeek.length).toFixed(2)}`, 'gray');
    log(`  Comisión promedio/venta:  $${((totalDirectCommission + totalOverrideCommission) / salesWeek.length).toFixed(2)}`, 'gray');
});
