import { Component, computed, input, output } from '@angular/core';
import { RankingRow, RankingAnonRow, StudentRankingView } from '../../core/data/ranking.models';
import { inRiskRegularity, isCandidatePromotion } from '../../domain/ranking/ranking.rules';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

type ListRow = RankingRow | RankingAnonRow;

function isIdentified(f: ListRow): f is RankingRow {
  return 'name' in f;
}

/**
 * Academic status of the own row — the only thing the banner shows. There is only a banner
 * for PROMOCIÓN (RF-RNK-05) and RIESGO (RF-RNK-06); any other situation (including
 * being in P90/P10 without meeting the conditions) is considered a "regular student" and has no
 * banner.
 */
type ZoneStatus = 'promotion' | 'risk' | 'outside' | 'inactive';
type Tone = 'ok' | 'risk' | 'info';

const COPY: Record<ZoneStatus, { tag: string; sub: string; tone: Tone }> = {
  promotion: {
    tag: 'ESTÁS EN ZONA DE PROMOCIÓN',
    sub: 'P90 · 0 vidas perdidas en el curso · 100 % de obligatorios (RF-RNK-05)',
    tone: 'ok',
  },
  risk: {
    tag: 'ESTÁS EN ZONA DE RIESGO',
    sub: 'P10 · obligatorios sin cerrar — tu regularidad está en juego (RF-RNK-06)',
    tone: 'risk',
  },
  outside: {
    tag: 'SIN PUESTO',
    sub: 'No figurás en esta cohorte todavía',
    tone: 'info',
  },
  inactive: {
    tag: 'PERCENTILES INACTIVOS',
    sub: 'La cohorte aún no llega a 10 inscriptos (RF-RNK-09)',
    tone: 'info',
  },
};

/**
 * ALUMNO view (RF-RNK-03). Unified screen: there is NO podium. A single scrollable
 * list, all anonymized except the own row, where the academic status is the
 * protagonist:
 *  - PROMOCIÓN (green) → row in P90 that also has 0 historical lost lives and
 *    100 % of the mandatory items passed (RF-RNK-05). If it is in P90 without meeting both,
 *    it is shown as a regular student.
 *  - RIESGO (red) → row in P10 that did not pass all the mandatory items (RF-RNK-06).
 * It does not decide privacy: it renders what the adapter already trimmed.
 */
@Component({
  selector: 'app-ranking-table-student',
  imports: [AvatarSprite],
  template: `
    <!-- ══ YOUR STATUS ══ only appears if you are in PROMOCIÓN or in RIESGO ══ -->
    @if (view().me; as me) {
      @if (copy(); as c) {
        <button type="button" class="rk-status rk-status--{{ c.tone }}" (click)="select.emit(me)">
          <span class="rk-status__pos">
            <span class="rk-status__pos-num tabular">{{ pad(me.position) }}</span>
            <span class="rk-status__pos-tot">/ {{ view().totalEnrolled }}</span>
          </span>
          <span class="rk-status__body">
            <span class="rk-status__tag">{{ c.tag }}</span>
            <span class="rk-status__sub">{{ c.sub }}</span>
          </span>
          <span class="rk-status__pctil">P{{ me.percentile }}</span>
        </button>
      }
    } @else if (copy(); as c) {
      <div class="rk-status rk-status--info">
        <span class="rk-status__body">
          <span class="rk-status__tag">{{ c.tag }}</span>
          <span class="rk-status__sub">{{ c.sub }}</span>
        </span>
      </div>
    }

    <!-- ══ Header + full cohort (anonymous except your row) ══ -->
    <div class="rk-head">
      <span style="text-align:center">POS</span><span>Estudiante</span>
      <span style="text-align:center">Pctil</span><span style="text-align:center">Nivel</span>
      <span style="text-align:right">XP</span>
    </div>

    @if (!view().cutoffs) {
      <div class="rk-divider">
        <span class="rk-divider__bar"></span>
        <span class="rk-divider__label">PERCENTILES INACTIVOS (RF-RNK-09)</span>
        <span class="rk-divider__bar"></span>
      </div>
    }

    @for (f of rows(); track f.position) {
      <!-- Closes the promotion zone: goes between the last P90 row and the first regular one. -->
      @if (p90Cutoff() === f.position) {
        <div class="rk-divider rk-divider--up">
          <span class="rk-divider__bar"></span>
          <span class="rk-divider__label">ZONA DE PROMOCIÓN · P90</span>
          <span class="rk-divider__bar"></span>
        </div>
      }
      @if (firstP10() === f.position) {
        <div class="rk-divider rk-divider--down">
          <span class="rk-divider__bar"></span>
          <span class="rk-divider__label">ZONA DE RIESGO · P10</span>
          <span class="rk-divider__bar"></span>
        </div>
      }
      <div
        class="rk-row"
        [id]="isMe(f) ? 'rk-me-row' : null"
        [class.rk-row--promo]="qualifiesForPromotion(f)"
        [class.rk-row--risk]="inRisk(f)"
        [class.rk-row--me]="isMe(f)"
        (click)="select.emit(f)"
      >
        <span class="rk-row__pos tabular">{{ f.position }}</span>
        <span style="display:flex;align-items:center;gap:0.5rem;min-width:0">
          <ui-avatar-sprite class="rk-row__avatar" [config]="f.avatar" [height]="52" />
          <span style="min-width:0">
            <span class="rk-row__name" style="display:block">{{ label(f) }}</span>
            @if (qualifiesForPromotion(f)) {
              <span class="rk-tag rk-tag--promo">PROMOCIÓN</span>
            } @else if (inRisk(f)) {
              <span class="rk-tag rk-tag--risk">RIESGO</span>
            }
            @if (isMe(f)) {
              <span class="ui-font" style="font-size:0.7rem;opacity:0.7;display:block"
                >Legajo {{ fileNumber(f) }}</span
              >
            }
          </span>
        </span>
        <span class="rk-row__cell">P{{ f.percentile }}</span>
        <span class="rk-row__cell rk-row__lv">Lv {{ f.nodeLevel }}</span>
        <span class="rk-row__xp tabular">{{ f.xpTotal }}</span>
      </div>
    }
  `,
})
export class StudentRankingTable {
  readonly view = input.required<StudentRankingView>();
  readonly select = output<RankingRow | RankingAnonRow>();

  /** Status of the own row — `null` = regular student, no banner. */
  protected readonly status = computed<ZoneStatus | null>(() => {
    const v = this.view();
    const me = v.me;
    if (!me) return 'outside';
    if (!v.cutoffs) return 'inactive';
    if (isCandidatePromotion(me)) return 'promotion';
    if (inRiskRegularity(me)) return 'risk';
    return null;
  });
  protected readonly copy = computed(() => {
    const e = this.status();
    return e ? COPY[e] : null;
  });

  /** Full cohort with scroll — untrimmed (there is no longer a podium absorbing the top). */
  protected readonly rows = computed<ListRow[]>(() => this.view().list);

  /**
   * Position of the first row OUTSIDE P90 — that is where the divider that closes the
   * promotion zone is drawn (it sits between the promoted and the regular ones). -1 if the
   * percentiles are not active.
   */
  protected readonly p90Cutoff = computed(() =>
    this.view().cutoffs
      ? (this.view().list.find((f) => f.zone !== 'p90')?.position ?? -1)
      : -1,
  );

  /** Position of the first row in the P10 zone, for the risk divider. */
  protected readonly firstP10 = computed(
    () => this.view().list.find((f) => f.zone === 'p10')?.position ?? -1,
  );

  /** RF-RNK-05: P90 + 0 historical lost lives + 100 % of mandatory items. */
  protected qualifiesForPromotion(f: ListRow): boolean {
    return isCandidatePromotion(f);
  }

  /** RF-RNK-06: P10 + unfinished mandatory items. */
  protected inRisk(f: ListRow): boolean {
    return inRiskRegularity(f);
  }

  protected isMe(f: ListRow): boolean {
    return isIdentified(f);
  }

  protected label(f: ListRow): string {
    return isIdentified(f) ? `${f.name} ${f.lastName} · vos` : f.pseudonym;
  }

  protected fileNumber(f: ListRow): string {
    return isIdentified(f) ? f.fileNumber : '';
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}
