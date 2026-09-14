import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type UiBadgeTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'ghost';

const TONES: Record<UiBadgeTone, string> = {
  neutral: 'badge-neutral',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  ghost: 'badge-ghost',
};

/**
 * Etiqueta genérica sobre el `badge` de daisyUI (05-design-system.md §4, `ui-badge`).
 * Sin textos de negocio: el rótulo va por <ng-content>.
 */
@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <span class="badge" [class]="clases()">
      <ng-content></ng-content>
    </span>
  `,
})
export class UiBadge {
  readonly tone = input<UiBadgeTone>('neutral');
  readonly outline = input(false);
  readonly pill = input(false);

  protected readonly clases = computed(() => {
    const parte = [TONES[this.tone()]];
    if (this.outline()) parte.push('badge-outline');
    if (this.pill()) parte.push('rounded-full');
    return parte.join(' ');
  });
}