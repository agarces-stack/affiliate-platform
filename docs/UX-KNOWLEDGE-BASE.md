# Base de Conocimiento UX - MagnetRaffic

Investigación profunda de patrones UX 2026 para SaaS orientado a usuarios no técnicos.

## Principios Core para 2026

### 1. Progressive Disclosure (Revelación Progresiva)
**El principio más importante para simplificar interfaces complejas.**

- Mostrar solo lo que el usuario necesita para completar la tarea actual
- Ocultar opciones avanzadas hasta que el usuario esté listo
- Usar accordions, tabs, y dropdowns para organizar profundidad
- "Si tiene más de 5 opciones visibles, estás mostrando demasiado"

**Aplicación en MagnetRaffic:**
- Sidebar: Agrupar 17 secciones en 5 categorías expandibles
- Modales: Mostrar campos básicos primero, "Advanced" expandible
- Dashboard: Widgets principales arriba, detalles bajo scroll

Sources:
- [NNGroup - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Userpilot - Progressive Disclosure Examples](https://userpilot.com/blog/progressive-disclosure-examples/)
- [IxDF - Progressive Disclosure](https://ixdf.org/literature/topics/progressive-disclosure)

### 2. Time-to-Value (TTV) < 5 minutos
**El usuario debe experimentar el valor de la plataforma en menos de 5 minutos.**

- Onboarding wizard: 3-5 pasos máximo
- Cada paso hace algo útil (no solo recopilar datos)
- Mostrar "Aha moment" lo antes posible
- Checklist visible de progreso

**Aplicación en MagnetRaffic:**
- Paso 1: Nombre de empresa → ya tienes dashboard
- Paso 2: Crear primera campaña → ya puedes trackear
- Paso 3: Invitar primer agente → equipo funcionando
- Paso 4: Configurar comisiones → listo para vender

Sources:
- [SaaS Onboarding UX Best Practices](https://www.designstudiouiux.com/blog/saas-onboarding-ux/)
- [SaaS Onboarding Flows That Convert](https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026)

### 3. Role-Based Interface
**Cada rol ve solo lo que necesita.**

- Admin: Todo (pero organizado por frecuencia de uso)
- Manager: Su equipo, reportes, aprobaciones
- Agente: Su wallet, links, equipo, chat AI

**Aplicación en MagnetRaffic:**
- El portal del afiliado ya es role-based
- El admin dashboard necesita priorizar las secciones más usadas

### 4. Micro-Interactions (Feedback instantáneo)
**Cada acción del usuario necesita respuesta visual inmediata.**

- Botón click → animación de loading (200-300ms)
- Acción exitosa → toast notification verde
- Error → toast rojo con mensaje claro
- Hover → highlight sutil
- Transiciones → 200-500ms, ease-out

**Regla de 3 segundos:** Si la animación dura más de 3 segundos, el usuario piensa que algo falló.

**CSS óptimo (GPU-accelerated):**
```css
.btn { transition: transform 0.2s ease, opacity 0.2s ease; }
.btn:active { transform: scale(0.95); }
.fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
```

Sources:
- [CSS Micro-Interactions](https://www.lifa-su.com/blog/ai-css-animation-micro-interactions.html)
- [Motion UI Trends 2026](https://lomatechnology.com/blog/motion-ui-trends-2026/2911)

### 5. Empty States (Estados vacíos)
**Cuando no hay datos, guiar al usuario en vez de mostrar vacío.**

3 tipos:
- **Informacional:** "No tienes agentes aún" + explicación
- **Accionable:** "No tienes agentes aún" + botón "Invitar primer agente"
- **Celebratorio:** "¡Todo al día! No hay conversiones pendientes"

**Estructura:**
```
[Ilustración/Icono simple]
[Título claro: "No hay agentes"]
[Explicación: "Los agentes aparecen aquí cuando se registran"]
[CTA: "Invitar primer agente"]
```

Sources:
- [Empty State UX Examples - Eleken](https://www.eleken.co/blog-posts/empty-state-ux)
- [SaaSFrame - 90 Empty State Examples](https://www.saasframe.io/categories/empty-state)
- [NNGroup - Empty States](https://www.nngroup.com/articles/empty-state-interface-design/)

### 6. Skeleton Screens (Loading States)
**En vez de spinners, mostrar la estructura de lo que va a cargar.**

```
┌─────────────────────────────┐
│ ████████  ░░░░░░░           │  ← Shimmer effect
│ ██████████████  ░░░░░       │
│ ████████  ░░░░░░░           │
└─────────────────────────────┘
```

CSS puro, no necesita JS:
```css
.skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
```

### 7. Toast Notifications (en vez de alert())
**Componente visual que aparece y desaparece sin interrumpir.**

Herramientas recomendadas (vanilla JS, sin framework):
- **Notyf** - 3KB, responsive, A11Y compatible, MIT license
- **Toastify-js** - Lightweight, customizable, no dependencies
- **Custom CSS** - Se puede hacer con 20 líneas de CSS + JS

```javascript
function toast(msg, type='success') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
```

Sources:
- [Notyf](https://carlosroso.com/notyf/)
- [Toastify-js](https://apvarun.github.io/toastify-js/)

## Herramientas Open Source Recomendadas

### Para Dashboard Admin (sin framework)

| Herramienta | Qué es | Por qué |
|-------------|--------|---------|
| **Tabler** | Dashboard template Bootstrap 5 + vanilla JS | 4,590 iconos SVG, dark/light mode, MIT |
| **Tabler Icons** | 6,050+ iconos SVG | Consistentes 24px, stroke 2px, MIT |
| **PlainAdmin** | Admin template vanilla JS | 300+ componentes, 5 layouts |
| **Volt Dashboard** | Bootstrap 5 admin | 100+ componentes, sin jQuery |

### Iconos (Tabler Icons - recomendado)
- 6,050+ iconos SVG gratis, MIT license
- Consistentes: 24px grid, 2px stroke
- Outline y filled variants
- CDN: `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css`
- Uso: `<i class="ti ti-home"></i>` `<i class="ti ti-users"></i>`

Sources:
- [Tabler](https://tabler.io/)
- [Tabler Icons](https://tabler.io/icons)
- [PlainAdmin](https://tailadmin.com/blog/free-html-admin-dashboard)

## Checklist de Implementación para MagnetRaffic

### Prioridad 1: Quick Wins (alto impacto, bajo esfuerzo)
- [ ] Agregar Tabler Icons al sidebar (CDN, 1 línea)
- [ ] Reemplazar alert() con toast notifications (30 líneas CSS+JS)
- [ ] Agregar loading states/skeleton screens
- [ ] Agrupar sidebar en categorías con accordions
- [ ] Agregar transiciones CSS (fade-in en secciones)

### Prioridad 2: Mejoras de Flujo
- [ ] Onboarding wizard (3-5 pasos) para primera vez
- [ ] Empty states con CTA en todas las tablas vacías
- [ ] Portal afiliado con tabs en vez de scroll
- [ ] Confirmación visual en todas las acciones

### Prioridad 3: Polish
- [ ] Skeleton screens en tablas mientras cargan
- [ ] Hover effects en cards y rows
- [ ] Animación de sidebar expand/collapse
- [ ] Light/dark mode toggle
- [ ] Keyboard shortcuts (Cmd+K para búsqueda)

## Patrones de Navegación Recomendados

### Sidebar Agrupado (Progressive Disclosure)
```
📊 Dashboard
   Overview

👥 People
   Affiliates
   Groups
   Ranks

💼 Business
   Campaigns
   Products
   Conversions
   Renewals

💰 Money
   Payouts
   Sales Reports

🔧 System
   ▸ Fraud Detection
   ▸ Logs
   ▸ Knowledge Base
   ▸ Settings
   ▸ Tracking Pixel
```

17 items → 5 grupos → mucho más escaneable.

### Bottom Navigation Mobile (Portal Afiliado)
```
[💰 Wallet] [📊 Stats] [👥 Team] [🤖 AI] [⚙️ More]
```

5 tabs máximo en mobile. "More" agrupa el resto.

## Métricas de UX a Medir

| Métrica | Target | Cómo medir |
|---------|--------|-----------|
| Time-to-value | < 5 min | Tiempo hasta primera campaña creada |
| Task completion rate | > 90% | % de wizards completados |
| Error rate | < 5% | Errores en formularios / total submissions |
| Bounce rate primer día | < 30% | % que no vuelve después de registrarse |
| Feature discovery | > 60% | % de features usados en primera semana |
