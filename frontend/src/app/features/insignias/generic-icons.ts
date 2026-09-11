import { PixelGrid } from '../../shared/pixel-icon';

// Librería genérica del selector de íconos del alta de insignias — separada a propósito de
// badge-icons.ts (pixel-grids.md: "para que el profesor arme insignias nuevas sin pisar el
// significado de las 15 [14] del catálogo fijo"). No mezclar los dos registries.

const NEUTRAL = 'var(--color-neutral)';
const PRIMARY = 'var(--color-primary)';
const SECONDARY = 'var(--color-secondary)';
const WARNING = 'var(--color-warning)';
const CONTENT = 'var(--color-base-content)';

export interface GenericIcon {
  grid: PixelGrid;
  colors: Record<number, string>;
  /** true = pixel-grids.md lo marca "rehacer" — se ofrece igual en el picker, etiquetado. */
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
