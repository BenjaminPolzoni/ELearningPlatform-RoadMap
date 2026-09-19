import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { StoreService } from '../../core/educa/store.service';
import type { Asignatura, Biome } from '../../core/educa/models';
import { UiBadge, UiCard } from '../profesor/shared/educa-ui';

/**
 * Entrada del alumno: Mis Clases (lista de asignaturas del `StoreService`, las
 * creadas por el profesor en /profesor). Elegir una lleva al hub de mundos
 * `/play/:id` (una tarjeta por unidad con su bioma) y de ahí al mundo
 * hexagonal de cada unidad (`/play/:id/:unidadId`).
 */
@Component({
  selector: 'app-mis-clases',
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
          <button (click)="cambiarRol()" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
            ⏻ Cambiar rol
          </button>
        </div>
      </div>

      <h1 class="text-3xl font-bold title-font text-primary">🎓 Mis clases</h1>
      <p class="mt-1 text-sm opacity-70">Elegí una clase para ver sus mundos y entrar a sus unidades.</p>

      <div class="mt-6 grid gap-4">
        @for (c of clases(); track c.id) {
          <a [routerLink]="['/play', c.id]">
            <ui-card>
              <div class="flex items-center gap-3">
                <span class="text-3xl">{{ emojiPortada(c) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold hover:underline truncate">{{ c.nombre }}</p>
                  <p class="text-sm text-gray-500 truncate">{{ c.descripcion || 'Sin descripción' }}</p>
                  <p class="text-sm text-gray-500">{{ resumen(c) }}</p>
                </div>
                <ui-badge>{{ c.unidades.length }} {{ c.unidades.length === 1 ? 'unidad' : 'unidades' }}</ui-badge>
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
export class MisClases {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthMockService);
  private readonly router = inject(Router);

  // Snapshot al entrar: el profesor escribe en el mismo localStorage, así que al
  // navegar acá el componente se crea de nuevo y ve lo último guardado.
  protected readonly clases = signal<Asignatura[]>(this.store.listAll());

  protected cambiarRol(): void {
    this.auth.salir();
    this.router.navigate(['/login']);
  }

  protected resumen(c: Asignatura): string {
    const modulos = c.unidades.reduce((n, u) => n + u.modulos.length, 0);
    const cofres = c.unidades.reduce(
      (n, u) => n + u.modulos.reduce((m, x) => m + x.anexos.length, 0),
      0,
    );
    return `${modulos} ${modulos === 1 ? 'torre' : 'torres'} · ${cofres} ${cofres === 1 ? 'cofre' : 'cofres'}`;
  }

  protected emojiPortada(c: Asignatura): string {
    return this.biomaEmoji(c.unidades[0]?.bioma);
  }

  protected biomaEmoji(bioma: Biome | undefined): string {
    if (bioma === 'desierto') return '🏜️';
    if (bioma === 'nieve') return '❄️';
    if (bioma === 'lava') return '🌋';
    return '🌿';
  }
}
