# Changelog - MagnetRaffic

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
