import { PixelGrid } from '../../shared/pixel-icon';

// Grids straight from pixel-art-arcade-icons (references/pixel-grids.md /
// scripts/pixel-svg.ts GRIDS) — not redesigned, only recolored. The 4 marked
// `needsRework` there (second_chance, level_up, explorer, marathon) are
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
  badge_perfect_section: {
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
  badge_first_try: {
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
  badge_second_chance: {
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
  badge_milestone_xp_bronze: {
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
  badge_milestone_xp_silver: {
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
  badge_milestone_xp_gold: {
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
  badge_level_up: {
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
  badge_elite_zone: {
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
  badge_first_steps: {
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
  badge_explorer: {
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
  badge_marathon: {
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
  badge_pioneer: {
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
  badge_event: {
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
