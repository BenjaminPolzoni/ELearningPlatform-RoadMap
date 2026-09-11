import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SaveFeedbackService } from '../../core/services/save-feedback.service';

/**
 * Pila de toasts de guardado (05 §6/§7). Se monta una vez por pantalla del profesor
 * (editor / unidad-editor) con posición fija, así queda visible sin importar el scroll.
 */
@Component({
  selector: 'app-save-feedback-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast toast-end toast-bottom z-50' },
  template: `
    @for (f of feedback.items(); track f.id) {
      <div
        class="alert chaflan border-2 py-2 px-3 text-sm"
        [class.alert-success]="f.tipo === 'ok'"
        [class.alert-error]="f.tipo === 'error'"
        role="status"
      >
        <span>{{ f.mensaje }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          (click)="feedback.dismiss(f.id)"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
    }
  `,
})
export class SaveFeedbackToast {
  protected readonly feedback = inject(SaveFeedbackService);
}
