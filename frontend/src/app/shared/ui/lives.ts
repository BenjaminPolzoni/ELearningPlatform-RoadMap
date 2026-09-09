import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** PAR-12: el tope de vidas del sistema es 3. */
export const VIDAS_MAX = 3;

/**
 * Corazones de vidas vigentes (05-design-system.md §4, `ui-lives`). Se dibujan siempre
 * los 3 slots: las vidas gastadas quedan como silueta vacía, si no el HUD "salta" de
 * ancho al perder una.
 */
@Component({
  selector: 'ui-lives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1' },
  template: `
    <span class="sr-only">{{ vidas() }} de {{ max }} vidas</span>
    @for (i of slots(); track i) {
      <svg
        width="16"
        height="14"
        viewBox="0 0 8 7"
        class="pixelado"
        [class.glow-pink]="i < vidas()"
        aria-hidden="true"
      >
        <!-- corazón de 8×7 px: dos lóbulos y una punta -->
        <path
          d="M1 0h2v1h2V0h2v1h1v3h-1v1h-1v1H6v1H2V6H1V5H0V4h1z"
          [attr.fill]="i < vidas() ? '#FF2758' : 'none'"
          stroke="#FF2758"
          stroke-width="0.4"
          [attr.opacity]="i < vidas() ? 1 : 0.3"
        />
      </svg>
    }
  `,
})
export class Lives {
  readonly vidas = input.required<number>();

  protected readonly max = VIDAS_MAX;
  protected readonly slots = computed(() => Array.from({ length: VIDAS_MAX }, (_, i) => i));
}
