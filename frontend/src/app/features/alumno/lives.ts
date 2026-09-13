import { Component, computed, input } from '@angular/core';
import { PixelGrid, PixelIcon } from '../../shared/pixel-icon';

/**
 * Pixel-art heart (pixel-art-arcade-icons skill, `heart_full`/`heart_empty`), 9x9 grid,
 * used as-is — only the empty state changes color, not shape. `1` = outline, `2` = fill,
 * `3` = shine highlight, `0` = transparent.
 */
const HEART_GRID: PixelGrid = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 3, 3, 1, 0, 1, 2, 2, 1],
  [1, 3, 2, 2, 1, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 1],
  [0, 1, 2, 2, 2, 2, 2, 1, 0],
  [0, 0, 1, 2, 2, 2, 1, 0, 0],
  [0, 0, 0, 1, 2, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];

// Real project palette (frontend/src/styles.css daisyUI themes), not the arcade reference
// palette — resolved as CSS vars at paint time, so the heart re-themes on its own.
const FULL_COLORS: Record<number, string> = {
  1: 'var(--color-neutral)',
  2: 'var(--color-error)',
  3: 'var(--color-base-content)',
};
const EMPTY_COLORS: Record<number, string> = {
  1: 'var(--color-neutral)',
  2: 'var(--color-base-300)',
  3: 'var(--color-base-200)',
};

/** Lives HUD (pixel-art hearts). Mirrors `ranking-detalle`'s `corazones()` logic (PAR-12: max 3). */
@Component({
  selector: 'app-lives',
  imports: [PixelIcon],
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="label()">
      @for (filled of hearts(); track $index) {
        <app-pixel-icon
          [grid]="heartGrid"
          [colors]="filled ? fullColors : emptyColors"
          [size]="size()"
          [class.heart-on]="filled"
          [class.heart-off]="!filled"
          [style.animation-delay.ms]="filled ? $index * 130 : null"
        />
      }
    </span>
  `,
})
export class Lives {
  readonly current = input.required<number>();
  readonly max = input(3);
  readonly size = input(14);

  protected readonly heartGrid = HEART_GRID;
  protected readonly fullColors = FULL_COLORS;
  protected readonly emptyColors = EMPTY_COLORS;

  protected readonly hearts = computed(() => {
    const total = this.max();
    const filled = Math.max(0, Math.min(total, this.current()));
    return Array.from({ length: total }, (_, i) => i < filled);
  });

  protected readonly label = computed(() => {
    const filled = Math.max(0, Math.min(this.max(), this.current()));
    return `${filled} de ${this.max()} vidas`;
  });
}
