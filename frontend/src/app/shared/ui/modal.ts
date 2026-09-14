import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Modal genérico sobre el `modal` de daisyUI (05-design-system.md §4, `ui-modal`).
 * Usa `<dialog>` con el atributo `open` controlado desde el padre: `[(open)]="x"`.
 * ESC y el click al backdrop cierran el modal y propagan el cierre al model.
 */
@Component({
  selector: 'ui-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <dialog class="modal" [open]="open()" (cancel)="onCancel($event)" (close)="cierreNativo()">
      <div class="modal-box">
        @if (title()) {
          <div class="flex items-start justify-between gap-4">
            <h3 class="text-lg font-bold">{{ title() }}</h3>
            @if (closable()) {
              <button
                class="btn btn-sm btn-circle btn-ghost"
                type="button"
                aria-label="Cerrar"
                (click)="cerrar()"
              >
                ✕
              </button>
            }
          </div>
        } @else if (closable()) {
          <button
            class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            type="button"
            aria-label="Cerrar"
            (click)="cerrar()"
          >
            ✕
          </button>
        }
        <div class="mt-4">
          <ng-content></ng-content>
        </div>
      </div>
      @if (closable()) {
        <form method="dialog" class="modal-backdrop">
          <button type="button" aria-label="Cerrar modal" (click)="cerrar()"></button>
        </form>
      }
    </dialog>
  `,
})
export class UiModal {
  /** Abierto/cerrado, en doble bind: `[(open)]="x"`. */
  readonly open = model(false);
  /** Encabezado opcional; sin él solo queda el contenido. */
  readonly title = input<string | undefined>(undefined);
  /** Si es false, no hay forma de cerrar (ni botón, ni backdrop, ni ESC). */
  readonly closable = input(true);

  protected cerrar(): void {
    this.open.set(false);
  }

  /** El navegador cerró el <dialog> por su cuenta (form method="dialog"). */
  protected cierreNativo(): void {
    this.open.set(false);
  }

  /** ESC: el navegador dispara `cancel`; lo frenamos y cerramos por el model. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.closable()) this.open.set(false);
  }
}