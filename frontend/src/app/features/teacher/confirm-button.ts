import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

/**
 * Delete button with inline confirmation: the first click shows "¿Eliminar? Sí/No" in place of
 * the button, instead of triggering the deletion directly — no destructive action of the
 * editor (section, content, connection) should be a single click with no way back.
 * Replaces the loose ✕ that `editor.ts` and `section-editor.ts` had.
 */
@Component({
  selector: 'app-confirm-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (!isAsking()) {
      <button
        type="button"
        [class]="btnClass()"
        (click)="isAsking.set(true)"
        [attr.title]="title()"
        [attr.aria-label]="title()"
      >
        🗑️
      </button>
    } @else {
      <span class="inline-flex items-center gap-1 whitespace-nowrap">
        <span class="text-[10px] ui-font opacity-70">¿Eliminar?</span>
        <button type="button" class="btn btn-xs btn-error" (click)="confirm()">Sí</button>
        <button type="button" class="btn btn-xs btn-ghost" (click)="isAsking.set(false)">No</button>
      </span>
    }
  `,
})
export class ConfirmButton {
  /** Classes of the ✕ button at rest — each screen keeps its own style (sm/xs, outline/ghost). */
  readonly btnClass = input('btn btn-xs btn-outline btn-error');
  readonly title = input('eliminar');
  readonly confirmed = output<void>();

  protected readonly isAsking = signal(false);

  protected confirm(): void {
    this.isAsking.set(false);
    this.confirmed.emit();
  }
}
