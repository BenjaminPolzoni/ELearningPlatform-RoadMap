import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoadmapStore } from '../../data-access/roadmap/roadmap.store';
import {
  Activity,
  Difficulty,
  defaultDescription,
  NewActivity,
  NodeType,
  ResourceTheoryType,
  XP_BY_DIFFICULTY,
} from '../../data-access/roadmap/roadmap.models';
import { ConfirmButtonComponent } from '../../ui/confirm-button/confirm-button.component';
import { NodeCanvasComponent } from '../../ui/node-canvas/node-canvas.component';
import { SaveFeedbackToastComponent } from '../../ui/save-feedback-toast/save-feedback-toast.component';
import { DIFFICULTY_LABEL } from '../../ui/labels';

// Types creatable from this form — 'boss'/'milestone' are left out (see roadmap.models.ts).
type ContentType = 'theory' | 'theoretical-challenge' | 'practical-challenge';
type View = 'list' | 'map';

/**
 * Editor of a section (E1 / Phase 2, Moodle style). The content is listed in a column,
 * linear downwards — like a Moodle course page: theory and practice challenges
 * stacked in order, each with its action (RF-CUR-04/05, RF-DES-06/07, PAR-01/13).
 * Everything goes through `RoadmapStore` → `RoadmapDataPort`, so the Phase 3 swap to HTTP does not touch this.
 *
 * "Node map" (G9): the same content, but as the board the student will go
 * through (`section-map.ts`) — position of each node and prerequisites between them, see
 * `node-canvas.ts`.
 */
@Component({
  selector: 'app-section-editor-page',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, NodeCanvasComponent, ConfirmButtonComponent, SaveFeedbackToastComponent],
  // Same as editor.ts: the root shell clips the <router-outlet> without scroll, so this view
  // (the node list, which may be taller than the screen) scrolls internally.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <a routerLink="/roadmap/teacher" class="btn btn-sm btn-ghost mb-4">← Volver al curso</a>

    @if (section(); as u) {
      <div class="max-w-3xl mx-auto">
        <div class="mb-4 text-center">
          <h2 class="title-font text-primary text-xl">{{ u.name }}</h2>
        </div>

        <!-- ── Tabs: content (CRUD) / node map (prerequisites) ── -->
        <div class="flex gap-2 mb-4">
          <button type="button" class="btn btn-sm"
            [class.btn-primary]="view() === 'list'" [class.btn-outline]="view() !== 'list'"
            (click)="view.set('list')">
            📋 Contenido
          </button>
          <button type="button" class="btn btn-sm"
            [class.btn-primary]="view() === 'map'" [class.btn-outline]="view() !== 'map'"
            (click)="view.set('map')">
            🗺️ Mapa de nodos
          </button>
        </div>

        @if (view() === 'map') {
          <app-node-canvas [section]="u" class="block mb-8" />
        } @else {
          <!-- ── Content in a column, linear downwards (Moodle) ──────── -->
          <ol class="flex flex-col">
            @for (a of u.activities; track a.id; let idx = $index; let last = $last) {
              <li class="relative pl-12">
                <!-- rail: number + vertical line going down to the next one -->
                <span
                  class="absolute left-0 top-4 z-10 grid place-items-center w-8 h-8 rounded-full
                         bg-base-300 text-base-content ui-font text-sm tabular"
                >{{ idx + 1 }}</span>
                @if (!last) {
                  <span class="absolute left-4 top-12 bottom-0 w-0.5 -translate-x-1/2 bg-base-300"></span>
                }

                <div
                  class="card bg-base-200 border-2 mb-4"
                  [class.border-primary]="editingId() === a.id"
                  [class.border-base-300]="editingId() !== a.id"
                >
                  <div class="card-body p-4 gap-2">
                    <div class="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        class="flex items-center gap-2 min-w-0 flex-1 text-left"
                        (click)="toggleExpanded(a.id)"
                        [attr.aria-expanded]="isExpanded(a.id)"
                        title="ver detalle"
                      >
                        <span class="text-lg leading-none shrink-0">{{ icon(a.type) }}</span>
                        <span class="font-bold truncate">{{ a.name }}</span>
                        <span class="text-xs opacity-50 shrink-0">{{ isExpanded(a.id) ? '▲' : '▼' }}</span>
                      </button>
                      <div class="flex flex-col items-end gap-1 shrink-0">
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-ghost" (click)="move(a.id, 'up')" [disabled]="idx === 0" title="subir">↑</button>
                          <button class="btn btn-xs btn-ghost" (click)="move(a.id, 'down')" [disabled]="last" title="bajar">↓</button>
                        </div>
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-outline" (click)="edit(a)" title="editar contenido" aria-label="editar contenido">✏️</button>
                          <app-confirm-button title="quitar contenido" (confirmed)="store.removeActivity(u.id, a.id)" />
                        </div>
                      </div>
                    </div>
                    @if (isExpanded(a.id)) {
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="badge badge-sm ui-font" [class]="badgeType(a.type)">{{ typeLabel(a) }}</span>
                        @if (a.difficulty) {
                          <span class="badge badge-sm ui-font" [class]="badgeDifficulty(a.difficulty)">
                            {{ difficultyLabel[a.difficulty] }} · {{ xpFor(a.difficulty) }} XP
                          </span>
                        }
                        @if (a.isMandatory) { <span class="badge badge-sm badge-warning ui-font">obligatorio</span> }
                        @if (isChallenge(a.type)) {
                          <span class="badge badge-sm badge-ghost ui-font">{{ a.allowedRetries }} reintentos</span>
                        }
                      </div>
                      <p class="text-sm opacity-70">{{ a.description || descriptionDefault(a.type) }}</p>
                    }
                  </div>
                </div>
              </li>
              <!-- Editing this content opens right here, below what was tapped — not
                   at the end of the list, so as not to lose sight of what is being edited. -->
              @if (showForm() && editingId() === a.id) {
                <li class="relative pl-12 mb-4">
                  <ng-container [ngTemplateOutlet]="formularioContent" />
                </li>
              }
            } @empty {
              <li class="opacity-60 mb-4">Sin contenido todavía. Agregá un desafío abajo.</li>
            }
          </ol>

          <!-- ── Add (at the end of the column, like Moodle) ── -->
          @if (showForm() && !editingId()) {
            <ng-container [ngTemplateOutlet]="formularioContent" />
          } @else if (!showForm()) {
            <button class="btn btn-outline btn-primary w-full border-dashed" (click)="openForm()" title="Atajo: Alt+A">
              ＋ Agregar contenido <kbd class="kbd kbd-xs ml-2">Alt</kbd>+<kbd class="kbd kbd-xs">A</kbd>
            </button>
          }

          <ng-template #formularioContent>
            <form class="card bg-base-200 border-2 border-primary" (submit)="save($event)">
              <div class="card-body gap-4">
                <h3 class="ui-font text-sm">{{ editingId() ? 'Editar contenido' : 'Agregar contenido' }}</h3>

                <div class="flex flex-wrap gap-3">
                  <label class="form-control">
                    <span class="label-text ui-font">Tipo</span>
                    <select class="select select-bordered select-sm" [ngModel]="type()" (ngModelChange)="type.set($event)" name="tipo">
                      <option value="theory">Contenido teórico</option>
                      <option value="theoretical-challenge">Desafío teórico</option>
                      <option value="practical-challenge">Desafío práctico</option>
                    </select>
                  </label>
                  <label class="form-control flex-1 min-w-52">
                    <span class="label-text ui-font">Nombre</span>
                    <input
                      #nameInput
                      class="input input-bordered input-sm" [ngModel]="name()" (ngModelChange)="name.set($event)" name="nombre" required
                    />
                  </label>
                </div>

                <label class="form-control">
                  <span class="label-text ui-font">Descripción</span>
                  <textarea
                    class="textarea textarea-bordered textarea-sm" rows="2"
                    [ngModel]="description()" (ngModelChange)="description.set($event)" name="descripcion"
                    [placeholder]="descriptionDefault(type())"
                  ></textarea>
                  <span class="label-text-alt opacity-60 mt-1">
                    Si la dejás vacía, el alumno ve la descripción sugerida de arriba.
                  </span>
                </label>
                @if (type() === 'theory') {
                  <div class="flex flex-wrap gap-3">
                    <label class="form-control">
                      <span class="label-text ui-font">Tipo de recurso</span>
                      <select class="select select-bordered select-sm" [ngModel]="resourceType()" (ngModelChange)="resourceType.set($event)" name="recursoTipo">
                        <option value="pdf">PDF</option>
                        <option value="video">Video</option>
                        <option value="ppt">Presentación (PPT)</option>
                      </select>
                    </label>
                    <label class="form-control flex-1 min-w-52">
                      <span class="label-text ui-font">URL del recurso</span>
                      <input
                        class="input input-bordered input-sm" type="url" [ngModel]="resourceUrl()" (ngModelChange)="resourceUrl.set($event)"
                        name="recursoUrl" placeholder="https://..." required
                      />
                    </label>
                  </div>
                  <span class="text-xs opacity-60 -mt-2">
                    Link a un recurso externo (YouTube, Google Drive, OneDrive, etc.) — el proyecto no sube archivos propios.
                  </span>
                } @else {
                  <div class="flex flex-wrap gap-3">
                    <label class="form-control">
                      <span class="label-text ui-font">Dificultad</span>
                      <select class="select select-bordered select-sm" [ngModel]="difficulty()" (ngModelChange)="difficulty.set($event)" name="dificultad">
                        <option value="BASIC">Básico · 100 XP</option>
                        <option value="MEDIUM">Medio · 250 XP</option>
                        <option value="ADVANCED">Avanzado · 500 XP</option>
                      </select>
                    </label>
                    <label class="form-control">
                      <span class="label-text ui-font">Reintentos (0-3)</span>
                      <input class="input input-bordered input-sm w-24 tabular" type="number" min="0" max="3" [ngModel]="retries()" (ngModelChange)="retries.set($event)" name="reintentos" />
                    </label>
                  </div>
                }

                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="checkbox checkbox-sm" [ngModel]="isMandatory()" (ngModelChange)="isMandatory.set($event)" name="obligatorio" />
                  <span class="label-text">Obligatorio para avanzar (RF-DES-06)</span>
                </label>

                <div class="flex gap-3">
                  <button class="btn btn-sm btn-primary" type="submit" [disabled]="!name().trim()">
                    {{ editingId() ? 'Guardar cambios' : 'Agregar' }}
                  </button>
                  <button class="btn btn-sm btn-ghost" type="button" (click)="cancel()">Cancelar</button>
                </div>
              </div>
            </form>
          </ng-template>
        }
      </div>
    } @else {
      <p class="opacity-70">Unidad no encontrada.</p>
    }

    <app-save-feedback-toast />
  `,
})
export class SectionEditorPageComponent {
  protected readonly difficultyLabel = DIFFICULTY_LABEL;
  protected readonly store = inject(RoadmapStore);
  private readonly route = inject(ActivatedRoute);
  private readonly nameInputRef = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  private readonly sectionId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly section = computed(() => this.store.sectionById(this.sectionId));

  protected readonly view = signal<View>('list');

  // ── detail dropdown per content item (type/XP/mandatory/retries/description) ──
  private readonly expandedIds = signal<ReadonlySet<string>>(new Set());
  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }
  protected toggleExpanded(id: string): void {
    const current = new Set(this.expandedIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.expandedIds.set(current);
  }

  // ── form state ──────────────────────────────────
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly type = signal<ContentType>('theoretical-challenge');
  protected readonly name = signal('');
  protected readonly isMandatory = signal(true);
  protected readonly description = signal('');
  protected readonly difficulty = signal<Difficulty>('BASIC');
  protected readonly retries = signal(1);
  protected readonly resourceUrl = signal('');
  protected readonly resourceType = signal<ResourceTheoryType>('pdf');

  /** Alt+A: add content — equivalent to Alt+U on the sections screen. */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.toLowerCase() === 'a') {
      ev.preventDefault();
      this.view.set('list');
      this.openForm();
    }
  }

  protected openForm(): void {
    this.showForm.set(true);
    setTimeout(() => this.nameInputRef()?.nativeElement.focus());
  }

  protected save(e: Event): void {
    e.preventDefault();
    const name = this.name().trim();
    if (!name) return;

    const isTheory = this.type() === 'theory';
    const dto: NewActivity = {
      name,
      type: this.type(),
      isMandatory: this.isMandatory(),
      allowedRetries: isTheory ? 0 : Number(this.retries()) || 0,
      description: this.description(),
      difficulty: isTheory ? undefined : this.difficulty(),
      resourceUrl: isTheory ? this.resourceUrl().trim() : undefined,
      resourceType: isTheory ? this.resourceType() : undefined,
    };

    const id = this.editingId();
    if (id) {
      this.store.editActivity(this.sectionId, id, dto, () => this.clean());
    } else {
      this.store.addActivity(this.sectionId, dto, () => this.clean());
    }
  }

  protected edit(a: Activity): void {
    this.editingId.set(a.id);
    this.showForm.set(true);
    // 'boss'/'milestone' are not in the selector — when editing one they fall back to a practice challenge.
    this.type.set(a.type === 'theory' ? 'theory' : a.type === 'theoretical-challenge' ? 'theoretical-challenge' : 'practical-challenge');
    this.name.set(a.name);
    this.isMandatory.set(a.isMandatory);
    this.description.set(a.description ?? '');
    this.difficulty.set(a.difficulty ?? 'BASIC');
    this.retries.set(a.allowedRetries);
    this.resourceUrl.set(a.resourceUrl ?? '');
    this.resourceType.set(a.resourceType ?? 'pdf');
  }

  protected cancel(): void {
    this.clean();
  }

  protected move(activityId: string, direction: 'up' | 'down'): void {
    this.store.moveActivity(this.sectionId, activityId, direction);
  }

  // ── presentation helpers ────────────────────────────────
  protected isChallenge(type: NodeType): boolean {
    return type !== 'milestone' && type !== 'theory';
  }
  protected xpFor(d: Difficulty): number {
    return XP_BY_DIFFICULTY[d];
  }
  protected icon(type: NodeType): string {
    switch (type) {
      case 'theory': return '📖';
      case 'theoretical-challenge': return '🧠';
      case 'practical-challenge': return '⚔️';
      case 'boss': return '👑';
      default: return '📍';
    }
  }
  protected typeLabel(a: Activity): string {
    switch (a.type) {
      case 'boss': return 'boss';
      case 'theory': return 'contenido teórico';
      case 'theoretical-challenge': return 'desafío teórico';
      case 'practical-challenge': return 'desafío práctico';
      default: return 'milestone';
    }
  }
  protected badgeType(type: NodeType): string {
    switch (type) {
      case 'theoretical-challenge':
      case 'practical-challenge':
        return 'badge-primary';
      case 'boss': return 'badge-secondary';
      case 'theory': return 'badge-accent';
      default: return 'badge-info badge-outline';
    }
  }
  protected badgeDifficulty(d: Difficulty): string {
    return d === 'BASIC' ? 'badge-success' : d === 'MEDIUM' ? 'badge-warning' : 'badge-error';
  }
  protected descriptionDefault(type: NodeType): string {
    return defaultDescription(type);
  }

  private clean(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.type.set('theoretical-challenge');
    this.name.set('');
    this.isMandatory.set(true);
    this.description.set('');
    this.difficulty.set('BASIC');
    this.retries.set(1);
    this.resourceUrl.set('');
    this.resourceType.set('pdf');
  }
}
