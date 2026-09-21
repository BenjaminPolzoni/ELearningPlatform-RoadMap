import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../../data-access/educa/store.service';
import { EducaCardComponent } from '../../ui/educa-ui/educa-ui.component';
import { RoleSwitchComponent } from '../../ui/role-switch/role-switch.component';

@Component({
  selector: 'app-teacher-home-page',
  standalone: true,
  imports: [RouterLink, EducaCardComponent, RoleSwitchComponent],
  template: `
    <div class="mx-auto max-w-3xl p-6 min-h-screen overflow-y-auto">
      <!-- Top bar with role and shortcuts -->
      <div class="flex items-center justify-between gap-4 border-b border-base-300 pb-4 mb-6">
        <h2 class="title-font text-primary text-xs">VISTA DEL PROFESOR</h2>
        <div class="flex items-center gap-2">
          <a routerLink="/roadmap/badges" class="btn btn-sm btn-outline btn-warning ui-font text-[8px]">
            🏅 Insignias
          </a>
          <app-role-switch />
        </div>
      </div>

      <!-- Main title -->
      <h1 class="text-3xl font-bold title-font text-primary">🎮 Educa — constructor de asignaturas</h1>
      <p class="mt-1 text-sm opacity-70">Crea una asignatura y constrúyela por niveles, unidades, módulos y anexos.</p>

      <!-- Quick subject creation form -->
      <div class="mt-6">
        <app-educa-card>
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
        </app-educa-card>
      </div>

      <!-- Subject list -->
      <div class="mt-6 grid gap-4">
        @for (a of items(); track a.id) {
          <app-educa-card>
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="min-w-0 flex-1">
                <a [routerLink]="['/roadmap/teacher/build', a.id]" class="text-lg font-bold text-primary hover:underline block truncate">
                  {{ a.name }}
                </a>
                <p class="text-xs opacity-70 mt-0.5">
                  {{ a.description || 'Sin descripción' }} · {{ a.sections.length }} unidades
                </p>
              </div>

              <div class="flex items-center gap-2">
                <a [routerLink]="['/roadmap/teacher/build', a.id]" class="btn btn-sm btn-primary ui-font text-[9px]">
                  🧩 Editar Curso
                </a>
                <a [routerLink]="['/roadmap/teacher/map', a.id]" class="btn btn-sm btn-outline btn-accent ui-font text-[9px]">
                  🗺️ Mapa
                </a>
                <button (click)="del(a.id)" aria-label="Eliminar {{ a.name }}" class="btn btn-sm btn-ghost text-error ui-font text-[9px]">
                  Eliminar
                </button>
              </div>
            </div>
          </app-educa-card>
        } @empty {
          <p class="opacity-60 text-center py-10">Aún no hay asignaturas. Crea la primera arriba 👆</p>
        }
      </div>
    </div>
  `,
})
export class TeacherHomePageComponent {
  private store = inject(StoreService);
  private router = inject(Router);
  items = signal(this.store.listAll());

  create(name: string, description: string): void {
    if (!name.trim()) return;
    const a = this.store.create(name, description);
    this.items.set(this.store.listAll());
    this.router.navigate(['/roadmap/teacher/build', a.id]);
  }

  del(id: string): void {
    this.store.delete(id);
    this.items.set(this.store.listAll());
  }
}
