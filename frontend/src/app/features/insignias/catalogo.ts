import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { InsigniasDataPort } from '../../core/data/insignias-data.port';
import {
  CRITERIO_LABEL,
  CRITERIO_NODO_ESPECIFICO,
  CRITERIOS_CON_VALOR,
  CriterioInsignia,
  InsigniaCatalogo,
  NuevaInsignia,
  TipoInsignia,
} from '../../core/data/insignias.models';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { PixelIcon } from '../../shared/pixel-icon';
import { BADGE_ICONS } from './badge-icons';
import { GENERIC_ICONS } from './generic-icons';

/**
 * Catálogo de insignias (ADMIN y PROFESOR — el alumno ve las que ganó desde su fila del
 * ranking, no este catálogo completo). El alta ("＋ Nueva insignia") es solo PROFESOR
 * (roadmap-requerimientos.md §9), con el mismo patrón de form inline que `editor.ts` /
 * `unidad-editor.ts` — no hay un modal real en el proyecto para traer ese patrón acá.
 */
@Component({
  selector: 'app-catalogo',
  imports: [PixelIcon, FormsModule],
  template: `
    <div class="flex items-baseline gap-4 mb-6">
      <h2 class="title-font text-primary text-xs">CATÁLOGO DE INSIGNIAS</h2>
      <span class="ui-font opacity-80">{{ insignias().length }} en total</span>
    </div>

    @if (auth.rol() === 'PROFESOR') {
      @if (mostrarForm()) {
        <form class="card bg-base-200 border-2 border-primary mb-6" (submit)="crear($event)">
          <div class="card-body gap-4">
            <h3 class="ui-font text-sm">Nueva insignia</h3>

            <label class="form-control max-w-sm">
              <span class="label-text ui-font">Nombre</span>
              <input
                class="input input-bordered input-sm"
                name="nombre"
                required
                [ngModel]="nombre()"
                (ngModelChange)="nombre.set($event)"
              />
            </label>

            <div>
              <span class="label-text ui-font block mb-2">Ícono</span>
              <div class="flex flex-wrap gap-2">
                @for (codigo of iconosGenericos; track codigo) {
                  <button
                    type="button"
                    class="relative border-2 rounded p-2 bg-base-100"
                    [class.border-primary]="iconoSel() === codigo"
                    [class.border-base-300]="iconoSel() !== codigo"
                    [attr.aria-pressed]="iconoSel() === codigo"
                    [attr.title]="codigo"
                    (click)="iconoSel.set(codigo)"
                  >
                    <app-pixel-icon [grid]="genericIcon(codigo).grid" [colors]="genericIcon(codigo).colors" [size]="32" />
                    @if (genericIcon(codigo).needsRework) {
                      <span class="badge badge-warning badge-xs absolute -top-2 -right-2">pendiente</span>
                    }
                  </button>
                }
              </div>
            </div>

            <label class="form-control max-w-xs">
              <span class="label-text ui-font">Tipo</span>
              <select
                class="select select-bordered select-sm"
                name="tipo"
                [ngModel]="tipo()"
                (ngModelChange)="cambiarTipo($event)"
              >
                <option value="TRANSVERSAL">Transversal</option>
                <option value="POR_NODO">Por nodo</option>
              </select>
            </label>

            @if (tipo() === 'TRANSVERSAL') {
              <div class="flex flex-wrap gap-3 items-end">
                <label class="form-control min-w-64">
                  <span class="label-text ui-font">Criterio</span>
                  <select
                    class="select select-bordered select-sm"
                    name="criterio"
                    [ngModel]="criterio()"
                    (ngModelChange)="cambiarCriterio($event)"
                  >
                    <option [ngValue]="null" disabled>Elegir criterio…</option>
                    @for (c of criterios; track c) {
                      <option [value]="c">{{ criterioLabel(c) }}</option>
                    }
                  </select>
                </label>

                @if (necesitaValor()) {
                  <label class="form-control">
                    <span class="label-text ui-font">Valor</span>
                    <input
                      class="input input-bordered input-sm w-28 tabular"
                      type="number"
                      min="1"
                      name="valor"
                      [ngModel]="valorCriterio()"
                      (ngModelChange)="valorCriterio.set($event)"
                    />
                  </label>
                }
              </div>
            }

            @if (mostrarNodo()) {
              <label class="form-control max-w-sm">
                <span class="label-text ui-font">Nodo</span>
                <select
                  class="select select-bordered select-sm"
                  name="nodo"
                  [ngModel]="nodoId()"
                  (ngModelChange)="nodoId.set($event)"
                >
                  <option [ngValue]="null" disabled>Elegir nodo…</option>
                  @for (u of store.unidades(); track u.id) {
                    <optgroup [label]="u.nombre">
                      @for (a of u.actividades; track a.id) {
                        <option [value]="a.id">{{ a.nombre }}</option>
                      }
                    </optgroup>
                  }
                </select>
              </label>
            }

            <div class="flex gap-3">
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="!formValido() || guardando()">
                {{ guardando() ? 'creando…' : 'crear' }}
              </button>
              <button class="btn btn-sm btn-ghost" type="button" (click)="cancelarForm()">cancelar</button>
            </div>
          </div>
        </form>
      } @else {
        <button class="btn btn-outline btn-primary w-full border-dashed mb-6" (click)="mostrarForm.set(true)">
          ＋ Nueva insignia
        </button>
      }
    }

    @if (cargando()) {
      <p class="opacity-60">Cargando...</p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (i of insignias(); track i.insigniaId) {
          <div class="card bg-base-200 border-2 border-base-300 gap-0">
            <div class="card-body gap-2">
              <div class="flex items-center gap-3">
                <app-pixel-icon [grid]="icono(i).grid" [colors]="icono(i).colors" [size]="56" />
                <h3 class="title-font text-xs leading-relaxed">{{ i.nombre }}</h3>
              </div>
              <p class="opacity-80 text-sm">{{ i.descripcion }}</p>
              <div class="flex flex-wrap gap-2 mt-1">
                <span class="badge badge-outline badge-sm ui-font">{{ tipoLabel(i) }}</span>
                <span class="badge badge-outline badge-sm ui-font">{{ i.origen }}</span>
                @if (i.iconoPendiente) {
                  <span class="badge badge-warning badge-sm ui-font">ícono pendiente</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Catalogo {
  protected readonly auth = inject(AuthMockService);
  protected readonly store = inject(RoadmapStore);
  private readonly data = inject(InsigniasDataPort);

  private readonly _insignias = signal<InsigniaCatalogo[] | undefined>(undefined);
  protected readonly cargando = computed(() => this._insignias() === undefined);
  protected readonly insignias = computed(() => this._insignias() ?? []);

  // ── alta ("＋ Nueva insignia") ──────────────────────────────
  protected readonly mostrarForm = signal(false);
  protected readonly guardando = signal(false);
  protected readonly nombre = signal('');
  protected readonly iconoSel = signal<string | null>(null);
  protected readonly tipo = signal<TipoInsignia>('TRANSVERSAL');
  protected readonly criterio = signal<CriterioInsignia | null>(null);
  protected readonly valorCriterio = signal<number | null>(null);
  protected readonly nodoId = signal<string | null>(null);

  protected readonly iconosGenericos = Object.keys(GENERIC_ICONS);
  protected readonly criterios = Object.keys(CRITERIO_LABEL) as CriterioInsignia[];

  protected readonly necesitaValor = computed(() => {
    const c = this.criterio();
    return c !== null && CRITERIOS_CON_VALOR.has(c);
  });
  private readonly necesitaNodoPorCriterio = computed(() => this.criterio() === CRITERIO_NODO_ESPECIFICO);
  /** POR_NODO siempre pide nodo; TRANSVERSAL solo si el criterio elegido es "nodo específico". */
  protected readonly mostrarNodo = computed(() => this.tipo() === 'POR_NODO' || this.necesitaNodoPorCriterio());

  protected readonly formValido = computed(() => {
    if (!this.nombre().trim() || !this.iconoSel()) return false;
    if (this.tipo() === 'TRANSVERSAL') {
      if (!this.criterio()) return false;
      if (this.necesitaValor() && !(this.valorCriterio() && this.valorCriterio()! > 0)) return false;
      if (this.necesitaNodoPorCriterio() && !this.nodoId()) return false;
      return true;
    }
    return !!this.nodoId();
  });

  constructor() {
    this.cargar();
  }

  protected crear(e: Event): void {
    e.preventDefault();
    if (!this.formValido()) return;

    const dto: NuevaInsignia = {
      nombre: this.nombre().trim(),
      icono: this.iconoSel()!,
      tipo: this.tipo(),
      criterio: this.tipo() === 'TRANSVERSAL' ? this.criterio()! : undefined,
      valorCriterio: this.necesitaValor() ? this.valorCriterio()! : undefined,
      nodoId: this.mostrarNodo() ? this.nodoId()! : undefined,
    };

    this.guardando.set(true);
    this.data.crear(CURSO_SEED_ID, dto).subscribe(() => {
      this.guardando.set(false);
      this.cancelarForm();
      this.cargar();
    });
  }

  protected cambiarTipo(t: TipoInsignia): void {
    this.tipo.set(t);
    this.criterio.set(null);
    this.valorCriterio.set(null);
    this.nodoId.set(null);
  }

  protected cambiarCriterio(c: CriterioInsignia): void {
    this.criterio.set(c);
    this.valorCriterio.set(null);
    this.nodoId.set(null);
  }

  protected cancelarForm(): void {
    this.mostrarForm.set(false);
    this.nombre.set('');
    this.iconoSel.set(null);
    this.tipo.set('TRANSVERSAL');
    this.criterio.set(null);
    this.valorCriterio.set(null);
    this.nodoId.set(null);
  }

  protected genericIcon(codigo: string) {
    return GENERIC_ICONS[codigo];
  }

  protected criterioLabel(c: CriterioInsignia): string {
    return CRITERIO_LABEL[c];
  }

  protected icono(i: InsigniaCatalogo) {
    return BADGE_ICONS[i.codigo] ?? GENERIC_ICONS[i.codigo];
  }

  protected tipoLabel(i: InsigniaCatalogo): string {
    return i.tipo === 'POR_NODO' ? 'por nodo' : 'transversal';
  }

  private cargar(): void {
    this.data.getCatalogo(CURSO_SEED_ID).subscribe((lista) => this._insignias.set(lista));
  }
}
