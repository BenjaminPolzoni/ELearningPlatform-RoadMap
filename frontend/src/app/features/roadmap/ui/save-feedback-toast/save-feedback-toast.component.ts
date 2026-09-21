import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SaveFeedbackService } from '../../data-access/feedback/save-feedback.service';

/**
 * Stack of save toasts (05 §6/§7). Mounted once per teacher screen
 * (editor / section-editor) with fixed position, so it stays visible regardless of scroll.
 */
@Component({
  selector: 'app-save-feedback-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toast toast-end toast-bottom z-50' },
  template: `
    @for (f of feedback.items(); track f.id) {
      <div
        class="alert chamfer border-2 py-2 px-3 text-sm"
        [class.alert-success]="f.type === 'ok'"
        [class.alert-error]="f.type === 'error'"
        role="status"
      >
        <span>{{ f.message }}</span>
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
export class SaveFeedbackToastComponent {
  protected readonly feedback = inject(SaveFeedbackService);
}
