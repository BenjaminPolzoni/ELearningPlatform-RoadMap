import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/**
 * Botón de baja con confirmación inline: el primer clic muestra "¿Eliminar? Sí/No" en el
 * lugar del botón, en vez de disparar la baja directo — ninguna acción destructiva del
 * editor (unidad, contenido, conexión) debería ser un solo clic sin vuelta atrás.
 * Reemplaza el ✕ suelto que tenían `editor.ts` y `unidad-editor.ts`.
 */
@Component({
  selector: 'app-confirm-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (!pidiendo()) {
      <button
        type="button"
        [class]="btnClass()"
        (click)="pidiendo.set(true)"
        [attr.title]="title()"
        [attr.aria-label]="title()"
      >
        ✕
      </button>
    } @else {
      <span class="inline-flex items-center gap-1 whitespace-nowrap">
        <span class="text-[10px] ui-font opacity-70">¿Eliminar?</span>
        <button type="button" class="btn btn-xs btn-error" (click)="confirmar()">Sí</button>
        <button type="button" class="btn btn-xs btn-ghost" (click)="pidiendo.set(false)">No</button>
      </span>
    }
  `,
})
export class ConfirmButton {
  /** Clases del botón ✕ en reposo — cada pantalla mantiene su propio estilo (sm/xs, outline/ghost). */
  readonly btnClass = input('btn btn-xs btn-outline btn-error');
  readonly title = input('eliminar');
  readonly confirmado = output<void>();

  protected readonly pidiendo = signal(false);

  protected confirmar(): void {
    this.pidiendo.set(false);
    this.confirmado.emit();
  }
}
