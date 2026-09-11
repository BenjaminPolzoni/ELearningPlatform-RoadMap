import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Actividad, Dificultad, Modalidad, NuevaActividad, TipoNodo } from '../../core/data/roadmap.models';
import { ConfirmButton } from './confirm-button';
import { NodoCanvas } from './nodo-canvas';
import { SaveFeedbackToast } from './save-feedback-toast';

type TipoContenido = 'teoria' | 'practica' | 'desafio';
type Vista = 'lista' | 'mapa';

// PAR-01: XP base que otorga un desafío según dificultad.
const XP_POR_DIFICULTAD: Record<Dificultad, number> = { BASICO: 100, MEDIO: 250, AVANZADO: 500 };

/**
 * Editor de una unidad (E1 / Fase 2, estilo Moodle). El contenido se lista en columna,
 * lineal hacia abajo — como la página de un curso de Moodle: material teórico/práctico y
 * desafíos apilados en orden, cada uno con su acción (RF-CUR-04/05, RF-DES-06/07, PAR-01/13).
 * Todo va por `RoadmapStore` → `RoadmapDataPort`, así el swap a HTTP de Fase 3 no toca esto.
 *
 * "Mapa de nodos" (G9): el mismo contenido, pero como el tablero que va a recorrer el
 * alumno (`unidad-mapa.ts`) — posición de cada nodo y prerequisitos entre ellos, ver
 * `nodo-canvas.ts`.
 */
@Component({
  selector: 'app-unidad-editor',
  imports: [FormsModule, RouterLink, NodoCanvas, ConfirmButton, SaveFeedbackToast],
  // Ídem editor.ts: el shell raíz recorta el <router-outlet> sin scroll, así que esta vista
  // (la lista de nodos, que puede ser más alta que la pantalla) scrollea puertas adentro.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <a routerLink="/profesor" class="btn btn-sm btn-ghost mb-4">← volver al curso</a>

    @if (unidad(); as u) {
      <div class="max-w-3xl mx-auto">
        <div class="flex items-baseline gap-4 mb-4">
          <h2 class="title-font text-primary text-xs">{{ u.nombre }}</h2>
          <span class="ui-font opacity-70">se abre con {{ u.umbralXpDesbloqueo }} XP</span>
        </div>

        <!-- ── Tabs: lista de contenido (CRUD) / mapa de nodos (posición + prerequisitos) ── -->
        <div class="tabs tabs-boxed mb-4 w-fit">
          <button class="tab" [class.tab-active]="vista() === 'lista'" (click)="vista.set('lista')">Lista</button>
          <button class="tab" [class.tab-active]="vista() === 'mapa'" (click)="vista.set('mapa')">Mapa de nodos</button>
        </div>

        @if (vista() === 'mapa') {
          <app-nodo-canvas [unidad]="u" class="block mb-8" />
        } @else {
          <!-- ── Contenido en columna, lineal hacia abajo (Moodle) ──────── -->
          <ol class="flex flex-col">
            @for (a of u.actividades; track a.id; let idx = $index; let last = $last) {
              <li class="relative pl-12">
                <!-- rail: número + línea vertical que baja al siguiente -->
                <span
                  class="absolute left-0 top-4 z-10 grid place-items-center w-8 h-8 rounded-full
                         bg-base-300 text-base-content ui-font text-sm tabular"
                >{{ idx + 1 }}</span>
                @if (!last) {
                  <span class="absolute left-4 top-12 bottom-0 w-0.5 -translate-x-1/2 bg-base-300"></span>
                }

                <div
                  class="card bg-base-200 border-2 mb-4"
                  [class.border-primary]="editandoId() === a.id"
                  [class.border-base-300]="editandoId() !== a.id"
                >
                  <div class="card-body p-4 gap-2">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-lg leading-none">{{ icono(a.tipo) }}</span>
                          <span class="font-bold">{{ a.nombre }}</span>
                          <span class="badge badge-sm ui-font" [class]="badgeTipo(a.tipo)">{{ etiquetaTipo(a) }}</span>
                          @if (a.dificultad) {
                            <span class="badge badge-sm ui-font" [class]="badgeDificultad(a.dificultad)">
                              {{ a.dificultad }} · {{ xpDe(a.dificultad) }} XP
                            </span>
                          }
                          @if (a.esObligatorio) { <span class="badge badge-sm badge-warning ui-font">obligatorio</span> }
                          @if (esDesafio(a.tipo)) {
                            <span class="badge badge-sm badge-ghost ui-font">{{ a.reintentosPermitidos }} reintentos</span>
                          }
                        </div>
                        @if (a.descripcion) { <p class="text-sm opacity-70 mt-1">{{ a.descripcion }}</p> }
                        @if (a.recurso) {
                          <a [href]="a.recurso" target="_blank" rel="noopener" class="text-xs link link-primary break-all">
                            🔗 {{ a.recurso }}
                          </a>
                        }
                      </div>
                      <div class="flex flex-col items-end gap-1 shrink-0">
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'arriba')" [disabled]="idx === 0" title="subir">↑</button>
                          <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'abajo')" [disabled]="last" title="bajar">↓</button>
                        </div>
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-outline" (click)="editar(a)">editar</button>
                          <app-confirm-button title="quitar contenido" (confirmado)="store.quitarActividad(u.id, a.id)" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            } @empty {
              <li class="opacity-60 mb-4">Sin contenido todavía. Agregá material o un desafío abajo.</li>
            }
          </ol>

          <!-- ── Agregar / editar (al final de la columna, como Moodle) ── -->
          @if (mostrarForm()) {
            <form class="card bg-base-200 border-2 border-primary" (submit)="guardar($event)">
              <div class="card-body gap-4">
                <h3 class="ui-font text-sm">{{ editandoId() ? 'Editar contenido' : 'Agregar contenido' }}</h3>

                <div class="flex flex-wrap gap-3">
                  <label class="form-control">
                    <span class="label-text ui-font">Tipo</span>
                    <select class="select select-bordered select-sm" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)" name="tipo">
                      <option value="teoria">Material teórico</option>
                      <option value="practica">Material práctico</option>
                      <option value="desafio">Desafío</option>
                    </select>
                  </label>
                  <label class="form-control flex-1 min-w-52">
                    <span class="label-text ui-font">Nombre</span>
                    <input
                      #nombreInput
                      class="input input-bordered input-sm" [ngModel]="nombre()" (ngModelChange)="nombre.set($event)" name="nombre" required
                    />
                  </label>
                </div>

                @if (esMaterial()) {
                  <label class="form-control">
                    <span class="label-text ui-font">Descripción</span>
                    <textarea class="textarea textarea-bordered textarea-sm" rows="2" [ngModel]="descripcion()" (ngModelChange)="descripcion.set($event)" name="descripcion"></textarea>
                  </label>
                  <label class="form-control">
                    <span class="label-text ui-font">Recurso (URL o texto)</span>
                    <input class="input input-bordered input-sm" [ngModel]="recurso()" (ngModelChange)="recurso.set($event)" name="recurso" placeholder="https://…" />
                    <span class="label-text-alt opacity-60 mt-1">
                      Mock: se guarda un enlace o texto. La subida de archivos necesita storage (Fase 3).
                    </span>
                  </label>
                } @else {
                  <div class="flex flex-wrap gap-3">
                    <label class="form-control">
                      <span class="label-text ui-font">Modalidad</span>
                      <select class="select select-bordered select-sm" [ngModel]="modalidad()" (ngModelChange)="modalidad.set($event)" name="modalidad">
                        <option value="teorico">Teórico</option>
                        <option value="practico">Práctico</option>
                      </select>
                    </label>
                    <label class="form-control">
                      <span class="label-text ui-font">Dificultad</span>
                      <select class="select select-bordered select-sm" [ngModel]="dificultad()" (ngModelChange)="dificultad.set($event)" name="dificultad">
                        <option value="BASICO">Básico · 100 XP</option>
                        <option value="MEDIO">Medio · 250 XP</option>
                        <option value="AVANZADO">Avanzado · 500 XP</option>
                      </select>
                    </label>
                    <label class="form-control">
                      <span class="label-text ui-font">Reintentos (0-3)</span>
                      <input class="input input-bordered input-sm w-24 tabular" type="number" min="0" max="3" [ngModel]="reintentos()" (ngModelChange)="reintentos.set($event)" name="reintentos" />
                    </label>
                  </div>
                }

                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="checkbox checkbox-sm" [ngModel]="esObligatorio()" (ngModelChange)="esObligatorio.set($event)" name="obligatorio" />
                  <span class="label-text">Obligatorio para avanzar (RF-DES-06)</span>
                </label>

                <div class="flex gap-3">
                  <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombre().trim()">
                    {{ editandoId() ? 'guardar cambios' : 'agregar' }}
                  </button>
                  <button class="btn btn-sm btn-ghost" type="button" (click)="cancelar()">cancelar</button>
                </div>
              </div>
            </form>
          } @else {
            <button class="btn btn-outline btn-primary w-full border-dashed" (click)="abrirForm()" title="Atajo: Alt+A">
              ＋ Agregar contenido <kbd class="kbd kbd-xs ml-2">Alt</kbd>+<kbd class="kbd kbd-xs">A</kbd>
            </button>
          }
        }
      </div>
    } @else {
      <p class="opacity-70">Unidad no encontrada.</p>
    }

    <app-save-feedback-toast />
  `,
})
export class UnidadEditor {
  protected readonly store = inject(RoadmapStore);
  private readonly route = inject(ActivatedRoute);
  private readonly nombreInputRef = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  private readonly unidadId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly unidad = computed(() => this.store.unidadPorId(this.unidadId));

  protected readonly vista = signal<Vista>('lista');

  // ── estado del formulario ──────────────────────────────────
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly tipo = signal<TipoContenido>('teoria');
  protected readonly nombre = signal('');
  protected readonly esObligatorio = signal(true);
  protected readonly descripcion = signal('');
  protected readonly recurso = signal('');
  protected readonly modalidad = signal<Modalidad>('practico');
  protected readonly dificultad = signal<Dificultad>('BASICO');
  protected readonly reintentos = signal(1);

  protected readonly esMaterial = computed(() => this.tipo() !== 'desafio');

  /** Alt+A: agregar contenido — equivalente al Alt+U de la pantalla de unidades. */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.toLowerCase() === 'a') {
      ev.preventDefault();
      this.vista.set('lista');
      this.abrirForm();
    }
  }

  protected abrirForm(): void {
    this.mostrarForm.set(true);
    setTimeout(() => this.nombreInputRef()?.nativeElement.focus());
  }

  protected guardar(e: Event): void {
    e.preventDefault();
    const nombre = this.nombre().trim();
    if (!nombre) return;

    const dto: NuevaActividad = {
      nombre,
      tipo: this.tipo(),
      esObligatorio: this.esObligatorio(),
      reintentosPermitidos: Number(this.reintentos()) || 0,
      descripcion: this.descripcion(),
      recurso: this.recurso(),
      dificultad: this.dificultad(),
      modalidad: this.modalidad(),
    };

    const id = this.editandoId();
    if (id) {
      this.store.editarActividad(this.unidadId, id, dto, () => this.limpiar());
    } else {
      this.store.agregarActividad(this.unidadId, dto, () => this.limpiar());
    }
  }

  protected editar(a: Actividad): void {
    this.editandoId.set(a.id);
    this.mostrarForm.set(true);
    this.tipo.set(a.tipo === 'boss' ? 'desafio' : (a.tipo as TipoContenido));
    this.nombre.set(a.nombre);
    this.esObligatorio.set(a.esObligatorio);
    this.descripcion.set(a.descripcion ?? '');
    this.recurso.set(a.recurso ?? '');
    this.modalidad.set(a.modalidad ?? 'practico');
    this.dificultad.set(a.dificultad ?? 'BASICO');
    this.reintentos.set(a.reintentosPermitidos);
  }

  protected cancelar(): void {
    this.limpiar();
  }

  protected mover(actividadId: string, direccion: 'arriba' | 'abajo'): void {
    this.store.moverActividad(this.unidadId, actividadId, direccion);
  }

  // ── helpers de presentación ────────────────────────────────
  protected esDesafio(tipo: TipoNodo): boolean {
    return tipo === 'desafio' || tipo === 'boss';
  }
  protected xpDe(d: Dificultad): number {
    return XP_POR_DIFICULTAD[d];
  }
  protected icono(tipo: TipoNodo): string {
    switch (tipo) {
      case 'teoria': return '📖';
      case 'practica': return '📝';
      case 'desafio': return '⚔️';
      case 'boss': return '👑';
      default: return '📍';
    }
  }
  protected etiquetaTipo(a: Actividad): string {
    if (a.tipo === 'boss') return 'boss';
    if (a.tipo === 'desafio') return `desafío ${a.modalidad ?? ''}`.trim();
    return a.tipo === 'teoria' ? 'teoría' : 'práctica';
  }
  protected badgeTipo(tipo: TipoNodo): string {
    switch (tipo) {
      case 'desafio': return 'badge-primary';
      case 'boss': return 'badge-secondary';
      case 'teoria': return 'badge-outline';
      default: return 'badge-info badge-outline';
    }
  }
  protected badgeDificultad(d: Dificultad): string {
    return d === 'BASICO' ? 'badge-success' : d === 'MEDIO' ? 'badge-warning' : 'badge-error';
  }

  private limpiar(): void {
    this.mostrarForm.set(false);
    this.editandoId.set(null);
    this.tipo.set('teoria');
    this.nombre.set('');
    this.esObligatorio.set(true);
    this.descripcion.set('');
    this.recurso.set('');
    this.modalidad.set('practico');
    this.dificultad.set('BASICO');
    this.reintentos.set(1);
  }
}
