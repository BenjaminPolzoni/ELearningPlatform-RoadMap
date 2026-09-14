import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export type UiAlertTone = 'none' | 'info' | 'success' | 'warning' | 'error';

const TONES: Record<UiAlertTone, string> = {
  none: '',
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

/**
 * Alerta/aviso genérico sobre el `alert` de daisyUI (05-design-system.md §4,
 * `ui-alert`). Sin textos de negocio: mensaje y decoración van por <ng-content>,
 * y cuando `closable`, el botón de cierre pone `visible` en false (doble bind)
 * para que el consumidor oculte el aviso (o lo elimine). Los tonos salen de los
 * tokens del tema activo — nunca hex.
 */
@Component({
  selector: 'ui-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (visible()) {
      <div class="alert" [class]="tono()" role="alert">
        <ng-content></ng-content>
        @if (closable()) {
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            aria-label="Cerrar"
            (click)="cerrar()"
          >
            ✕
          </button>
        }
      </div>
    }
  `,
})
export class UiAlert {
  readonly tone = input<UiAlertTone>('none');
  /** Sin botón de cierre: el aviso se queda o lo oculta el padre. */
  readonly closable = input(true);
  /** Aviso visible, en doble bind: `[(visible)]="x"`. */
  readonly visible = model(true);

  protected readonly tono = computed(() => TONES[this.tone()]);

  protected cerrar(): void {
    this.visible.set(false);
  }
}