import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { RoadmapStore } from '../../core/data/roadmap.store';

/** Routes according to the role on entry. ADMIN does not have its own screen yet (Phase 3). */
@Component({
  selector: 'app-home',
  template: `
    <section class="flex flex-col gap-4">
      <h2 class="title-font text-primary text-xs">PANEL {{ auth.role() }}</h2>
      <p class="opacity-70">
        Curso: <b>{{ store.roadmap()?.name ?? '…' }}</b> · {{ store.sections().length }} unidades.
      </p>
      <p class="opacity-60">La vista de administración se arma en Fase 3.</p>
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthMockService);
  protected readonly store = inject(RoadmapStore);
  private readonly router = inject(Router);

  constructor() {
    const destination =
      this.auth.role() === 'PROFESOR' ? '/profesor' : this.auth.role() === 'ALUMNO' ? '/alumno' : null;
    if (destination) queueMicrotask(() => this.router.navigateByUrl(destination));
  }
}
