import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RoadmapStore } from '../../data-access/roadmap/roadmap.store';
import { Section } from '../../data-access/roadmap/roadmap.models';
import { BIOME_DEFAULT, BIOMES, Biome } from '../../data-access/roadmap/biomes';
import { ConfirmButtonComponent } from '../../ui/confirm-button/confirm-button.component';
import { SaveFeedbackToastComponent } from '../../ui/save-feedback-toast/save-feedback-toast.component';

/**
 * Course editor (E1). Moodle-style course page: the sections are stacked in a column,
 * linear downwards, each one linking to its content. "View as student" leads to the real
 * map (shared `RoadmapStore`) — there is no separate preview, so it looks exactly the same
 * as what the student will see, not an approximation.
 */
@Component({
  selector: 'app-course-editor-page',
  imports: [FormsModule, RouterLink, ConfirmButtonComponent, SaveFeedbackToastComponent],
  // The root shell (app.html) clips the <router-outlet> to a fixed frame without scroll (designed
  // for the student's arcade map) — this view does need to scroll, so it scrolls
  // internally instead of relying on the document.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <div class="max-w-3xl mx-auto w-full">
      <div class="flex items-center justify-between gap-4 mb-6">
        <h2 class="title-font text-primary text-xs">EDITOR DEL CURSO</h2>
        <div class="flex items-center gap-2">
          <a routerLink="/roadmap/login" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
            👤 {{ store.roadmap() ? 'TEACHER' : 'ROL' }} ▾
          </a>
          <a routerLink="/roadmap/badges" class="btn btn-sm btn-outline btn-warning ui-font text-[8px]">
            🏅 Insignias
          </a>
          <a routerLink="/roadmap/student" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Ver el mapa tal como lo ve el alumno">
            👁 Ver como alumno
          </a>
        </div>
      </div>

      <!-- ── Sections in a column, linear downwards (Moodle) ──────── -->
      <ol class="flex flex-col gap-3 mb-6">
        @for (u of store.sections(); track u.id; let idx = $index; let last = $last) {
          <li class="card bg-base-200 border-2" [class.border-primary]="editingId() === u.id" [class.border-base-300]="editingId() !== u.id">
            @if (editingId() === u.id) {
              <form class="card-body p-4 flex-row flex-wrap items-end gap-3" (submit)="saveEdit($event, u.id)">
                <label class="form-control flex-1 min-w-52">
                  <span class="label-text ui-font">Nombre</span>
                  <input class="input input-bordered input-sm" name="nombreEdit" required
                    [ngModel]="nameEdit()" (ngModelChange)="nameEdit.set($event)" />
                </label>
                <label class="form-control">
                  <span class="label-text ui-font">Umbral XP</span>
                  <input class="input input-bordered input-sm w-28 tabular" type="number" min="0" name="umbralEdit"
                    [ngModel]="thresholdEdit()" (ngModelChange)="thresholdEdit.set($event)" />
                </label>
                <div class="form-control w-full">
                  <span class="label-text ui-font">Bioma</span>
                  <div class="flex gap-1 flex-wrap">
                    @for (b of biomes; track b.id) {
                      <button type="button" class="btn btn-xs"
                        [class.btn-primary]="biomeEdit() === b.id"
                        [class.btn-outline]="biomeEdit() !== b.id"
                        [disabled]="!b.available"
                        [title]="b.available ? b.label : b.label + ' — Próximamente'"
                        (click)="biomeEdit.set(b.id)">
                        {{ b.icon }} {{ b.label }}@if (!b.available) { <span class="opacity-60"> · pronto</span> }
                      </button>
                    }
                  </div>
                  @if (previewBiomeEdit(); as pb) {
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
                <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nameEdit().trim()">Guardar</button>
                <button class="btn btn-sm btn-ghost" type="button" (click)="cancelEdit()">Cancelar</button>
              </form>
            } @else {
              <div class="card-body p-4 flex-row items-center gap-4">
                <span class="grid place-items-center w-8 h-8 rounded-full bg-base-300 ui-font tabular shrink-0">
                  {{ u.order }}
                </span>
                <div class="min-w-0 flex-1">
                  <a [routerLink]="['/roadmap/teacher/section', u.id]" class="link link-primary font-bold">{{ u.name }}</a>
                  <div class="text-xs opacity-70">
                    se abre con {{ u.xpThreshold }} XP · {{ u.activities.length }} contenidos
                    @if (u.activities.length === 0) {
                      <span class="badge badge-warning badge-xs ml-1" title="RF-CUR-07">vacía</span>
                    }
                  </div>
                </div>
                <div class="flex flex-col gap-1 shrink-0">
                  <button class="btn btn-xs btn-ghost" (click)="move(u.id, 'up')" [disabled]="idx === 0" title="subir">↑</button>
                  <button class="btn btn-xs btn-ghost" (click)="move(u.id, 'down')" [disabled]="last" title="bajar">↓</button>
                </div>
                <a [routerLink]="['/roadmap/teacher/section', u.id]" class="btn btn-sm btn-outline btn-primary shrink-0">
                  Contenido →
                </a>
                <button class="btn btn-sm btn-outline shrink-0" (click)="edit(u)" title="editar nombre y umbral">Editar</button>
                <app-confirm-button
                  class="shrink-0"
                  btnClass="btn btn-sm btn-ghost btn-square text-error"
                  title="quitar unidad"
                  (confirmed)="store.removeSection(u.id)"
                />
              </div>
            }
          </li>
        } @empty {
          <li class="opacity-60">Sin unidades. Agregá la primera abajo.</li>
        }
      </ol>

      <!-- ── Add section, at the end of the column ────────────────── -->
      @if (showForm()) {
        <form class="card bg-base-200 border-2 border-primary mb-8" (submit)="add($event)">
          <div class="card-body p-4 flex-row flex-wrap items-end gap-3">
            <label class="form-control flex-1 min-w-52">
              <span class="label-text ui-font">Nombre de la unidad</span>
              <input
                #nameInput
                class="input input-bordered input-sm" name="nombre" required
                [ngModel]="name()" (ngModelChange)="name.set($event)"
              />
            </label>
            <label class="form-control">
              <span class="label-text ui-font">Umbral XP</span>
              <input
                class="input input-bordered input-sm w-28 tabular"
                type="number" min="0" name="umbral"
                [ngModel]="threshold()" (ngModelChange)="threshold.set($event)"
              />
            </label>
            <div class="form-control w-full">
              <span class="label-text ui-font">Bioma</span>
              <div class="flex gap-1 flex-wrap">
                @for (b of biomes; track b.id) {
                  <button type="button" class="btn btn-xs"
                    [class.btn-primary]="biome() === b.id"
                    [class.btn-outline]="biome() !== b.id"
                    [disabled]="!b.available"
                    [title]="b.available ? b.label : b.label + ' — Próximamente'"
                    (click)="biome.set(b.id)">
                    {{ b.icon }} {{ b.label }}@if (!b.available) { <span class="opacity-60"> · pronto</span> }
                  </button>
                }
              </div>
              @if (previewBiome(); as pb) {
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
            <button class="btn btn-sm btn-primary" type="submit" [disabled]="!name().trim()">agregar</button>
            <button class="btn btn-sm btn-ghost" type="button" (click)="showForm.set(false)">cancelar</button>
          </div>
        </form>
      } @else {
        <button
          class="btn btn-outline btn-primary w-full border-dashed mb-8"
          (click)="openForm()"
          title="Atajo: Alt+U"
        >
          ＋ Agregar unidad <kbd class="kbd kbd-xs ml-2">Alt</kbd>+<kbd class="kbd kbd-xs">U</kbd>
        </button>
      }
    </div>

    <app-save-feedback-toast />
  `,
})
export class CourseEditorPageComponent {
  protected readonly store = inject(RoadmapStore);
  private readonly nameInputRef = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  protected readonly biomes = BIOMES;

  protected readonly showForm = signal(false);
  protected readonly name = signal('');
  protected readonly threshold = signal(0);
  protected readonly biome = signal<Biome>(BIOME_DEFAULT);
  protected readonly previewBiome = computed(() => this.biomes.find((b) => b.id === this.biome()));

  protected readonly editingId = signal<string | null>(null);
  protected readonly nameEdit = signal('');
  protected readonly thresholdEdit = signal(0);
  protected readonly biomeEdit = signal<Biome>(BIOME_DEFAULT);
  protected readonly previewBiomeEdit = computed(() => this.biomes.find((b) => b.id === this.biomeEdit()));

  /** Alt+U: add section, from anywhere on the screen (05 §7: discoverable shortcuts). */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.toLowerCase() === 'u') {
      ev.preventDefault();
      this.openForm();
    }
  }

  protected openForm(): void {
    this.showForm.set(true);
    setTimeout(() => this.nameInputRef()?.nativeElement.focus());
  }

  protected add(e: Event): void {
    e.preventDefault();
    const name = this.name().trim();
    if (!name) return;
    this.store.addSection(
      { name, xpThreshold: Number(this.threshold()) || 0, biome: this.biome() },
      () => {
        this.name.set('');
        this.threshold.set(0);
        this.biome.set(BIOME_DEFAULT);
        this.showForm.set(false);
      },
    );
  }

  protected move(sectionId: string, direction: 'up' | 'down'): void {
    this.store.moveSection(sectionId, direction);
  }

  protected edit(u: Section): void {
    this.editingId.set(u.id);
    this.nameEdit.set(u.name);
    this.thresholdEdit.set(u.xpThreshold);
    this.biomeEdit.set(u.biome ?? BIOME_DEFAULT);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(e: Event, sectionId: string): void {
    e.preventDefault();
    const name = this.nameEdit().trim();
    if (!name) return;
    this.store.editSection(
      sectionId,
      { name, xpThreshold: Number(this.thresholdEdit()) || 0, biome: this.biomeEdit() },
      () => this.editingId.set(null),
    );
  }
}
