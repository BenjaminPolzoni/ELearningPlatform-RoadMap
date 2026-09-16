import { Component, computed, HostListener, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RankingDataPort } from '../../core/data/ranking-data.port';
import { FilaRanking, FilaRankingAnon } from '../../core/data/ranking.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { RankingTablaAlumno } from './ranking-tabla-alumno';
import { RankingTablaStaff } from './ranking-tabla-staff';
import { RankingDetalle } from './ranking-detalle';

/**
 * Gabinete arcade del ranking (E8). Pide la vista al `RankingDataPort` y muestra la que
 * corresponda al rol de la sesión (el adapter ya la recortó — acá no se filtra nada):
 *  - ALUMNO  → lista unificada anonimizada, fila propia y cortes P90/P10 (RF-RNK-03).
 *  - PROFESOR/ADMIN → tabla identificada completa para auditar el cierre (RF-RNK-10).
 * Click en una fila abre el detalle con la visibilidad que ya trae esa fila (RF-RNK-07).
 */
@Component({
  selector: 'app-ranking-panel',
  imports: [RankingTablaAlumno, RankingTablaStaff, RankingDetalle],
  template: `
    <div class="rk-backdrop" (click)="cerrar.emit()">
      <aside
        class="rk-cabinet"
        role="dialog"
        aria-modal="true"
        aria-label="Ranking de la cohorte"
        (click)="$event.stopPropagation()"
      >
        <span class="rk-cabinet__scanlines" aria-hidden="true"></span>

        @if (!seleccion()) {
          <button
            class="rk-close"
            (click)="cerrar.emit()"
            aria-label="Cerrar (ESC)"
            title="Cerrar (ESC)"
          ></button>
        }

        @if (seleccion()) {
          <header class="rk-marquee rk-marquee--back">
            <button class="rk-chip rk-marquee__back" (click)="seleccion.set(null)">VOLVER</button>
            <span class="rk-marquee__word">INFO</span>
          </header>
        } @else {
          <header class="rk-marquee">
            <span class="rk-marquee__bulbs" aria-hidden="true"></span>
            <span class="rk-marquee__word">RANKING</span>
          </header>
        }

        <div class="rk-screen">
          @if (cargando()) {
            <p
              class="console-font rk-neon-success"
              style="text-align:center;font-size:1.4rem;letter-spacing:0.2em;padding:3rem 0"
            >
              CONECTANDO<span class="rk-blink">…</span>
            </p>
          } @else if (vista(); as v) {
            @if (seleccion(); as sel) {
              <app-ranking-detalle [fila]="sel" [total]="totalInscriptos()" />
            } @else if (v.rol === 'ALUMNO') {
              <app-ranking-tabla-alumno [vista]="v" (seleccionar)="seleccion.set($event)" />
            } @else {
              <app-ranking-tabla-staff [vista]="v" (seleccionar)="seleccion.set($event)" />
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
          @if (!seleccion() && vistaAlumnoConYo(); as yo) {
            <button
              class="rk-deck__text rk-deck__text--btn rk-neon-success"
              (click)="irAMiPuesto()"
              title="Ir a tu fila en la lista"
            >
              &#9654; IR A TU POSICIÓN · {{ pad(yo.posicion) }}/{{ totalInscriptos() }}
            </button>
          } @else {
            <span class="rk-deck__text rk-neon-success">INSERT COIN · PRESS START</span>
          }
          <span style="display:flex;gap:0.55rem;flex-shrink:0">
            <span class="rk-btn-round rk-btn-round--a" aria-hidden="true"></span>
            <button
              class="rk-btn-round rk-btn-round--b"
              (click)="cerrar.emit()"
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
  readonly cerrar = output<void>();

  private readonly data = inject(RankingDataPort);

  protected readonly vista = toSignal(this.data.getRanking(CURSO_SEED_ID));
  protected readonly cargando = computed(() => this.vista() === undefined);
  protected readonly seleccion = signal<FilaRanking | FilaRankingAnon | null>(null);

  /** Fila propia del alumno si la sesión es ALUMNO y está en la cohorte; si no, `null`. */
  protected readonly vistaAlumnoConYo = computed(() => {
    const v = this.vista();
    return v && v.rol === 'ALUMNO' ? v.yo : null;
  });
  protected readonly totalInscriptos = computed(() => this.vista()?.totalInscriptos ?? 0);

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** Lleva el scroll de la pantalla a la fila propia del alumno (id `rk-yo-row`). */
  protected irAMiPuesto(): void {
    const ir = () =>
      document.getElementById('rk-yo-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (this.seleccion()) {
      this.seleccion.set(null); // volver a la tabla si veníamos del detalle
      setTimeout(ir, 60);
    } else {
      ir();
    }
  }

  /** Escape: desde el detalle vuelve a la tabla; desde la tabla cierra. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.seleccion()) {
      this.seleccion.set(null);
    } else {
      this.cerrar.emit();
    }
  }
}
