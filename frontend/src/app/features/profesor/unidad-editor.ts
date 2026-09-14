import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoadmapStore } from '../../core/data/roadmap.store';
import {
  Actividad,
  Dificultad,
  descripcionPorDefecto,
  NuevaActividad,
  TipoNodo,
  XP_POR_DIFICULTAD,
} from '../../core/data/roadmap.models';
import { ConfirmButton } from './confirm-button';
import { NodoCanvas } from './nodo-canvas';
import { SaveFeedbackToast } from './save-feedback-toast';

// Tipos creables desde este formulario — 'boss'/'hito' quedan afuera (ver roadmap.models.ts).
type TipoContenido = 'desafio-teorico' | 'desafio-practico';
type Vista = 'lista' | 'mapa';

/**
 * Editor de una unidad (E1 / Fase 2, estilo Moodle). El contenido se lista en columna,
 * lineal hacia abajo — como la página de un curso de Moodle: desafíos teóricos y prácticos
 * apilados en orden, cada uno con su acción (RF-CUR-04/05, RF-DES-06/07, PAR-01/13).
 * Todo va por `RoadmapStore` → `RoadmapDataPort`, así el swap a HTTP de Fase 3 no toca esto.
 *
 * "Mapa de nodos" (G9): el mismo contenido, pero como el tablero que va a recorrer el
 * alumno (`unidad-mapa.ts`) — posición de cada nodo y prerequisitos entre ellos, ver
 * `nodo-canvas.ts`.
 */
@Component({
  selector: 'app-unidad-editor',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, NodoCanvas, ConfirmButton, SaveFeedbackToast],
  // Ídem editor.ts: el shell raíz recorta el <router-outlet> sin scroll, así que esta vista
  // (la lista de nodos, que puede ser más alta que la pantalla) scrollea puertas adentro.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <a routerLink="/profesor" class="btn btn-sm btn-ghost mb-4">← Volver al curso</a>

    @if (unidad(); as u) {
      <div class="max-w-3xl mx-auto">
        <div class="mb-4 text-center">
          <h2 class="title-font text-primary text-xl">{{ u.nombre }}</h2>
        </div>

        <!-- ── Tabs: contenido (CRUD) / mapa de nodos (prerequisitos) ── -->
        <div class="flex gap-2 mb-4">
          <button type="button" class="btn btn-sm"
            [class.btn-primary]="vista() === 'lista'" [class.btn-outline]="vista() !== 'lista'"
            (click)="vista.set('lista')">
            📋 Contenido
          </button>
          <button type="button" class="btn btn-sm"
            [class.btn-primary]="vista() === 'mapa'" [class.btn-outline]="vista() !== 'mapa'"
            (click)="vista.set('mapa')">
            🗺️ Mapa de nodos
          </button>
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
                    <div class="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        class="flex items-center gap-2 min-w-0 flex-1 text-left"
                        (click)="toggleExpandido(a.id)"
                        [attr.aria-expanded]="expandido(a.id)"
                        title="ver detalle"
                      >
                        <span class="text-lg leading-none shrink-0">{{ icono(a.tipo) }}</span>
                        <span class="font-bold truncate">{{ a.nombre }}</span>
                        <span class="text-xs opacity-50 shrink-0">{{ expandido(a.id) ? '▲' : '▼' }}</span>
                      </button>
                      <div class="flex flex-col items-end gap-1 shrink-0">
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'arriba')" [disabled]="idx === 0" title="subir">↑</button>
                          <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'abajo')" [disabled]="last" title="bajar">↓</button>
                        </div>
                        <div class="flex gap-1">
                          <button class="btn btn-xs btn-outline" (click)="editar(a)" title="editar contenido" aria-label="editar contenido">✏️</button>
                          <app-confirm-button title="quitar contenido" (confirmado)="store.quitarActividad(u.id, a.id)" />
                        </div>
                      </div>
                    </div>
                    @if (expandido(a.id)) {
                      <div class="flex items-center gap-2 flex-wrap">
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
                      <p class="text-sm opacity-70">{{ a.descripcion || descripcionDefault(a.tipo) }}</p>
                    }
                  </div>
                </div>
              </li>
              <!-- Editar este contenido se abre acá mismo, debajo de lo que se tocó — no
                   al final de la lista, para no perder de vista qué se está editando. -->
              @if (mostrarForm() && editandoId() === a.id) {
                <li class="relative pl-12 mb-4">
                  <ng-container [ngTemplateOutlet]="formularioContenido" />
                </li>
              }
            } @empty {
              <li class="opacity-60 mb-4">Sin contenido todavía. Agregá un desafío abajo.</li>
            }
          </ol>

          <!-- ── Agregar (al final de la columna, como Moodle) ── -->
          @if (mostrarForm() && !editandoId()) {
            <ng-container [ngTemplateOutlet]="formularioContenido" />
          } @else if (!mostrarForm()) {
            <button class="btn btn-outline btn-primary w-full border-dashed" (click)="abrirForm()" title="Atajo: Alt+A">
              ＋ Agregar contenido <kbd class="kbd kbd-xs ml-2">Alt</kbd>+<kbd class="kbd kbd-xs">A</kbd>
            </button>
          }

          <ng-template #formularioContenido>
            <form class="card bg-base-200 border-2 border-primary" (submit)="guardar($event)">
              <div class="card-body gap-4">
                <h3 class="ui-font text-sm">{{ editandoId() ? 'Editar contenido' : 'Agregar contenido' }}</h3>

                <div class="flex flex-wrap gap-3">
                  <label class="form-control">
                    <span class="label-text ui-font">Tipo</span>
                    <select class="select select-bordered select-sm" [ngModel]="tipo()" (ngModelChange)="tipo.set($event)" name="tipo">
                      <option value="desafio-teorico">Desafío teórico</option>
                      <option value="desafio-practico">Desafío práctico</option>
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

                <label class="form-control">
                  <span class="label-text ui-font">Descripción</span>
                  <textarea
                    class="textarea textarea-bordered textarea-sm" rows="2"
                    [ngModel]="descripcion()" (ngModelChange)="descripcion.set($event)" name="descripcion"
                    [placeholder]="descripcionDefault(tipo())"
                  ></textarea>
                  <span class="label-text-alt opacity-60 mt-1">
                    Si la dejás vacía, el alumno ve la descripción sugerida de arriba.
                  </span>
                </label>
                <div class="flex flex-wrap gap-3">
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

                <label class="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" class="checkbox checkbox-sm" [ngModel]="esObligatorio()" (ngModelChange)="esObligatorio.set($event)" name="obligatorio" />
                  <span class="label-text">Obligatorio para avanzar (RF-DES-06)</span>
                </label>

                <div class="flex gap-3">
                  <button class="btn btn-sm btn-primary" type="submit" [disabled]="!nombre().trim()">
                    {{ editandoId() ? 'Guardar cambios' : 'Agregar' }}
                  </button>
                  <button class="btn btn-sm btn-ghost" type="button" (click)="cancelar()">Cancelar</button>
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
export class UnidadEditor {
  protected readonly store = inject(RoadmapStore);
  private readonly route = inject(ActivatedRoute);
  private readonly nombreInputRef = viewChild<ElementRef<HTMLInputElement>>('nombreInput');

  private readonly unidadId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly unidad = computed(() => this.store.unidadPorId(this.unidadId));

  protected readonly vista = signal<Vista>('lista');

  // ── desplegable de detalle por contenido (tipo/XP/obligatorio/reintentos/descripción) ──
  private readonly expandidos = signal<ReadonlySet<string>>(new Set());
  protected expandido(id: string): boolean {
    return this.expandidos().has(id);
  }
  protected toggleExpandido(id: string): void {
    const actual = new Set(this.expandidos());
    if (actual.has(id)) actual.delete(id);
    else actual.add(id);
    this.expandidos.set(actual);
  }

  // ── estado del formulario ──────────────────────────────────
  protected readonly mostrarForm = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly tipo = signal<TipoContenido>('desafio-teorico');
  protected readonly nombre = signal('');
  protected readonly esObligatorio = signal(true);
  protected readonly descripcion = signal('');
  protected readonly dificultad = signal<Dificultad>('BASICO');
  protected readonly reintentos = signal(1);

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
      dificultad: this.dificultad(),
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
    // 'boss'/'hito' no están en el selector — al editar uno caen a desafío práctico.
    this.tipo.set(a.tipo === 'desafio-teorico' ? 'desafio-teorico' : 'desafio-practico');
    this.nombre.set(a.nombre);
    this.esObligatorio.set(a.esObligatorio);
    this.descripcion.set(a.descripcion ?? '');
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
    return tipo !== 'hito';
  }
  protected xpDe(d: Dificultad): number {
    return XP_POR_DIFICULTAD[d];
  }
  protected icono(tipo: TipoNodo): string {
    switch (tipo) {
      case 'desafio-teorico': return '🧠';
      case 'desafio-practico': return '⚔️';
      case 'boss': return '👑';
      default: return '📍';
    }
  }
  protected etiquetaTipo(a: Actividad): string {
    switch (a.tipo) {
      case 'boss': return 'boss';
      case 'desafio-teorico': return 'desafío teórico';
      case 'desafio-practico': return 'desafío práctico';
      default: return 'hito';
    }
  }
  protected badgeTipo(tipo: TipoNodo): string {
    switch (tipo) {
      case 'desafio-teorico':
      case 'desafio-practico':
        return 'badge-primary';
      case 'boss': return 'badge-secondary';
      default: return 'badge-info badge-outline';
    }
  }
  protected badgeDificultad(d: Dificultad): string {
    return d === 'BASICO' ? 'badge-success' : d === 'MEDIO' ? 'badge-warning' : 'badge-error';
  }
  protected descripcionDefault(tipo: TipoNodo): string {
    return descripcionPorDefecto(tipo);
  }

  private limpiar(): void {
    this.mostrarForm.set(false);
    this.editandoId.set(null);
    this.tipo.set('desafio-teorico');
    this.nombre.set('');
    this.esObligatorio.set(true);
    this.descripcion.set('');
    this.dificultad.set('BASICO');
    this.reintentos.set(1);
  }
}
