import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { FilaRanking, FilaRankingAnon } from '../../core/data/ranking.models';
import { InsigniasDataPort } from '../../core/data/insignias-data.port';
import { InsigniaCatalogo, InsigniaOtorgada } from '../../core/data/insignias.models';
import { enRiesgoRegularidad, esCandidatoPromocion } from '../../domain/ranking/ranking.reglas';
import { PixelIcon } from '../../shared/pixel-icon';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { BADGE_ICONS } from '../insignias/badge-icons';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { Racha } from '../alumno/racha';

type FilaDetalle = FilaRanking | FilaRankingAnon;

function esIdentificada(f: FilaDetalle): f is FilaRanking {
  return 'nombre' in f;
}

/**
 * Detalle de una fila del ranking (RF-RNK-07), estilo HUD de videojuego. La visibilidad
 * ya viene resuelta en el dato:
 *  - fila identificada (`nombre` presente) → la mandó el adapter porque es la fila propia
 *    del alumno o porque el rol es PROFESOR/ADMIN → se muestran identidad y auditoría.
 *  - fila anónima → solo stats (XP, nodo, percentil, insignias, vidas, monedas).
 * Este componente no vuelve a decidir nada de privacidad: renderiza lo que recibió.
 */
@Component({
  selector: 'app-ranking-detalle',
  imports: [PixelIcon, Racha, AvatarSprite],
  template: `
    <div class="rk-hud">
      <!-- Perfil: escudo hexagonal + identidad -->
      <div style="display:flex;align-items:center;gap:1rem">
        <span class="rk-shield"><ui-avatar-sprite [config]="fila().avatar" [alto]="108" /></span>
        <div style="min-width:0">
          @if (identificada(); as f) {
            <div
              class="console-font"
              style="font-size:1.6rem;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase;color:var(--rk-ink)"
            >
              {{ f.nombre }} {{ f.apellido }}
            </div>
            <div class="console-font rk-neon-primary" style="font-size:1rem">
              Legajo {{ f.legajo }}
            </div>
          } @else {
            <div
              class="console-font"
              style="font-size:1.6rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--rk-ink)"
            >
              {{ anon().seudonimo }}
            </div>
          }
          <div class="rk-plate">
            <span class="rk-plate__k">PUESTO</span>
            <span class="rk-plate__v tabular">{{ pad(fila().posicion) }} / {{ total() }}</span>
          </div>
        </div>
      </div>

      <!-- HUD: NIVEL · XP · PERCENTIL -->
      <div style="display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:0.5rem">
        <div class="rk-stat" style="align-items:center;justify-content:center;text-align:center">
          <span class="rk-stat__label">NIVEL ACTUAL</span>
          <span class="rk-stat__value rk-neon-primary">{{ pad(fila().nivelNodo) }}</span>
        </div>
        <div class="rk-stat">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span class="rk-stat__label">XP TOTAL</span>
            <span class="title-font tabular" style="font-size:0.7rem">{{ fila().xpTotal }}</span>
          </div>
          <span class="rk-xpbar" aria-hidden="true"
            ><span class="rk-xpbar__fill" [style.width.%]="xpPct()"></span
          ></span>
        </div>
        <div class="rk-stat" style="align-items:center;justify-content:center;text-align:center">
          <span class="rk-stat__label">PERCENTIL</span>
          <span class="rk-stat__value rk-neon-accent">P{{ fila().percentil }}</span>
        </div>
      </div>

      <!-- Inventario: monedas + vidas + racha -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem">
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-coin" aria-hidden="true"></span>
          <span class="rk-stat__label">MONEDAS</span>
          <span class="title-font tabular" style="margin-left:auto;font-size:0.8rem">{{
            fila().monedas
          }}</span>
        </div>
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-stat__label">VIDAS</span>
          <span
            style="margin-left:auto;display:inline-flex;gap:5px"
            [attr.aria-label]="fila().vidas + ' vidas'"
          >
            @for (on of corazones(); track $index) {
              <span
                class="rk-heart"
                [class.rk-heart--on]="on"
                [class.rk-heart--off]="!on"
                aria-hidden="true"
              ></span>
            }
          </span>
        </div>
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-stat__label">RACHA</span>
          <span style="margin-left:auto"><app-racha /></span>
        </div>
      </div>

      @if (identificada(); as f) {
        <!-- Auditoría / cierre — solo con fila identificada (fila propia del alumno o rol staff) -->
        <div class="rk-audit">
          <span class="rk-stat__label">CIERRE DEL CURSO</span>
          <div class="rk-audit__grid">
            <div class="rk-stat">
              <span class="rk-stat__label">INSIGNIAS</span>
              <div
                style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;min-height:18px"
                [attr.aria-label]="insigniasGanadas().length + ' insignias'"
              >
                @for (i of insigniasGanadas(); track i.insigniaId) {
                  <app-pixel-icon
                    [grid]="icono(i).grid"
                    [colors]="icono(i).colors"
                    [size]="18"
                    [attr.title]="i.nombre"
                  />
                } @empty {
                  <span class="opacity-50 tabular" style="font-size:0.7rem">—</span>
                }
              </div>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">VIDAS PERD.</span>
              <span class="rk-stat__value tabular">{{ f.vidasPerdidasHistorico }}</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">EJERCICIOS</span>
              <span class="rk-stat__value tabular">{{ f.ejerciciosCompletados }}</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">OBLIGATORIOS</span>
              <span class="rk-stat__value tabular">{{ f.obligatoriosAprobadosPct }}%</span>
            </div>
          </div>
          <div>
            @if (candidato()) {
              <span class="rk-mark rk-mark--promo">CANDIDATO A PROMOCIÓN</span>
            } @else if (riesgo()) {
              <span class="rk-mark rk-mark--riesgo">RIESGO DE REGULARIDAD</span>
            } @else {
              <span class="rk-mark rk-mark--none">REGULAR</span>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class RankingDetalle {
  readonly fila = input.required<FilaDetalle>();
  /** Total de inscriptos de la cohorte, para el "PUESTO NN / total". */
  readonly total = input<number>(0);

  private readonly insigniasData = inject(InsigniasDataPort);

  protected readonly identificada = computed(() => {
    const f = this.fila();
    return esIdentificada(f) ? f : null;
  });
  protected readonly anon = computed(() => this.fila() as FilaRankingAnon);

  private readonly catalogoInsignias = toSignal(this.insigniasData.getCatalogo(CURSO_SEED_ID), {
    initialValue: [] as InsigniaCatalogo[],
  });
  // toObservable en vez de leer this.identificada() acá directo: un input.required() todavía
  // no tiene valor bindeado durante la construcción del componente (NG0951) — toObservable
  // defiere la primera lectura hasta después, cuando el input ya está seteado.
  private readonly otorgadas = toSignal(
    toObservable(this.identificada).pipe(
      switchMap((f) => (f ? this.insigniasData.getGanadasPorAlumno(f.alumnoId) : of([] as InsigniaOtorgada[]))),
    ),
    { initialValue: [] as InsigniaOtorgada[] },
  );

  /** Cruza lo ganado (`insigniaId`) contra el catálogo para tener ícono + nombre. */
  protected readonly insigniasGanadas = computed(() => {
    const ids = new Set(this.otorgadas().map((o) => o.insigniaId));
    return this.catalogoInsignias().filter((i) => ids.has(i.insigniaId));
  });

  /** Progreso dentro del nodo actual: XP total sobre un tramo nominal de 700 por nodo. */
  protected readonly xpPct = computed(() => {
    const xp = this.fila().xpTotal;
    return Math.round(((xp % 700) / 700) * 100);
  });

  /** 3 slots de vida (PAR-12: máximo 3). */
  protected readonly corazones = computed(() => {
    const v = Math.max(0, Math.min(3, this.fila().vidas));
    return [v > 0, v > 1, v > 2];
  });

  protected readonly candidato = computed(() => {
    const f = this.identificada();
    return f ? esCandidatoPromocion(f) : false;
  });
  protected readonly riesgo = computed(() => {
    const f = this.identificada();
    return f ? enRiesgoRegularidad(f) : false;
  });

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected icono(i: InsigniaCatalogo) {
    return BADGE_ICONS[i.codigo];
  }
}
