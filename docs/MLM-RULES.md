# Reglas de Negocio MLM - MagnetRaffic

## Modelo de Negocio

MagnetRaffic gestiona equipos de ventas para agencias de seguros y distribuidores con la siguiente jerarquía:

```
Propietario / Distribuidor (Rango 10)
  └── Director (Rango 7-8)
        └── Manager (Rango 5-6)
              └── Líder (Rango 3-4)
                    └── Agente (Rango 1-2)
```

## Rangos

- 10 rangos disponibles (1-10)
- Nombres y colores custom por empresa
- Cada rango tiene:
  - Requisitos de ascenso (ventas personales, ventas de equipo, reclutas)
  - Permisos de reclutamiento (puede/no puede, profundidad máxima)
  - Comisiones configuradas por campaña

## Flujo del Dinero

```
Carrier paga → Empresa (dueño del sistema)
Empresa reparte → toda la cadena según rangos
```

El dueño del sistema recibe todo el dinero y lo distribuye.

## Modos de Comisión

### Modo Fixed (Override Fijo)
Cada rango tiene un % de override independiente.

**Ejemplo:**
- Rango 5 (Manager): 3% override
- Rango 3 (Líder): 2% override

Venta de $1,000 por Agente (Rango 1):
- Agente gana: 7% = $70 (direct)
- Líder (Rango 3) gana: 2% = $20 (override)
- Manager (Rango 5) gana: 3% = $30 (override)

### Modo Difference (Override por Diferencia) ← Estándar en Seguros
El override es la diferencia entre el % del líder y el % del subordinado inmediato.

**Ejemplo:**
- Rango 1 (Agente): Direct 7%
- Rango 3 (Líder): Direct 10%
- Rango 5 (Manager): Direct 12%
- Rango 8 (Director): Direct 15%

Venta de $1,000 por Agente (Rango 1):
- Agente gana: 7% = $70
- Líder gana: 10% - 7% = 3% = $30
- Manager gana: 12% - 10% = 2% = $20
- Director gana: 15% - 12% = 3% = $30

**Compresión natural:** Si Líder y Manager tienen el mismo rango (ej: ambos Rango 3), el Manager gana 0% override (diferencia = 0). La comisión "salta" al siguiente nivel superior.

### Override por Nivel de Profundidad
Además del override general, se puede configurar override específico por nivel:

```json
override_by_level: [
  { "level": 1, "percent": 5, "fixed": 0 },   // Nivel 1 (directos): 5%
  { "level": 2, "percent": 3, "fixed": 0 },   // Nivel 2: 3%
  { "level": 3, "percent": 1, "fixed": 0 }    // Nivel 3: 1%
]
```

### Comisión Fija + Porcentaje
Cada nivel puede combinar:
- Porcentaje del monto de la venta
- Monto fijo por venta

Ejemplo: Rango 5 gana 3% + $5 fijos por cada venta de su equipo.

## Reclutamiento

### Flujo
1. Agente comparte link: `{dominio}/affiliate?ref=AFFXXX`
2. Nuevo agente se registra → `parent_affiliate_id` se asigna automáticamente
3. Nuevo agente hereda la `company_id` del parent
4. Nuevo agente empieza en Rango 1

### Restricciones por Rango
- `can_recruit`: Si este rango puede reclutar o no
- `max_recruit_depth`: Profundidad máxima de la cadena (0 = sin límite)

### Profundidad Global
La empresa tiene `max_recruitment_depth` que limita la profundidad total de overrides.

## Ascenso Automático

El sistema evalúa ascensos cuando:
1. Se registra una nueva conversión (automático)
2. El admin click "Evaluate All Rank Promotions" (manual/batch)

### Requisitos por Rango
Cada rango puede tener:
- `min_personal_sales`: Ventas personales mínimas
- `min_team_sales`: Ventas totales del equipo mínimas
- `min_direct_recruits`: Reclutas directos activos mínimos

### Reglas
- Solo se puede **subir** de rango, nunca bajar automáticamente
- Se busca el rango más alto al que califica
- Si no cumple un requisito para rango N, no se evalúan rangos superiores
- El ascenso genera una notificación al agente
- Todo queda registrado en `rank_history`

## Fraud Detection

### Reglas de Click
1. Bot detection (user-agent patterns)
2. User-agent vacío o < 20 chars
3. Click spam: 10+ desde misma IP en 1 hora
4. Excessive clicks: 50+ desde misma IP en 24h
5. IP bloqueada manualmente
6. Referer sospechoso (click farms)
7. IP privada/localhost
8. Self-clicking: 20+ clicks mismo afiliado+IP en 24h

### Reglas de Conversión
1. Conversion spam: 5+ desde misma IP en 24h
2. Click-to-conversion < 3 segundos
3. Monto > $10,000 (flagged)
4. Monto $0 o negativo
5. IP bloqueada

### Acciones
- **Critical** → Bloqueado (conversión rechazada)
- **High** → Flagged (conversión marcada para revisión)
- **Medium/Low** → Logged (solo se registra)

## Webhooks

Eventos disponibles para webhooks:
- `new_conversion` - Nueva venta
- `new_affiliate` - Nuevo registro de agente
- `affiliate_approved` - Agente aprobado
- `payout_completed` - Pago completado
- `rank_promotion` - Ascenso de rango
- `fraud_alert` - Alerta de fraude

Los webhooks se firman con HMAC-SHA256 si se configura un secret.
Se desactivan automáticamente después de 10 fallos consecutivos.
