import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UiProgressTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

const TONES: Record<UiProgressTone, string> = {
  neutral: '',
  primary: 'progress-primary',
  secondary: 'progress-secondary',
  accent: 'progress-accent',
  info: 'progress-info',
  success: 'progress-success',
  warning: 'progress-warning',
  error: 'progress-error',
};

/**
 * Barra de progreso genérica sobre el `progress` de daisyUI
 * (05-design-system.md §4, `ui-progress`). Sin `value` la barra queda
 * indeterminada (la animación de "cargando" del elemento nativo). Los tonos
 * salen de los tokens del tema activo — nunca hex.
 */
@Component({
  selector: 'ui-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div>
      @if (label()) {
        <span class="mb-1 block text-sm font-medium text-base-content/80">{{ label() }}</span>
      }
      <progress
        class="progress w-full"
        [class]="tono()"
        [attr.value]="value() ?? null"
        [max]="max()"
        [attr.aria-label]="label() ?? ariaLabel() ?? null"
      ></progress>
    </div>
  `,
})
export class UiProgress {
  /** Progreso actual (0..max). Sin valor, la barra es indeterminada. */
  readonly value = input<number | undefined>(undefined);
  /** Extremo superior del rango. */
  readonly max = input<number>(100);
  readonly tone = input<UiProgressTone>('primary');
  /** Rótulo visible opcional (también se usa como aria-label si no hay ariaLabel). */
  readonly label = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  protected readonly tono = computed(() => TONES[this.tone()]);
}