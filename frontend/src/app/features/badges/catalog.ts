import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { BadgesDataPort } from '../../core/data/badges-data.port';
import {
  CRITERION_LABEL,
  CRITERION_SPECIFIC_NODE,
  CRITERIA_WITH_VALUE,
  BadgeCriterion,
  BadgeCatalog,
  NewBadge,
  BadgeType,
} from '../../core/data/badges.models';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { PixelIcon } from '../../shared/pixel-icon';
import { RouterLink } from '@angular/router';
import { BADGE_ICONS } from './badge-icons';
import { GENERIC_ICONS } from './generic-icons';

/**
 * Badge catalog (ADMIN and PROFESOR — the student sees the ones earned from their row in the
 * ranking or their inventory, not this full catalog). Creating ("＋ Nueva insignia") is PROFESOR only
 * (roadmap-requerimientos.md §9).
 */
@Component({
  selector: 'app-catalog',
  imports: [PixelIcon, FormsModule, RouterLink],
  // Same as editor.ts/section-editor.ts: the root shell clips the <router-outlet> without scroll,
  // so this view scrolls internally.
  host: { class: 'block w-full h-full overflow-y-auto p-6' },
  template: `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-baseline gap-4">
        <h2 class="title-font text-primary text-xs">CATÁLOGO DE INSIGNIAS</h2>
        <span class="ui-font opacity-80 text-[10px]">{{ badges().length }} en total</span>
      </div>
      <a routerLink="/profesor" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]">
        ◀ Volver al editor
      </a>
    </div>

    @if (auth.role() === 'PROFESOR') {
      @if (showForm()) {
        <form class="card bg-base-200 border-2 border-primary mb-6" (submit)="create($event)">
          <div class="card-body gap-4">
            <h3 class="ui-font text-sm">Nueva insignia</h3>

            <label class="form-control max-w-sm">
              <span class="label-text ui-font">Nombre</span>
              <input
                class="input input-bordered input-sm"
                name="nombre"
                required
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
              />
            </label>

            <div>
              <span class="label-text ui-font block mb-2">Ícono</span>
              <div class="flex flex-wrap gap-2">
                @for (code of genericIcons; track code) {
                  <button
                    type="button"
                    class="relative border-2 rounded p-2 bg-base-100"
                    [class.border-primary]="iconSel() === code"
                    [class.border-base-300]="iconSel() !== code"
                    [attr.aria-pressed]="iconSel() === code"
                    [attr.title]="code"
                    (click)="iconSel.set(code)"
                  >
                    <app-pixel-icon [grid]="genericIcon(code).grid" [colors]="genericIcon(code).colors" [size]="32" />
                    @if (genericIcon(code).needsRework) {
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
                [ngModel]="type()"
                (ngModelChange)="changeType($event)"
              >
                <option value="TRANSVERSAL">Transversal</option>
                <option value="POR_NODO">Por nodo</option>
              </select>
            </label>

            @if (type() === 'TRANSVERSAL') {
              <div class="flex flex-wrap gap-3 items-end">
                <label class="form-control min-w-64">
                  <span class="label-text ui-font">Criterio</span>
                  <select
                    class="select select-bordered select-sm"
                    name="criterio"
                    [ngModel]="criterion()"
                    (ngModelChange)="changeCriterion($event)"
                  >
                    <option [ngValue]="null" disabled>Elegir criterio…</option>
                    @for (c of criteria; track c) {
                      <option [value]="c">{{ criterionLabel(c) }}</option>
                    }
                  </select>
                </label>

                @if (needsValue()) {
                  <label class="form-control">
                    <span class="label-text ui-font">Valor</span>
                    <input
                      class="input input-bordered input-sm w-28 tabular"
                      type="number"
                      min="1"
                      name="valor"
                      [ngModel]="valueCriterion()"
                      (ngModelChange)="valueCriterion.set($event)"
                    />
                  </label>
                }
              </div>
            }

            @if (showNode()) {
              <label class="form-control max-w-sm">
                <span class="label-text ui-font">Nodo</span>
                <select
                  class="select select-bordered select-sm"
                  name="nodo"
                  [ngModel]="nodeId()"
                  (ngModelChange)="nodeId.set($event)"
                >
                  <option [ngValue]="null" disabled>Elegir nodo…</option>
                  @for (u of store.sections(); track u.id) {
                    <optgroup [label]="u.name">
                      @for (a of u.activities; track a.id) {
                        <option [value]="a.id">{{ a.name }}</option>
                      }
                    </optgroup>
                  }
                </select>
              </label>
            }

            <div class="flex gap-3">
              <button class="btn btn-sm btn-primary" type="submit" [disabled]="!formValid() || saving()">
                {{ saving() ? 'creando…' : 'crear' }}
              </button>
              <button class="btn btn-sm btn-ghost" type="button" (click)="cancelForm()">cancelar</button>
            </div>
          </div>
        </form>
      } @else {
        <button class="btn btn-outline btn-primary w-full border-dashed mb-6" (click)="showForm.set(true)">
          ＋ Nueva insignia
        </button>
      }
    }

    @if (loading()) {
      <p class="opacity-60">Cargando...</p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (i of badges(); track i.badgeId) {
          <div class="card bg-base-200 border-2 border-base-300 gap-0">
            <div class="card-body gap-2">
              <div class="flex items-center gap-3">
                <app-pixel-icon [grid]="icon(i).grid" [colors]="icon(i).colors" [size]="56" />
                <h3 class="title-font text-xs leading-relaxed">{{ i.name }}</h3>
              </div>
              <p class="opacity-80 text-sm">{{ i.description }}</p>
              <div class="flex flex-wrap gap-2 mt-1">
                <span class="badge badge-outline badge-sm ui-font">{{ typeLabel(i) }}</span>
                <span class="badge badge-outline badge-sm ui-font">{{ i.origin }}</span>
                @if (i.pendingIcon) {
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
export class Catalog {
  protected readonly auth = inject(AuthMockService);
  protected readonly store = inject(RoadmapStore);
  private readonly data = inject(BadgesDataPort);

  private readonly _badges = signal<BadgeCatalog[] | undefined>(undefined);
  protected readonly loading = computed(() => this._badges() === undefined);
  protected readonly badges = computed(() => this._badges() ?? []);

  // ── creation ("＋ New badge") ──────────────────────────────
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly name = signal('');
  protected readonly iconSel = signal<string | null>(null);
  protected readonly type = signal<BadgeType>('TRANSVERSAL');
  protected readonly criterion = signal<BadgeCriterion | null>(null);
  protected readonly valueCriterion = signal<number | null>(null);
  protected readonly nodeId = signal<string | null>(null);

  protected readonly genericIcons = Object.keys(GENERIC_ICONS);
  protected readonly criteria = Object.keys(CRITERION_LABEL) as BadgeCriterion[];

  protected readonly needsValue = computed(() => {
    const c = this.criterion();
    return c !== null && CRITERIA_WITH_VALUE.has(c);
  });
  private readonly needsNodeByCriterion = computed(() => this.criterion() === CRITERION_SPECIFIC_NODE);
  /** POR_NODO always asks for a node; TRANSVERSAL only if the chosen criterion is "specific node". */
  protected readonly showNode = computed(() => this.type() === 'POR_NODO' || this.needsNodeByCriterion());

  protected readonly formValid = computed(() => {
    if (!this.name().trim() || !this.iconSel()) return false;
    if (this.type() === 'TRANSVERSAL') {
      if (!this.criterion()) return false;
      if (this.needsValue() && !(this.valueCriterion() && this.valueCriterion()! > 0)) return false;
      if (this.needsNodeByCriterion() && !this.nodeId()) return false;
      return true;
    }
    return !!this.nodeId();
  });

  constructor() {
    this.load();
  }

  protected create(e: Event): void {
    e.preventDefault();
    if (!this.formValid()) return;

    const dto: NewBadge = {
      name: this.name().trim(),
      icon: this.iconSel()!,
      type: this.type(),
      criterion: this.type() === 'TRANSVERSAL' ? this.criterion()! : undefined,
      valueCriterion: this.needsValue() ? this.valueCriterion()! : undefined,
      nodeId: this.showNode() ? this.nodeId()! : undefined,
    };

    this.saving.set(true);
    this.data.create(COURSE_SEED_ID, dto).subscribe(() => {
      this.saving.set(false);
      this.cancelForm();
      this.load();
    });
  }

  protected changeType(t: BadgeType): void {
    this.type.set(t);
    this.criterion.set(null);
    this.valueCriterion.set(null);
    this.nodeId.set(null);
  }

  protected changeCriterion(c: BadgeCriterion): void {
    this.criterion.set(c);
    this.valueCriterion.set(null);
    this.nodeId.set(null);
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.name.set('');
    this.iconSel.set(null);
    this.type.set('TRANSVERSAL');
    this.criterion.set(null);
    this.valueCriterion.set(null);
    this.nodeId.set(null);
  }

  protected genericIcon(code: string) {
    return GENERIC_ICONS[code];
  }

  protected criterionLabel(c: BadgeCriterion): string {
    return CRITERION_LABEL[c];
  }

  protected icon(i: BadgeCatalog) {
    return BADGE_ICONS[i.code] ?? GENERIC_ICONS[i.code];
  }

  protected typeLabel(i: BadgeCatalog): string {
    return i.type === 'POR_NODO' ? 'por nodo' : 'transversal';
  }

  private load(): void {
    this.data.getCatalog(COURSE_SEED_ID).subscribe((list) => this._badges.set(list));
  }
}
