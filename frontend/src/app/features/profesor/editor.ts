import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Mapa } from '../alumno/mapa';

/**
 * Editor de curso (E1, Fase 1). Vista densa y seria (05-design-system.md §6): tabla de
 * unidades + alta inline. Al agregar/quitar, el preview del mapa al costado se actualiza
 * solo (`RoadmapStore` compartido) — es el momento de la demo: "agrego unidad, aparece
 * la isla". CRUD de actividades y edición inline: Fase 2.
 */
@Component({
  selector: 'app-editor',
  imports: [FormsModule, Mapa],
  template: `
    <h2 class="title-font text-primary text-xs mb-4">EDITOR DEL CURSO</h2>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
      <div class="flex flex-col gap-4">
        <table class="table table-sm border-2 border-base-300">
          <thead>
            <tr>
              <th>#</th><th>Unidad</th>
              <th class="text-right">Umbral XP</th>
              <th class="text-right">Actividades</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (u of store.unidades(); track u.id) {
              <tr>
                <td class="tabular">{{ u.orden }}</td>
                <td>
                  {{ u.nombre }}
                  @if (u.actividades.length === 0) {
                    <span class="badge badge-warning badge-sm ml-2" title="RF-CUR-07">sin actividades</span>
                  }
                </td>
                <td class="text-right tabular">{{ u.umbralXpDesbloqueo }}</td>
                <td class="text-right tabular">{{ u.actividades.length }}</td>
                <td class="text-right">
                  <button class="btn btn-xs btn-outline btn-error" (click)="store.quitarUnidad(u.id)">
                    quitar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="opacity-60">Sin unidades. Agregá la primera abajo.</td></tr>
            }
          </tbody>
        </table>

        <form class="flex flex-wrap items-end gap-3 border-2 border-base-300 p-4" (submit)="agregar($event)">
          <label class="form-control">
            <span class="label-text ui-font">Nombre</span>
            <input
              class="input input-bordered input-sm" name="nombre" required
              [ngModel]="nombre()" (ngModelChange)="nombre.set($event)"
            />
          </label>
          <label class="form-control">
            <span class="label-text ui-font">Umbral XP</span>
            <input
              class="input input-bordered input-sm w-28 tabular"
              type="number" min="0" name="umbral"
              [ngModel]="umbral()" (ngModelChange)="umbral.set($event)"
            />
          </label>
          <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombre().trim()">
            agregar unidad
          </button>
        </form>
      </div>

      <div class="border-2 border-base-300 p-4">
        <h3 class="ui-font text-sm opacity-70 mb-2">Preview del mapa</h3>
        <app-mapa [preview]="true" class="w-[420px] block" />
      </div>
    </div>
  `,
})
export class Editor {
  protected readonly store = inject(RoadmapStore);

  protected readonly nombre = signal('');
  protected readonly umbral = signal(0);

  protected agregar(e: Event): void {
    e.preventDefault();
    const nombre = this.nombre().trim();
    if (!nombre) return;
    this.store.agregarUnidad({ nombre, umbralXpDesbloqueo: Number(this.umbral()) || 0 });
    this.nombre.set('');
    this.umbral.set(0);
  }
}
