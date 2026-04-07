# Guía de Deploy - MagnetRaffic

## Requisitos

- Servidor con Node.js 18+ (recomendado 22)
- PostgreSQL 14+
- Nginx (para SSL)
- Docker (opcional)

## Deploy Manual

### 1. Clonar e instalar

```bash
git clone {tu-repo} /opt/magnetraffic
cd /opt/magnetraffic
npm install --production
```

### 2. Configurar environment

```bash
cp config/.env.example config/.env
nano config/.env
```

Editar:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/magnetraffic
PORT=3000
NODE_ENV=production
JWT_SECRET=<generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
APP_URL=https://tudominio.com
TRACKING_DOMAIN=https://tudominio.com
ALLOWED_ORIGINS=https://tudominio.com
```

### 3. Crear base de datos

```bash
# En PostgreSQL:
createdb magnetraffic

# Ejecutar migraciones:
npm run db:migrate
```

### 4. Iniciar con PM2

```bash
npm install -g pm2
pm2 start src/server.js --name magnetraffic
pm2 save
pm2 startup
```

### 5. Configurar Nginx + SSL

```bash
# Copiar config
cp deploy/nginx.conf /etc/nginx/sites-available/magnetraffic

# Editar - cambiar "yourdomain.com" por tu dominio
nano /etc/nginx/sites-available/magnetraffic

# Habilitar
ln -s /etc/nginx/sites-available/magnetraffic /etc/nginx/sites-enabled/

# Obtener SSL
apt install certbot python3-certbot-nginx
certbot --nginx -d tudominio.com

# Agregar rate limit zone al nginx.conf principal
echo 'limit_req_zone $binary_remote_addr zone=tracking:10m rate=30r/s;' >> /etc/nginx/conf.d/rate-limit.conf

# Reiniciar
systemctl restart nginx
```

## Deploy con Docker

### 1. Build

```bash
docker build -t magnetraffic .
```

### 2. Run

```bash
docker run -d \
  --name magnetraffic \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/magnetraffic \
  -e JWT_SECRET=$(openssl rand -hex 64) \
  -e NODE_ENV=production \
  -e APP_URL=https://tudominio.com \
  -e TRACKING_DOMAIN=https://tudominio.com \
  -e ALLOWED_ORIGINS=https://tudominio.com \
  --restart unless-stopped \
  magnetraffic
```

### 3. Verificar health

```bash
curl http://localhost:3000/health
# { "status": "ok", "timestamp": "...", "uptime": 5 }
```

## Actualizar

```bash
git pull
npm install --production
pm2 restart magnetraffic
# o con Docker:
docker build -t magnetraffic . && docker stop magnetraffic && docker rm magnetraffic && docker run ... (mismo comando de arriba)
```

## Backup

```bash
# Backup de base de datos
pg_dump magnetraffic > backup_$(date +%Y%m%d).sql

# Restaurar
psql magnetraffic < backup_20260407.sql
```

## Monitoreo

- **Logs**: `pm2 logs magnetraffic` o `docker logs magnetraffic`
- **Health check**: `GET /health` → devuelve status y uptime
- **Docker**: HEALTHCHECK integrado (cada 30s)
