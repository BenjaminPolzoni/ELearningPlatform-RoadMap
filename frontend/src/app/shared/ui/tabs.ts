import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface UiTab {
  /** Identificador estable — se compara con `[(value)]`. */
  id: string;
  label: string;
}

/**
 * Tablist genérico sobre las `tabs` de daisyUI (05-design-system.md §4, `ui-tabs`).
 * Solo maneja la barra de pestañas: el panel activo lo decide el consumidor con el
 * doble bind `[(value)]` (mostrar/ocultar su propio contenido). Sin textos de negocio.
 */
@Component({
  selector: 'ui-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="tabs" [class.tabs-boxed]="boxed()" role="tablist">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="tab"
          [class.tab-active]="tab.id === value()"
          [attr.aria-selected]="tab.id === value()"
          (click)="value.set(tab.id)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class UiTabs {
  /** Definición de las pestañas. */
  readonly tabs = input<UiTab[]>([]);
  /** Pestaña activa, en doble bind: `[(value)]="x"` (inicializala). */
  readonly value = model<string | undefined>(undefined);
  /** Panel con fondo de caja (`tabs-boxed`) en lugar de la fila pelada. */
  readonly boxed = input(false);
}