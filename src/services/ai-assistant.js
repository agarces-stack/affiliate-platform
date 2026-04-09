const db = require('../models/db');

const SYSTEM_PROMPT = `Eres el asistente AI de MagnetRaffic, una plataforma de gestión de equipos de ventas multinivel para agencias de seguros y distribuidores.

Tu trabajo es interpretar lo que el admin quiere crear y generar la configuración exacta en JSON.

La plataforma tiene:
- Campañas (grupos de productos)
- Productos con SKU, precio, categoría, comisiones
- Goals (etapas: lead, quote, application, policy_bound, first_payment, renewal)
- Rangos 1-10 (Agente, Agente Senior, Líder, Líder Senior, Manager, Manager Senior, Director, Director Senior, VP, Propietario)
- Comisiones directas (% + fija) por rango
- Override commissions (el upline gana sobre ventas del equipo)
- Modo override: "fixed" (cada rango tiene su %) o "difference" (gana la diferencia de % entre rangos)
- Renovaciones con comisión recurrente
- Commission groups para agrupar agentes

SIEMPRE responde con JSON válido y NADA MÁS. El JSON debe seguir esta estructura:

{
  "summary": "Descripción breve de lo que se va a crear",
  "campaign": {
    "name": "string",
    "description": "string",
    "url": "string o null",
    "commission_type": "cpa|revshare|hybrid",
    "commission_amount": 0,
    "commission_percent": 0
  },
  "products": [
    {
      "name": "string",
      "sku": "STRING-CODE",
      "category": "string",
      "price": 0,
      "commission_type": "hybrid",
      "commission_amount": 0,
      "commission_percent": 0,
      "is_recurring": false,
      "renewal_period_months": 12,
      "renewal_commission_percent": 0,
      "goals": [
        {
          "slug": "string_snake_case",
          "name": "string",
          "step_order": 1,
          "commission_type": "cpa|revshare|hybrid",
          "commission_amount": 0,
          "commission_percent": 0,
          "is_final": false,
          "triggers_renewal": false,
          "requires_previous_goal": false
        }
      ]
    }
  ],
  "rank_commissions": [
    {
      "rank_number": 1,
      "rank_name": "Agente",
      "direct_commission_percent": 0,
      "direct_commission_fixed": 0,
      "override_commission_percent": 0,
      "override_commission_fixed": 0
    }
  ],
  "override_mode": "fixed|difference",
  "suggestions": ["string array de sugerencias o advertencias"]
}

Si el admin no especifica algo, usa valores razonables para la industria de seguros.
Si el admin pide algo que no tiene sentido, explícalo en "suggestions".
Genera SKUs en mayúsculas con guiones (ej: VIDA-PREMIUM, SALUD-BASIC).`;

async function askAI(prompt, companyId) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // Obtener contexto de la empresa
    let context = '';
    try {
        const ranks = await db.query('SELECT rank_number, name FROM ranks WHERE company_id = $1 ORDER BY rank_number', [companyId]);
        const campaigns = await db.query('SELECT name FROM campaigns WHERE company_id = $1', [companyId]);
        const products = await db.query('SELECT name, sku, category FROM products WHERE company_id = $1', [companyId]);
        const company = await db.query('SELECT name, override_mode FROM companies WHERE id = $1', [companyId]);

        context = `\n\nContexto de la empresa "${company.rows[0]?.name}":
- Override mode actual: ${company.rows[0]?.override_mode || 'fixed'}
- Rangos configurados: ${ranks.rows.map(r => `${r.rank_number}=${r.name}`).join(', ')}
- Campañas existentes: ${campaigns.rows.map(c => c.name).join(', ') || 'ninguna'}
- Productos existentes: ${products.rows.map(p => `${p.name} (${p.sku})`).join(', ') || 'ninguno'}`;
    } catch (e) {
        // Context is optional
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: SYSTEM_PROMPT + context,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `AI API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.content[0]?.text || '';

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    return JSON.parse(jsonMatch[0]);
}

// Aplicar la configuración generada por AI
async function applyAIConfig(config, companyId) {
    const results = { campaign: null, products: [], rank_commissions: [] };

    // 1. Crear campaña
    if (config.campaign) {
        const c = config.campaign;
        const result = await db.query(
            `INSERT INTO campaigns (company_id, name, description, url, commission_type, commission_amount, commission_percent)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [companyId, c.name, c.description || null, c.url || 'https://example.com',
             c.commission_type || 'hybrid', c.commission_amount || 0, c.commission_percent || 0]
        );
        results.campaign = result.rows[0];
    }

    const campaignId = results.campaign?.id;

    // 2. Crear productos con goals
    if (config.products?.length) {
        for (const p of config.products) {
            const prod = await db.query(
                `INSERT INTO products (company_id, campaign_id, sku, name, category, price,
                 commission_type, commission_amount, commission_percent, is_recurring,
                 renewal_period_months, renewal_commission_percent)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
                [companyId, campaignId, p.sku || null, p.name, p.category || null,
                 p.price || 0, p.commission_type || 'hybrid', p.commission_amount || 0,
                 p.commission_percent || 0, p.is_recurring || false,
                 p.renewal_period_months || 12, p.renewal_commission_percent || 0]
            );

            const prodResult = { ...prod.rows[0], goals: [] };

            // Crear goals
            if (p.goals?.length) {
                for (const g of p.goals) {
                    const goal = await db.query(
                        `INSERT INTO goals (company_id, product_id, slug, name, step_order,
                         commission_type, commission_amount, commission_percent,
                         is_final, triggers_renewal, requires_previous_goal)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
                        [companyId, prod.rows[0].id, g.slug, g.name, g.step_order || 1,
                         g.commission_type || 'cpa', g.commission_amount || 0,
                         g.commission_percent || 0, g.is_final || false,
                         g.triggers_renewal || false, g.requires_previous_goal || false]
                    );
                    prodResult.goals.push(goal.rows[0]);
                }
            }
            results.products.push(prodResult);
        }
    }

    // 3. Configurar comisiones por rango
    if (config.rank_commissions?.length && campaignId) {
        for (const rc of config.rank_commissions) {
            const rank = await db.query(
                'SELECT id FROM ranks WHERE company_id = $1 AND rank_number = $2',
                [companyId, rc.rank_number]
            );
            if (rank.rows.length === 0) continue;

            await db.query(
                `INSERT INTO rank_commissions (company_id, rank_id, campaign_id,
                 direct_commission_percent, direct_commission_fixed,
                 override_commission_percent, override_commission_fixed)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)
                 ON CONFLICT (rank_id, campaign_id) DO UPDATE SET
                 direct_commission_percent = $4, direct_commission_fixed = $5,
                 override_commission_percent = $6, override_commission_fixed = $7`,
                [companyId, rank.rows[0].id, campaignId,
                 rc.direct_commission_percent || 0, rc.direct_commission_fixed || 0,
                 rc.override_commission_percent || 0, rc.override_commission_fixed || 0]
            );
            results.rank_commissions.push(rc);
        }
    }

    // 4. Actualizar override mode si se especificó
    if (config.override_mode) {
        await db.query('UPDATE companies SET override_mode = $1 WHERE id = $2', [config.override_mode, companyId]);
    }

    return results;
}

module.exports = { askAI, applyAIConfig };
