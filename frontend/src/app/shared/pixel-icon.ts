import { Component, computed, input } from '@angular/core';

export type PixelGrid = readonly (readonly number[])[];

export interface PixelIconPixel {
  x: number;
  y: number;
  fill: string;
}

/** Turns a pixel-art-arcade-icons grid (0 = transparent) into one rect per non-zero cell. */
export function gridToPixels(grid: PixelGrid, colors: Record<number, string>): PixelIconPixel[] {
  const pixels: PixelIconPixel[] = [];
  grid.forEach((row, y) =>
    row.forEach((value, x) => {
      if (value) pixels.push({ x, y, fill: colors[value] });
    }),
  );
  return pixels;
}

/**
 * Generic pixel-art icon renderer (pixel-art-arcade-icons skill): grid + color map in, SVG
 * out. Grids and color maps stay owned by each feature (lives, badges) — this only renders.
 */
@Component({
  selector: 'app-pixel-icon',
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + cols() + ' ' + rows()"
      [attr.width]="size()"
      [attr.height]="size()"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      @for (p of pixels(); track p.x + '-' + p.y) {
        <rect [attr.x]="p.x" [attr.y]="p.y" width="1" height="1" [attr.fill]="p.fill" />
      }
    </svg>
  `,
})
export class PixelIcon {
  readonly grid = input.required<PixelGrid>();
  readonly colors = input.required<Record<number, string>>();
  readonly size = input(14);

  protected readonly cols = computed(() => this.grid()[0]?.length ?? 0);
  protected readonly rows = computed(() => this.grid().length);
  protected readonly pixels = computed(() => gridToPixels(this.grid(), this.colors()));
}
