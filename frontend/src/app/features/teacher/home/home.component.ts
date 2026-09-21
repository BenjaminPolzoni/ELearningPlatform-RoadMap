import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/educa/store.service';
import { UiCard } from '../shared/educa-ui';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, UiCard],
  template: `
    <div class="mx-auto max-w-3xl p-6 min-h-screen overflow-y-auto">
      <!-- Top bar with role and shortcuts -->
      <div class="flex items-center justify-between gap-4 border-b border-base-300 pb-4 mb-6">
        <h2 class="title-font text-primary text-xs">VISTA DEL PROFESOR</h2>
        <div class="flex items-center gap-2">
          <a routerLink="/insignias" class="btn btn-sm btn-outline btn-warning ui-font text-[8px]">
            🏅 Insignias
          </a>
          <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Ver el mundo 3D tal como lo ve el alumno">
            👁️ Ver como alumno
          </a>
          <a routerLink="/login" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
            👤 PROFESOR ▾
          </a>
        </div>
      </div>

      <!-- Main title -->
      <h1 class="text-3xl font-bold title-font text-primary">🎮 Educa — constructor de asignaturas</h1>
      <p class="mt-1 text-sm opacity-70">Crea una asignatura y constrúyela por niveles, unidades, módulos y anexos.</p>

      <!-- Quick subject creation form -->
      <div class="mt-6">
        <ui-card>
          <div class="flex flex-col gap-3 sm:flex-row items-stretch">
            <input #n placeholder="Nombre (p. ej. Programación 1º)"
              class="input input-bordered input-sm flex-1"
              (keydown.enter)="create(n.value, d.value); n.value=''; d.value=''" />
            <input #d placeholder="Descripción (opcional)"
              class="input input-bordered input-sm flex-1"
              (keydown.enter)="create(n.value, d.value); n.value=''; d.value=''" />
            <button (click)="create(n.value, d.value); n.value=''; d.value=''"
              class="btn btn-sm btn-primary ui-font text-[9px]">+ Nueva</button>
          </div>
        </ui-card>
      </div>

      <!-- Subject list -->
      <div class="mt-6 grid gap-4">
        @for (a of items(); track a.id) {
          <ui-card>
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="min-w-0 flex-1">
                <a [routerLink]="['/profesor/build', a.id]" class="text-lg font-bold text-primary hover:underline block truncate">
                  {{ a.name }}
                </a>
                <p class="text-xs opacity-70 mt-0.5">
                  {{ a.description || 'Sin descripción' }} · {{ a.sections.length }} unidades
                </p>
              </div>

              <div class="flex items-center gap-2">
                <a [routerLink]="['/profesor/build', a.id]" class="btn btn-sm btn-primary ui-font text-[9px]">
                  🧩 Editar Curso
                </a>
                <a [routerLink]="['/profesor/map', a.id]" class="btn btn-sm btn-outline btn-accent ui-font text-[9px]">
                  🗺️ Mapa
                </a>
                <button (click)="del(a.id)" aria-label="Eliminar {{ a.name }}" class="btn btn-sm btn-ghost text-error ui-font text-[9px]">
                  Eliminar
                </button>
              </div>
            </div>
          </ui-card>
        } @empty {
          <p class="opacity-60 text-center py-10">Aún no hay asignaturas. Crea la primera arriba 👆</p>
        }
      </div>
    </div>
  `,
})
export class HomeComponent {
  private store = inject(StoreService);
  private router = inject(Router);
  items = signal(this.store.listAll());

  create(name: string, description: string): void {
    if (!name.trim()) return;
    const a = this.store.create(name, description);
    this.items.set(this.store.listAll());
    this.router.navigate(['/profesor/build', a.id]);
  }

  del(id: string): void {
    this.store.delete(id);
    this.items.set(this.store.listAll());
  }
}
