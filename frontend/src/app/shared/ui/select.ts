import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Select genérico (05-design-system.md §4, `ui-select`). Doble bind con model:
 * `[(value)]="x"`. Las opciones van proyectadas por <ng-content>.
 */
@Component({
  selector: 'ui-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <select
      class="select select-bordered w-full"
      [value]="value()"
      [name]="name()"
      [disabled]="disabled()"
      [required]="required()"
      [attr.aria-label]="ariaLabel()"
      (change)="actualizar($event)"
    >
      <ng-content></ng-content>
    </select>
  `,
})
export class UiSelect {
  readonly name = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Valor seleccionado, en doble bind: `[(value)]="x"`. */
  readonly value = model<string>('');

  protected actualizar(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}