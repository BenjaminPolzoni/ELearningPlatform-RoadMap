import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Campo de entrada genérico (05-design-system.md §4, `ui-input`). Doble bind con
 * model: `[(value)]="x"`. No valida ni formatea: es el input crudo con el look del
 * design system, para que cada feature decida su contrato.
 */
@Component({
  selector: 'ui-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <input
      class="input input-bordered w-full"
      [type]="type()"
      [value]="value()"
      [placeholder]="placeholder()"
      [name]="name()"
      [autocomplete]="autocomplete()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [attr.aria-label]="ariaLabel()"
      (input)="actualizar($event)"
    />
  `,
})
export class UiInput {
  readonly type = input<
    'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' | 'date'
  >('text');
  readonly placeholder = input<string>('');
  readonly name = input<string | undefined>(undefined);
  readonly autocomplete = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Valor editable, en doble bind: `[(value)]="x"`. */
  readonly value = model<string>('');

  protected actualizar(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}