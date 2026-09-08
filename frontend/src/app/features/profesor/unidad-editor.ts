import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Actividad, Dificultad, Modalidad, NuevaActividad, TipoNodo } from '../../core/data/roadmap.models';

type TipoContenido = 'teoria' | 'practica' | 'desafio';

// PAR-01: XP base que otorga un desafío según dificultad.
const XP_POR_DIFICULTAD: Record<Dificultad, number> = { BASICO: 100, MEDIO: 250, AVANZADO: 500 };

/**
 * Editor de una unidad (E1 / Fase 2, estilo Moodle). El profesor arma el contenido de la
 * unidad: sube material teórico/práctico y crea desafíos teóricos/prácticos con dificultad
 * (RF-CUR-04/05, RF-DES-06/07, PAR-01/13). Todo va por `RoadmapStore` → `RoadmapDataPort`,
 * así el swap a HTTP de Fase 3 no toca esta pantalla.
 */
@Component({
  selector: 'app-unidad-editor',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/profesor" class="btn btn-sm btn-ghost mb-4">← volver al curso</a>

    @if (unidad(); as u) {
      <div class="flex items-baseline gap-4 mb-6">
        <h2 class="title-font text-primary text-xs">{{ u.nombre }}</h2>
        <span class="ui-font opacity-70">se abre con {{ u.umbralXpDesbloqueo }} XP</span>
      </div>

      <!-- ── Contenido de la unidad ─────────────────────────────── -->
      <table class="table table-sm border-2 border-base-300 mb-8">
        <thead>
          <tr>
            <th>#</th><th>Contenido</th><th>Tipo</th><th>Dificultad</th>
            <th class="text-center">Obligatorio</th><th class="text-center">Reintentos</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (a of u.actividades; track a.id; let idx = $index) {
            <tr [class.opacity-60]="editandoId() === a.id">
              <td class="tabular">{{ idx + 1 }}</td>
              <td>
                <div>{{ a.nombre }}</div>
                @if (a.descripcion) { <div class="text-xs opacity-60">{{ a.descripcion }}</div> }
                @if (a.recurso) {
                  <a [href]="a.recurso" target="_blank" rel="noopener" class="text-xs link link-primary">{{ a.recurso }}</a>
                }
              </td>
              <td>
                <span class="badge badge-sm ui-font" [class]="badgeTipo(a.tipo)">{{ etiquetaTipo(a) }}</span>
              </td>
              <td>
                @if (a.dificultad) {
                  <span class="badge badge-sm" [class]="badgeDificultad(a.dificultad)">
                    {{ a.dificultad }} · {{ xpDe(a.dificultad) }} XP
                  </span>
                } @else { <span class="opacity-40">—</span> }
              </td>
              <td class="text-center">{{ a.esObligatorio ? '✓' : '—' }}</td>
              <td class="text-center tabular">{{ esDesafio(a.tipo) ? a.reintentosPermitidos : '—' }}</td>
              <td class="text-right whitespace-nowrap">
                <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'arriba')" [disabled]="idx === 0" title="subir">↑</button>
                <button class="btn btn-xs btn-ghost" (click)="mover(a.id, 'abajo')" [disabled]="idx === u.actividades.length - 1" title="bajar">↓</button>
                <button class="btn btn-xs btn-outline" (click)="editar(a)">editar</button>
                <button class="btn btn-xs btn-outline btn-error" (click)="store.quitarActividad(u.id, a.id)">✕</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="opacity-60">Sin contenido todavía. Agregá material o un desafío abajo.</td></tr>
          }
        </tbody>
      </table>

      <!-- ── Alta / edición de contenido ────────────────────────── -->
      <form class="card bg-base-200 border-2 border-base-300 max-w-2xl" (submit)="guardar($event)">
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
              <input class="input input-bordered input-sm" [ngModel]="nombre()" (ngModelChange)="nombre.set($event)" name="nombre" required />
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
            @if (editandoId()) {
              <button class="btn btn-sm btn-ghost" type="button" (click)="cancelar()">cancelar</button>
            }
          </div>
        </div>
      </form>
    } @else {
      <p class="opacity-70">Unidad no encontrada.</p>
    }
  `,
})
export class UnidadEditor {
  protected readonly store = inject(RoadmapStore);
  private readonly route = inject(ActivatedRoute);

  private readonly unidadId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly unidad = computed(() => this.store.unidadPorId(this.unidadId));

  // ── estado del formulario ──────────────────────────────────
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
      this.store.editarActividad(this.unidadId, id, dto);
    } else {
      this.store.agregarActividad(this.unidadId, dto);
    }
    this.limpiar();
  }

  protected editar(a: Actividad): void {
    this.editandoId.set(a.id);
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
