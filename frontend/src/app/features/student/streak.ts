import { Component, input } from '@angular/core';
import { PixelGrid, PixelIcon } from '../../shared/pixel-icon';

/**
 * Pixel-art fire (pixel-art-arcade-icons skill, `fire_racha`), 7x9, used as is — it is the
 * only icon in the set that is not 9x9. Only 1 state (there is no "extinguished streak" like heart_empty).
 */
export const FIRE_GRID: PixelGrid = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 1, 0],
  [1, 2, 3, 2, 2, 2, 1],
  [1, 2, 2, 3, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 1],
  [0, 1, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
];

export const FIRE_COLORS: Record<number, string> = {
  1: 'var(--color-neutral)',
  2: 'var(--color-warning)',
  3: 'var(--color-base-content)',
};

/**
 * Streak indicator: icon + counter. No mechanics yet (architecture proposal,
 * not PRD) — `current` is a mocked number, there is no date, cutoff or calculation here.
 */
@Component({
  selector: 'app-streak',
  imports: [PixelIcon],
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="current() + ' días de racha'">
      <app-pixel-icon [grid]="fireGrid" [colors]="fireColors" [size]="16" />
      <b class="tabular text-warning">{{ current() }}</b>
    </span>
  `,
})
export class Streak {
  readonly current = input(7);

  protected readonly fireGrid = FIRE_GRID;
  protected readonly fireColors = FIRE_COLORS;
}
