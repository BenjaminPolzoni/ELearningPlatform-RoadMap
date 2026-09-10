import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Unidad } from '../../core/data/roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { Lives } from './lives';

type EstadoIsla = 'bloqueada' | 'disponible' | 'completada';
interface Isla {
  u: Unidad;
  cx: number;
  cy: number;
  estado: EstadoIsla;
  aqui: boolean;
}

// Layout serpenteante: 4 islas por fila, la dirección se invierte fila a fila.
const POR_FILA = 4;
const DX = 210;
const DY = 150;
const X0 = 110;
const Y0 = 90;

/**
 * Mapa de islas del alumno (E2, Fase 1). Placeholder SVG del engine 2.5D real (three.js,
 * Squad Engine) — mismo dato (`RoadmapStore`), misma lógica de estado; cuando exista el
 * engine se reemplaza solo esta vista. Con `[preview]="true"` se embebe en el editor sin
 * panel de detalle ni estados por alumno.
 */
@Component({
  selector: 'app-mapa',
  imports: [Lives],
  template: `
    @if (!preview()) {
      <div class="flex items-baseline gap-4 mb-4">
        <h2 class="title-font text-primary text-xs">MAPA DEL CURSO</h2>
        <span class="ui-font opacity-80 inline-flex items-baseline gap-4">
          <span>XP <b class="tabular text-warning">{{ xp() }}</b></span>
          <span class="inline-flex items-center gap-2">vidas <app-lives [current]="vidas()" /></span>
        </span>
      </div>
    }

    <svg [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto()" class="w-full max-w-4xl block">
      <polyline
        [attr.points]="camino()"
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="3"
        stroke-dasharray="4 8"
        opacity="0.45"
      />
      @for (isla of islas(); track isla.u.id) {
        <g
          [class.cursor-pointer]="!preview()"
          (click)="!preview() && sel.set(isla.u)"
        >
          <rect
            [attr.x]="isla.cx - 30"
            [attr.y]="isla.cy - 30"
            width="60"
            height="60"
            [attr.transform]="'rotate(45 ' + isla.cx + ' ' + isla.cy + ')'"
            [attr.fill]="relleno(isla.estado)"
            [attr.stroke]="isla.aqui ? 'var(--color-secondary)' : 'var(--color-base-content)'"
            [attr.stroke-width]="isla.aqui ? 4 : 2"
          />
          <text
            [attr.x]="isla.cx"
            [attr.y]="isla.cy + 6"
            text-anchor="middle"
            font-size="20"
          >{{ icono(isla.estado) }}</text>
          <text
            [attr.x]="isla.cx"
            [attr.y]="isla.cy + 58"
            text-anchor="middle"
            fill="var(--color-base-content)"
            font-size="13"
          >{{ isla.u.orden }}. {{ isla.u.nombre }}</text>
          @if (isla.aqui) {
            <text
              [attr.x]="isla.cx"
              [attr.y]="isla.cy - 46"
              text-anchor="middle"
              fill="var(--color-secondary)"
              font-size="11"
            >acá estás</text>
          }
        </g>
      }
    </svg>

    @if (!preview() && sel(); as u) {
      <div class="card bg-base-200 border-2 border-primary mt-6 max-w-2xl">
        <div class="card-body gap-3">
          <div class="flex items-baseline justify-between">
            <h3 class="title-font text-xs text-primary">{{ u.nombre }}</h3>
            <span class="ui-font opacity-70">se abre con {{ u.umbralXpDesbloqueo }} XP</span>
          </div>
          <ol class="flex flex-col gap-1">
            @for (a of u.actividades; track a.id) {
              <li class="flex items-center gap-2">
                <span class="badge badge-outline badge-sm ui-font">{{ a.tipo }}</span>
                <span>{{ a.nombre }}</span>
                @if (a.dificultad) {
                  <span class="badge badge-sm badge-primary badge-outline">{{ a.dificultad }}</span>
                }
                @if (a.esObligatorio) {
                  <span class="badge badge-warning badge-sm">obligatorio</span>
                }
              </li>
            } @empty {
              <li class="opacity-60">Sin actividades todavía.</li>
            }
          </ol>
        </div>
      </div>
    }
  `,
})
export class Mapa {
  readonly preview = input(false);

  private readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly sel = signal<Unidad | null>(null);
  protected readonly xp = computed(() => this.progreso()?.xpTotal ?? 0);
  protected readonly vidas = computed(() => this.progreso()?.vidasVigentes ?? 0);

  protected readonly islas = computed<Isla[]>(() => {
    const us = this.store.unidades();
    const prog = this.progreso();
    const completos = new Set(
      (prog?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );

    const items = us.map((u, i): Isla => {
      const row = Math.floor(i / POR_FILA);
      const inRow = i % POR_FILA;
      const col = row % 2 === 0 ? inRow : POR_FILA - 1 - inRow;
      const estado = this.preview()
        ? 'disponible'
        : this.estadoDe(u, completos, this.xp());
      return { u, cx: X0 + col * DX, cy: Y0 + row * DY, estado, aqui: false };
    });

    const aqui = items.find((it) => it.estado === 'disponible');
    if (aqui && !this.preview()) aqui.aqui = true;
    return items;
  });

  protected readonly ancho = computed(() => X0 * 2 + (POR_FILA - 1) * DX);
  protected readonly alto = computed(() => {
    const filas = Math.max(1, Math.ceil(this.islas().length / POR_FILA));
    return Y0 * 2 + (filas - 1) * DY;
  });
  protected readonly camino = computed(() =>
    this.islas().map((it) => `${it.cx},${it.cy}`).join(' '),
  );

  protected relleno(e: EstadoIsla): string {
    return e === 'completada'
      ? 'var(--color-node-done)'
      : e === 'disponible'
        ? 'var(--color-node-open)'
        : 'var(--color-node-locked)';
  }

  protected icono(e: EstadoIsla): string {
    return e === 'completada' ? '✓' : e === 'disponible' ? '◆' : '🔒';
  }

  private estadoDe(u: Unidad, completos: Set<string>, xp: number): EstadoIsla {
    const tieneNodos = u.actividades.length > 0;
    if (tieneNodos && u.actividades.every((a) => completos.has(a.id))) return 'completada';
    return xp >= u.umbralXpDesbloqueo ? 'disponible' : 'bloqueada';
  }
}
