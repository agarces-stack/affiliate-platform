# MagnetRaffic

Plataforma propia de affiliate tracking para Traduce y Trebolife.

## Features

- Click tracking con click_id unico (UUID)
- Conversion tracking via postback S2S, pixel JS, image pixel
- Comisiones: CPA, RevShare, Hybrid, Tiered, Recurring
- MLM multi-nivel (sub-afiliados)
- Coupon tracking (sin necesidad de link)
- Dashboard admin (campañas, afiliados, reportes, payouts)
- Portal de afiliados (links, stats, comisiones)
- Fraud detection basico
- API REST completa
- White-label ready

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Supabase)
- **Cache:** Redis (para clicks en tiempo real)
- **Frontend Admin:** Next.js
- **Frontend Affiliate:** Next.js
- **Auth:** JWT + bcrypt

## Setup

```bash
npm install
cp config/.env.example .env
# Editar .env con tus credenciales
npm run db:migrate
npm run dev
```

## Estructura

```
affiliate-platform/
├── src/
│   ├── routes/          # API endpoints
│   ├── middleware/       # Auth, rate limiting, fraud
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   └── utils/           # Helpers
├── database/            # Migrations y seeds
├── frontend/
│   ├── admin/           # Dashboard administrador
│   └── affiliate/       # Portal del afiliado
├── config/              # Configuracion
└── docs/                # Documentacion
```
