# Guía del Administrador - MagnetRaffic

## Primeros Pasos

### 1. Login
Accede a `{tu-dominio}/admin` y usa tus credenciales:
- Email: el que se configuró en la migración
- Password: el que se configuró en la migración

### 2. Configurar Rangos
Ve a la sección **Ranks** en el sidebar. Por defecto hay 10 rangos:

| # | Nombre Default | Puedes cambiarlo a... |
|---|---------------|----------------------|
| 1 | Agente | Vendedor, Representante |
| 2 | Agente Senior | Asesor |
| 3 | Líder | Team Lead |
| 4 | Líder Senior | Supervisor |
| 5 | Manager | Gerente de Agencia |
| 6 | Manager Senior | Gerente Regional |
| 7 | Director | Director de Zona |
| 8 | Director Senior | Director Nacional |
| 9 | VP | Vicepresidente |
| 10 | Propietario | CEO, Dueño |

**Para editar**: Click en "Edit" junto al rango → cambia nombre, color, permisos de reclutamiento.

### 3. Elegir Modo de Override

En la sección **Ranks**, arriba verás el selector "Override Mode":

- **Fixed**: Cada rango tiene su propio % de override independiente. Ejemplo: Rango 5 gana 3% override sin importar el rango del subordinado.
- **Difference** (recomendado para seguros): El líder gana la diferencia entre su % y el del subordinado. Ejemplo: Rango 5 tiene 12%, Rango 3 tiene 8% → override = 4%.

### 4. Configurar Comisiones

1. Ve a **Ranks** → sección "Commission Matrix"
2. Selecciona una campaña del dropdown
3. Para cada rango, click "Edit" y configura:
   - **Direct %**: Porcentaje de la venta que gana el agente
   - **Direct Fixed $**: Monto fijo adicional por venta
   - **Override %**: Porcentaje de override sobre ventas del equipo
   - **Override Fixed $**: Monto fijo de override por venta del equipo

**Ejemplo para seguros:**

| Rango | Direct % | Direct $ | Override % | Override $ |
|-------|---------|---------|-----------|-----------|
| Agente | 7% | $0 | 0% | $0 |
| Líder | 10% | $0 | 3% | $0 |
| Manager | 12% | $0 | 5% | $0 |
| Director | 15% | $0 | 8% | $0 |

En modo **Difference**, solo necesitas configurar el Direct % - el override se calcula automáticamente como la diferencia.

### 5. Crear Campañas (Productos)

1. Ve a **Campaigns** → "Create Campaign"
2. Llena: nombre, URL del landing page, tipo de comisión
3. La comisión de la campaña es el fallback si no hay configuración por rango

### 6. Gestionar Agentes

**Aprobar nuevos agentes:**
- Ve a **Affiliates** → agentes con status "pending" → click "Approve"
- Al aprobar, el agente puede hacer login y ver su portal

**Cambiar rango:**
- En la tabla de afiliados, click "Change" junto al rango actual
- Selecciona nuevo rango y opcionalmente una razón

**Ascenso automático:**
- En **Ranks** → click "Evaluate All Rank Promotions"
- Esto evalúa todos los agentes contra los requisitos de cada rango
- Los que califiquen suben automáticamente

### 7. Conversiones

**Aprobar/Rechazar:**
- Ve a **Conversions**
- Click "Approve" para confirmar la venta
- Click "Reject" para rechazar → esto revierte TODA la cadena de comisiones (directa + overrides MLM)

### 8. Payouts

1. Ve a **Payouts** → "Create Payout"
2. Ingresa: Affiliate ID, monto, método de pago
3. El sistema verifica que haya balance suficiente
4. Al crear, el balance se descuenta automáticamente
5. Click "Mark Paid" cuando hayas enviado el dinero

### 9. Fraud Detection

- Ve a **Fraud Detection** para ver alertas
- **Block IP**: Bloquea una IP manualmente
- **Suspicious IPs**: IPs con más alertas → click "Block" para bloquear
- Las conversiones de IPs bloqueadas se rechazan automáticamente

### 10. Notificaciones

- El badge en el sidebar muestra notificaciones sin leer
- Click en **Notifications** para ver todas
- "Mark All Read" para limpiar

### 11. Búsqueda Global

- La barra de búsqueda en la parte superior busca en:
  - Agentes (nombre, email, ref_id)
  - Campañas (nombre)
  - Conversiones (order_id, email)
- Escribe mínimo 2 caracteres

### 12. Tracking Pixel

Ve a **Tracking Pixel** para obtener los códigos de integración:
- **JS Pixel**: Para páginas de thank-you
- **Image Pixel**: Pixel invisible 1x1
- **S2S Postback**: URL para llamar desde tu servidor
- **Landing Page Script**: Para capturar click_id en cookies
