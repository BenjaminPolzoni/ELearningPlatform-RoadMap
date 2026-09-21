import { PixelGrid } from '../pixel-icon/pixel-icon.component';

// Generic library of the icon picker in badge creation — deliberately separate from
// badge-icons.ts (pixel-grids.md: "so the teacher can build new badges without stepping on the
// meaning of the 15 [14] of the fixed catalog"). Do not mix the two registries.

const NEUTRAL = 'var(--color-neutral)';
const PRIMARY = 'var(--color-primary)';
const SECONDARY = 'var(--color-secondary)';
const WARNING = 'var(--color-warning)';
const CONTENT = 'var(--color-base-content)';

export interface GenericIcon {
  grid: PixelGrid;
  colors: Record<number, string>;
  /** true = pixel-grids.md marks it "redo" — still offered in the picker, labeled. */
  needsRework: boolean;
}

export const GENERIC_ICONS: Record<string, GenericIcon> = {
  generic_star: {
    grid: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [1, 1, 1, 1, 2, 1, 1, 1, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 1, 0, 1, 2, 1, 0],
      [0, 1, 1, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: WARNING },
    needsRework: true,
  },
  generic_gem: {
    grid: [
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 3, 2, 3, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: PRIMARY, 3: CONTENT },
    needsRework: false,
  },
  generic_sword: {
    grid: [
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 1, 3, 1, 0, 0, 0],
      [0, 0, 0, 0, 3, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: CONTENT, 3: SECONDARY },
    needsRework: true,
  },
  generic_book: {
    grid: [
      [0, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 2, 2, 2, 1, 3, 3, 3, 1],
      [1, 2, 2, 2, 1, 3, 3, 3, 1],
      [1, 2, 2, 2, 1, 3, 3, 3, 1],
      [1, 2, 2, 2, 1, 3, 3, 3, 1],
      [1, 2, 2, 2, 1, 3, 3, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: PRIMARY },
    needsRework: false,
  },
  generic_lightning: {
    grid: [
      [0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0, 0],
      [1, 2, 2, 2, 2, 1, 1, 1, 0],
      [0, 1, 1, 2, 2, 2, 1, 0, 0],
      [0, 0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 0, 0, 1, 2, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: WARNING },
    needsRework: false,
  },
  generic_medal: {
    grid: [
      [0, 1, 0, 0, 0, 0, 0, 1, 0],
      [1, 2, 1, 0, 0, 0, 1, 2, 1],
      [1, 3, 2, 1, 0, 1, 2, 3, 1],
      [0, 1, 2, 2, 1, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0, 0],
      [0, 1, 2, 3, 2, 3, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: CONTENT },
    needsRework: true,
  },
  generic_key: {
    grid: [
      [0, 0, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 2, 3, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0, 0],
      [0, 0, 1, 2, 1, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 0, 0, 0],
      [0, 0, 0, 2, 0, 0, 1, 0, 0],
      [0, 0, 0, 2, 2, 2, 2, 1, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: WARNING, 3: CONTENT },
    needsRework: true,
  },
  generic_potion: {
    grid: [
      [0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 2, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 3, 2, 3, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0],
    ],
    colors: { 1: NEUTRAL, 2: SECONDARY, 3: PRIMARY },
    needsRework: false,
  },
};
