import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** PAR-12: the system's lives cap is 3. */
export const LIVES_MAX = 3;

/**
 * Hearts of current lives (05-design-system.md §4, `ui-lives`). The 3 slots are always
 * drawn: spent lives stay as an empty silhouette, otherwise the HUD "jumps" in
 * width when one is lost.
 */
@Component({
  selector: 'ui-lives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1' },
  template: `
    <span class="sr-only">{{ lives() }} de {{ max }} vidas</span>
    @for (i of slots(); track i) {
      <svg
        width="16"
        height="14"
        viewBox="0 0 8 7"
        class="pixelated"
        [class.glow-pink]="i < lives()"
        aria-hidden="true"
      >
        <!-- 8×7 px heart: two lobes and a tip -->
        <path
          d="M1 0h2v1h2V0h2v1h1v3h-1v1h-1v1H6v1H2V6H1V5H0V4h1z"
          [attr.fill]="i < lives() ? '#FF2758' : 'none'"
          stroke="#FF2758"
          stroke-width="0.4"
          [attr.opacity]="i < lives() ? 1 : 0.3"
        />
      </svg>
    }
  `,
})
export class Lives {
  readonly lives = input.required<number>();

  protected readonly max = LIVES_MAX;
  protected readonly slots = computed(() => Array.from({ length: LIVES_MAX }, (_, i) => i));
}
