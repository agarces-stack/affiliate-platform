# Arquitectura - MagnetRaffic

## Visión General

MagnetRaffic es una plataforma de gestión de equipos de ventas multinivel para agencias de seguros y distribuidores. No es un affiliate tracker genérico - está diseñada para manejar jerarquías de agentes con comisiones en cascada.

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 22 |
| Framework | Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Frontend | Vanilla HTML/CSS/JS |
| Charts | Chart.js (CDN) |
| Proxy | Nginx (producción) |
| Container | Docker |

## Estructura de Archivos

```
affiliate-platform/
├── src/
│   ├── server.js                 # Entry point, middleware, rutas
│   ├── routes/
│   │   ├── tracking.js           # GET /track - Click tracking (público)
│   │   ├── conversions.js        # GET /postback - Conversiones (público) + CRUD admin
│   │   ├── auth.js               # Login, register, reclutamiento
│   │   ├── affiliates.js         # CRUD afiliados + stats
│   │   ├── campaigns.js          # CRUD campañas
│   │   ├── ranks.js              # Config rangos + comisiones + settings
│   │   ├── team.js               # Árbol de equipo + stats
│   │   ├── notifications.js      # Notificaciones in-app
│   │   ├── webhooks.js           # Webhooks salientes
│   │   ├── reports.js            # Dashboard + reportes + búsqueda
│   │   ├── coupons.js            # Cupones
│   │   ├── payouts.js            # Pagos
│   │   └── fraud.js              # Fraud detection dashboard
│   ├── middleware/
│   │   └── auth.js               # JWT verification (authMiddleware, affiliateAuth)
│   ├── models/
│   │   └── db.js                 # PostgreSQL connection pool
│   └── services/
│       ├── fraud.js              # Motor de reglas de fraude (8+ reglas)
│       ├── rank-evaluator.js     # Ascenso automático de rango
│       ├── notifications.js      # Servicio de notificaciones (10 tipos)
│       └── webhooks.js           # Disparador de webhooks (HMAC signing)
├── database/
│   ├── schema.sql                # Schema principal (14 tablas)
│   ├── migrate.js                # Script de migración + seeds
│   ├── migration_fraud.sql       # Tabla blocked_ips
│   ├── migration_ranks.sql       # Tablas ranks, rank_commissions, rank_history
│   └── migration_webhooks.sql    # Tabla webhooks
├── frontend/
│   ├── index.html                # Landing page
│   ├── admin/dashboard.html      # Dashboard admin (single-file, ~500 líneas)
│   └── affiliate/portal.html     # Portal afiliado (single-file, ~250 líneas)
├── deploy/
│   └── nginx.conf                # Config Nginx con SSL
├── config/
│   ├── .env                      # Variables de entorno (NO en git)
│   └── .env.example              # Template
└── docs/                         # Esta documentación
```

## Base de Datos (17 tablas)

```
companies          → Empresas/tenants (MagnetRaffic, Traduce, Trebolife)
users              → Admin users (admin, manager, viewer)
affiliates         → Agentes de ventas (con rank, parent, balance)
campaigns          → Productos/campañas (comisiones, MLM config)
campaign_affiliates → Override de comisión por agente-campaña
ranks              → Rangos 1-10 custom por empresa
rank_commissions   → Comisiones directas + override por rango y campaña
rank_history       → Historial de cambios de rango
clicks             → Click tracking (UUID, IP, UA, device, bot detection)
conversions        → Conversiones/ventas (amount, commission, status)
mlm_commissions    → Comisiones de override distribuidas por nivel
coupons            → Códigos de cupón para tracking sin click
payouts            → Pagos a agentes
fraud_logs         → Alertas de fraude
blocked_ips        → IPs bloqueadas manualmente
notifications      → Notificaciones in-app
webhooks           → Webhooks salientes configurados
```

## Flujo de una Venta

```
1. Agente comparte link → /track?ref_id=ABC&campaign_id=1
2. Click registrado (UUID, fraud check, redirect)
3. Cliente compra → /postback?click_id=xxx&amount=150
4. Fraud detection (8+ reglas)
5. Comisión directa calculada (según rango del agente + campaña)
6. Conversión + balance actualizados (transacción atómica)
7. Override commissions calculados (sube por cadena de padres)
   - Modo "fixed": cada padre gana su % de override configurado
   - Modo "difference": cada padre gana la diferencia de % vs subordinado
8. Ascenso de rango evaluado automáticamente
9. Notificaciones enviadas (agente + padres en la cadena)
10. Webhooks disparados (new_conversion)
```

## Seguridad

- **Helmet**: Security headers (X-Frame-Options, HSTS, etc.)
- **Rate limiting**: 3 niveles (auth estricto, API general, tracking permisivo)
- **JWT**: Tokens firmados con secret de 64 bytes, expiración 7 días
- **bcrypt**: Contraseñas hasheadas con salt de 10 rounds
- **Multi-tenant**: `company_id` en TODAS las queries
- **XSS**: Función `E()` de escape en todo el frontend
- **CORS**: Orígenes configurables por env var
- **Fraud**: 8+ reglas de detección, IP blocking, auto-flag
- **Transacciones**: Balance updates atómicos con ROLLBACK

## Multi-Tenant

Toda la plataforma es multi-empresa. Cada empresa tiene sus propios:
- Agentes, campañas, conversiones
- Rangos con nombres custom
- Comisiones configuradas independientemente
- Override mode (fixed vs difference)
- Webhooks
- Fraud logs y blocked IPs
