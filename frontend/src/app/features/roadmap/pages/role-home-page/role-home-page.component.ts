import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService } from '../../data-access/session/auth-mock.service';
import { RoadmapStore } from '../../data-access/roadmap/roadmap.store';
import { ROLE_LABEL } from '../../ui/labels';

/** Routes according to the role on entry. ADMIN does not have its own screen yet (Phase 3). */
@Component({
  selector: 'app-role-home-page',
  template: `
    <section class="flex flex-col gap-4">
      <h2 class="title-font text-primary text-xs">PANEL {{ roleLabel() }}</h2>
      <p class="opacity-70">
        Curso: <b>{{ store.roadmap()?.name ?? '…' }}</b> · {{ store.sections().length }} unidades.
      </p>
      <p class="opacity-60">La vista de administración se arma en Fase 3.</p>
    </section>
  `,
})
export class RoleHomePageComponent {
  protected readonly roleLabel = (): string => { const r = this.auth.role(); return r ? ROLE_LABEL[r] : ''; };
  protected readonly auth = inject(AuthMockService);
  protected readonly store = inject(RoadmapStore);
  private readonly router = inject(Router);

  constructor() {
    const destination =
      this.auth.role() === 'TEACHER' ? '/roadmap/teacher' : this.auth.role() === 'STUDENT' ? '/roadmap/student' : null;
    if (destination) queueMicrotask(() => this.router.navigateByUrl(destination));
  }
}
