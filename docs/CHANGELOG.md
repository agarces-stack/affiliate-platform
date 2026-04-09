# Changelog - MagnetRaffic

## [2.1.0] - 2026-04-09 - Security Audit & Hardcode Fixes

### Security (26 vulnerabilidades arregladas)
- **CRITICAL**: `adminAuth` middleware en 15 archivos de rutas admin (antes cualquier afiliado tenía acceso admin)
- **CRITICAL**: Passwords de seed ahora vienen de `SEED_ADMIN_PASSWORD` env var (antes 'admin2026' hardcodeado)
- **CRITICAL**: No se imprimen passwords en stdout durante migración
- **HIGH**: Incoming hooks (n8n/GHL) ahora usan transacción atómica BEGIN/COMMIT
- **HIGH**: Webhook SSRF protection - bloquea URLs a localhost, IPs privadas, AWS metadata
- **MEDIUM**: Validación de email (regex) y password (min 8 chars) en registro
- **MEDIUM**: Error messages genéricos en AI endpoints (no exponen detalles internos)
- **MEDIUM**: Group stats y commissions verifican company_id (previene data leak cross-tenant)
- **MEDIUM**: Cookies con `secure:true` en producción
- **MEDIUM**: Webhook affiliates con hash único por creación

### Fixed (Hardcodeados eliminados)
- `SEED_ADMIN_PASSWORD` - password de admins desde env (antes 'admin2026')
- `BCRYPT_ROUNDS` - configurable desde env (antes hardcodeado 10, ahora default 12)
- `JWT_EXPIRY` - configurable desde env (antes '7d' hardcodeado)
- `AI_MODEL` - modelo Claude configurable (antes hardcodeado en 2 archivos)
- `EMBEDDING_MODEL` - modelo OpenAI configurable
- `APP_NAME` - nombre de app configurable (antes 'MagnetRaffic' en 5 lugares)
- `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` - configurables desde env
- SQL injection fix en change-password.js (tabla ahora hardcodeada segura)

### Added
- `src/middleware/auth.js`: nuevo `adminAuth` middleware (bloquea afiliados de rutas admin)
- `src/utils/security.js`: capLimit(), isValidEmail(), isStrongPassword(), safeError(), isValidWebhookUrl()
- `docs/SECURITY-AUDIT.md`: reporte completo de auditoría con 30 findings

## [2.0.0] - 2026-04-08 - UX Overhaul + TrackNow Parity

### Added - UX
- Sidebar agrupado en 5 categorías (Dashboard, People, Business, Money, System) con Tabler Icons (6050+ SVG)
- Toast notifications reemplazan todos los `alert()` (success, error, warning, info)
- Skeleton loading con shimmer animation CSS puro
- Section transitions fade-in 300ms
- Onboarding wizard 5 pasos para primera vez
- Cmd+K búsqueda overlay desde cualquier sección
- Portal afiliado con 5 tabs (Wallet, Links, Team, AI, More) en vez de scroll infinito
- `frontend/i18n/ux.js`: sistema UX compartido (toasts, skeleton, transitions, Cmd+K, onboarding)
- `docs/UX-KNOWLEDGE-BASE.md`: investigación UX 2026 (progressive disclosure, micro-interactions, empty states)

### Added - TrackNow Parity (10 features)
- Tiered commissions con 5 timeframes (all_time, this_month, last_month, this_year, last_year)
- 5 métricas de tier: conversiones, revenue, comisión ganada, clicks, reclutas
- Relative Commission MLM: % de la comisión del nivel anterior (cadena descendente)
- Split Commission MLM: se descuenta del afiliado (solo 1 nivel)
- Progressive Commission: rangos escalonados por monto ($0-1000 al 5%, $1000-5000 al 7%...)
- CPC (Cost Per Click): comisión automática por click único
- CSV import de productos y payouts en bulk
- Widget de progreso de tier en portal del afiliado
- `docs/TRACKNOW-COMPARISON.md`: comparación feature por feature (MR gana 30, igual 43, TN gana 1)

### Added - Features
- Commission groups: agrupar afiliados con 4 tipos de comisión de manager
- AI Assistant: crear campañas con lenguaje natural (Claude API)
- RAG Knowledge Base: pgvector, embeddings, búsqueda semántica, AI chat para agentes
- Multi-idioma: Español, Inglés, Portugués, Francés (180+ claves)
- Catálogo de productos con SKU, categoría, precio + Goals (funnel de etapas)
- Renovaciones de pólizas con upcoming renewals y comisiones por rango
- Sales Reports avanzados: por agente, campaña, rango, comparativo mensual
- PayPal Payouts API + Wire transfers + payment providers configurables
- Wallet bank-like: balance disponible/pendiente, retiros, extracto bancario
- Calendario de pagos: on_request, weekly, biweekly, monthly + hold days + auto-approve
- Postback logs con timing + Activity audit logs
- Integraciones n8n + GHL: incoming hooks, API keys, webhooks HMAC-SHA256
- Notificaciones in-app: 10 tipos de evento en admin y portal
- Scripts CLI: change-password, create-admin, generate-api-key, generate-jwt-secret

### Added - Documentation
- `docs/PROJECT-COMPLETE.md`: documentación completa del proyecto (96 features, 33+ tablas)
- `docs/ARCHITECTURE.md`: stack, estructura, DB schema, flujos, seguridad
- `docs/API.md`: 70+ endpoints documentados
- `docs/ADMIN-GUIDE.md`: guía paso a paso para administradores
- `docs/AFFILIATE-GUIDE.md`: guía para agentes/afiliados
- `docs/DEPLOY.md`: deploy manual, Docker, Nginx+SSL, backup
- `docs/MLM-RULES.md`: reglas de negocio completas
- `docs/INTEGRATIONS.md`: guía n8n + GHL + Zapier

## [1.5.0] - 2026-04-07 (Noche)

### Added
- **Notificaciones in-app**: 10 tipos de evento (new_conversion, override_earned, rank_promotion, new_recruit, payout_created, payout_completed, fraud_alert, affiliate_approved, conversion_rejected). UI en admin y portal.
- **Árbol visual de equipo**: Vista recursiva con colores de rango, status dots, stats inline en portal del afiliado.
- **Búsqueda global en admin**: Barra de búsqueda con debounce que busca en agentes, campañas y conversiones. Endpoint `/api/reports/search`.
- **Portal mobile-first**: Bottom navigation, botones touch-friendly, grid responsive, scroll-to-section.
- **Webhooks salientes**: Tabla webhooks, CRUD API, HMAC-SHA256 signing, auto-disable tras 10 fallos. Integrado en conversiones.
- **Migración webhooks**: `database/migration_webhooks.sql`.

## [1.4.0] - 2026-04-07

### Added
- **Helmet** security headers.
- **Rate limiting**: auth (20/15min), API (500/15min), tracking (200/min).
- **Morgan** request logging (combined en prod, dev en dev).
- **Override por diferencia**: Modelo estándar de seguros. El líder gana la diferencia entre su % y el del subordinado. Configurable por empresa (`override_mode`: fixed | difference).
- **Ascenso automático de rango**: Evalúa `min_personal_sales`, `min_team_sales`, `min_direct_recruits`. Se ejecuta post-conversión + botón batch en admin.
- **Dashboard de conversiones real**: Listar, aprobar, rechazar con reversión atómica de comisiones y MLM.
- **Dockerfile mejorado**: Non-root user `appuser`, HEALTHCHECK, no copia .env.
- **Nginx config**: `deploy/nginx.conf` con SSL, proxy_pass, rate limiting.
- Trust proxy para IP correcta detrás de Nginx.

### Changed
- README actualizado con stack real y estructura completa.
- `.env.example` con instrucción para generar JWT secret seguro.

## [1.3.0] - 2026-04-06

### Added
- **Sistema de rangos 1-10**: Nombres y colores custom por empresa. Tabla `ranks`, `rank_commissions`, `rank_history`.
- **Comisiones por rango**: % del monto + fija, directo + override, configurable por campaña.
- **Árbol de equipo**: Query recursiva SQL, stats por nivel, top performers. Endpoints `/api/team/:id/tree`, `/api/team/:id/stats`, `/api/team/:id/top`.
- **Reclutamiento con parent automático**: `parent_ref_id` en registro, validación de `can_recruit` y `max_recruit_depth`.
- **UI admin sección Ranks**: Editar nombres/colores, matriz de comisiones por campaña, asignar rango a agentes.
- **UI portal sección My Team**: Stats de equipo, tabla por nivel, top performers.

### Fixed
- **XSS protegido**: Función `E()` de escape HTML en dashboard admin.
- **CORS restringido**: Lee `ALLOWED_ORIGINS` de .env.
- **Multi-tenant auth**: Campaign stats y affiliate stats verifican `company_id`.
- **Try-catch en todas las rutas**: auth, affiliates, campaigns, coupons, payouts, fraud, reports.
- **Transacciones atómicas**: Payouts y conversiones usan BEGIN/COMMIT/ROLLBACK.
- **Fraud detection en conversiones**: `checkConversionFraud()` activado en postback.
- **Balance del afiliado**: Endpoint retorna balance, portal lo muestra.
- **Validación de inputs**: Campos requeridos en campaigns, coupons, payouts, auth.
- **Migración fraud**: `migration_fraud.sql` ahora se ejecuta.
- **Chart últimos 30 días** en vez de rango hardcodeado.
- Eliminado `routes/frontend.js` (código muerto).
- Redis removido de .env.example (no se usa).

## [1.2.0] - 2026-04-04

### Added
- Fraud Detection: bot detection, click spam, IP blocking, self-click detection, conversion fraud, suspicious IPs dashboard, block/unblock UI.

## [1.1.0] - 2026-04-04

### Added
- Chart.js gráficos, CRUD campañas/afiliados/cupones/payouts desde UI.
- JS pixel, image pixel, S2S code generator, export CSV.
- Deep links, mobile responsive, portal afiliado completo con stats.

## [1.0.1] - 2026-04-04

### Changed
- Rebrand a MagnetRaffic: 3 empresas (MagnetRaffic, Traduce, Trebolife).

## [1.0.0] - 2026-04-04

### Added
- Frontend: Admin Dashboard + Affiliate Portal + Dockerfile para deploy.

## [0.1.0] - 2026-04-04

### Added
- MVP v1: Click tracker, Conversion postback, Affiliates CRUD, Campaigns, Coupons, Payouts, Reports, MLM, Auth.
