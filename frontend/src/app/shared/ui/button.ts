import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Variantes de `ui-button` (05-design-system.md §4): mapean a clases `btn-*` de daisyUI. */
export type UiButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral'
  | 'ghost'
  | 'outline'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type UiButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<UiButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
  neutral: 'btn-neutral',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  info: 'btn-info',
  success: 'btn-success',
  warning: 'btn-warning',
  error: 'btn-error',
};

const SIZES: Record<UiButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

/**
 * Botón genérico sobre el `btn` de daisyUI (05-design-system.md §4, `ui-button`).
 * Sin textos de negocio: el contenido va por <ng-content>. Sin colores hardcodeados:
 * las variantes salen de los tokens del tema activo.
 */
@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <button
      class="btn"
      [class]="clases()"
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() || null"
    >
      @if (loading()) {
        <span class="loading loading-spinner" aria-hidden="true"></span>
      }
      <ng-content></ng-content>
    </button>
  `,
})
export class UiButton {
  readonly variant = input<UiButtonVariant>('primary');
  readonly size = input<UiButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  /** Ocupa todo el ancho del contenedor. */
  readonly block = input(false);
  readonly disabled = input(false);
  /** Muestra el spinner y bloquea el click mientras la acción corre. */
  readonly loading = input(false);

  protected readonly clases = computed(() => {
    const base = [VARIANTS[this.variant()], SIZES[this.size()]];
    if (this.block()) base.push('btn-block');
    return base.join(' ');
  });
}