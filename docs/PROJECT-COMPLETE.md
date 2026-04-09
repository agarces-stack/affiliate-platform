# MagnetRaffic - Documentación Completa del Proyecto

**Fecha:** 2026-04-08
**Versión:** 2.0.0
**Commits:** 26 | **Archivos:** 79 | **Líneas:** 12,587+

---

## 1. QUÉ ES MAGNETRAFFIC

Plataforma de gestión de equipos de ventas multinivel para agencias de seguros y distribuidores. Reemplaza TrackNow ($79-$1,499/mes) con una solución propia que supera sus features.

**Empresas:** MagnetRaffic (plataforma), Traduce (traducciones inmigración), Trebolife (seguros/vida, 18 productos)

**Stack:** Node.js 22 + Express + PostgreSQL + Vanilla JS + Chart.js

---

## 2. QUÉ SE CONSTRUYÓ (Sesión completa)

### Fase 1: Core + Bugfixes (Commits 1-4)
| Commit | Qué se hizo |
|--------|------------|
| 072b7ad | MVP: Click tracker, Conversions, Affiliates, Campaigns, Coupons, Payouts, MLM, Auth |
| 4b32424 | Frontend: Admin Dashboard + Affiliate Portal + Dockerfile |
| 884926e | Rebrand a MagnetRaffic (3 empresas) |
| b2e148c | Chart.js, CRUD completo, pixel tracking, CSV export, mobile responsive |
| a9f7e8b | Fraud Detection: 8+ reglas, IP blocking, dashboard |

### Fase 2: MLM + Seguridad (Commits 5-8)
| Commit | Qué se hizo |
|--------|------------|
| fe6930b | Rangos 1-10 custom, comisiones % + fija, árbol de equipo recursivo, reclutamiento automático, XSS fix, CORS, try-catch, transacciones atómicas |
| 7eb1a95 | Helmet, rate limiting, morgan, override por diferencia, ascenso automático, conversiones admin con reversión |
| c523ff6 | Notificaciones (10 tipos), árbol visual, búsqueda global, mobile-first, webhooks salientes |
| ccc3c8c | Documentación completa (8 docs) |

### Fase 3: Integraciones (Commits 9-12)
| Commit | Qué se hizo |
|--------|------------|
| e5aa717 | Scripts admin: change-password, create-admin, generate-secret |
| 82cb4ae | Override por nivel configurable UI |
| 7e4f670 | n8n + GHL: incoming hooks, API keys, documentación integrations |
| 4b00588 | Renovaciones de pólizas + Sales Reports avanzados |

### Fase 4: Pagos + Wallet (Commits 13-15)
| Commit | Qué se hizo |
|--------|------------|
| 2e4e8ea | PayPal Payouts API + Wire transfers |
| de281cb | Wallet bank-like: calendario pagos, retiros, extracto bancario |
| 2686a01 | Logs y auditoría: postback logs, activity logs |

### Fase 5: Productos + Grupos + AI (Commits 16-20)
| Commit | Qué se hizo |
|--------|------------|
| 95fd183 | Catálogo de productos (18+ SKUs) + Goals (funnel de etapas) |
| 1c21596 | Commission groups + UI completa 16 secciones |
| 5ab5d1b | AI Assistant: crear campañas con lenguaje natural (Claude) |
| 36a2813 | Multi-idioma: ES, EN, PT, FR (180+ claves) |
| d91800c | RAG: Knowledge base con pgvector, búsqueda semántica, AI chat |

### Fase 6: Paridad TrackNow + UX (Commits 21-26)
| Commit | Qué se hizo |
|--------|------------|
| ef93a37 | 10 features faltantes: tiered timeframes, relative MLM, progressive, CPC, CSV import |
| 9a5deab | Comparación TrackNow actualizada |
| bca76e2 | UX Knowledge Base: investigación profunda 2026 |
| 0f98838 | 8 mejoras UX: sidebar icons, toasts, skeleton, tabs, onboarding, Cmd+K |

---

## 3. ARQUITECTURA

### 79 archivos en el proyecto
```
affiliate-platform/
├── src/                          (34 archivos)
│   ├── server.js                 Entry point + middleware + rutas
│   ├── routes/                   (22 archivos, 70+ endpoints)
│   │   ├── tracking.js           Click tracking (público)
│   │   ├── conversions.js        Postback + admin CRUD + override MLM
│   │   ├── auth.js               Login, register, reclutamiento
│   │   ├── affiliates.js         CRUD afiliados + stats
│   │   ├── campaigns.js          CRUD campañas
│   │   ├── ranks.js              Config rangos + comisiones + settings
│   │   ├── team.js               Árbol de equipo + stats
│   │   ├── products.js           Catálogo + goals + tracking
│   │   ├── groups.js             Commission groups + members
│   │   ├── tiers.js              Tiered commissions + progressive + CSV import
│   │   ├── renewals.js           Renovaciones de pólizas
│   │   ├── sales-reports.js      Reportes por agente/campaña/rango
│   │   ├── notifications.js      Notificaciones in-app
│   │   ├── wallet.js             Balance, retiros, movimientos
│   │   ├── payments.js           PayPal + Wire + providers
│   │   ├── webhooks.js           Webhooks salientes
│   │   ├── incoming-hooks.js     n8n/GHL/Zapier incoming
│   │   ├── knowledge.js          RAG knowledge base
│   │   ├── ai.js                 AI campaign creator
│   │   ├── logs.js               Postback + activity logs
│   │   ├── fraud.js              Fraud dashboard
│   │   ├── reports.js            Dashboard + búsqueda global
│   │   ├── coupons.js            Cupones
│   │   └── payouts.js            Pagos legacy
│   ├── middleware/
│   │   └── auth.js               JWT verification
│   ├── models/
│   │   └── db.js                 PostgreSQL pool
│   └── services/                 (9 archivos)
│       ├── fraud.js              Motor de fraude (8+ reglas)
│       ├── rank-evaluator.js     Ascenso automático de rango
│       ├── tier-evaluator.js     Evaluación de tiers + progressive
│       ├── notifications.js      10 tipos de notificación
│       ├── webhooks.js           HMAC signing + auto-disable
│       ├── account.js            Balance movements + release pending
│       ├── paypal.js             PayPal Payouts API
│       ├── ai-assistant.js       Claude API + context from DB
│       ├── rag.js                Embeddings + semantic search + chat
│       └── audit-log.js          Postback + activity logging
├── database/                     (16 archivos)
│   ├── schema.sql                14 tablas core
│   ├── migrate.js                Migration runner + seeds
│   └── migration_*.sql           11 migraciones incrementales
├── frontend/                     (5 archivos)
│   ├── admin/dashboard.html      Admin dashboard (1,200+ líneas)
│   ├── affiliate/portal.html     Portal afiliado (480+ líneas)
│   ├── index.html                Landing page
│   └── i18n/
│       ├── translations.js       180+ claves en 4 idiomas
│       └── ux.js                 Toasts, skeleton, transitions, Cmd+K, onboarding
├── deploy/
│   └── nginx.conf                Nginx + SSL config
├── scripts/                      (4 archivos)
│   ├── change-password.js
│   ├── create-admin.js
│   ├── generate-api-key.js
│   └── generate-jwt-secret.js
├── docs/                         (11 archivos)
│   ├── INDEX.md
│   ├── ARCHITECTURE.md
│   ├── API.md                    70+ endpoints documentados
│   ├── ADMIN-GUIDE.md
│   ├── AFFILIATE-GUIDE.md
│   ├── DEPLOY.md
│   ├── MLM-RULES.md
│   ├── INTEGRATIONS.md           n8n + GHL + Zapier
│   ├── UX-KNOWLEDGE-BASE.md      Patrones UX 2026
│   ├── TRACKNOW-COMPARISON.md    Feature comparison
│   ├── CHANGELOG.md
│   └── PROJECT-COMPLETE.md       Este archivo
├── config/
│   ├── .env                      (gitignored)
│   └── .env.example
├── Dockerfile                    Non-root, healthcheck
├── package.json
└── README.md
```

### 33+ tablas en PostgreSQL
```
CORE:           companies, users, affiliates, campaigns, campaign_affiliates
TRACKING:       clicks, conversions, conversion_goals, coupons
MLM:            ranks, rank_commissions, rank_history, mlm_commissions
PRODUCTS:       products, goals, product_rank_commissions, goal_rank_commissions
GROUPS:         commission_groups, group_commissions
TIERS:          commission_tiers, affiliate_tiers, progressive_rules
RENEWALS:       renewals, rank_renewal_commissions
PAGOS:          payouts, payment_providers, payment_transactions, account_movements, withdrawal_requests
SEGURIDAD:      fraud_logs, blocked_ips, api_keys
SISTEMA:        notifications, webhooks, postback_logs, activity_logs
RAG:            kb_documents, kb_chunks (pgvector), kb_conversations
```

---

## 4. FEATURES COMPLETOS

### Tracking (5)
- [x] Click tracking con UUID, cookies, redirect
- [x] Conversion postback (S2S, JS pixel, image pixel)
- [x] Coupon tracking sin click
- [x] Deep links + sub-IDs (sub1, sub2, sub3)
- [x] CPC (comisión por click único)

### Comisiones (12)
- [x] CPA (fijo por venta)
- [x] RevShare (% del monto)
- [x] Hybrid (fijo + %)
- [x] CPC (por click)
- [x] Comisión por rango (% + fija, configurable por campaña)
- [x] Comisión por producto + rango
- [x] Comisión por goal + rango
- [x] Override fijo por rango
- [x] Override por diferencia (estándar seguros)
- [x] Override por nivel de profundidad (L1:5%, L2:3%...)
- [x] Progressive commission (escalonada por monto)
- [x] Tiered commission (por performance + timeframes)

### MLM (8)
- [x] Sub-afiliados via link de reclutamiento
- [x] Parent automático al registrarse
- [x] 5 tipos de MLM: amount_based, commission_based, fixed, relative, split
- [x] Profundidad configurable por empresa y por rango
- [x] can_recruit y max_recruit_depth por rango
- [x] Ascenso automático de rango
- [x] Historial de cambios de rango
- [x] Evaluación batch de rangos

### Tiered Commissions (6)
- [x] Tiers por campaña con requisitos
- [x] 5 métricas: conversiones, revenue, comisión, clicks, reclutas
- [x] 5 timeframes: all_time, this_month, last_month, this_year, last_year
- [x] Evaluación automática post-conversión
- [x] Evaluación batch manual
- [x] Widget de progreso en portal afiliado

### Productos & Goals (6)
- [x] Catálogo con SKU, categoría, precio
- [x] Goals por producto (funnel de etapas)
- [x] step_order, is_final, triggers_renewal, requires_previous_goal
- [x] Comisión por goal + rango
- [x] Postback con product_id/product_sku + goal
- [x] CSV import de productos

### Commission Groups (5)
- [x] Grupos de comisión por empresa
- [x] 4 tipos de comisión de manager: commission_based, fixed, amount_based, split
- [x] Comisiones por grupo + campaña/producto
- [x] Asignar/remover miembros
- [x] Stats por grupo

### Renovaciones (5)
- [x] Tracking de renovaciones por póliza/conversión
- [x] Comisiones de renovación por rango
- [x] max_renewals = 0 (comisiones de por vida)
- [x] Upcoming renewals (próximas a vencer)
- [x] Aprobar/cancelar con reversión

### Pagos (8)
- [x] PayPal Payouts API (sandbox + live)
- [x] Wire/ACH transfers
- [x] Payment providers configurables por empresa
- [x] Fee tracking (% + fijo)
- [x] Wallet bank-like (balance disponible vs pendiente)
- [x] Calendario de pagos (on_request, weekly, biweekly, monthly)
- [x] Solicitudes de retiro del afiliado
- [x] CSV import de payouts en bulk

### Reportes (6)
- [x] Dashboard overview con stats
- [x] Reporte por agente (ventas + renewals)
- [x] Reporte por campaña
- [x] Reporte por rango (avg revenue per agent)
- [x] Comparativo mensual (este mes vs anterior, % cambio)
- [x] Chart.js gráficos

### Seguridad (10)
- [x] Helmet security headers
- [x] Rate limiting: auth (20/15min), API (500/15min), tracking (200/min)
- [x] JWT auth con bcrypt
- [x] Multi-tenant (company_id en todas las queries)
- [x] XSS protection (función E() en frontend)
- [x] CORS restringido por env var
- [x] Fraud detection 8+ reglas
- [x] IP blocking
- [x] Transacciones atómicas (BEGIN/COMMIT/ROLLBACK)
- [x] Trust proxy para IP correcta

### Integraciones (7)
- [x] n8n (webhooks + incoming hooks + API keys)
- [x] GoHighLevel (webhooks + hooks)
- [x] Zapier (webhooks)
- [x] API keys con SHA256 hash
- [x] Webhooks salientes HMAC-SHA256 signed
- [x] Auto-disable webhooks tras 10 fallos
- [x] Incoming hooks para crear conversiones/afiliados/payouts/rangos

### AI (3)
- [x] AI Assistant: crear campañas con lenguaje natural (Claude Haiku)
- [x] RAG Knowledge Base: pgvector, embeddings, búsqueda semántica
- [x] AI Chat: agentes preguntan sobre productos con contexto RAG

### Notificaciones (3)
- [x] 10 tipos: new_conversion, override_earned, rank_promotion, new_recruit, payout_created, payout_completed, fraud_alert, affiliate_approved, conversion_rejected, new_affiliate
- [x] UI en admin (badge + sección)
- [x] UI en portal afiliado

### Logs & Auditoría (3)
- [x] Postback logs (cada request con params, status, timing)
- [x] Activity logs (acciones del admin)
- [x] Stats: total, hoy, errores, avg processing time

### Multi-idioma (1)
- [x] 4 idiomas: Español, Inglés, Portugués, Francés (180+ claves)

### UX (8)
- [x] Sidebar agrupado en 5 categorías con Tabler Icons (6050+)
- [x] Toast notifications (reemplazan todos los alert())
- [x] Skeleton loading (shimmer CSS puro)
- [x] Section transitions (fade-in 300ms)
- [x] Empty states con CTA
- [x] Portal afiliado con tabs (Wallet, Links, Team, AI, More)
- [x] Onboarding wizard (5 pasos primera vez)
- [x] Cmd+K búsqueda overlay

### Admin Dashboard (17 secciones)
- [x] Overview, Affiliates, Groups, Campaigns, Products, Conversions, Renewals, Sales Reports, Coupons, Payouts, Notifications, Ranks, Fraud, Logs, Knowledge Base, Settings, Tracking Pixel

### Portal Afiliado (5 tabs)
- [x] Wallet (balance, retiros, transacciones)
- [x] Links (tracking links, deep links, cupones)
- [x] Team (árbol visual, stats por nivel, top performers)
- [x] AI (chat con RAG, knowledge base)
- [x] More (notificaciones, tier progress)

### Scripts CLI (4)
- [x] change-password, create-admin, generate-api-key, generate-jwt-secret

### Documentación (11 docs)
- [x] Architecture, API (70+ endpoints), Admin Guide, Affiliate Guide, Deploy Guide, MLM Rules, Integrations, UX Knowledge Base, TrackNow Comparison, Changelog, Este doc

---

## 5. COMPARACIÓN VS TRACKNOW

| Métrica | TrackNow | MagnetRaffic |
|---------|---------|-------------|
| Features donde MR gana | - | **30** |
| Features iguales | **43** | 43 |
| Features donde TN gana | **1** | - |
| Features exclusivos MR | 0 | **16** |
| UX Score | 6.4/10 | **7.1/10** |
| Costo mensual | $79-$1,499 | ~$10 (servidor) |
| Datos propios | No (SaaS) | **Sí** |
| AI integrada | No | **Sí (3 features)** |

El único feature que TrackNow tiene y MagnetRaffic no: Live XML/JSON product feed.

---

## 6. QUÉ FALTA PARA PRODUCCIÓN

### Bloqueante (1 item)
- [ ] HTTPS + dominio (config Nginx lista en deploy/nginx.conf)

### Importante (4 items)
- [ ] Push + deploy al servidor 72.60.124.152
- [ ] Generar JWT secret seguro en producción
- [ ] Configurar ANTHROPIC_API_KEY y OPENAI_API_KEY
- [ ] Instalar pgvector en PostgreSQL para RAG

### Nice to have (5 items)
- [ ] Custom notifications por threshold (como TrackNow)
- [ ] VPN/proxy detection en fraud
- [ ] Dashboard personalizable (drag widgets)
- [ ] Translation manager (editar textos custom)
- [ ] Live XML/JSON product feed

---

## 7. CREDENCIALES DEFAULT

| Email | Password | Tipo |
|-------|----------|------|
| admin@magnetraffic.com | admin2026 | Admin |
| admin@traduce.com | admin2026 | Admin |
| admin@trebolife.com | admin2026 | Admin |

**CAMBIAR EN PRODUCCIÓN:** `npm run change-password admin@magnetraffic.com NuevoPassword`

---

## 8. CÓMO LEVANTAR

```bash
git clone <repo> && cd affiliate-platform
npm install
cp config/.env.example config/.env
# Editar .env con credenciales reales
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copiar output como JWT_SECRET
npm run db:migrate
npm run dev
# Abrir http://localhost:3000/admin
```

---

## 9. ENV VARS REQUERIDAS

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<64 bytes hex>
NODE_ENV=production
APP_URL=https://tudominio.com
TRACKING_DOMAIN=https://tudominio.com
ALLOWED_ORIGINS=https://tudominio.com
ANTHROPIC_API_KEY=sk-ant-...    # Para AI assistant + RAG chat
OPENAI_API_KEY=sk-...           # Para embeddings (RAG)
```
