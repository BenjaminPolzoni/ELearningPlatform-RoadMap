import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Actividad, EstadoNodo, TipoNodo } from '../../core/data/roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { Hud } from '../../shared/ui/hud';

interface Casillero {
  a: Actividad;
  i: number;
  x: number;
  y: number;
  estado: EstadoNodo;
  alcanzable: boolean;
}

// Serpentina de 4 columnas: fallback para actividades sin posición propia (no debería
// pasar en la práctica — el adapter les asigna una default al crearlas — pero cubre datos
// viejos de localStorage de antes de este editor).
const COLS = 4;
const CW = 168;
const CH = 138;
const X0 = 104;
const Y0 = 96;
const LADO = 72; // lado del casillero
const MARGEN_TABLERO = 90; // aire alrededor del bounding box de los nodos posicionados

/** Duración de un tramo de caminata, en ms. */
const MS_POR_TRAMO = 420;

function posicionSerpentina(indice: number): { x: number; y: number } {
  const fila = Math.floor(indice / COLS);
  const enFila = indice % COLS;
  const col = fila % 2 === 0 ? enFila : COLS - 1 - enFila;
  return { x: X0 + col * CW, y: Y0 + fila * CH };
}

const GLIFO: Record<TipoNodo, string> = {
  teoria: '≡',
  practica: '▤',
  desafio: '◆',
  boss: '★',
  hito: '❖',
};

/**
 * Tablero interno de una unidad (05-design-system.md §5) — tablero plano estilo Mario 3:
 * casilleros unidos por caminos ortogonales, recorridos por el **avatar personalizado**
 * del alumno, que camina de nodo en nodo en vez de teletransportarse.
 *
 * SVG y no canvas a propósito: cada casillero es un elemento del DOM, con foco, rol y
 * `aria-label` (05 §5/§7).
 *
 * Las posiciones son las que el profesor definió en el editor gráfico (`posicion_x`/
 * `posicion_y`, ver `features/profesor/nodo-canvas.ts`) — la serpentina de acá abajo es
 * solo el fallback para una actividad que por lo que sea no tenga posición propia
 * (deuda-tecnica/tarea-deuda-05-design-system.md #1, ya pagada).
 */
@Component({
  selector: 'app-unidad-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, Hud, RouterLink, UpperCasePipe],
  host: { class: 'block w-full' },
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .casillero:focus-visible {
      outline: none;
    }
    .casillero:focus-visible .foco {
      stroke: #f3eaff;
      stroke-width: 3;
      stroke-dasharray: 5 4;
    }
  `,
  template: `
    @if (unidad(); as u) {
      <div class="relative overflow-hidden border-2 border-secondary bg-brand-night chaflan w-full max-w-6xl mx-auto shadow-2xl">
        <!-- marco doble estilo consola: el tablero vive adentro de un cartucho -->
        <div class="border-4 border-primary/30 p-1">
          <svg
            [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto()"
            class="block w-full"
            [style.max-height.px]="680"
            role="application"
            [attr.aria-label]="'Tablero de la unidad ' + u.nombre"
          >
            <defs>
              <!-- suelo del tablero: trama de puntos, el equivalente al arenal de la referencia -->
              <pattern id="trama" width="16" height="16" patternUnits="userSpaceOnUse">
                <rect width="16" height="16" fill="#241046" />
                <circle cx="4" cy="4" r="1.4" fill="#3A1568" />
                <circle cx="12" cy="12" r="1.4" fill="#3A1568" />
              </pattern>
              <filter id="neon-t" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect [attr.width]="ancho()" [attr.height]="alto()" fill="url(#trama)" />

            <!-- decorado determinista: cristales del paisaje, fuera de los caminos -->
            <g class="pixelado" opacity="0.75">
              @for (d of decorado(); track $index) {
                <polygon
                  [attr.points]="
                    d.x + ',' + (d.y - d.h) + ' ' + (d.x + d.w) + ',' + d.y + ' ' + (d.x - d.w) + ',' + d.y
                  "
                  [attr.fill]="d.color"
                  opacity="0.55"
                />
              }
            </g>

            <!-- caminos ortogonales entre casilleros consecutivos -->
            <g stroke-linecap="butt">
              @for (t of tramos(); track t.id) {
                <line
                  [attr.x1]="t.x1"
                  [attr.y1]="t.y1"
                  [attr.x2]="t.x2"
                  [attr.y2]="t.y2"
                  [attr.stroke]="t.color"
                  stroke-width="16"
                  opacity="0.9"
                />
                <line
                  [attr.x1]="t.x1"
                  [attr.y1]="t.y1"
                  [attr.x2]="t.x2"
                  [attr.y2]="t.y2"
                  stroke="#190236"
                  stroke-width="16"
                  stroke-dasharray="2 14"
                  opacity="0.35"
                />
              }
            </g>

            <!-- casilleros -->
            @for (c of casilleros(); track c.a.id) {
              <g
                class="casillero"
                [class.cursor-pointer]="c.alcanzable"
                [attr.tabindex]="c.alcanzable ? 0 : -1"
                role="button"
                [attr.aria-label]="etiqueta(c)"
                [attr.aria-disabled]="!c.alcanzable"
                (click)="ir(c)"
                (keydown.enter)="ir(c)"
                (keydown.space)="ir(c)"
              >
                <!-- sombra dura de 4px: da el relieve de sprite sobre el suelo -->
                <rect
                  [attr.x]="c.x - LADO / 2 + 4"
                  [attr.y]="c.y - LADO / 2 + 4"
                  [attr.width]="LADO"
                  [attr.height]="LADO"
                  fill="#0E0120"
                  opacity="0.6"
                />
                <rect
                  [attr.x]="c.x - LADO / 2"
                  [attr.y]="c.y - LADO / 2"
                  [attr.width]="LADO"
                  [attr.height]="LADO"
                  [attr.fill]="relleno(c.estado)"
                  [attr.stroke]="c.estado === 'bloqueado' ? '#190236' : '#F3EAFF'"
                  stroke-width="3"
                  [attr.filter]="c.estado === 'habilitado' ? 'url(#neon-t)' : null"
                />
                <rect
                  class="foco"
                  [attr.x]="c.x - LADO / 2 - 5"
                  [attr.y]="c.y - LADO / 2 - 5"
                  [attr.width]="LADO + 10"
                  [attr.height]="LADO + 10"
                  fill="none"
                  stroke="none"
                />
                <text
                  [attr.x]="c.x"
                  [attr.y]="c.y + 9"
                  text-anchor="middle"
                  font-size="26"
                  [attr.fill]="c.estado === 'bloqueado' ? '#7A66A0' : '#FFFFFF'"
                >
                  {{ glifo(c) }}
                </text>
                <text
                  [attr.x]="c.x"
                  [attr.y]="c.y + LADO / 2 + 18"
                  text-anchor="middle"
                  font-size="11"
                  [attr.fill]="c.estado === 'bloqueado' ? '#8A76B0' : '#F3EAFF'"
                  style="font-family: var(--font-title)"
                >
                  {{ c.a.nombre }}
                </text>
                @if (c.a.esObligatorio) {
                  <circle [attr.cx]="c.x + LADO / 2 - 4" [attr.cy]="c.y - LADO / 2 + 4" r="5" fill="#FF2758" />
                }
              </g>
            }

            <!-- avatar caminando: su posición es una interpolación, no la del casillero -->
            <g
              [attr.transform]="'translate(' + pos().x + ',' + pos().y + ')'"
              class="pointer-events-none"
              style="transition: none"
            >
              <foreignObject x="-20" y="-62" width="40" height="66">
                <ui-avatar-sprite
                  [config]="avatarSrv.avatar()"
                  [alto]="58"
                  [sombra]="true"
                  [caminando]="caminando()"
                  [mirando]="mirando()"
                />
              </foreignObject>
            </g>
          </svg>
        </div>

        <!-- HUD flotante, en la misma posición que en el mapa general -->
        <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div class="pointer-events-auto"><ui-hud [xp]="xp()" [vidas]="vidas()" /></div>
          <a
            routerLink="/alumno"
            class="btn btn-sm btn-outline btn-primary ui-font pointer-events-auto text-[8px]"
          >
            ◀ VOLVER AL MAPA
          </a>
        </div>

        <!-- barra de estado estilo consola -->
        <div
          class="ui-font flex items-center gap-4 border-t-2 border-secondary bg-base-100 px-4 py-2 text-[9px]"
        >
          <span class="text-primary">UNIDAD {{ u.orden }}</span>
          <span class="text-accent">{{ u.nombre }}</span>
          <span class="tabular opacity-70">{{ hechas() }}/{{ casilleros().length }} COMPLETADAS</span>
          <span class="ml-auto tabular opacity-50">XP {{ xp() }}</span>
        </div>
      </div>

      <!-- ficha del casillero seleccionado -->
      @if (sel(); as c) {
        <div class="chaflan mt-4 border-2 border-primary bg-base-200 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="title-font text-lg text-primary">{{ c.a.nombre }}</h3>
              <p class="ui-font mt-1 text-[8px] text-accent">
                {{ c.a.tipo | uppercase }}
                @if (c.a.dificultad) {
                  · {{ c.a.dificultad }}
                }
                @if (c.a.modalidad) {
                  · {{ c.a.modalidad | uppercase }}
                }
                · {{ c.a.reintentosPermitidos }} REINTENTOS
              </p>
            </div>
            <button class="btn btn-ghost btn-xs" (click)="sel.set(null)" aria-label="Cerrar ficha">✕</button>
          </div>
          @if (c.a.descripcion) {
            <p class="mt-3 text-sm opacity-80">{{ c.a.descripcion }}</p>
          }
          @if (c.a.recurso) {
            <a [href]="c.a.recurso" target="_blank" rel="noopener" class="link link-accent mt-2 block text-sm">
              Abrir material ↗
            </a>
          }
          <button class="btn btn-primary btn-sm ui-font mt-4 text-[8px]" [disabled]="c.estado !== 'habilitado'">
            {{ c.estado === 'completado' ? '✓ YA COMPLETADA' : '▶ COMENZAR' }}
          </button>
        </div>
      }
    } @else {
      <p class="opacity-70">Esa unidad no existe.</p>
    }
  `,
})
export class UnidadMapa {
  /** Viene del router (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly avatarSrv = inject(AvatarService);
  private readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);
  private readonly destroyRef = inject(DestroyRef);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly LADO = LADO;
  protected readonly sel = signal<Casillero | null>(null);
  protected readonly xp = computed(() => this.progreso()?.xpTotal ?? 0);
  protected readonly vidas = computed(() => this.progreso()?.vidasVigentes ?? 0);

  protected readonly unidad = computed(() => this.store.unidadPorId(this.id()));

  protected readonly casilleros = computed<Casillero[]>(() => {
    const u = this.unidad();
    if (!u) return [];
    const estados = new Map((this.progreso()?.nodos ?? []).map((n) => [n.nodoId, n.estado]));

    const items = u.actividades.map((a, i): Casillero => {
      const serpentina = posicionSerpentina(i);
      return {
        a,
        i,
        x: typeof a.posicionX === 'number' ? a.posicionX : serpentina.x,
        y: typeof a.posicionY === 'number' ? a.posicionY : serpentina.y,
        estado: estados.get(a.id) ?? 'bloqueado',
        alcanzable: false,
      };
    });

    // Movimiento lineal (05 §5): se llega hasta el primer nodo no completado, no más allá.
    const frente = items.findIndex((c) => c.estado !== 'completado');
    const tope = frente === -1 ? items.length - 1 : frente;
    items.forEach((c) => (c.alcanzable = c.i <= tope));
    return items;
  });

  protected readonly hechas = computed(
    () => this.casilleros().filter((c) => c.estado === 'completado').length,
  );

  // Bounding box de los nodos ya posicionados + margen — crece solo si el profesor arrastra
  // uno más allá del encuadre por defecto (mismo criterio que `Mapa.encuadreBase`).
  protected readonly ancho = computed(() => {
    const xs = this.casilleros().map((c) => c.x);
    return Math.max(X0 * 2, ...xs) + MARGEN_TABLERO;
  });
  protected readonly alto = computed(() => {
    const ys = this.casilleros().map((c) => c.y);
    return Math.max(Y0 * 2, ...ys) + MARGEN_TABLERO;
  });

  protected readonly tramos = computed(() => {
    const cs = this.casilleros();
    return cs.slice(0, -1).map((a, i) => {
      const b = cs[i + 1];
      return {
        id: `${a.a.id}->${b.a.id}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        color: a.estado === 'completado' ? 'var(--color-node-done)' : 'var(--color-node-locked)',
      };
    });
  });

  /**
   * Cristales de fondo. Deterministas por índice, y confinados a la franja que queda
   * **entre** dos filas de casilleros: si se los dejara caer en cualquier lado tapan
   * casilleros y rótulos, que es justo lo que tiene que quedar legible.
   */
  protected readonly decorado = computed(() => {
    const filas = Math.max(1, Math.ceil(this.casilleros().length / COLS));
    const W = this.ancho();
    const colores = ['#6B21C9', '#8B3DF5', '#FF2758'];
    const carriles = Math.max(1, filas);

    return Array.from({ length: carriles * 5 }, (_, i) => {
      const r1 = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin(i * 31.416) * 43758.5453) % 1;
      const carril = i % carriles;
      return {
        x: 44 + r1 * (W - 88),
        // el carril arranca debajo del rótulo de la fila y termina antes de la siguiente
        y: Y0 + carril * CH + LADO / 2 + 46 + r2 * 34,
        w: 7 + r2 * 9,
        h: 14 + r1 * 20,
        color: colores[i % colores.length],
      };
    });
  });

  // ---------- caminata del avatar ----------

  private readonly indiceAvatar = signal(0);
  protected readonly pos = signal<{ x: number; y: number }>({ x: X0, y: Y0 });
  protected readonly caminando = signal(false);
  protected readonly mirando = signal<'derecha' | 'izquierda'>('derecha');
  private raf = 0;

  constructor() {
    // Al abrir la unidad (o si cambia el progreso) el avatar aparece parado en el frente.
    effect(() => {
      const cs = this.casilleros();
      if (cs.length === 0) return;
      const frente = cs.findIndex((c) => c.estado !== 'completado');
      const destino = frente === -1 ? cs.length - 1 : frente;
      if (this.raf === 0) {
        this.indiceAvatar.set(destino);
        this.pos.set({ x: cs[destino].x, y: cs[destino].y });
      }
    });

    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.raf));
  }

  protected ir(c: Casillero): void {
    if (!c.alcanzable) return;
    this.sel.set(c);
    if (c.i !== this.indiceAvatar()) this.caminar(c.i);
  }

  /**
   * Camina tramo a tramo hasta el casillero destino. Se pasa por cada nodo intermedio en
   * vez de ir en línea recta: los tramos consecutivos son ortogonales, así que recorrerlos
   * uno por uno es exactamente seguir el camino dibujado.
   */
  private caminar(destino: number): void {
    cancelAnimationFrame(this.raf);
    const cs = this.casilleros();
    const paso = destino > this.indiceAvatar() ? 1 : -1;

    const siguiente = (): void => {
      const actual = this.indiceAvatar();
      if (actual === destino) {
        this.caminando.set(false);
        this.raf = 0;
        return;
      }
      const desde = cs[actual];
      const hasta = cs[actual + paso];
      if (!desde || !hasta) {
        this.caminando.set(false);
        this.raf = 0;
        return;
      }

      this.caminando.set(true);
      if (hasta.x !== desde.x) this.mirando.set(hasta.x > desde.x ? 'derecha' : 'izquierda');
      const t0 = performance.now();

      const tick = (t: number): void => {
        const k = Math.min(1, (t - t0) / MS_POR_TRAMO);
        this.pos.set({
          x: desde.x + (hasta.x - desde.x) * k,
          y: desde.y + (hasta.y - desde.y) * k,
        });
        if (k < 1) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.indiceAvatar.set(actual + paso);
          siguiente();
        }
      };
      this.raf = requestAnimationFrame(tick);
    };

    siguiente();
  }

  // ---------- presentación ----------

  protected relleno(e: EstadoNodo): string {
    return e === 'completado'
      ? 'var(--color-node-done)'
      : e === 'habilitado'
        ? 'var(--color-node-open)'
        : e === 'fallado'
          ? 'var(--color-node-failed)'
          : 'var(--color-node-locked)';
  }

  /** Estado + tipo, siempre por ícono además de por color (05 §7). */
  protected glifo(c: Casillero): string {
    if (c.estado === 'bloqueado') return '🔒';
    if (c.estado === 'completado') return '✓';
    if (c.estado === 'fallado') return '✕';
    return GLIFO[c.a.tipo];
  }

  protected etiqueta(c: Casillero): string {
    return `${c.a.nombre}, ${c.a.tipo}, ${c.estado}${c.a.esObligatorio ? ', obligatoria' : ''}`;
  }
}
