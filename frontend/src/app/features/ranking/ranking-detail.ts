import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { RankingRow, RankingAnonRow } from '../../core/data/ranking.models';
import { BadgesDataPort } from '../../core/data/badges-data.port';
import { BadgeCatalog, GrantedBadge } from '../../core/data/badges.models';
import { inRiskRegularity, isCandidatePromotion } from '../../domain/ranking/ranking.rules';
import { PixelIcon } from '../../shared/pixel-icon';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { BADGE_ICONS } from '../badges/badge-icons';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { Lives } from '../student/lives';
import { Streak } from '../student/streak';

type DetailRow = RankingRow | RankingAnonRow;

function isIdentified(f: DetailRow): f is RankingRow {
  return 'name' in f;
}

/**
 * Detail of a ranking row (RF-RNK-07), videogame HUD style. Visibility
 * is already resolved in the data:
 *  - identified row (`name` present) → the adapter sent it because it is the student's own
 *    row or because the role is PROFESOR/ADMIN → identity and audit are shown.
 *  - anonymous row → only stats (XP, node, percentile, badges, lives, coins).
 * This component does not decide anything about privacy again: it renders what it received.
 */
@Component({
  selector: 'app-ranking-detail',
  imports: [PixelIcon, Streak, Lives, AvatarSprite],
  template: `
    <div class="rk-hud">
      <!-- Profile: hexagonal shield + identity -->
      <div style="display:flex;align-items:center;gap:1rem">
        <span class="rk-shield"><ui-avatar-sprite [config]="row().avatar" [height]="108" /></span>
        <div style="min-width:0">
          @if (identified(); as f) {
            <div
              class="console-font"
              style="font-size:1.6rem;line-height:1.2;letter-spacing:0.04em;text-transform:uppercase;color:var(--rk-ink)"
            >
              {{ f.name }} {{ f.lastName }}
            </div>
            <div class="console-font rk-neon-primary" style="font-size:1rem">
              Legajo {{ f.fileNumber }}
            </div>
          } @else {
            <div
              class="console-font"
              style="font-size:1.6rem;letter-spacing:0.04em;text-transform:uppercase;color:var(--rk-ink)"
            >
              {{ anon().pseudonym }}
            </div>
          }
          <div class="rk-plate">
            <span class="rk-plate__k">PUESTO</span>
            <span class="rk-plate__v tabular">{{ pad(row().position) }} / {{ total() }}</span>
          </div>
        </div>
      </div>

      <!-- HUD: LEVEL · XP · PERCENTILE -->
      <div style="display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:0.5rem">
        <div class="rk-stat" style="align-items:center;justify-content:center;text-align:center">
          <span class="rk-stat__label">NIVEL ACTUAL</span>
          <span class="rk-stat__value rk-neon-primary">{{ pad(row().nodeLevel) }}</span>
        </div>
        <div class="rk-stat">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span class="rk-stat__label">XP TOTAL</span>
            <span class="title-font tabular" style="font-size:0.7rem">{{ row().xpTotal }}</span>
          </div>
          <span class="rk-xpbar" aria-hidden="true"
            ><span class="rk-xpbar__fill" [style.width.%]="xpPct()"></span
          ></span>
        </div>
        <div class="rk-stat" style="align-items:center;justify-content:center;text-align:center">
          <span class="rk-stat__label">PERCENTIL</span>
          <span class="rk-stat__value rk-neon-accent">P{{ row().percentile }}</span>
        </div>
      </div>

      <!-- Inventory: coins + lives + streak -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.6rem">
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-coin" aria-hidden="true"></span>
          <span class="rk-stat__label">MONEDAS</span>
          <span class="title-font tabular" style="margin-left:auto;font-size:0.8rem">{{
            row().coins
          }}</span>
        </div>
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-stat__label">VIDAS</span>
          <span style="margin-left:auto"><app-lives [current]="row().lives" [size]="20" /></span>
        </div>
        <div class="rk-stat" style="flex-direction:row;align-items:center;gap:0.6rem">
          <span class="rk-stat__label">RACHA</span>
          <span style="margin-left:auto"><app-streak /></span>
        </div>
      </div>

      @if (identified(); as f) {
        <!-- Audit / closing — only with an identified row (the student's own row or staff role) -->
        <div class="rk-audit">
          <span class="rk-stat__label">CIERRE DEL CURSO</span>
          <div class="rk-audit__grid">
            <div class="rk-stat">
              <span class="rk-stat__label">INSIGNIAS</span>
              <div
                style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;min-height:18px"
                [attr.aria-label]="earnedBadges().length + ' insignias'"
              >
                @for (i of earnedBadges(); track i.badgeId) {
                  <app-pixel-icon
                    [grid]="icon(i).grid"
                    [colors]="icon(i).colors"
                    [size]="18"
                    [attr.title]="i.name"
                  />
                } @empty {
                  <span class="opacity-50 tabular" style="font-size:0.7rem">—</span>
                }
              </div>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">VIDAS PERD.</span>
              <span class="rk-stat__value tabular">{{ f.lostLives }}</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">EJERCICIOS</span>
              <span class="rk-stat__value tabular">{{ f.completedExercises }}</span>
            </div>
            <div class="rk-stat">
              <span class="rk-stat__label">OBLIGATORIOS</span>
              <span class="rk-stat__value tabular">{{ f.mandatoryPassedPct }}%</span>
            </div>
          </div>
          <div>
            @if (candidate()) {
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
export class RankingDetail {
  readonly row = input.required<DetailRow>();
  /** Total enrolled in the cohort, for the "PUESTO NN / total". */
  readonly total = input<number>(0);

  private readonly badgesData = inject(BadgesDataPort);

  protected readonly identified = computed(() => {
    const f = this.row();
    return isIdentified(f) ? f : null;
  });
  protected readonly anon = computed(() => this.row() as RankingAnonRow);

  private readonly catalogBadges = toSignal(this.badgesData.getCatalog(COURSE_SEED_ID), {
    initialValue: [] as BadgeCatalog[],
  });
  // toObservable instead of reading this.identified() here directly: an input.required() has no
  // bound value yet during the component's construction (NG0951) — toObservable
  // defers the first read until later, when the input is already set.
  private readonly granted = toSignal(
    toObservable(this.identified).pipe(
      switchMap((f) => (f ? this.badgesData.getEarnedByStudent(f.studentId) : of([] as GrantedBadge[]))),
    ),
    { initialValue: [] as GrantedBadge[] },
  );

  /** Crosses the earned items (`badgeId`) against the catalog to get icon + name. */
  protected readonly earnedBadges = computed(() => {
    const ids = new Set(this.granted().map((o) => o.badgeId));
    return this.catalogBadges().filter((i) => ids.has(i.badgeId));
  });

  /** Progress within the current node: total XP over a nominal stretch of 700 per node. */
  protected readonly xpPct = computed(() => {
    const xp = this.row().xpTotal;
    return Math.round(((xp % 700) / 700) * 100);
  });

  protected readonly candidate = computed(() => {
    const f = this.identified();
    return f ? isCandidatePromotion(f) : false;
  });
  protected readonly riesgo = computed(() => {
    const f = this.identified();
    return f ? inRiskRegularity(f) : false;
  });

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected icon(i: BadgeCatalog) {
    return BADGE_ICONS[i.code];
  }
}
