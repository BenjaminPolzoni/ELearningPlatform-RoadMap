---
name: pixel-art-arcade-icons
description: >-
  Generar íconos y elementos de UI en pixel art (corazones/vidas,
  racha/fuego, insignias, íconos genéricos) estilo arcade retro, como SVG
  a partir de grillas de píxeles. Usar esta skill siempre que se pida
  crear, replicar o extender íconos pixelados para el módulo de Roadmap
  (vidas, racha, catálogo de insignias) o cualquier ícono nuevo en el
  mismo estilo, incluso si el pedido no menciona "pixel art" explícitamente
  pero describe algo como "corazones estilo Minecraft", "insignia
  pixelada" o "ícono 8-bit". Importante: esta skill nunca aplica la
  paleta arcade de referencia (violeta, cian, magenta, dorado) sin antes
  revisar si el proyecto ya tiene su propio sistema de diseño (Tailwind
  config, variables CSS, tema de daisyUI); adaptar siempre al estilo real
  de la página salvo que el usuario pida explícitamente la paleta de
  referencia.
---

# Pixel Art Arcade Icons

Genera íconos pixelados como SVG vectorial (no imágenes rasterizadas), a partir
de grillas de enteros donde cada número mapea a un color. Cada "pixel" es un
`<rect>`, así que el resultado es liviano, editable, y pega directo en Figma
si hace falta.

Nace del trabajo de diseño del catálogo de insignias, vidas y racha del
módulo Roadmap (Grupo 10, TUP) — ver `references/pixel-grids.md` para todas
las grillas ya diseñadas y probadas.

## Paso 0 — SIEMPRE primero: detectar el sistema de diseño real del proyecto

Antes de generar cualquier ícono nuevo, buscar en el repo (en este orden —
**el proyecto no usa Angular Material**, la paleta vive en Tailwind/daisyUI
o en variables SCSS propias):

1. Config de tema de daisyUI (`daisyui: { themes: [...] }` dentro de
   `tailwind.config.{js,ts,cjs}`) — es la elección confirmada del equipo
   (sprint 0: "implementar daisyUI con nuestra paleta"), revisar acá
   primero. daisyUI define variables por tema (`primary`, `secondary`,
   `accent`, `base-100`, etc.) y las expone también como variables CSS
   (`--p`, `--s`, `--a`...) en runtime.
2. El resto de `tailwind.config.{js,ts,cjs}` — bloque `theme.colors` o
   `theme.extend.colors`, si hay colores custom fuera del tema de daisyUI.
3. Variables CSS custom (`:root { --color-... }` o similar) en
   `src/styles.scss` u otros `.scss` globales.
4. Cualquier archivo `design-tokens.*`, `theme.*` o `colors.*` en `src/`.

Si se encuentra un sistema de diseño real, **usar esos colores**, no la
paleta arcade de `references/design-tokens.md` — esa paleta es solo la
referencia original con la que se diseñó el catálogo de ejemplo, pensada
para reemplazarse.

Si no se encuentra nada (proyecto nuevo, sin estilos definidos todavía),
usar la paleta arcade de referencia y avisar al usuario que se está usando
un placeholder.

**Nunca asumir la paleta arcade por default.** Preguntar si hay dudas.

## Paso 1 — Reusar antes que rediseñar

Antes de dibujar una grilla nueva, revisar `references/pixel-grids.md`: ya
existen 23 íconos diseñados (2 estados de vida, racha, 15 insignias del
catálogo, 8 íconos genéricos para el picker del CRUD). Si el pedido es
"replicar" alguno de estos, usar la grilla tal cual — solo hay que
recolorear con la paleta real del proyecto (Paso 0), no rehacer la forma.

**Excepción — íconos marcados como débiles.** `references/pixel-grids.md`
marca explícitamente cuáles grillas no quedaron bien resueltas a 9x9
(espada, llave, medalla, estrella, brújula/explorador, cronómetro/maratón,
gorro/subiste-de-nivel). Si el pedido toca alguno de estos, no los repliques
tal cual — rediseñá la forma desde cero, típicamente subiendo la resolución
a 11x11 o 13x13 para tener más margen de silueta.

## Paso 2 — Generar el SVG

Usar `scripts/pixel-svg.ts`. Tiene:

- `PALETTE_ARCADE`: la paleta de referencia (objeto clave→hex).
- `rectsFromGrid(grid, colors, x0, y0, px)`: convierte una grilla en
  `<rect>`s, fusionando celdas horizontales contiguas del mismo color para
  que el SVG no quede innecesariamente pesado.
- `icon(grid, colors, x, y, px)`: wrapper que devuelve el `<g>` de un ícono
  ya posicionado.
- `standaloneSvg(grid, colors, px, padding)`: un ícono como SVG completo,
  para escribirlo directo como archivo `.svg`.
- `GRIDS`: objeto con las 23 grillas ya definidas (mismo contenido que
  `references/pixel-grids.md`), tipado con `IconEntry` (incluye
  `needsRework` y `notes` por ícono).

Ejemplo de uso — regenerar el corazón con la paleta real del proyecto en vez
de la arcade:

```typescript
import { GRIDS, icon } from "./pixel-svg";

// colores reales del proyecto (Paso 0), no los de PALETTE_ARCADE
const colorsReal = { 1: "#1A1A1A", 2: "#E63946", 3: "#FFFFFF" };
const svgFragment = icon(GRIDS["heart_full"].grid, colorsReal, 0, 0, 8);
```

El script también corre solo y escribe un `.svg` por ícono (salteando los
que están marcados `needsRework`):

```bash
npx ts-node scripts/pixel-svg.ts ./src/assets/icons
```

Si el proyecto tiene `"type": "module"` en su `package.json`, agregar
`--compiler-options '{"module":"commonjs"}'` a ese comando — el script usa
`require`, que asume CommonJS (está documentado en el propio archivo).

## Paso 3 — Integrarlo al proyecto real

No asumir que el resultado final tiene que ser un archivo `.svg` suelto —
esa fue la forma más práctica de compartirlo en el chat de diseño (para que
importara a Figma), pero en el código real (Angular 22) conviene:

- **Como componente**, si el ícono necesita variar color/tamaño/estado en
  runtime (ej. el corazón lleno/vacío según `vidasVigentes`, o el badge que
  cambia de tier): un `PixelIconComponent` standalone, con `@Input()` para
  `name` (clave de `GRIDS`), `colors` y `size`, que renderiza el SVG vía
  `[innerHTML]` + `DomSanitizer.bypassSecurityTrustHtml(...)` (el contenido
  es generado por este mismo script, no HTML de usuario — es un caso
  legítimo de `bypassSecurityTrustHtml`, no un riesgo de XSS).
- **Como asset estático**, si el ícono es siempre igual (no cambia de color
  ni de estado): exportarlo una sola vez con `standaloneSvg` a
  `src/assets/icons/`, y referenciarlo como cualquier otro asset de Angular
  (`<img src="assets/icons/heart-full.svg">` o `background-image` en CSS).
- Preferir el componente para vidas y para las insignias con tiers (bronce/
  plata/oro); preferir asset estático para las que no cambian de estado.

## Notas de diseño a respetar

- **Vidas**: solo 2 estados (llena / vacía). No hay corazón "a medio llenar"
  como estado de datos — si se necesita una transición visual de perder una
  vida, es una animación entre esos dos estados, no un tercer estado nuevo.
- **Racha**: el ícono está listo, pero la mecánica de racha (otorgamiento
  diario, corte a medianoche, reinicio) no está confirmada como alcance del
  proyecto — solo aparece como "para más adelante" en la propuesta de
  arquitectura. No asumir que hay que implementar la lógica solo porque el
  ícono ya existe.
- **Insignias del catálogo vs. íconos genéricos del CRUD**: son dos
  librerías separadas a propósito. Las 15 insignias del catálogo tienen
  significado fijo (cada una representa un criterio específico); los 8
  íconos genéricos son para que el profesor arme insignias nuevas sin pisar
  el significado de las que ya existen. No mezclar ambos sets.
