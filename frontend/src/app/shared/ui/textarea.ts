import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Área de texto genérica (05-design-system.md §4, `ui-textarea`). Doble bind con
 * model: `[(value)]="x"`.
 */
@Component({
  selector: 'ui-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <textarea
      class="textarea textarea-bordered w-full"
      [value]="value()"
      [placeholder]="placeholder()"
      [name]="name()"
      [rows]="rows()"
      [attr.maxlength]="maxlength()"
      [disabled]="disabled()"
      [required]="required()"
      [attr.aria-label]="ariaLabel()"
      (input)="actualizar($event)"
    ></textarea>
  `,
})
export class UiTextarea {
  readonly placeholder = input<string>('');
  readonly name = input<string | undefined>(undefined);
  readonly rows = input<number>(3);
  readonly maxlength = input<number | undefined>(undefined);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Valor editable, en doble bind: `[(value)]="x"`. */
  readonly value = model<string>('');

  protected actualizar(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}