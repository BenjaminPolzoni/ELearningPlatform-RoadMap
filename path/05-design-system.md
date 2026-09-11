# 05 · Design system

> Squad **UI**. Fuente de verdad de la paleta: **`Fotos_y_conceptos/paleta.jpg`** (lámina
> de marca). Referencias visuales del mapa: `Fotos_y_conceptos/estilo_roadmap.jpeg` (vista
> general 2.5D) y `Fotos_y_conceptos/Dentro_de_los_niveles.jpeg` (tablero interno de la
> unidad, estilo Mario 3 — la misma lámina que ya usaba este documento antes del rediseño).
>
> ⚠️ Las láminas `Fotos_y_conceptos/InterfazDeColores*.png` quedaron **obsoletas**: definían
> una paleta cyan/magenta que el rediseño reemplazó por la de marca. Se conservan como
> historial del proyecto, no como referencia de implementación.

## 1. Paleta

Los cuatro swatches se muestrearon píxel a píxel de `Fotos_y_conceptos/paleta.jpg` — no
son una interpretación de la lámina.

| Color | Hex | Rol |
|---|---|---|
| 🩷 Rosa fuego | `#FF2758` | **primary** — acción principal, nodo disponible, "acá estás" |
| 🟣 Violeta eléctrico | `#6B21C9` | **secondary** — bordes, marcos, estructura |
| 🟪 Violeta profundo | `#2D164A` | **base-300** — superficies elevadas |
| ⚫ Negro violáceo | `#190236` | **base-100** en tema oscuro — fondo |
| ⚪ Blanco | `#FFFFFF` | texto sobre color, filos del pixel-art |

Derivados de la misma familia para el arte del mapa, expuestos como utilidades en el
`@theme` de `styles.css` y **fijos en los dos temas**: `brand-void` `#0E0120` (el vacío
bajo las islas) y `brand-glow` `#8B3DF5` (el violeta que brilla).

### Colores de estado del nodo

Consistentes entre el mapa 2.5D, el tablero interno y la UI:

| Estado | Hex | Uso |
|---|---|---|
| `bloqueado` | `#3C2A5E` | Violeta apagado + ícono de candado |
| `habilitado` | `#FF2758` | Rosa fuego con glow — es el "andá por acá" |
| `completado` | `#8B3DF5` | Violeta eléctrico — el tramo ya recorrido |
| `fallado` | `#9B1B3C` | Rosa oscurecido + ícono ✕ |

> **Por qué `completado` no es verde** (como en la versión anterior de este documento): la
> paleta de marca no tiene un verde, y agregarlo rompía lo único que se pidió respetar. El
> contraste "recorrido vs. próximo" se resuelve igual de bien con violeta (hecho) contra
> rosa (siguiente) — que además es exactamente la lectura de `estilo_roadmap.jpeg`.

---

## 2. Tema daisyUI

daisyUI 5 con Tailwind 4 se configura **por CSS**, no por `tailwind.config.js`. La fuente
de verdad es `frontend/src/styles.css` — este documento describe las decisiones, no
duplica el archivo.

Dos temas, `arcade-dark` (default, `prefersdark`) y `arcade-light`, más un bloque `@theme`
con lo que **no** rota con el tema: los swatches crudos, los colores de estado de nodo y
las familias tipográficas.

Cambio de tema en runtime: atributo `data-theme` en `<html>` (`ThemeService`).

```ts
document.documentElement.dataset['theme'] = 'arcade-light';
```

> ⚠️ **Radios chicos y borde de 2 px son deliberados**: el look es angular, no redondeado.
> Si algún componente se ve "moderno y suave", está mal para este proyecto. El utilitario
> `.chaflan` corta las esquinas en diagonal donde hace falta reforzarlo.

> **La escena del mapa es oscura en los dos temas** (`.escena-neon`). El tema claro aclara
> el *chrome* de la app — navbar, fichas, HUD, editor del profesor — no el mundo del juego:
> un mapa nocturno con caminos de neón no tiene versión clara que funcione.

### Primitivas de arte compartidas

Viven en `styles.css` y las usan tanto el mapa como el tablero:

| Clase | Qué hace |
|---|---|
| `.escena-neon` | Fondo de escena: viñeta violeta sobre `brand-void` |
| `.chaflan` | Esquinas cortadas en diagonal (`clip-path`) |
| `.pixelado` | `image-rendering: pixelated` + `shape-rendering: crispEdges` |
| `.glow-pink` / `.glow-violet` | Halo neón por `drop-shadow`, aplicable a SVG |
| `.anim-flotar` / `.anim-latir` / `.anim-fluir` | Flotación de islas, pulso del nodo actual, flujo del camino |

Las tres animaciones se anulan bajo `prefers-reduced-motion` desde el propio `styles.css`,
así que ningún componente tiene que acordarse de hacerlo.

---

## 3. Tipografía

Las dos de la lámina de marca, más la pixel font del HUD. Todas en Google Fonts:

| Nivel | Uso | Fuente | Clase |
|---|---|---|---|
| **Title** | Títulos de pantalla, nombres de unidad y de nodo | `Chelsea Market` | `.title-font` |
| **Body** | Texto corrido, descripciones | `Comfortaa` | (default en `html`) |
| **UI / HUD** | Botones chicos, labels, XP, contadores | `Press Start 2P` | `.ui-font` / `.pixel-font` |

`Press Start 2P` no está en la lámina: se conserva del design system anterior porque el HUD
y la barra inferior del mapa son piezas de **gabinete arcade**, y una pixel font es lo que
las hace leer como tales al lado del pixel-art del avatar. Se usa solo en textos cortos y
en mayúsculas — es muy ancha.

Los números de XP, posición de ranking y contadores van con `.tabular`
(`font-variant-numeric: tabular-nums`), si no bailan al actualizarse.

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
| Componente | Qué muestra | Estado |
|---|---|---|
| `ui-xp-bar` | Barra de XP + nivel actual + XP al siguiente nivel | ✅ `shared/ui/xp-bar.ts` |
| `ui-lives` | Corazones de vidas vigentes (3 slots fijos, PAR-12) | ✅ `shared/ui/lives.ts` |
| `ui-avatar-sprite` | Sprite pixel-art del alumno, personalizable | ✅ `shared/ui/avatar-sprite.ts` |
| `ui-hud` | Composición: avatar + nivel + XP + vidas | ✅ `shared/ui/hud.ts` |
| `ui-node-icon` | Ícono por `TipoNodo`, coloreado por `EstadoNodo` | ⬜ hoy inline en el tablero |
| `ui-ranking-row` | Fila con resalte P90 / P10 | ⬜ |

> Los componentes de dominio son los que el resto de los equipos nos van a importar.
> Prioridad alta y API estable desde temprano.

### El avatar del alumno

`ui-avatar-sprite` es un SVG de grilla **16×22** con `shape-rendering: crispEdges`: escala a
cualquier tamaño sin perder el borde duro del pixel-art y sin necesitar un atlas de PNGs.
El mismo componente se usa en tres lugares — HUD (busto recortado), isla actual del mapa
2.5D y ficha del tablero de unidad — variando solo `alto`.

La configuración vive en `core/avatar/`: el catálogo (`avatar.models.ts`) y la persistencia
(`avatar.service.ts`). Se personaliza en `/alumno/avatar`.

| Parte | Opciones |
|---|---|
| Piel | 6 tonos — 4 naturales + 2 estilizados de la paleta |
| Pelo | corto · largo · cresta · rapado · afro, en 6 colores |
| Traje | 6 colores |
| Accesorio | ninguno · visor · gorra · corona · auriculares, en 6 colores |

Dos reglas de contraste que el componente resuelve solo, porque si no el sprite se rompe
con ciertas combinaciones: el **emblema del pecho** se invierte cuando el traje ya es rosa,
y los **zapatos** van siempre en hueso (el punto de apoyo del sprite tiene que verse contra
el suelo oscuro, y un traje "noche" dejaba al personaje sin pies).

Lo que se persiste son **ids del catálogo**, nunca hex — un retoque de paleta no invalida
los avatares ya guardados, y el DTO queda listo para viajar al perfil del BFF en Fase 3.

---

## 5. Mapa 2.5D del curso (SVG isométrico)

Referencia: `Fotos_y_conceptos/estilo_roadmap.jpeg`. Implementación:
`features/alumno/mapa.ts` + `core/iso/iso.ts`. El contrato del layout es el de
[`04-engine-2-5d.md`](04-engine-2-5d.md) §4 — acá va solo lo visual. **La matemática de la
proyección está documentada en detalle en 04 §11**, con el motivo de cada decisión; esto de
acá es el resumen de lo que produce.

- Cada unidad es una **isla flotante**: tapa en rombo + dos caras extruidas + base rocosa
  que se afina hacia abajo, sobre una grilla isométrica de piso — los cuatro son polígonos
  SVG (`<polygon>`), no geometría 3D; el volumen es un truco de dibujar las caras correctas
  en el orden correcto
- El "brillo neón" de caminos e íconos es un filtro SVG (`feGaussianBlur` + `feMerge`), el
  equivalente casero al `UnrealBloomPass` de three.js que describe 04 §6
- Los **caminos** son curvas cuadráticas entre islas, con tres trazos superpuestos: halo
  difuso, línea sólida, y guiones animados que fluyen en el sentido de la marcha
- Estado por isla: bloqueada (apagada) · disponible (violeta con emblema) · completada
- La isla **actual** lleva halo rosa pulsante, borde rosa y el **avatar del alumno** parado
  encima — es el ancla del jugador en el mapa
- Paneo con drag y zoom acotado (04 §9); el encuadre se deriva del bounding box del layout,
  así que crece solo al agregar unidades
- Con `[preview]="true"` el mismo componente se embebe en el editor del profesor: encuadre
  completo, sin HUD, sin paneo y sin estados por alumno

---

## 6. Tablero interno de la unidad (SVG)

Referencia: `Fotos_y_conceptos/Dentro_de_los_niveles.jpeg` — tablero plano estilo Mario 3.
Implementación: `features/alumno/unidad-mapa.ts`.

- **SVG**, no Canvas: los nodos son elementos del DOM → accesibles, con foco y `aria-label`,
  y estilables con las mismas variables del tema
- Suelo de trama de puntos dentro de un marco doble, tipo cartucho de consola, con cristales
  de decorado deterministas confinados al carril **entre** filas de casilleros
- Los caminos son segmentos **ortogonales** entre casilleros, con guiones oscuros encima que
  les dan el aspecto segmentado de la referencia
- El **avatar personalizado camina** de casillero en casillero (interpolación por
  `requestAnimationFrame`, un tramo a la vez, dándose vuelta según la dirección) — no se
  teletransporta
- **Movimiento lineal**: solo se puede avanzar hasta el primer nodo no completado
- El profesor debería definir `posicion_x` / `posicion_y` de cada nodo; mientras el editor
  no lo exponga, el tablero calcula una serpentina de 4 columnas
  (deuda [#1](deuda-tecnica/tarea-deuda-05-design-system.md))

```
┌─ Unidad 1 · Fundamentos ────────────────────────┐
│                                                  │
│  [✓]───[✓]───[✓]───[◆]                          │
│                      │                           │
│         [🔒]───────[🔒]                          │
│                                                  │
│  ✓ completado   ◆ acá estás   🔒 bloqueado       │
└──────────────────────────────────────────────────┘
```

---

## 7. Vista del profesor: densa y seria

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

## 8. Accesibilidad y restricciones

- **Desktop-only** (RF-NFR-05): guard de viewport que muestra
  *"Esta sección requiere una computadora"* en lugar de degradarse o fallar
- Contraste: verificar el par texto/fondo en **ambos temas**. El texto sobre la escena del
  mapa está en hex fijos claros (`#F3EAFF`, `#C79BFF`) justamente porque la escena no rota
  con el tema — usar `base-content` ahí lo volvería ilegible en tema claro
- No comunicar estado **solo por color**: cada estado de nodo lleva también ícono
  (candado, check, número, cruz). Un daltónico tiene que poder jugar
- Foco visible en todos los interactivos, incluidos los nodos del SVG: las islas y los
  casilleros son `role="button"` con `tabindex`, y el anillo de foco es un polígono punteado
  dedicado (`.isla-foco` / `.foco`), porque un `outline` sobre un `<g>` de SVG no se dibuja
- **Sin strings hardcodeados** (RF-NFR-07): todo texto pasa por i18n desde el día 1,
  aunque el MVP sea solo español
- `prefers-reduced-motion`: desactivado desde `styles.css` para las tres animaciones de
  escena y desde el propio componente para el ciclo de caminata del avatar

---

## 9. Checklist del squad

- [x] Tema `arcade-dark` y `arcade-light` con toggle funcionando — `styles.css` +
      `ThemeService` (Fase 0)
- [x] Paleta migrada a la lámina de marca (`Fotos_y_conceptos/paleta.jpg`) — §1
- [x] Tipografías cargadas con fallback real — Chelsea Market / Comfortaa / Press Start 2P
      vía Google Fonts, con stack de fallback en `@theme`
- [ ] Componentes base de `shared/ui` con sus 4 estados
- [x] Componentes de dominio `xp-bar`, `lives`, `avatar-sprite`, `hud`
- [ ] `ui-node-icon` y `ui-ranking-row`
- [x] Mapa 2.5D del curso con islas, caminos por progreso, paneo/zoom y avatar
- [x] Avatar personalizable, persistido, usado en HUD + mapa + tablero
- [x] Tablero interno de la unidad con nodos, caminos y avatar caminando
- [ ] Pantalla de ranking con resaltes P90/P10
- [x] Guard desktop-only — overlay RF-NFR-05 en el shell (`App`), reactivo al resize (Fase 0)
- [x] Estados comunicados con ícono además de color
- [ ] Revisión de contraste formal (WCAG AA) en ambos temas
