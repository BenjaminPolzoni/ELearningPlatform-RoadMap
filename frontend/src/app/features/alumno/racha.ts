import { Component, input } from '@angular/core';
import { PixelGrid, PixelIcon } from '../../shared/pixel-icon';

/**
 * Pixel-art fire (pixel-art-arcade-icons skill, `fire_racha`), 7x9, usado tal cual — es el
 * único ícono del set que no es 9x9. Solo 1 estado (no hay "racha apagada" como heart_empty).
 */
const FIRE_GRID: PixelGrid = [
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

const FIRE_COLORS: Record<number, string> = {
  1: 'var(--color-neutral)',
  2: 'var(--color-warning)',
  3: 'var(--color-base-content)',
};

/**
 * Indicador de racha: ícono + contador. Sin mecánica todavía (propuesta de arquitectura,
 * no PRD) — `current` es un número mockeado, no hay fecha, corte ni cálculo acá.
 */
@Component({
  selector: 'app-racha',
  imports: [PixelIcon],
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="current() + ' días de racha'">
      <app-pixel-icon [grid]="fireGrid" [colors]="fireColors" [size]="16" />
      <b class="tabular text-warning">{{ current() }}</b>
    </span>
  `,
})
export class Racha {
  readonly current = input(7);

  protected readonly fireGrid = FIRE_GRID;
  protected readonly fireColors = FIRE_COLORS;
}
