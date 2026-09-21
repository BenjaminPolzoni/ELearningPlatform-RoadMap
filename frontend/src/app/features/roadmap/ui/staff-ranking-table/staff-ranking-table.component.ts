import { Component, input, output } from '@angular/core';
import { RankingRow, StaffRankingView } from '../../data-access/ranking/ranking.models';
import { inRiskRegularity, isCandidatePromotion } from '../../domain/ranking/ranking.rules';
import { AvatarSpriteComponent } from '../avatar-sprite/avatar-sprite.component';

/**
 * PROFESOR view (RF-RNK-10): dense, identified table with no anonymity, with the
 * minimum columns to scan the cohort — position, student, file number, percentile, XP, historical
 * lost lives and the suggested status (promotion candidate RF-RNK-05 / regularity
 * risk RF-RNK-06). The rest (current node, badges, exercises, % of mandatory)
 * lives in the "INFO" detail on clicking the row, so as not to overflow the cabinet's
 * CRT screen.
 */
@Component({
  selector: 'app-staff-ranking-table',
  imports: [AvatarSpriteComponent],
  template: `
    <div class="staff-scroll">
      <table class="staff">
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align:left">Alumno</th>
            <th style="text-align:left">Legajo</th>
            <th title="Percentil dentro de la cohorte">Pctl</th>
            <th style="text-align:right">XP</th>
            <th title="Vidas perdidas históricas">
              <span class="rk-ico rk-ico--heartbreak" aria-hidden="true"></span>
            </th>
            <th style="text-align:left">Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (f of view().rows; track f.studentId) {
            <tr
              [class.up]="f.zone === 'p90'"
              [class.down]="f.zone === 'p10'"
              [class.promo]="candidate(f)"
              [class.risk]="isAtRisk(f)"
              (click)="select.emit(f)"
            >
              <td class="tabular">{{ f.position }}</td>
              <td class="staff__student">
                <div class="staff__identity">
                  <app-avatar-sprite class="rk-row__avatar" [config]="f.avatar" [height]="43" />
                  <b class="staff__name">{{ f.name }} {{ f.lastName }}</b>
                </div>
              </td>
              <td class="staff__file-number">{{ f.fileNumber }}</td>
              <td class="tabular">P{{ f.percentile }}</td>
              <td class="tabular" style="text-align:right;color:var(--rk-yellow)">
                {{ f.xpTotal }}
              </td>
              <td class="tabular">{{ f.lostLives }}</td>
              <td style="text-align:left">
                @if (candidate(f)) {
                  <span class="tag tag--ok">promoción</span>
                } @else if (isAtRisk(f)) {
                  <span class="tag tag--risk">riesgo</span>
                } @else {
                  <span style="opacity:0.4">—</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .staff-scroll {
      overflow-x: auto;
    }
    .staff {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-console);
      font-size: 1.05rem;
      color: var(--rk-ink);
    }
    /* headers in VT323: the labels are words ("Alumno", "Estado"),
       in Press Start 2P at this size they were not readable. */
    .staff th {
      font-family: var(--font-console);
      font-size: 1rem;
      line-height: 1.2;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
      color: var(--rk-cyan);
      padding: 0.5rem 0.6rem;
      border-bottom: 2px solid var(--rk-cyan);
      background: var(--rk-bg2);
      white-space: nowrap;
    }
    .staff td {
      text-align: center;
      padding: 0.5rem 0.5rem;
      border-bottom: 1px solid var(--rk-bg3);
      cursor: pointer;
    }
    /* Student + file number: two left-aligned columns so each
       name faces its file number and both read effortlessly. */
    .staff__student {
      text-align: left;
    }
    .staff__identity {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .staff__identity .rk-row__avatar {
      width: 28px;
      height: 28px;
      flex: none;
    }
    .staff__name {
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .staff__file-number {
      text-align: left;
      /* Audit data, not the protagonist of the row: small so as not to compete
         with the student's name. */
      font-family: var(--font-ui);
      font-size: 0.55rem;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      color: var(--rk-cyan);
      white-space: nowrap;
    }
    /* numeric data in Press Start 2P; the student's name stays in VT323 (base cell) */
    .staff td.tabular {
      font-family: var(--font-title);
      font-size: 0.8rem;
      line-height: 1.5;
    }
    .staff tbody tr:hover {
      background: var(--rk-bg3);
    }
    .staff tr.up td:first-child {
      color: var(--rk-green);
    }
    .staff tr.down td:first-child {
      color: var(--rk-magenta);
    }
    .tag {
      font-family: var(--font-title);
      font-size: 0.42rem;
      letter-spacing: 0.08em;
      padding: 0.3rem 0.45rem;
      border: 2px solid currentColor;
      border-radius: 2px;
      white-space: nowrap;
    }
    .tag--ok {
      color: var(--rk-green);
      text-shadow: 0 0 6px rgba(57, 255, 136, 0.6);
    }
    .tag--risk {
      color: var(--rk-magenta);
      text-shadow: 0 0 6px rgba(255, 46, 147, 0.6);
    }
    /* Neon row, same as the student's list (.rk-row--promo / --riesgo):
       faint background + side bar + glow. In a table with border-collapse the
       box-shadow of the <tr> does not paint, so the bloom goes as drop-shadow. */
    .staff tbody tr.promo {
      background: rgba(57, 255, 136, 0.09);
      filter: drop-shadow(0 0 8px rgba(57, 255, 136, 0.35));
    }
    .staff tbody tr.promo:hover {
      background: rgba(57, 255, 136, 0.16);
    }
    .staff tbody tr.promo td {
      border-bottom-color: rgba(57, 255, 136, 0.4);
    }
    .staff tbody tr.promo td:first-child {
      box-shadow: inset 5px 0 0 var(--rk-green);
      color: var(--rk-green);
    }
    .staff tbody tr.risk {
      background: rgba(255, 46, 147, 0.09);
      filter: drop-shadow(0 0 8px rgba(255, 46, 147, 0.35));
    }
    .staff tbody tr.risk:hover {
      background: rgba(255, 46, 147, 0.16);
    }
    .staff tbody tr.risk td {
      border-bottom-color: rgba(255, 46, 147, 0.4);
    }
    .staff tbody tr.risk td:first-child {
      box-shadow: inset 5px 0 0 var(--rk-magenta);
      color: var(--rk-magenta);
    }
  `,
})
export class StaffRankingTableComponent {
  readonly view = input.required<StaffRankingView>();
  readonly select = output<RankingRow>();

  protected candidate = isCandidatePromotion;
  protected isAtRisk = inRiskRegularity;
}
