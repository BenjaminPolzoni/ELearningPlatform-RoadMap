import { Injectable, signal } from '@angular/core';

export type TipoFeedback = 'ok' | 'error';

export interface Feedback {
  id: number;
  tipo: TipoFeedback;
  mensaje: string;
}

const DURACION_MS = 3200;

/**
 * Feedback explícito de guardado para la vista del profesor (05-design-system.md §6/§7):
 * "nada de autoguardado invisible" — cada alta/edición/baja dispara un mensaje breve que
 * se autodescarta. Vive en `core/` (no en `shared/ui`, co-mantenido con Notificaciones/G2)
 * porque es un detalle de UX propio del editor del roadmap, no un componente de dominio.
 */
@Injectable({ providedIn: 'root' })
export class SaveFeedbackService {
  private readonly _items = signal<Feedback[]>([]);
  readonly items = this._items.asReadonly();
  private seq = 0;

  ok(mensaje = 'Guardado ✓'): void {
    this.emitir('ok', mensaje);
  }

  error(mensaje = 'Error al guardar'): void {
    this.emitir('error', mensaje);
  }

  dismiss(id: number): void {
    this._items.update((arr) => arr.filter((f) => f.id !== id));
  }

  private emitir(tipo: TipoFeedback, mensaje: string): void {
    const id = ++this.seq;
    this._items.update((arr) => [...arr, { id, tipo, mensaje }]);
    setTimeout(() => this.dismiss(id), DURACION_MS);
  }
}
