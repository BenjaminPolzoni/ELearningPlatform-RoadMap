/**
 * pixel-svg.ts — generador de íconos pixel art como SVG, en TypeScript.
 *
 * Ver SKILL.md antes de usar: el Paso 0 (detectar el sistema de diseño real
 * del proyecto — en este caso, buscar en los estilos globales de Angular o
 * en el tema de Angular Material / Tailwind si el proyecto lo usa) va ANTES
 * de generar nada con PALETTE_ARCADE. Esa paleta es el placeholder original,
 * pensada para reemplazarse por las variables reales del proyecto.
 *
 * Pensado para correr con ts-node o como script de npm (ver "Uso" al final).
 */

export type PixelGrid = number[][];
export type ColorMap = Record<number, string>;

export const PALETTE_ARCADE = {
  bg: "#0D0B1E",
  panel: "#161328",
  panel2: "#1E1A38",
  violet: "#8B5CF6",
  cyan: "#00E5FF",
  magenta: "#FF2E93",
  gold: "#FFD60A",
  white: "#F8FAFC",
  muted: "#6B6785",
} as const;

/** Convierte una grilla (0 = transparente) en <rect> SVG, fusionando
 * celdas horizontales contiguas del mismo color. */
export function rectsFromGrid(
  grid: PixelGrid,
  colors: ColorMap,
  x0 = 0,
  y0 = 0,
  px = 8
): string {
  const out: string[] = [];
  grid.forEach((row, ry) => {
    let cx = 0;
    while (cx < row.length) {
      const v = row[cx];
      if (v === 0) {
        cx += 1;
        continue;
      }
      let cx2 = cx;
      while (cx2 < row.length && row[cx2] === v) cx2 += 1;
      const w = cx2 - cx;
      out.push(
        `<rect x="${x0 + cx * px}" y="${y0 + ry * px}" width="${w * px}" height="${px}" fill="${colors[v]}"/>`
      );
      cx = cx2;
    }
  });
  return out.join("\n");
}

/** Ícono como <g> ya posicionado. */
export function icon(grid: PixelGrid, colors: ColorMap, x = 0, y = 0, px = 8): string {
  return `<g>${rectsFromGrid(grid, colors, x, y, px)}</g>`;
}

/** SVG mínimo con un solo ícono — para exportar un .svg por ícono a
 * src/assets/icons/ (o donde el proyecto guarde assets estáticos). */
export function standaloneSvg(grid: PixelGrid, colors: ColorMap, px = 16, padding = 0): string {
  const w = grid[0].length * px + padding * 2;
  const h = grid.length * px + padding * 2;
  const body = rectsFromGrid(grid, colors, padding, padding, px);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

export interface IconEntry {
  grid: PixelGrid;
  colorsArcade: ColorMap;
  needsRework: boolean;
  notes: string;
}

// ---------------------------------------------------------------------------
// Grillas ya diseñadas (9x9 salvo aclaración). Ver references/pixel-grids.md
// para la versión legible con la tabla de estado (listo / rehacer).
// ---------------------------------------------------------------------------
export const GRIDS: Record<string, IconEntry> = {
  heart_full: {
    grid: [
      [0,1,1,0,0,0,1,1,0],
      [1,3,3,1,0,1,2,2,1],
      [1,3,2,2,1,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [0,1,2,2,2,2,2,1,0],
      [0,0,1,2,2,2,1,0,0],
      [0,0,0,1,2,1,0,0,0],
      [0,0,0,0,1,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.magenta, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Vida vigente. Solo 2 estados con heart_empty — no hay 'medio corazón' como estado de datos.",
  },
  heart_empty: {
    grid: [
      [0,1,1,0,0,0,1,1,0],
      [1,3,3,1,0,1,2,2,1],
      [1,3,2,2,1,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [0,1,2,2,2,2,2,1,0],
      [0,0,1,2,2,2,1,0,0],
      [0,0,0,1,2,1,0,0,0],
      [0,0,0,0,1,0,0,0,0],
    ],
    colorsArcade: { 1: "#3A3552", 2: "#1E1A38", 3: "#2A2545" },
    needsRework: false,
    notes: "Vida perdida. Misma forma que heart_full, solo cambia la paleta a tonos apagados.",
  },
  heart_halo: {
    grid: [
      [0,1,1,0,0,0,1,1,0],
      [1,3,3,1,0,1,2,2,1],
      [1,3,2,2,1,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],
      [0,1,2,2,2,2,2,1,0],
      [0,0,1,2,2,2,1,0,0],
      [0,0,0,1,2,1,0,0,0],
      [0,0,0,0,1,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.gold, 2: PALETTE_ARCADE.magenta, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Insignia 'Sin heridas'. Mismo dibujo que heart_full, contorno dorado en vez de negro.",
  },
  fire_racha: {
    grid: [
      [0,0,0,1,0,0,0],
      [0,0,1,2,1,0,0],
      [0,1,2,2,2,1,0],
      [1,2,3,2,2,2,1],
      [1,2,2,3,2,2,1],
      [1,2,2,2,2,2,1],
      [0,1,2,2,2,1,0],
      [0,1,2,2,2,1,0],
      [0,0,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Racha activa. Grilla 7x9. Mecánica de racha sin confirmar como alcance — ver SKILL.md.",
  },
  badge_seccion_perfecta: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,1],[1,2,3,2,2,2,3,2,1],
      [1,2,2,2,4,2,2,2,1],[1,2,2,4,4,4,2,2,1],[1,2,2,2,4,2,2,2,1],
      [0,1,2,2,2,2,2,1,0],[0,0,1,2,2,2,1,0,0],[0,0,0,1,1,1,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white, 4: PALETTE_ARCADE.violet },
    needsRework: false,
    notes: "Transversal — sección completa sin perder vidas.",
  },
  badge_a_la_primera: {
    grid: [
      [0,0,1,1,1,1,1,0,0],[0,1,2,2,2,2,2,1,0],[1,2,1,1,1,1,1,2,1],
      [1,2,1,3,3,3,1,2,1],[1,2,1,3,4,3,1,2,1],[1,2,1,3,3,3,1,2,1],
      [1,2,1,1,1,1,1,2,1],[0,1,2,2,2,2,2,1,0],[0,0,1,1,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white, 4: PALETTE_ARCADE.magenta },
    needsRework: false,
    notes: "Transversal — nodo superado sin usar reintentos.",
  },
  badge_segunda_oportunidad: {
    grid: [
      [0,0,0,0,1,0,0,0,0],[0,0,0,1,2,1,0,0,0],[0,0,1,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,1,0],[0,0,0,1,2,1,0,0,0],[0,0,0,1,2,1,0,0,0],
      [0,0,0,1,2,1,0,0,0],[0,0,0,1,2,1,0,0,0],[0,0,1,1,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan },
    needsRework: true,
    notes: "Transversal — recuperaste una vida. Parece cruz, no flecha. Rediseñar.",
  },
  badge_hito_xp_bronce: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,1],[1,2,3,2,2,2,3,2,1],
      [0,1,2,2,2,2,2,1,0],[0,0,1,2,2,2,1,0,0],[0,0,0,1,2,1,0,0,0],
      [0,0,1,2,2,2,1,0,0],[0,1,2,2,2,2,2,1,0],[1,1,1,1,1,1,1,1,1],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Transversal — 1er umbral de XP. Misma forma que plata/oro, cambia el color por tier.",
  },
  badge_hito_xp_plata: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,1],[1,2,3,2,2,2,3,2,1],
      [0,1,2,2,2,2,2,1,0],[0,0,1,2,2,2,1,0,0],[0,0,0,1,2,1,0,0,0],
      [0,0,1,2,2,2,1,0,0],[0,1,2,2,2,2,2,1,0],[1,1,1,1,1,1,1,1,1],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Transversal — 2do umbral de XP.",
  },
  badge_hito_xp_oro: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,1],[1,2,3,2,2,2,3,2,1],
      [0,1,2,2,2,2,2,1,0],[0,0,1,2,2,2,1,0,0],[0,0,0,1,2,1,0,0,0],
      [0,0,1,2,2,2,1,0,0],[0,1,2,2,2,2,2,1,0],[1,1,1,1,1,1,1,1,1],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Transversal — 3er umbral de XP.",
  },
  badge_subiste_de_nivel: {
    grid: [
      [0,0,0,1,1,1,0,0,0],[0,0,1,2,2,2,1,0,0],[0,1,2,2,2,2,2,1,0],
      [0,0,0,0,0,0,0,0,0],[0,0,0,1,1,1,0,0,0],[0,0,1,2,2,2,1,0,0],
      [0,1,2,2,2,2,2,1,0],[1,2,2,2,2,2,2,2,1],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet },
    needsRework: true,
    notes: "Transversal — nuevo nivel alcanzado. Parece gorrito, no rango. Rediseñar.",
  },
  badge_zona_elite: {
    grid: [
      [0,1,0,1,0,1,0,1,0],[1,2,1,2,1,2,1,2,1],[1,2,2,2,2,2,2,2,1],
      [1,2,3,2,2,2,3,2,1],[1,1,1,1,1,1,1,1,1],[0,1,2,2,2,2,2,1,0],
      [0,1,2,2,2,2,2,1,0],[0,1,1,1,1,1,1,1,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Transversal — entraste a zona P90.",
  },
  badge_primeros_pasos: {
    grid: [
      [1,1,1,1,1,0,0,0,0],[1,2,2,2,1,0,0,0,0],[1,2,3,2,1,0,0,0,0],
      [1,2,2,2,1,0,0,0,0],[1,1,1,1,1,0,0,0,0],[1,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,0,0,0],[1,1,1,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Transversal — primer nodo obligatorio completado.",
  },
  badge_explorador: {
    grid: [
      [0,0,1,1,1,1,1,0,0],[0,1,2,2,2,2,2,1,0],[1,2,2,3,2,3,2,2,1],
      [1,2,2,2,4,2,2,2,1],[1,2,3,2,4,2,3,2,1],[1,2,2,2,4,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],[0,1,2,2,2,2,2,1,0],[0,0,1,1,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet, 3: PALETTE_ARCADE.white, 4: PALETTE_ARCADE.magenta },
    needsRework: true,
    notes: "Transversal — nodo opcional completado. Parece carita, no brújula. Rediseñar.",
  },
  badge_maraton: {
    grid: [
      [0,0,1,1,1,0,0,0,0],[0,0,1,2,1,0,0,0,0],[0,1,1,1,1,1,0,0,0],
      [1,2,2,2,2,2,1,0,0],[1,2,3,2,4,2,1,0,0],[1,2,2,2,2,2,1,0,0],
      [1,2,2,2,2,2,1,0,0],[0,1,2,2,2,1,0,0,0],[0,0,1,1,1,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.magenta, 3: PALETTE_ARCADE.white, 4: PALETTE_ARCADE.cyan },
    needsRework: true,
    notes: "Transversal — sección entera en un día. Parece poción, no cronómetro. Rediseñar.",
  },
  badge_pionero: {
    grid: [
      [0,0,0,1,1,0,0,0,0],[0,0,1,2,2,1,0,0,0],[0,0,1,2,3,1,0,0,0],
      [0,0,1,2,2,1,0,0,0],[0,1,2,2,2,2,1,0,0],[1,2,1,2,2,1,2,1,0],
      [0,1,4,1,1,4,1,0,0],[0,0,0,4,4,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white, 4: PALETTE_ARCADE.gold },
    needsRework: false,
    notes: "Transversal — primero de la cohorte en completar un nodo. Query más pesada que las demás.",
  },
  badge_boss: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,2,2,2,2,1],[1,2,3,2,2,2,3,2,1],
      [1,2,2,2,2,2,2,2,1],[1,2,2,1,2,1,2,2,1],[0,1,1,1,1,1,1,1,0],
      [0,0,1,2,1,2,1,0,0],[0,0,1,1,1,1,1,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.white, 3: PALETTE_ARCADE.magenta },
    needsRework: false,
    notes: "Por nodo — la asigna el profesor al armar un nodo tipo hito/boss.",
  },
  badge_evento: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,3,2,3,2,2,1],[1,1,1,3,1,3,1,1,1],
      [1,2,2,3,2,3,2,2,1],[1,2,2,3,2,3,2,2,1],[1,2,2,3,2,3,2,2,1],
      [1,2,2,3,2,3,2,2,1],[1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet, 3: PALETTE_ARCADE.gold },
    needsRework: false,
    notes: "Por nodo — desafío puntual (hackathon interno, evento especial).",
  },
  generic_star: {
    grid: [
      [0,0,0,0,1,0,0,0,0],[0,0,0,1,2,1,0,0,0],[0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,1,1,1],[1,2,2,2,2,2,2,2,1],[0,1,2,2,2,2,2,1,0],
      [0,1,2,1,0,1,2,1,0],[0,1,1,0,0,0,1,1,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold },
    needsRework: true,
    notes: "Genérico del CRUD. Poco legible a 9x9. Rediseñar.",
  },
  generic_gem: {
    grid: [
      [0,0,1,1,1,1,1,0,0],[0,1,2,3,2,3,2,1,0],[1,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],[0,1,2,2,2,2,2,1,0],[0,0,1,2,2,2,1,0,0],
      [0,0,0,1,2,1,0,0,0],[0,0,0,0,1,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.cyan, 3: PALETTE_ARCADE.white },
    needsRework: false,
    notes: "Genérico del CRUD.",
  },
  generic_sword: {
    grid: [
      [0,0,0,0,1,0,0,0,0],[0,0,0,0,2,0,0,0,0],[0,0,0,0,2,0,0,0,0],
      [0,0,0,0,2,0,0,0,0],[0,0,0,0,2,0,0,0,0],[0,1,1,1,1,1,1,1,0],
      [0,0,0,1,3,1,0,0,0],[0,0,0,0,3,0,0,0,0],[0,0,0,0,1,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.white, 3: PALETTE_ARCADE.violet },
    needsRework: true,
    notes: "Genérico del CRUD. Muy fina. Rediseñar con más ancho.",
  },
  generic_book: {
    grid: [
      [0,1,1,1,1,1,1,1,0],[1,2,2,2,1,3,3,3,1],[1,2,2,2,1,3,3,3,1],
      [1,2,2,2,1,3,3,3,1],[1,2,2,2,1,3,3,3,1],[1,2,2,2,1,3,3,3,1],
      [1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet, 3: PALETTE_ARCADE.cyan },
    needsRework: false,
    notes: "Genérico del CRUD.",
  },
  generic_lightning: {
    grid: [
      [0,0,0,1,1,0,0,0,0],[0,0,1,2,2,1,0,0,0],[0,1,2,2,2,1,0,0,0],
      [1,2,2,2,2,1,1,1,0],[0,1,1,2,2,2,1,0,0],[0,0,0,1,2,2,1,0,0],
      [0,0,0,0,1,2,1,0,0],[0,0,0,0,0,1,1,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold },
    needsRework: false,
    notes: "Genérico del CRUD.",
  },
  generic_medal: {
    grid: [
      [0,1,0,0,0,0,0,1,0],[1,2,1,0,0,0,1,2,1],[1,3,2,1,0,1,2,3,1],
      [0,1,2,2,1,2,2,1,0],[0,0,1,1,1,1,1,0,0],[0,0,1,2,2,2,1,0,0],
      [0,1,2,3,2,3,2,1,0],[0,1,2,2,2,2,2,1,0],[0,0,1,1,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.magenta, 3: PALETTE_ARCADE.white },
    needsRework: true,
    notes: "Genérico del CRUD. Cinta ilegible. Rediseñar.",
  },
  generic_key: {
    grid: [
      [0,0,1,1,1,0,0,0,0],[0,1,2,3,2,1,0,0,0],[0,1,2,2,2,1,0,0,0],
      [0,0,1,2,1,0,0,0,0],[0,0,0,2,0,0,0,0,0],[0,0,0,2,0,0,1,0,0],
      [0,0,0,2,2,2,2,1,0],[0,0,0,0,1,0,1,0,0],[0,0,0,0,0,0,0,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.gold, 3: PALETTE_ARCADE.white },
    needsRework: true,
    notes: "Genérico del CRUD. Muy fina. Rediseñar.",
  },
  generic_potion: {
    grid: [
      [0,0,0,1,1,0,0,0,0],[0,0,0,1,2,1,0,0,0],[0,0,1,1,1,1,1,0,0],
      [0,1,2,2,2,2,2,1,0],[1,2,2,3,2,3,2,2,1],[1,2,2,2,2,2,2,2,1],
      [1,2,2,2,2,2,2,2,1],[0,1,2,2,2,2,2,1,0],[0,0,1,1,1,1,1,0,0],
    ],
    colorsArcade: { 1: PALETTE_ARCADE.bg, 2: PALETTE_ARCADE.violet, 3: PALETTE_ARCADE.cyan },
    needsRework: false,
    notes: "Genérico del CRUD.",
  },
};

// ---------------------------------------------------------------------------
// Uso como script (ts-node) — escribe un .svg por ícono que NO necesita
// rework a la carpeta que le pases, usando la paleta arcade de referencia.
// Reemplazar PALETTE_ARCADE por los colores reales del proyecto (Paso 0 del
// SKILL.md) antes de correr esto contra los assets finales.
//
//   npx ts-node pixel-svg.ts ./src/assets/icons
//
// Requiere Node con soporte de "fs" (no pensado para correr en el browser).
//
// Nota ESM vs CommonJS: este bloque usa `require`/`require.main`, que
// asume CommonJS. Si el proyecto tiene "type": "module" en package.json,
// ts-node lo va a intentar correr como ESM y va a fallar con
// "require is not defined". Solución rápida sin tocar el resto del repo:
//   npx ts-node --compiler-options '{"module":"commonjs"}' pixel-svg.ts ./src/assets/icons
// ---------------------------------------------------------------------------
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const outDir = process.argv[2] || "./pixel-icons-out";
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  let skipped = 0;
  for (const [name, entry] of Object.entries(GRIDS)) {
    if (entry.needsRework) {
      console.warn(`skip (needs rework): ${name} — ${entry.notes}`);
      skipped += 1;
      continue;
    }
    const svg = standaloneSvg(entry.grid, entry.colorsArcade, 16);
    fs.writeFileSync(path.join(outDir, `${name}.svg`), svg, "utf-8");
    written += 1;
  }
  console.log(`${written} íconos escritos en ${outDir}, ${skipped} saltados (necesitan rework).`);
}
