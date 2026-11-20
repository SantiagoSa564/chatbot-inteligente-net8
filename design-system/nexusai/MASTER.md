# Sistema de diseño vigente — NexusAI

> **Prioridad actual — reconstrucción del chat:** usar directamente el shell/sidebar/stage/topbar/composer de v0. Sidebar de 265px permanente por defecto en escritorio, historial con scroll y grupos Hoy/Ayer/Anteriores, búsqueda local y pie de cuenta. Topbar de 70px; editor redondeado con texto, base de conocimiento y envío integrados. No restaurar navegación horizontal, segunda cabecera ni editor con envío exterior. `wwwroot/css/chat-v0.css` define la distribución vigente; los tokens y estilos de otras vistas siguen en `styles.css`. Valorar/regenerar están explícitamente deshabilitados por ausencia de soporte real. Ver `Docs/CHAT_LAYOUT_V0.md` para límites y pruebas. Esta indicación prevalece sobre la descripción previa de lateral bajo demanda.

> **Referencia vigente:** integración visual de `NexusAI-estatico.zip` sobre la SPA original, autorizada el 20 de noviembre de 2026. Pantalla completa, sin marco exterior ni widget centrado. Las tarjetas interiores no limitan el tamaño de la aplicación. El textarea mantiene un único foco en su contenedor. No importar la lógica demo del ZIP.

## Fuente de verdad y alcance

La dirección vigente es **superficies claras, acento violeta, bienvenida lavanda y navegación administrativa lateral**, con alternativa oscura basada en tokens. Las conversaciones se abren bajo demanda; se mantienen las cuatro vistas originales. La columna de lectura tiene gutters adaptativos, pero la aplicación ocupa todo el viewport. No copiar contactos, perfiles, métricas, planes ni acciones ficticias. Los valores normativos están en `wwwroot/css/styles.css`. Estas reglas no certifican cumplimiento completo de accesibilidad.

La referencia es el ZIP estático entregado por el usuario. Se reutilizan su símbolo y su ilustración abstracta optimizada; no su fotografía de perfil. Las fuentes visuales anteriores no deben restaurarse. No sobrescribir `/home/santiago/Documentos/theme.css` ni importar GSAP o frameworks.

## Stack y componentes

- HTML5, CSS3 y JavaScript ES6 vanilla en `wwwroot`, sin framework ni bundler.
- El frontend usa CSS semántico local: no incorporar Tailwind ni su CDN.
- Reutilizar `.panel`, `.panel-header`, `.btn`, `.btn-primary`, `.btn-accent`, `.btn-secondary`, `.form-input`, `.msg-row`, `.data-table` y `.tag`.
- Inter mediante Google Fonts, con fuentes de sistema de respaldo; monospace del sistema para código/cifras. SVG locales/inline, sin Lucide en tiempo de ejecución ni dependencias nuevas.
- Librerías autorizadas: Marked + DOMPurify para Markdown seguro y Fuse.js para búsquedas aproximadas. Distribuciones locales y licencias en `wwwroot/vendor`, sin CDN ni cambio de framework. Ver versiones y sincronización en `wwwroot/vendor/README.md`.

## Tokens vigentes

| Token | Valor |
|---|---|
| `--color-canvas` | `#f8f9fc` |
| `--color-paper` | `#ffffff` |
| `--color-surface-alt` | `#f6f6fa` |
| `--color-ink` | `#20212c` |
| `--color-ink-soft` | `#505369` |
| `--color-mid-gray` | `#696d80` |
| `--color-hairline` | `#e3e4ed` |
| `--color-accent` | `#7051df` |
| `--color-accent-hover` | `#593bc3` |
| `--color-accent-soft` | `#f0ebff` |
| `--color-on-accent` | `#ffffff` |
| `--color-user-bubble` | `#f0ebff` |
| `--color-bot-bubble` | `transparent` |
| `--color-rail` | `#ffffff` |
| `--color-rail-active` | `#f0ebff` |
| `--color-on-rail` | `#20212c` |
| `--color-rail-muted` | `#696d80` |
| `--color-rail-accent` | `#593bc3` |
| `--color-hero` | `#f1edfc` |
| `--font-sans` | Inter + fuentes de sistema |
| `--font-mono` | Monospace del sistema |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `14px` |

Sin sombra ni marco exterior. Radios solo en controles, tarjetas y diálogos. Sombra localizada en el panel de conversaciones superpuesto. Conservar espaciados `--spacing-4/8/12/16/20/24/48`. La ilustración decorativa reserva dimensiones; los textos nunca dependen de ella.

Modo oscuro: `html[data-theme="dark"]`, canvas `#171820`, papel `#21222c`, texto `#eeeef7`, acento `#b09aff` con texto oscuro `#201733`. Estados semánticos, campos, enlaces y menú tienen tokens propios. La preferencia inicial respeta el sistema; el selector guarda solo `nexus_ui_theme`, nunca identidad ni secretos.

Escala tipográfica existente: caption 12px, body 14px, body-lg 16px, subheading 18px, heading-sm 24px, heading 30px. Usar sus tokens de interlineado y tracking; mensajes con interlineado al menos 1.5 y campos móviles preferiblemente 16px. Cifras con `font-variant-numeric: tabular-nums`.

### Estados implementados en CSS

Tokens disponibles: `--color-success-ink/surface/border` = `#166534 / #f0fdf4 / #bbf7d0`; `--color-warning-ink/surface/border` = `#92400e / #fffbeb / #fde68a`; `--color-danger-ink/surface/border` = `#991b1b / #fef2f2 / #fecaca`. Cada sufijo representa una variable independiente.

`--color-muted-ink: #696d80` y `--color-control-border: #85889a` en claro; `#b3b6c9` y `#81859b` en oscuro. No confundir divisores decorativos con límites de campos. El foco usa el acento del tema. Ver `Docs/INTERFAZ_Y_PRUEBAS.md`.

Validar cada pareja real: texto normal 4.5:1; texto grande y límites o gráficos necesarios para identificar controles 3:1. Los bordes suaves son decorativos, no el único indicador de un campo. No depender solo del color.

## Vistas y acciones

- Navegación pública: Chat y Ayuda. Solo Admin ve el acceso a Administración, con navegación propia para Preguntas/respuestas, Registros locales y Ajustes del servicio. No mostrar tablas, KPI, IDs, claves ni roles redundantes al usuario final.
- Mostrar el distintivo Demo únicamente cuando corresponde. Si el servicio no está disponible, ofrecer una explicación breve, Reintentar y Probar demo. Los detalles técnicos pertenecen a ajustes del Admin; una respuesta de FAQs no certifica salud del LLM ni de toda la API.
- Usuario: cabecera sobre papel, bienvenida lavanda con tres sugerencias de FAQs activas reales y mensajes del usuario sobre el tinte del tema. La bienvenida desaparece al existir consultas del usuario; una sesión nueva inicia arriba, sin scroll automático al saludo. Editor y Enviar permanecen dentro del viewport. «Conversaciones» abre un panel superpuesto de hasta 380px; «Volver al chat» o Escape lo cierra. Al seleccionar o crear una conversación se vuelve al chat.
- Admin: `#admin-shell` con menú lateral de 250px y contenido separado para FAQs/registros. Ajustes conserva el modal existente. «Volver al chat» no cierra sesión ni pierde permisos. En móvil, el menú pasa arriba. El wrapper está oculto para no Admin; rutas y acciones conservan su validación de rol.
- La acción de copiar se revela al pasar el puntero o enfocar la respuesta; en dispositivos táctiles permanece visible. No ocultar controles a usuarios de teclado ni reducir sus áreas de interacción para aparentar minimalismo.
- Ayuda pública: preguntas activas desplegables, buscador aproximado y opción de llevar una pregunta al chat. Ninguna tabla administrativa para visitantes/User. Los avisos breves no deben tapar acciones: usar la franja de estado dentro de la aplicación.
- Enter envía y Shift+Enter inserta salto, sin enviar durante IME; límite de 1500 caracteres. Evitar envíos duplicados, liberar loading con `finally` y asociar respuestas a la sesión de origen.
- CRUD de FAQs con búsqueda, categorías y columnas ID/categoría/pregunta/respuesta/estado/acciones, solo dentro de Administración. Validar rol también en rutas y manejadores, no solo en visibilidad de botones. Al revocar sesión, vaciar datos y formularios administrativos. La API debe autorizar independientemente del navegador y filtrar FAQs inactivas para no Admin.
- `.btn-primary` y `.btn-accent` usan el acento y `--color-on-accent`, blanco en claro y oscuro en modo oscuro. No añadir adjuntos, traducción, reservas ni códigos QR ficticios.
- KPI, exportación y limpieza de bitácora solo para Admin y con alcance local explícito. No simular registros globales de SQL Server ni mezclar historiales personales entre cuentas. «Limpiar historial local» requiere confirmación y no implica borrar SQL Server.
- CSV con Blob UTF-8, escape correcto y neutralización de fórmulas de hoja de cálculo. Tablas pueden tener scroll local accesible, no hacer desbordar la página.

## Fallback y seguridad

- Modo demo explícito y elegido por el usuario, con datos y credenciales separados de producción; no sincronizar automáticamente ni enviar tokens simulados a la API.
- 400/422: validación; 401: autenticación real; 403: permisos; 404/409: ausencia/conflicto; 429: espera y `Retry-After` cuando exista. Ninguno autoriza un éxito local simulado.
- Red/timeout/5xx: conservar entrada, mostrar error y permitir reintento. No reintentar mutaciones automáticamente si pudieron aplicarse.
- Verificar `res.ok` antes de actualizar listas, cerrar editores o anunciar éxito. Nunca usar login demo como sustituto de autenticación real fallida.
- Llamadas externas desde el navegador solo como demo elegida, con aviso sobre consultas y FAQs enviadas a terceros. En producción, claves del proveedor solo en backend; no guardar contraseñas ni claves en `localStorage`.
- Capturar errores de almacenamiento o JSON sin descartar datos silenciosamente. Datos de usuario y tablas como texto seguro; respuestas del asistente mediante Marked y DOMPurify con lista restringida, HTML crudo escapado, sin imágenes remotas ni enlaces peligrosos. Si falta parser o sanitizador, usar texto plano. Nunca insertar HTML sin sanitizar ni interpolar datos no confiables en handlers inline.

## Accesibilidad y validación pendiente

- Objetivo WCAG 2.2 AA: etiquetas, encabezados lógicos, foco visible y no oculto por cabecera sticky, nombres accesibles y controles táctiles orientativamente de 44×44px.
- Modales: nombre accesible, semántica dialog, foco inicial/contenido/restaurado, Escape y fondo no interactivo. Errores asociados al campo y persistentes si requieren acción.
- Loading con `disabled`/`aria-busy` según contexto; avisos `role="status"` o `aria-live="polite"`, alertas urgentes sin repetición. No releer todo el chat en cada mensaje.
- Estados vacíos distintos de errores. Transiciones discretas de 120–200ms y respeto a `prefers-reduced-motion`; no animaciones obligatorias.
- Probar 320, 375, 768, 1024 y 1440px, zoom 200%, reflujo, teclado virtual y modales con viewport bajo. Sin alturas rígidas que oculten acciones; wrap de filtros y composer adaptable.
- Validar teclado, lector de pantalla, contraste, Admin/User/Visitante, modo demo y fallos de API antes de declarar cumplimiento. Las reglas por página no pueden anular permisos, accesibilidad o seguridad.

---

## Archivo histórico — no aplicar

Se conserva el diseño generado anterior únicamente como referencia histórica. **Nada de lo siguiente es normativo ni debe copiarse al frontend actual.**

<details>
<summary>Diseño generado anterior (obsoleto)</summary>

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** NexusAI
**Generated:** 2026-11-13 10:22:12
**Category:** AI/Chatbot Platform
**Design Dials:** Variance 7/10 (Balanced / Modern) | Motion 6/10 (Standard) | Density 7/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#7C3AED` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#A78BFA` | `--color-secondary` |
| On Secondary | `#0F172A` | `--color-on-secondary` |
| Accent/CTA | `#0891B2` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#FAF5FF` | `--color-background` |
| Foreground | `#1E1B4B` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#1E1B4B` | `--color-card-foreground` |
| Muted | `#ECEEF9` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#DDD6FE` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#7C3AED` | `--color-ring` |

**Color Notes:** AI purple + cyan interactions [Accent adjusted from #06B6D4]

### Typography

- **Heading Font:** Space Grotesk
- **Body Font:** DM Sans
- **Mood:** tech, startup, modern, innovative, bold, futuristic
- **Google Fonts:** [Space Grotesk + DM Sans](https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #0891B2;
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #7C3AED;
  border: 2px solid #7C3AED;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FAF5FF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #7C3AED;
  outline: none;
  box-shadow: 0 0 0 3px #7C3AED20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** AI-Native UI

**Keywords:** Chatbot, conversational, voice, assistant, agentic, ambient, minimal chrome, streaming text, AI interactions

**Best For:** AI products, chatbots, voice assistants, copilots, AI-powered tools, conversational interfaces

**Key Effects:** Typing indicators (3-dot pulse), streaming text animations, pulse animations, context cards, smooth reveals

### Page Pattern

**Pattern Name:** Product Demo + Features

- **Conversion Strategy:** Use an interactive demo only when it explains value better than static media. Provide captions, transcript, visible play/pause controls, and a non-video fallback; do not autoplay under reduced motion. Pause media when offscreen or hidden and keep the final product state available as static content.
- **CTA Placement:** Video center + CTA right/bottom
- **Section Order:** Hero > Product video/mockup (center) > Feature breakdown per section > Comparison (optional) > CTA

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ Heavy chrome
- ❌ Slow response feedback

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

</details>
