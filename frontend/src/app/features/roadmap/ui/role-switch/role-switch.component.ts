import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { AuthMockService, Role } from '../../data-access/session/auth-mock.service';

interface RoleView {
  role: Role;
  label: string;
  icon: string;
  home: string;
}

/** Top-bar buttons that switch between the student and the teacher view (mock roles). */
@Component({
  selector: 'app-role-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-1', role: 'group', 'aria-label': 'Cambiar de vista' },
  template: `
    @for (view of views; track view.role) {
      <button
        type="button"
        class="btn ui-font text-[8px]"
        [class.btn-sm]="!compact()"
        [class.btn-xs]="compact()"
        [class.btn-secondary]="isActive(view.role)"
        [class.btn-outline]="!isActive(view.role)"
        [attr.aria-pressed]="isActive(view.role)"
        (click)="switchTo(view)"
      >
        {{ view.icon }} {{ view.label }}
      </button>
    }
  `,
})
export class RoleSwitchComponent {
  private readonly auth = inject(AuthMockService);
  private readonly router = inject(Router);

  /** Smaller buttons, for bars that overlay the 3D canvas. */
  readonly compact = input(false);

  protected readonly views: RoleView[] = [
    { role: 'STUDENT', label: 'Alumno', icon: '🎓', home: '/roadmap/student' },
    { role: 'TEACHER', label: 'Profesor', icon: '👨‍🏫', home: '/roadmap/teacher' },
  ];

  protected isActive(role: Role): boolean {
    return this.auth.role() === role;
  }

  protected switchTo(view: RoleView): void {
    this.auth.enterAs(view.role);
    void this.router.navigate([view.home]);
  }
}
