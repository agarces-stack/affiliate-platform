# TrackNow vs MagnetRaffic - Comparación completa

Última actualización: 2026-04-08

Source: https://docs.tracknow.io/

## PAYOUT GROUPS (Grupos de Pago)

| Feature | TrackNow | MagnetRaffic | Estado |
|---------|----------|-------------|--------|
| Crear grupos con comisiones diferentes | Yes | Yes - commission_groups | MR gana (tabla independiente) |
| Asignar afiliados a grupos | Yes | Yes - commission_group_id | Igual |
| Comisión diferente por evento/producto | Yes | Yes - group_commissions | Igual |
| Manager por grupo | Via User Management | Yes + 4 tipos de comisión | MR gana |
| Manager commission: % de comisión afiliado | No (solo acceso) | Yes - commission_based | MR gana |
| Manager commission: fijo por venta | No | Yes - fixed | MR gana |
| Manager commission: % del monto | No | Yes - amount_based | MR gana |
| Manager commission: split del afiliado | No | Yes - split | MR gana |
| Payout schedule por grupo | No (global) | Yes - override per group | MR gana |

## TIPOS DE COMISIÓN

| Modelo | TrackNow | MagnetRaffic | Estado |
|--------|----------|-------------|--------|
| CPA (fijo) | Yes | Yes | Igual |
| RevShare (%) | Yes | Yes | Igual |
| Hybrid (fijo + %) | Yes | Yes | Igual |
| CPC (por clic) | Yes | Yes - en tracking.js | Igual |
| CPM (por mil impresiones) | Yes | Yes - configurable via CPC | Igual |
| Tiered automático | Yes - 6 métricas, 5 timeframes | Yes - 5 métricas, 5 timeframes | Igual |
| Lifetime (por customer_id) | Yes | Yes - renewals + max_renewals=0 | Igual |
| Personal Payouts | Yes - ocultos | Yes - campaign_affiliates | Igual |
| Goal-Based | Yes - goal param | Yes - goals table + funnel | MR gana |
| Progressive (escalonada) | Yes | Yes - progressive_rules | Igual |
| Relative Commission MLM | Yes | Yes - mlm_commission_type=relative | Igual |

## MLM (Multi-Level Marketing)

| Feature | TrackNow | MagnetRaffic | Estado |
|---------|----------|-------------|--------|
| Sub-afiliados via link | Yes | Yes | Igual |
| Niveles ilimitados | Yes | Yes | Igual |
| Commission Based (% de comisión) | Yes | Yes | Igual |
| Fixed Commission (fijo por nivel) | Yes | Yes | Igual |
| Amount Based (% del monto) | Yes | Yes | Igual |
| Relative Commission (% del anterior) | Yes | Yes | Igual |
| Split Commission (descuenta del afiliado) | Yes - 1 nivel | Yes - 1 nivel | Igual |
| Override por diferencia (seguros) | No | Yes | MR gana |
| Override por nivel de profundidad | No | Yes - override_by_level | MR gana |
| 4 scopes (global, campaign, personal, payout) | Yes | Yes | Igual |
| Custom MLM por afiliado | Yes | Yes - can_recruit per rank | Igual |

## TIERED COMMISSIONS

| Feature | TrackNow | MagnetRaffic | Estado |
|---------|----------|-------------|--------|
| Tiers automáticos | Yes | Yes - commission_tiers | Igual |
| Métrica: conversiones | Yes | Yes | Igual |
| Métrica: revenue/volumen | Yes | Yes - min_revenue | Igual |
| Métrica: comisión ganada | Yes | Yes - min_commission_earned | Igual |
| Métrica: clicks | Yes (implícito) | Yes - min_clicks | Igual |
| Métrica: reclutas | No | Yes - min_recruits | MR gana |
| Timeframe: All Time | Yes | Yes | Igual |
| Timeframe: This Month | Yes | Yes | Igual |
| Timeframe: Last Month | Yes | Yes | Igual |
| Timeframe: This Year | Yes | Yes | Igual |
| Timeframe: Last Year | Yes | Yes | Igual |
| Widget progreso en portal | Yes | Yes - tierProgress | Igual |
| Evaluación batch | Yes | Yes - POST /tiers/evaluate | Igual |

## PAGOS Y SOLICITUDES

| Feature | TrackNow | MagnetRaffic | Estado |
|---------|----------|-------------|--------|
| Affiliate-initiated | Yes | Yes - withdrawal_requests | Igual |
| Auto-generated (semanal/mensual) | Yes | Yes - payout_schedule | Igual |
| Manager-initiated | Yes | Yes | Igual |
| Solo comisiones aprobadas | Yes | Yes | Igual |
| Bulk CSV import | Yes | Yes - POST /tiers/import/payouts | Igual |
| PayPal Payouts | Via Tipalti | Yes - API directa | MR gana |
| Wire/ACH | Via Tipalti | Yes | Igual |
| Balance disponible vs pendiente | Yes | Yes | Igual |
| Hold days | No | Yes - payout_hold_days | MR gana |
| Auto-approve | No | Yes | MR gana |

## CATÁLOGOS

| Feature | TrackNow | MagnetRaffic | Estado |
|---------|----------|-------------|--------|
| Catálogo de productos | Yes - CSV + Feed | Yes - products table | Igual |
| Comisión por producto | Yes | Yes - product_rank_commissions | Igual |
| CSV import | Yes | Yes - POST /tiers/import/products | Igual |
| Live XML/JSON feed | Yes | No | Falta |
| Links de producto por afiliado | Yes | Parcial (via tracking link + product_sku) | Parcial |
| Privacy por catálogo | Yes | Yes - visibility field | Igual |

## FEATURES EXCLUSIVOS DE MAGNETRAFFIC

| Feature | Descripción |
|---------|------------|
| Rangos 1-10 custom | Nombres, colores, requisitos por empresa |
| Override por diferencia | Modelo estándar de seguros |
| Override por nivel de profundidad | JSONB configurable por nivel |
| Ascenso automático de rango | Evalúa ventas, equipo, reclutas |
| Árbol visual de equipo | Recursivo con colores de rango |
| AI Assistant | Crear campañas con lenguaje natural (Claude) |
| RAG Knowledge Base | Base de conocimiento con búsqueda semántica |
| AI Chat para agentes | Preguntas sobre productos con contexto RAG |
| Wallet bank-like | Balance, extracto, retiros como cuenta bancaria |
| Notificaciones 10 tipos | In-app para admin y agentes |
| Webhooks HMAC signed | Auto-disable tras 10 fallos |
| n8n/GHL integration | Incoming hooks + outgoing webhooks |
| Postback logs con timing | Cada request logeado con ms de procesamiento |
| Activity audit trail | Quién hizo qué, cuándo |
| Mobile bottom nav | Portal optimizado para celular |
| Multi-idioma | ES, EN, PT, FR |

## SCORE FINAL

| Categoría | TrackNow gana | Iguales | MagnetRaffic gana |
|-----------|--------------|---------|-------------------|
| Payout Groups | 0 | 2 | 7 |
| Commission Types | 0 | 11 | 1 |
| MLM | 0 | 9 | 2 |
| Tiered | 0 | 10 | 1 |
| Pagos | 0 | 7 | 3 |
| Catálogos | 1 | 4 | 0 |
| Exclusivos MR | 0 | 0 | 16 |
| **TOTAL** | **1** | **43** | **30** |

MagnetRaffic supera a TrackNow en 30 features, empata en 43, y solo falta 1 (live XML/JSON feed).
