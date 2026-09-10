import { Component, computed, input } from '@angular/core';

/**
 * Pixel-art heart (pixel-art-arcade-icons skill, `heart_full`/`heart_empty`), 9x9 grid,
 * used as-is — only the empty state changes color, not shape. `1` = outline, `2` = fill,
 * `3` = shine highlight, `0` = transparent.
 */
const HEART_GRID: readonly number[][] = [
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

interface HeartPixel {
  x: number;
  y: number;
  fill: string;
}

function heartPixels(colors: Record<number, string>): HeartPixel[] {
  const pixels: HeartPixel[] = [];
  HEART_GRID.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) pixels.push({ x, y, fill: colors[value] });
    }),
  );
  return pixels;
}

const FULL_PIXELS = heartPixels(FULL_COLORS);
const EMPTY_PIXELS = heartPixels(EMPTY_COLORS);

/** Lives HUD (pixel-art hearts). Mirrors `ranking-detalle`'s `corazones()` logic (PAR-12: max 3). */
@Component({
  selector: 'app-lives',
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="label()">
      @for (filled of hearts(); track $index) {
        <svg
          viewBox="0 0 9 9"
          width="14"
          height="14"
          shape-rendering="crispEdges"
          aria-hidden="true"
        >
          @for (p of (filled ? fullPixels : emptyPixels); track p.x + '-' + p.y) {
            <rect [attr.x]="p.x" [attr.y]="p.y" width="1" height="1" [attr.fill]="p.fill" />
          }
        </svg>
      }
    </span>
  `,
})
export class Lives {
  readonly current = input.required<number>();
  readonly max = input(3);

  protected readonly fullPixels = FULL_PIXELS;
  protected readonly emptyPixels = EMPTY_PIXELS;

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
