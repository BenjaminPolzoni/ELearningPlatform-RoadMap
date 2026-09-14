import { PixelGrid } from '../../shared/pixel-icon';

// Grids straight from pixel-art-arcade-icons (references/pixel-grids.md /
// scripts/pixel-svg.ts GRIDS) — not redesigned, only recolored. The 4 marked
// `needsRework` there (segunda_oportunidad, subiste_de_nivel, explorador, maraton) are
// included as-is too; the catalog screen flags them as pending instead of hiding them.

// PALETTE_ARCADE → real project token (frontend/src/styles.css daisyUI themes):
//   bg → --color-neutral · cyan → --color-primary · violet → --color-secondary
//   magenta → --color-accent · gold → --color-warning · white → --color-base-content
const NEUTRAL = 'var(--color-neutral)';
const PRIMARY = 'var(--color-primary)';
const SECONDARY = 'var(--color-secondary)';
const ACCENT = 'var(--color-accent)';
const WARNING = 'var(--color-warning)';
const CONTENT = 'var(--color-base-content)';

export interface BadgeIcon {
  grid: PixelGrid;
  colors: Record<number, string>;
}

export const BADGE_ICONS: Record<string, BadgeIcon> = {
  badge_seccion_perfecta: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [1, 2, 2, 2, 4, 2, 2, 2, 1],
      [1, 2, 2, 4, 4, 4, 2, 2, 1],
      [1, 2, 2, 2, 4, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT, 4: SECONDARY },
  },
  badge_a_la_primera: {
    grid: [
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 1, 1, 1, 1, 1, 2, 1],
      [1, 2, 1, 3, 3, 3, 1, 2, 1],
      [1, 2, 1, 3, 4, 3, 1, 2, 1],
      [1, 2, 1, 3, 3, 3, 1, 2, 1],
      [1, 2, 1, 1, 1, 1, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT, 4: ACCENT },
  },
  badge_segunda_oportunidad: {
    grid: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY },
  },
  badge_hito_xp_bronce: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: CONTENT },
  },
  badge_hito_xp_plata: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT },
  },
  badge_hito_xp_oro: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: { 1: NEUTRAL, 2: WARNING, 3: CONTENT },
  },
  badge_subiste_de_nivel: {
    grid: [
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY },
  },
  badge_zona_elite: {
    grid: [
      [0, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 2, 1, 2, 1, 2, 1, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: WARNING, 3: CONTENT },
  },
  badge_primeros_pasos: {
    grid: [
      [1, 1, 1, 1, 1, 0, 0, 0, 0],
      [1, 2, 2, 2, 1, 0, 0, 0, 0],
      [1, 2, 3, 2, 1, 0, 0, 0, 0],
      [1, 2, 2, 2, 1, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT },
  },
  badge_explorador: {
    grid: [
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 2, 2, 2, 4, 2, 2, 2, 1],
      [1, 2, 3, 2, 4, 2, 3, 2, 1],
      [1, 2, 2, 2, 4, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: CONTENT, 4: ACCENT },
  },
  badge_maraton: {
    grid: [
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 2, 1, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 0, 0, 0],
      [1, 2, 2, 2, 2, 2, 1, 0, 0],
      [1, 2, 3, 2, 4, 2, 1, 0, 0],
      [1, 2, 2, 2, 2, 2, 1, 0, 0],
      [1, 2, 2, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: ACCENT, 3: CONTENT, 4: PRIMARY },
  },
  badge_pionero: {
    grid: [
      [0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 3, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0, 0],
      [1, 2, 1, 2, 2, 1, 2, 1, 0],
      [0, 1, 4, 1, 1, 4, 1, 0, 0],
      [0, 0, 0, 4, 4, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT, 4: WARNING },
  },
  badge_boss: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 3, 2, 2, 2, 3, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 1, 2, 1, 2, 2, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 2, 1, 2, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: CONTENT, 3: ACCENT },
  },
  badge_evento: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 1, 1, 3, 1, 3, 1, 1, 1],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: WARNING },
  },
};
