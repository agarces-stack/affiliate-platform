# MagnetRaffic

Plataforma de affiliate tracking y gestión de equipos de ventas multinivel para agencias de seguros y distribuidores.

## Features

### Tracking
- Click tracking con UUID único
- Conversion tracking: S2S postback, JS pixel, Image pixel, Coupon
- Deep links, sub-IDs, cookie tracking (30 días configurable)

### Comisiones & MLM
- Rangos 1-10 con nombres custom por empresa
- Comisiones directas: % del monto + fija por rango
- Override commissions: modo fijo o por diferencia (estándar seguros)
- Override configurable por nivel de profundidad
- Ascenso automático de rango por producción y equipo

### Gestión de Equipo
- Árbol de equipo recursivo (sin límite de profundidad)
- Stats por nivel, top performers
- Reclutamiento via link con parent automático
- Control de quién puede reclutar y hasta qué profundidad

### Admin Dashboard
- Overview con stats y gráficos (Chart.js)
- CRUD: afiliados, campañas, cupones, payouts
- Conversiones: listar, aprobar, rechazar (con reversión de comisión)
- Fraud detection: 8+ reglas, block/unblock IPs
- Configuración de rangos y comisiones
- Export CSV

### Portal de Afiliado
- Login/Register con reclutamiento automático
- Stats personales + stats de equipo
- Tracking links, deep links, cupones
- Top performers del equipo

### Seguridad
- Helmet (security headers)
- Rate limiting (auth, API, tracking)
- Fraud detection (bot, click spam, self-click, IP blocking)
- JWT auth con bcrypt
- Multi-tenant (company_id en todas las queries)
- XSS protection en frontend

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Frontend:** Vanilla HTML/CSS/JS (sin framework)
- **Charts:** Chart.js (CDN)

## Setup

```bash
npm install
cp config/.env.example config/.env
# Editar config/.env con tus credenciales
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copiar el resultado como JWT_SECRET en .env
npm run db:migrate
npm run dev
```

## Deploy con Docker

```bash
docker build -t magnetraffic .
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  -e NODE_ENV=production \
  --name magnetraffic magnetraffic
```

## Estructura

```
affiliate-platform/
├── src/
│   ├── routes/          # API endpoints
│   │   ├── tracking.js      # Click tracking
│   │   ├── conversions.js   # Postback + admin CRUD
│   │   ├── auth.js          # Login, register, recruit
│   │   ├── affiliates.js    # Affiliate management
│   │   ├── campaigns.js     # Campaign CRUD
│   │   ├── ranks.js         # Rank config + commissions
│   │   ├── team.js          # Team tree + stats
│   │   ├── reports.js       # Analytics
│   │   ├── coupons.js       # Coupon tracking
│   │   ├── payouts.js       # Payment processing
│   │   └── fraud.js         # Fraud dashboard
│   ├── middleware/      # Auth middleware
│   ├── models/          # Database connection
│   └── services/        # Fraud detection, rank evaluator
├── database/            # Migrations y seeds
├── frontend/
│   ├── admin/           # Dashboard administrador
│   └── affiliate/       # Portal del afiliado
├── deploy/              # Nginx config
├── config/              # Environment config
└── docs/                # Documentación
```
