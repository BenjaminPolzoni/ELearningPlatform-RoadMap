import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { StoreService } from '../../core/educa/store.service';
import type { Subject, Biome } from '../../core/educa/models';
import { UiBadge, UiCard } from '../teacher/shared/educa-ui';

/**
 * Student entry point: My Courses (list of subjects from the `StoreService`, the
 * ones created by the teacher in /profesor). Choosing one leads to the worlds hub
 * `/play/:id` (one card per section with its biome) and from there to the hexagonal
 * world of each section (`/play/:id/:sectionId`).
 */
@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [RouterLink, UiBadge, UiCard],
  template: `
    <div class="mx-auto max-w-3xl p-6 min-h-screen overflow-y-auto">
      <div class="flex items-center justify-between gap-4 border-b border-base-300 pb-4 mb-6">
        <h2 class="title-font text-primary text-xs">MIS CLASES</h2>
        <div class="flex items-center gap-2">
          <a routerLink="/alumno/avatar" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Personalizar tu avatar">
            🧍 Mi avatar
          </a>
          <button (click)="changeRole()" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
            ⏻ Cambiar rol
          </button>
        </div>
      </div>

      <h1 class="text-3xl font-bold title-font text-primary">🎓 Mis clases</h1>
      <p class="mt-1 text-sm opacity-70">Elegí una clase para ver sus mundos y entrar a sus unidades.</p>

      <div class="mt-6 grid gap-4">
        @for (c of courses(); track c.id) {
          <a [routerLink]="['/play', c.id]">
            <ui-card>
              <div class="flex items-center gap-3">
                <span class="text-3xl">{{ coverEmoji(c) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold hover:underline truncate">{{ c.name }}</p>
                  <p class="text-sm text-gray-500 truncate">{{ c.description || 'Sin descripción' }}</p>
                  <p class="text-sm text-gray-500">{{ summary(c) }}</p>
                </div>
                <ui-badge>{{ c.sections.length }} {{ c.sections.length === 1 ? 'unidad' : 'unidades' }}</ui-badge>
              </div>
            </ui-card>
          </a>
        } @empty {
          <p class="opacity-60 text-center py-10">Aún no hay clases disponibles. Pedile a tu profesor que cree la primera 👆</p>
        }
      </div>
    </div>
  `,
})
export class MyCourses {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthMockService);
  private readonly router = inject(Router);

  // Snapshot on entering: the teacher writes to the same localStorage, so when
  // navigating here the component is created anew and sees what was last saved.
  protected readonly courses = signal<Subject[]>(this.store.listAll());

  protected changeRole(): void {
    this.auth.exit();
    this.router.navigate(['/login']);
  }

  protected summary(c: Subject): string {
    const modules = c.sections.reduce((n, u) => n + u.modules.length, 0);
    const chests = c.sections.reduce(
      (n, u) => n + u.modules.reduce((m, x) => m + x.attachments.length, 0),
      0,
    );
    return `${modules} ${modules === 1 ? 'torre' : 'torres'} · ${chests} ${chests === 1 ? 'cofre' : 'cofres'}`;
  }

  protected coverEmoji(c: Subject): string {
    return this.biomeEmoji(c.sections[0]?.biome);
  }

  protected biomeEmoji(biome: Biome | undefined): string {
    if (biome === 'desierto') return '🏜️';
    if (biome === 'nieve') return '❄️';
    if (biome === 'lava') return '🌋';
    return '🌿';
  }
}
