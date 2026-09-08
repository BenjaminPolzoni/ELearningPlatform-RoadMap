import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Mapa } from '../alumno/mapa';

/**
 * Editor de curso (E1). Página del curso estilo Moodle: las unidades se apilan en columna,
 * lineal hacia abajo, cada una enlazando a su contenido. Al agregar/quitar, el preview del
 * mapa se actualiza solo (`RoadmapStore` compartido) — "agrego unidad, aparece la isla".
 */
@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink, Mapa],
  template: `
    <div class="max-w-3xl mx-auto">
      <h2 class="title-font text-primary text-xs mb-6">EDITOR DEL CURSO</h2>

      <!-- ── Unidades en columna, lineal hacia abajo (Moodle) ──────── -->
      <ol class="flex flex-col gap-3 mb-6">
        @for (u of store.unidades(); track u.id) {
          <li class="card bg-base-200 border-2 border-base-300">
            <div class="card-body p-4 flex-row items-center gap-4">
              <span class="grid place-items-center w-8 h-8 rounded-full bg-base-300 ui-font tabular shrink-0">
                {{ u.orden }}
              </span>
              <div class="min-w-0 flex-1">
                <a [routerLink]="['/profesor/unidad', u.id]" class="link link-primary font-bold">{{ u.nombre }}</a>
                <div class="text-xs opacity-70 ui-font">
                  se abre con {{ u.umbralXpDesbloqueo }} XP · {{ u.actividades.length }} contenidos
                  @if (u.actividades.length === 0) {
                    <span class="badge badge-warning badge-xs ml-1" title="RF-CUR-07">vacía</span>
                  }
                </div>
              </div>
              <a [routerLink]="['/profesor/unidad', u.id]" class="btn btn-sm btn-outline btn-primary shrink-0">
                contenido →
              </a>
              <button class="btn btn-sm btn-ghost btn-square text-error shrink-0" (click)="store.quitarUnidad(u.id)" title="quitar unidad">✕</button>
            </div>
          </li>
        } @empty {
          <li class="opacity-60">Sin unidades. Agregá la primera abajo.</li>
        }
      </ol>

      <!-- ── Alta de unidad, al final de la columna ────────────────── -->
      @if (mostrarForm()) {
        <form class="card bg-base-200 border-2 border-primary mb-8" (submit)="agregar($event)">
          <div class="card-body p-4 flex-row flex-wrap items-end gap-3">
            <label class="form-control flex-1 min-w-52">
              <span class="label-text ui-font">Nombre de la unidad</span>
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
            <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombre().trim()">agregar</button>
            <button class="btn btn-sm btn-ghost" type="button" (click)="mostrarForm.set(false)">cancelar</button>
          </div>
        </form>
      } @else {
        <button class="btn btn-outline btn-primary w-full border-dashed mb-8" (click)="mostrarForm.set(true)">
          ＋ Agregar unidad
        </button>
      }

      <!-- ── Preview del mapa ──────────────────────────────────────── -->
      <div class="border-2 border-base-300 p-4">
        <h3 class="ui-font text-sm opacity-70 mb-2">Preview del mapa</h3>
        <app-mapa [preview]="true" class="block" />
      </div>
    </div>
  `,
})
export class Editor {
  protected readonly store = inject(RoadmapStore);

  protected readonly mostrarForm = signal(false);
  protected readonly nombre = signal('');
  protected readonly umbral = signal(0);

  protected agregar(e: Event): void {
    e.preventDefault();
    const nombre = this.nombre().trim();
    if (!nombre) return;
    this.store.agregarUnidad({ nombre, umbralXpDesbloqueo: Number(this.umbral()) || 0 });
    this.nombre.set('');
    this.umbral.set(0);
    this.mostrarForm.set(false);
  }
}
