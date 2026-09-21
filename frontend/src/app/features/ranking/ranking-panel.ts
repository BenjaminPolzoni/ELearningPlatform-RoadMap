import { Component, computed, HostListener, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RankingDataPort } from '../../core/data/ranking-data.port';
import { RankingRow, RankingAnonRow } from '../../core/data/ranking.models';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { StudentRankingTable } from './student-ranking-table';
import { StaffRankingTable } from './staff-ranking-table';
import { RankingDetail } from './ranking-detail';

/**
 * Arcade cabinet of the ranking (E8). Asks the `RankingDataPort` for the view and shows the one that
 * corresponds to the session role (the adapter already trimmed it — nothing is filtered here):
 *  - ALUMNO  → unified anonymized list, own row and P90/P10 cutoffs (RF-RNK-03).
 *  - PROFESOR/ADMIN → full identified table to audit the closing (RF-RNK-10).
 * Clicking a row opens the detail with the visibility that row already carries (RF-RNK-07).
 */
@Component({
  selector: 'app-ranking-panel',
  imports: [StudentRankingTable, StaffRankingTable, RankingDetail],
  template: `
    <div class="rk-backdrop" (click)="close.emit()">
      <aside
        class="rk-cabinet"
        role="dialog"
        aria-modal="true"
        aria-label="Ranking de la cohorte"
        (click)="$event.stopPropagation()"
      >
        <span class="rk-cabinet__scanlines" aria-hidden="true"></span>

        @if (!selection()) {
          <button
            class="rk-close"
            (click)="close.emit()"
            aria-label="Cerrar (ESC)"
            title="Cerrar (ESC)"
          ></button>
        }

        @if (selection()) {
          <header class="rk-marquee rk-marquee--back">
            <button class="rk-chip rk-marquee__back" (click)="selection.set(null)">VOLVER</button>
            <span class="rk-marquee__word">INFO</span>
          </header>
        } @else {
          <header class="rk-marquee">
            <span class="rk-marquee__bulbs" aria-hidden="true"></span>
            <span class="rk-marquee__word">RANKING</span>
          </header>
        }

        <div class="rk-screen">
          @if (loading()) {
            <p
              class="console-font rk-neon-success"
              style="text-align:center;font-size:1.4rem;letter-spacing:0.2em;padding:3rem 0"
            >
              CONECTANDO<span class="rk-blink">…</span>
            </p>
          } @else if (view(); as v) {
            @if (selection(); as sel) {
              <app-ranking-detail [row]="sel" [total]="totalEnrolled()" />
            } @else if (v.role === 'ALUMNO') {
              <app-ranking-table-student [view]="v" (select)="selection.set($event)" />
            } @else {
              <app-ranking-table-staff [view]="v" (select)="selection.set($event)" />
            }
          } @else {
            <p
              class="console-font"
              style="color:var(--rk-magenta);text-align:center;padding:2rem 0"
            >
              SIN DATOS
            </p>
          }
        </div>

        <footer class="rk-deck">
          <span class="rk-joystick" aria-hidden="true"></span>
          @if (!selection() && viewStudentWithYo(); as yo) {
            <button
              class="rk-deck__text rk-deck__text--btn rk-neon-success"
              (click)="scrollToMyRow()"
              title="Ir a tu fila en la lista"
            >
              &#9654; IR A TU POSICIÓN · {{ pad(yo.position) }}/{{ totalEnrolled() }}
            </button>
          } @else {
            <span class="rk-deck__text rk-neon-success">INSERT COIN · PRESS START</span>
          }
          <span style="display:flex;gap:0.55rem;flex-shrink:0">
            <span class="rk-btn-round rk-btn-round--a" aria-hidden="true"></span>
            <button
              class="rk-btn-round rk-btn-round--b"
              (click)="close.emit()"
              aria-label="Cerrar"
              title="Cerrar"
            ></button>
          </span>
        </footer>
      </aside>
    </div>
  `,
  styles: `
    .rk-blink {
      animation: rk-blink 1s steps(2, start) infinite;
    }
    @keyframes rk-blink {
      50% {
        opacity: 0.15;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .rk-blink {
        animation: none;
      }
    }
  `,
})
export class RankingPanel {
  readonly close = output<void>();

  private readonly data = inject(RankingDataPort);

  protected readonly view = toSignal(this.data.getRanking(COURSE_SEED_ID));
  protected readonly loading = computed(() => this.view() === undefined);
  protected readonly selection = signal<RankingRow | RankingAnonRow | null>(null);

  /** The student's own row if the session is ALUMNO and is in the cohort; otherwise `null`. */
  protected readonly viewStudentWithYo = computed(() => {
    const v = this.view();
    return v && v.role === 'ALUMNO' ? v.yo : null;
  });
  protected readonly totalEnrolled = computed(() => this.view()?.totalEnrolled ?? 0);

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Scrolls the screen to the student's own row (id `rk-yo-row`). */
  protected scrollToMyRow(): void {
    const ir = () =>
      document.getElementById('rk-yo-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (this.selection()) {
      this.selection.set(null); // go back to the table if we came from the detail
      setTimeout(ir, 60);
    } else {
      ir();
    }
  }

  /** Escape: from the detail it goes back to the table; from the table it closes. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.selection()) {
      this.selection.set(null);
    } else {
      this.close.emit();
    }
  }
}
