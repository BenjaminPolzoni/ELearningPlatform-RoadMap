import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Unidad } from '../../core/data/roadmap.models';
import { BIOMA_DEFAULT, BIOMAS, Bioma } from '../../core/data/biomas';
import { ConfirmButton } from './confirm-button';
import { SaveFeedbackToast } from './save-feedback-toast';

/**
 * Editor de curso (E1). Página del curso estilo Moodle: las unidades se apilan en columna,
 * lineal hacia abajo, cada una enlazando a su contenido. "Ver como alumno" lleva al mapa
 * real (`RoadmapStore` compartido) — no hay preview aparte, así se ve exactamente lo mismo
 * que va a ver el alumno, no una aproximación.
 */
@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink, ConfirmButton, SaveFeedbackToast],
  // El shell raíz (app.html) recorta el <router-outlet> a un cuadro fijo sin scroll (pensado
  // para el mapa arcade del alumno) — esta vista sí necesita scrollear, así que scrollea
  // puertas adentro en vez de depender del documento.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <div class="max-w-3xl mx-auto w-full">
      <div class="flex items-center justify-between gap-4 mb-6">
        <h2 class="title-font text-primary text-xs">EDITOR DEL CURSO</h2>
        <div class="flex items-center gap-2">
          <a routerLink="/login" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
            👤 {{ store.roadmap() ? 'PROFESOR' : 'ROL' }} ▾
          </a>
          <a routerLink="/insignias" class="btn btn-sm btn-outline btn-warning ui-font text-[8px]">
            🏅 Insignias
          </a>
          <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Ver el mapa tal como lo ve el alumno">
            👁 Ver como alumno
          </a>
        </div>
      </div>

      <!-- ── Unidades en columna, lineal hacia abajo (Moodle) ──────── -->
      <ol class="flex flex-col gap-3 mb-6">
        @for (u of store.unidades(); track u.id; let idx = $index; let last = $last) {
          <li class="card bg-base-200 border-2" [class.border-primary]="editandoId() === u.id" [class.border-base-300]="editandoId() !== u.id">
            @if (editandoId() === u.id) {
              <form class="card-body p-4 flex-row flex-wrap items-end gap-3" (submit)="guardarEdicion($event, u.id)">
                <label class="form-control flex-1 min-w-52">
                  <span class="label-text ui-font">Nombre</span>
                  <input class="input input-bordered input-sm" name="nombreEdit" required
                    [ngModel]="nombreEdit()" (ngModelChange)="nombreEdit.set($event)" />
                </label>
                <label class="form-control">
                  <span class="label-text ui-font">Umbral XP</span>
                  <input class="input input-bordered input-sm w-28 tabular" type="number" min="0" name="umbralEdit"
                    [ngModel]="umbralEdit()" (ngModelChange)="umbralEdit.set($event)" />
                </label>
                <div class="form-control w-full">
                  <span class="label-text ui-font">Bioma</span>
                  <div class="flex gap-1 flex-wrap">
                    @for (b of biomas; track b.id) {
                      <button type="button" class="btn btn-xs"
                        [class.btn-primary]="biomaEdit() === b.id"
                        [class.btn-outline]="biomaEdit() !== b.id"
                        [disabled]="!b.disponible"
                        [title]="b.disponible ? b.label : b.label + ' — Próximamente'"
                        (click)="biomaEdit.set(b.id)">
                        {{ b.icon }} {{ b.label }}@if (!b.disponible) { <span class="opacity-60"> · pronto</span> }
                      </button>
                    }
                  </div>
                  @if (previewBiomaEdit(); as pb) {
                    <div class="mt-2">
                      <span class="label-text ui-font opacity-70 text-[10px]">Vista previa del mapa</span>
                      @if (pb.previewImage) {
                        <img [src]="pb.previewImage" [alt]="'Vista previa del bioma ' + pb.label"
                          class="rounded border border-base-300 w-40 h-28 object-cover" />
                      } @else {
                        <div class="rounded border border-dashed border-base-300 w-40 h-28 grid place-items-center text-[10px] text-center opacity-60 p-1">
                          Mapa próximamente
                        </div>
                      }
                    </div>
                  }
                </div>
                <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombreEdit().trim()">Guardar</button>
                <button class="btn btn-sm btn-ghost" type="button" (click)="cancelarEdicion()">Cancelar</button>
              </form>
            } @else {
              <div class="card-body p-4 flex-row items-center gap-4">
                <span class="grid place-items-center w-8 h-8 rounded-full bg-base-300 ui-font tabular shrink-0">
                  {{ u.orden }}
                </span>
                <div class="min-w-0 flex-1">
                  <a [routerLink]="['/profesor/unidad', u.id]" class="link link-primary font-bold">{{ u.nombre }}</a>
                  <div class="text-xs opacity-70">
                    se abre con {{ u.umbralXpDesbloqueo }} XP · {{ u.actividades.length }} contenidos
                    @if (u.actividades.length === 0) {
                      <span class="badge badge-warning badge-xs ml-1" title="RF-CUR-07">vacía</span>
                    }
                  </div>
                </div>
                <div class="flex flex-col gap-1 shrink-0">
                  <button class="btn btn-xs btn-ghost" (click)="mover(u.id, 'arriba')" [disabled]="idx === 0" title="subir">↑</button>
                  <button class="btn btn-xs btn-ghost" (click)="mover(u.id, 'abajo')" [disabled]="last" title="bajar">↓</button>
                </div>
                <a [routerLink]="['/profesor/unidad', u.id]" class="btn btn-sm btn-outline btn-primary shrink-0">
                  Contenido →
                </a>
                <button class="btn btn-sm btn-outline shrink-0" (click)="editar(u)" title="editar nombre y umbral">Editar</button>
                <app-confirm-button
                  class="shrink-0"
                  btnClass="btn btn-sm btn-ghost btn-square text-error"
                  title="quitar unidad"
                  (confirmado)="store.quitarUnidad(u.id)"
                />
              </div>
            }
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
                #nombreInput
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
            <div class="form-control w-full">
              <span class="label-text ui-font">Bioma</span>
              <div class="flex gap-1 flex-wrap">
                @for (b of biomas; track b.id) {
                  <button type="button" class="btn btn-xs"
                    [class.btn-primary]="bioma() === b.id"
                    [class.btn-outline]="bioma() !== b.id"
                    [disabled]="!b.disponible"
                    [title]="b.disponible ? b.label : b.label + ' — Próximamente'"
                    (click)="bioma.set(b.id)">
                    {{ b.icon }} {{ b.label }}@if (!b.disponible) { <span class="opacity-60"> · pronto</span> }
                  </button>
                }
              </div>
              @if (previewBioma(); as pb) {
                <div class="mt-2">
                  <span class="label-text ui-font opacity-70 text-[10px]">Vista previa del mapa</span>
                  @if (pb.previewImage) {
                    <img [src]="pb.previewImage" [alt]="'Vista previa del bioma ' + pb.label"
                      class="rounded border border-base-300 w-40 h-28 object-cover" />
                  } @else {
                    <div class="rounded border border-dashed border-base-300 w-40 h-28 grid place-items-center text-[10px] text-center opacity-60 p-1">
                      Mapa próximamente
                    </div>
                  }
                </div>
              }
            </div>
            <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombre().trim()">agregar</button>
            <button class="btn btn-sm btn-ghost" type="button" (click)="mostrarForm.set(false)">cancelar</button>
          </div>
        </form>
      } @else {
        <button
          class="btn btn-outline btn-primary w-full border-dashed mb-8"
          (click)="abrirForm()"
          title="Atajo: Alt+U"
        >
          ＋ Agregar unidad <kbd class="kbd kbd-xs ml-2">Alt</kbd>+<kbd class="kbd kbd-xs">U</kbd>
        </button>
      }
    </div>

    <app-save-feedback-toast />
  `,
})
export class Editor {
  protected readonly store = inject(RoadmapStore);
  private readonly nombreInputRef = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  protected readonly biomas = BIOMAS;

  protected readonly mostrarForm = signal(false);
  protected readonly nombre = signal('');
  protected readonly umbral = signal(0);
  protected readonly bioma = signal<Bioma>(BIOMA_DEFAULT);
  protected readonly previewBioma = computed(() => this.biomas.find((b) => b.id === this.bioma()));

  protected readonly editandoId = signal<string | null>(null);
  protected readonly nombreEdit = signal('');
  protected readonly umbralEdit = signal(0);
  protected readonly biomaEdit = signal<Bioma>(BIOMA_DEFAULT);
  protected readonly previewBiomaEdit = computed(() => this.biomas.find((b) => b.id === this.biomaEdit()));

  /** Alt+U: agregar unidad, desde cualquier lugar de la pantalla (05 §7: atajos descubribles). */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.toLowerCase() === 'u') {
      ev.preventDefault();
      this.abrirForm();
    }
  }

  protected abrirForm(): void {
    this.mostrarForm.set(true);
    setTimeout(() => this.nombreInputRef()?.nativeElement.focus());
  }

  protected agregar(e: Event): void {
    e.preventDefault();
    const nombre = this.nombre().trim();
    if (!nombre) return;
    this.store.agregarUnidad(
      { nombre, umbralXpDesbloqueo: Number(this.umbral()) || 0, bioma: this.bioma() },
      () => {
        this.nombre.set('');
        this.umbral.set(0);
        this.bioma.set(BIOMA_DEFAULT);
        this.mostrarForm.set(false);
      },
    );
  }

  protected mover(unidadId: string, direccion: 'arriba' | 'abajo'): void {
    this.store.moverUnidad(unidadId, direccion);
  }

  protected editar(u: Unidad): void {
    this.editandoId.set(u.id);
    this.nombreEdit.set(u.nombre);
    this.umbralEdit.set(u.umbralXpDesbloqueo);
    this.biomaEdit.set(u.bioma ?? BIOMA_DEFAULT);
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
  }

  protected guardarEdicion(e: Event, unidadId: string): void {
    e.preventDefault();
    const nombre = this.nombreEdit().trim();
    if (!nombre) return;
    this.store.editarUnidad(
      unidadId,
      { nombre, umbralXpDesbloqueo: Number(this.umbralEdit()) || 0, bioma: this.biomaEdit() },
      () => this.editandoId.set(null),
    );
  }
}
