import { Injectable, signal } from '@angular/core';

export type FeedbackType = 'ok' | 'error';

export interface Feedback {
  id: number;
  type: FeedbackType;
  message: string;
}

const DURATION_MS = 3200;

/**
 * Explicit save feedback for the teacher's view (05-design-system.md §6/§7):
 * "no invisible autosave" — every create/edit/remove triggers a brief message that
 * dismisses itself. It lives in `core/` (not in `shared/ui`, co-maintained with Notifications/G2)
 * because it is a UX detail specific to the roadmap editor, not a domain component.
 */
@Injectable({ providedIn: 'root' })
export class SaveFeedbackService {
  private readonly _items = signal<Feedback[]>([]);
  readonly items = this._items.asReadonly();
  private seq = 0;

  ok(message = 'Guardado ✓'): void {
    this.emit('ok', message);
  }

  error(message = 'Error al guardar'): void {
    this.emit('error', message);
  }

  dismiss(id: number): void {
    this._items.update((arr) => arr.filter((f) => f.id !== id));
  }

  private emit(type: FeedbackType, message: string): void {
    const id = ++this.seq;
    this._items.update((arr) => [...arr, { id, type, message }]);
    setTimeout(() => this.dismiss(id), DURATION_MS);
  }
}
