# Integraciones - MagnetRaffic

## API Keys

Todas las integraciones externas (n8n, GHL, Zapier) usan API keys.

### Generar API Key
```bash
node scripts/generate-api-key.js 1 "n8n Production"
# Output: mr_a1b2c3d4e5f6...
```

### Usar API Key
```
Header: X-API-Key: mr_a1b2c3d4e5f6...
O query param: ?api_key=mr_a1b2c3d4e5f6...
```

---

## n8n

### MagnetRaffic → n8n (webhooks salientes)

Cuando algo pasa en MagnetRaffic, se envía un POST a tu workflow n8n.

**Setup:**
1. En n8n, crea un Webhook trigger node → copia la URL
2. En MagnetRaffic admin, ve a crear webhook via API:
```
POST /api/webhooks
{
  "name": "n8n - New Conversions",
  "url": "https://tu-n8n.com/webhook/abc123",
  "events": ["new_conversion", "new_affiliate", "rank_promotion"],
  "secret": "mi_secret_para_firmar"
}
```
3. n8n recibe:
```json
{
  "event": "new_conversion",
  "timestamp": "2026-04-07T...",
  "data": {
    "conversion_id": 1,
    "affiliate_id": 5,
    "amount": 150.00,
    "commission": 10.50,
    "tracking_method": "s2s",
    "order_id": "ORD-123"
  }
}
```

**Eventos disponibles:**
- `new_conversion` - Nueva venta
- `new_affiliate` - Nuevo registro
- `affiliate_approved` - Agente aprobado
- `payout_completed` - Pago completado
- `rank_promotion` - Ascenso de rango
- `fraud_alert` - Alerta de fraude

### n8n → MagnetRaffic (incoming hooks)

Usa HTTP Request nodes en n8n para enviar datos a MagnetRaffic.

**Crear conversión desde n8n:**
```
POST {APP_URL}/hooks/conversion
Headers: X-API-Key: mr_...
Body:
{
  "ref_id": "AFF123",         // o "affiliate_id": 5
  "campaign_id": 1,
  "order_id": "ORD-456",
  "amount": 200.00,
  "commission": 20.00,
  "customer_email": "cliente@email.com",
  "customer_name": "Juan"
}
```

**Crear afiliado desde n8n:**
```
POST {APP_URL}/hooks/affiliate
Headers: X-API-Key: mr_...
Body:
{
  "email": "nuevo@agente.com",
  "first_name": "Maria",
  "last_name": "Garcia",
  "phone": "+1-555-0123",
  "parent_ref_id": "AFF123",  // opcional, para asignar a equipo
  "status": "approved"         // o "pending"
}
```

**Cambiar rango desde n8n:**
```
POST {APP_URL}/hooks/rank
Headers: X-API-Key: mr_...
Body:
{
  "ref_id": "AFF123",
  "rank_number": 5,
  "reason": "Monthly evaluation - promoted via n8n"
}
```

**Registrar payout desde n8n:**
```
POST {APP_URL}/hooks/payout
Headers: X-API-Key: mr_...
Body:
{
  "ref_id": "AFF123",
  "amount": 500.00,
  "payment_method": "bank_transfer",
  "transaction_id": "TXN-789"
}
```

**Leer datos (polling):**
```
GET {APP_URL}/hooks/affiliates?status=approved&limit=10
GET {APP_URL}/hooks/conversions?status=pending&since=2026-04-01
Headers: X-API-Key: mr_...
```

### Ejemplo de workflow n8n completo

```
[Webhook Trigger] → recibe new_conversion de MagnetRaffic
    ↓
[IF] amount > 1000
    ↓ Yes
[HTTP Request] → POST a GHL para crear/actualizar contacto
    ↓
[HTTP Request] → POST a Slack para notificar al equipo
    ↓ No
[HTTP Request] → POST a GHL solo actualizar tag
```

---

## GoHighLevel (GHL)

### MagnetRaffic → GHL (via n8n o directo)

**Opción 1: Via n8n (recomendado)**
1. Webhook de MagnetRaffic → n8n
2. n8n transforma datos → HTTP Request a GHL API

**Opción 2: Webhook directo a GHL**
1. Crear webhook en MagnetRaffic apuntando a GHL webhook URL:
```
POST /api/webhooks
{
  "name": "GHL - Sync Conversions",
  "url": "https://services.leadconnectorhq.com/hooks/tu-webhook-id",
  "events": ["new_conversion", "new_affiliate"]
}
```

### GHL → MagnetRaffic

Cuando un contacto en GHL completa una acción (compra, firma, etc.):

**Setup en GHL:**
1. Crear un Workflow trigger (ej: "Pipeline stage changed")
2. Agregar acción "Webhook" → POST a:
```
{APP_URL}/hooks/conversion
Headers: X-API-Key: mr_...
Body:
{
  "ref_id": "{{contact.custom_field_ref_id}}",
  "amount": "{{contact.custom_field_policy_amount}}",
  "order_id": "{{contact.id}}",
  "customer_email": "{{contact.email}}",
  "customer_name": "{{contact.first_name}}"
}
```

### Sincronizar agentes GHL ↔ MagnetRaffic

**Nuevo agente en MagnetRaffic → Crear contacto en GHL:**
```
Webhook event: new_affiliate
→ n8n HTTP Request → POST https://services.leadconnectorhq.com/contacts/
Body: { "email": data.email, "firstName": data.first_name, "tags": ["affiliate", "rank-1"] }
```

**Actualización de rango → Actualizar tag en GHL:**
```
Webhook event: rank_promotion
→ n8n → PUT GHL contact → update tags ["rank-5", "manager"]
```

---

## Zapier

Mismos endpoints que n8n, usando "Webhooks by Zapier" trigger y "Webhooks by Zapier" action.

**MagnetRaffic → Zapier:**
- Crear webhook con URL de Zapier catch hook

**Zapier → MagnetRaffic:**
- Usar "Webhooks by Zapier" action → POST a `/hooks/conversion`

---

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/hooks/conversion` | Crear conversión |
| POST | `/hooks/affiliate` | Crear afiliado |
| POST | `/hooks/payout` | Registrar payout |
| POST | `/hooks/rank` | Cambiar rango |
| GET | `/hooks/affiliates` | Listar afiliados |
| GET | `/hooks/conversions` | Listar conversiones |

Todos requieren header `X-API-Key` o query param `api_key`.
