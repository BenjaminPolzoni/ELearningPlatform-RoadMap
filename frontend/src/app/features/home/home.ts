import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { RoadmapStore } from '../../core/data/roadmap.store';

/** Enruta según el rol al entrar. ADMIN todavía no tiene pantalla propia (Fase 3). */
@Component({
  selector: 'app-home',
  template: `
    <section class="flex flex-col gap-4">
      <h2 class="title-font text-primary text-xs">PANEL {{ auth.rol() }}</h2>
      <p class="opacity-70">
        Curso: <b>{{ store.roadmap()?.nombre ?? '…' }}</b> · {{ store.unidades().length }} unidades.
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
    const destino =
      this.auth.rol() === 'PROFESOR' ? '/profesor' : this.auth.rol() === 'ALUMNO' ? '/alumno' : null;
    if (destino) queueMicrotask(() => this.router.navigateByUrl(destino));
  }
}
