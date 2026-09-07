# 05 · Design system

> Squad **UI**. Referencias: `Fotos_y_conceptos/InterfazDeColores.png` y `InterfazDeColoresClaro.png`

## 1. Paleta

Extraída de las láminas *ED-CADE — Biblioteca de componentes*.

| Color | Hex | Rol |
|---|---|---|
| 🔵 Cyan | `#00E5FF` | **primary** — acción principal, nodo disponible, caminos activos |
| 🟣 Violeta | `#B85CF6` | **secondary** — acentos, headers, zonas especiales |
| 🩷 Magenta | `#FF2E93` | **accent / error** — errores, nodo fallado, alertas |
| 🟡 Amarillo | `#FFD60A` | **warning / action** — botones de acción, monedas, destacados |
| ⚫ Navy | `#0D0B1E` | **base-100** en tema oscuro — fondo |

### Colores de estado del nodo

Consistentes entre el mapa 3D, el mapa interno y la UI:

| Estado | Hex | Uso |
|---|---|---|
| `bloqueado` | `#6B7285` | Gris apagado + ícono de candado |
| `habilitado` | `#00E5FF` | Cyan — es el "andá por acá" |
| `completado` | `#39FF88` | Verde neón (los caminos verdes de la referencia) |
| `fallado` | `#FF2E93` | Magenta |

---

## 2. Tema daisyUI

daisyUI 5 con Tailwind 4 se configura **por CSS**, no por `tailwind.config.js`.

`frontend/src/styles.css`:

```css
@import "tailwindcss";
@plugin "daisyui";

/* ---------- ARCADE OSCURO (default) ---------- */
@plugin "daisyui/theme" {
  name: "arcade-dark";
  default: true;
  prefersdark: true;
  color-scheme: dark;

  --color-base-100: #0D0B1E;
  --color-base-200: #16123020;
  --color-base-300: #221C4A;
  --color-base-content: #E8E6FF;

  --color-primary: #00E5FF;
  --color-primary-content: #001A1F;
  --color-secondary: #B85CF6;
  --color-secondary-content: #14042A;
  --color-accent: #FF2E93;
  --color-accent-content: #2A0016;
  --color-neutral: #221C4A;
  --color-neutral-content: #E8E6FF;

  --color-info: #00E5FF;
  --color-info-content: #001A1F;
  --color-success: #39FF88;
  --color-success-content: #002E14;
  --color-warning: #FFD60A;
  --color-warning-content: #2A2200;
  --color-error: #FF2E93;
  --color-error-content: #2A0016;

  --radius-selector: 0.25rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
  --border: 2px;
  --depth: 1;
}

/* ---------- ARCADE CLARO ---------- */
@plugin "daisyui/theme" {
  name: "arcade-light";
  default: false;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: #F5F3FF;
  --color-base-200: #E9E4FF;
  --color-base-300: #D6CEFF;
  --color-base-content: #14103A;

  --color-primary: #00B8D4;
  --color-primary-content: #FFFFFF;
  --color-secondary: #8B3FD9;
  --color-secondary-content: #FFFFFF;
  --color-accent: #E01A7A;
  --color-accent-content: #FFFFFF;
  --color-neutral: #14103A;
  --color-neutral-content: #F5F3FF;

  --color-info: #00B8D4;
  --color-info-content: #FFFFFF;
  --color-success: #0E9F6E;
  --color-success-content: #FFFFFF;
  --color-warning: #D9A400;
  --color-warning-content: #2A2200;
  --color-error: #E01A7A;
  --color-error-content: #FFFFFF;

  --radius-selector: 0.25rem;
  --radius-field: 0.25rem;
  --radius-box: 0.5rem;
  --border: 2px;
  --depth: 1;
}

/* colores de estado, disponibles como utilidades */
@theme {
  --color-node-locked: #6B7285;
  --color-node-open:   #00E5FF;
  --color-node-done:   #39FF88;
  --color-node-failed: #FF2E93;
}
```

Cambio de tema en runtime: atributo `data-theme` en `<html>`.

```ts
document.documentElement.dataset['theme'] = 'arcade-light';
```

> ⚠️ **Radios chicos y borde de 2 px son deliberados**: el look arcade es angular, no redondeado.
> Si algún componente se ve "moderno y suave", está mal para este proyecto.

---

## 3. Tipografía

Las láminas muestran tres niveles. Como no tenemos las fuentes originales, se usan equivalentes
de Google Fonts:

| Nivel | Uso | Fuente sugerida |
|---|---|---|
| **Title** | Títulos de pantalla, nombres de unidad | `Press Start 2P` — solo títulos cortos, es muy ancha |
| **Body** | Texto corrido, descripciones | `Chivo` o system-ui |
| **UI** | Botones, labels, HUD, números | `IBM Plex Mono` — tabular para XP y posiciones |

Los números de XP, posición de ranking y contadores van con
`font-variant-numeric: tabular-nums`, si no bailan al actualizarse.

---

## 4. Componentes de `shared/ui`

Esta librería es la que **co-mantenemos con el Grupo 2** (Notificaciones). Todo lo que entre acá
tiene que ser genérico y consumible por otros equipos.

### Base
| Componente | Estados |
|---|---|
| `ui-button` | normal · hover · pressed · disabled · variantes primary/secondary/action |
| `ui-card` | con y sin header |
| `ui-modal` | con backdrop, cerrable |
| `ui-input` / `ui-textarea` | normal · error (con mensaje) |
| `ui-select` | estilo arcade custom |
| `ui-checkbox` / `ui-radio` | |
| `ui-badge` | dificultad, tipo de nodo |

### De dominio
| Componente | Qué muestra |
|---|---|
| `ui-xp-bar` | Barra de XP + nivel actual + XP al siguiente nivel |
| `ui-lives` | Corazones de vidas vigentes, con animación de descuento |
| `ui-avatar` | Avatar del alumno con marco según nivel |
| `ui-node-icon` | Ícono por `TipoNodo`, coloreado por `EstadoNodo` |
| `ui-hud` | Composición: avatar + XP + vidas + monedas |
| `ui-ranking-row` | Fila con resalte P90 verde / P10 rojo |

> Los componentes de dominio (`xp-bar`, `lives`, `avatar`) son los que el resto de los equipos
> nos van a importar. Prioridad alta y API estable desde temprano.

---

## 5. Mapa interno de la unidad (SVG)

Referencia: `Fotos_y_conceptos/Dentro_de_los_niveles.jpeg` — tablero plano estilo Mario 3.

- **SVG**, no Canvas: los nodos son elementos del DOM → accesibles, con foco y `aria-label`,
  y estilables con las mismas variables del tema
- El profesor define `posicion_x` / `posicion_y` de cada nodo en el editor; el SVG los ubica
  sobre una grilla
- Los caminos son `<path>` entre nodos conectados (`RoadmapConexion`)
- El avatar se **anima entre nodos** siguiendo el path (`getPointAtLength`)
- **Movimiento lineal**: solo se puede avanzar a un nodo cuyos prerequisitos estén `completado`

```
┌─ Unidad 2 · Estructuras de control ─────────────┐
│                                                  │
│  [✓]───[✓]───[◆]───[🔒]───[🔒]                  │
│   │                          │                   │
│  teoría              boss ───┘                   │
│                                                  │
│  ✓ completado   ◆ acá estás   🔒 bloqueado       │
└──────────────────────────────────────────────────┘
```

---

## 6. Vista del profesor: densa y seria

Requerimiento explícito: la gestión debe ser **navegable y eficiente**, no lúdica. El juego es
para el alumno; el profesor necesita trabajar rápido.

- Layout de **dos paneles**: lista de unidades a la izquierda, detalle a la derecha
- Tablas densas con acciones inline, sin tarjetas grandes
- Atajos de teclado para agregar unidad y actividad
- **Preview del mapa en vivo** al costado, para ver el efecto de cada cambio
- Guardado con feedback explícito (nada de autoguardado silencioso)
- Sugerencias de buenas prácticas de gamificación (RF-CUR-07) como *hints* no bloqueantes
  — ej. *"esta unidad no tiene ningún nodo obligatorio"*

---

## 7. Accesibilidad y restricciones

- **Desktop-only** (RF-NFR-05): guard de viewport que muestra
  *"Esta sección requiere una computadora"* en lugar de degradarse o fallar
- Contraste: verificar el par texto/fondo en **ambos temas** — el cyan sobre navy pasa,
  pero cyan sobre base-200 hay que revisarlo
- No comunicar estado **solo por color**: cada estado de nodo lleva también ícono
  (candado, check, rombo, cruz). Un daltónico tiene que poder jugar
- Foco visible en todos los interactivos, incluidos los nodos del SVG
- **Sin strings hardcodeados** (RF-NFR-07): todo texto pasa por i18n desde el día 1,
  aunque el MVP sea solo español
- `prefers-reduced-motion`: desactivar el paneo automático y las animaciones del avatar

---

## 8. Checklist del squad

- [ ] Tema `arcade-dark` y `arcade-light` con toggle funcionando
- [ ] Tipografías cargadas con fallback real
- [ ] Componentes base de `shared/ui` con sus 4 estados
- [ ] Componentes de dominio (`xp-bar`, `lives`, `avatar`, `node-icon`, `hud`)
- [ ] Mapa interno SVG con nodos, caminos y avatar animado
- [ ] Pantalla de ranking con resaltes P90/P10
- [ ] Guard desktop-only
- [ ] Revisión de contraste en ambos temas
- [ ] Estados comunicados con ícono además de color
