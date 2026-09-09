import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Unidad } from '../../core/data/roadmap.models';
import {
  base,
  caja,
  camino,
  caraLateral,
  layoutIslas,
  proyectar,
  Punto,
  frac,
  rombo,
  TILE_H,
} from '../../core/iso/iso';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { Hud } from '../../shared/ui/hud';

type EstadoIsla = 'bloqueada' | 'disponible' | 'completada';

interface Isla {
  u: Unidad;
  /** Centro de la cara superior, ya proyectado a pantalla. */
  c: Punto;
  /** Centro sin la elevación aplicada — donde apoya la sombra sobre el piso. */
  piso: Punto;
  estado: EstadoIsla;
  actual: boolean;
  hechas: number;
  total: number;
}

// --- geometría de la isla, en px de pantalla ---
const SEMI_ANCHO = 86;
const SEMI_ALTO = 43;
const ESPESOR = 24;
const BASE_LARGO = 70;
const MARGEN = 90;

/**
 * Mapa 2.5D del curso (E2): cada unidad es una isla flotante en perspectiva isométrica,
 * unidas por caminos de neón que se colorean según el avance, con el avatar del alumno
 * parado sobre la unidad en la que está.
 *
 * Render en SVG con la matemática de `core/iso` — ver el comentario de cabecera de
 * `iso.ts` sobre por qué SVG y no three.js. Las posiciones **se calculan siempre**
 * (04-engine-2-5d.md §4): agregar la unidad 7 en el editor reflowea el mapa solo.
 *
 * Con `[preview]="true"` se embebe en el editor del profesor: encuadre completo, sin HUD,
 * sin paneo y sin estados por alumno.
 */
@Component({
  selector: 'app-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, Hud, RouterLink],
  host: { class: 'block' },
  styles: `
    :host {
      display: block;
    }
    .isla-hit:focus-visible {
      outline: none;
    }
    .isla-hit:focus-visible .isla-foco {
      stroke: #f3eaff;
      stroke-width: 3;
      stroke-dasharray: 6 4;
    }
  `,
  template: `
    <div
      class="escena-neon relative overflow-hidden border-2 border-secondary"
      [class.chaflan]="!preview()"
      [style.height.px]="preview() ? 300 : 620"
    >
      <svg
        #lienzo
        [attr.viewBox]="viewBox()"
        class="block h-full w-full select-none"
        [class.cursor-grab]="!preview() && !arrastrando()"
        [class.cursor-grabbing]="arrastrando()"
        (pointerdown)="tomar($event)"
        (pointermove)="mover($event)"
        (pointerup)="soltar($event)"
        (pointercancel)="soltar($event)"
        (wheel)="rueda($event)"
        [attr.role]="preview() ? 'img' : 'application'"
        [attr.aria-label]="'Mapa del curso: ' + islas().length + ' unidades'"
      >
        <defs>
          <!-- isla bloqueada: apagada, casi fundida con el fondo -->
          <linearGradient id="isla-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3E2166" />
            <stop offset="100%" stop-color="#241046" />
          </linearGradient>
          <!-- isla accesible: violeta eléctrico de marca -->
          <linearGradient id="isla-top-on" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#9D57FF" />
            <stop offset="100%" stop-color="#5A1BA8" />
          </linearGradient>
          <!-- roca: se apaga hacia abajo para que la isla parezca desprendida del vacío -->
          <linearGradient id="isla-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#54299B" />
            <stop offset="45%" stop-color="#331255" />
            <stop offset="100%" stop-color="#1B0838" />
          </linearGradient>
          <filter id="neon" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- piso: grilla isométrica que da el plano de apoyo (referencia estilo_roadmap) -->
        <g opacity="0.16" stroke="#8B3DF5" stroke-width="1">
          @for (l of grilla(); track $index) {
            <line [attr.x1]="l.a.x" [attr.y1]="l.a.y" [attr.x2]="l.b.x" [attr.y2]="l.b.y" />
          }
        </g>

        <!-- caminos: van debajo de las islas para que se "metan" bajo el borde -->
        <g fill="none" stroke-linecap="round">
          @for (t of tramos(); track t.id) {
            <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="11" opacity="0.28" filter="url(#neon)" />
            <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="4" [attr.opacity]="t.tenue ? 0.4 : 0.95" />
            @if (!t.tenue) {
              <path
                [attr.d]="t.d"
                stroke="#F3EAFF"
                stroke-width="2"
                stroke-dasharray="3 13"
                opacity="0.9"
                class="anim-fluir"
              />
            }
          }
        </g>

        @for (isla of islas(); track isla.u.id) {
          <g
            class="isla-hit"
            [class.cursor-pointer]="!preview()"
            [attr.tabindex]="preview() ? null : 0"
            [attr.role]="preview() ? null : 'button'"
            [attr.aria-label]="etiqueta(isla)"
            (click)="!preview() && seleccionar(isla)"
            (keydown.enter)="!preview() && seleccionar(isla)"
            (keydown.space)="!preview() && seleccionar(isla)"
          >
            <!-- sombra proyectada sobre el piso -->
            <ellipse
              [attr.cx]="isla.piso.x"
              [attr.cy]="isla.piso.y + 30"
              [attr.rx]="SEMI_ANCHO * 0.82"
              [attr.ry]="SEMI_ALTO * 0.5"
              fill="#0E0120"
              opacity="0.5"
            />

            <!-- halo bajo la isla actual: el "andá por acá" se ve desde lejos -->
            @if (isla.actual) {
              <ellipse
                [attr.cx]="isla.c.x"
                [attr.cy]="isla.c.y + 6"
                [attr.rx]="SEMI_ANCHO * 1.25"
                [attr.ry]="SEMI_ALTO * 0.95"
                fill="#FF2758"
                opacity="0.3"
                filter="url(#neon)"
                class="anim-latir"
              />
            }

            <!-- volumen: base rocosa + dos caras + tapa. El contorno de la roca lleva
                 filo violeta: sin él la punta se funde con el fondo y la isla se lee plana. -->
            <polygon
              [attr.points]="poliBase(isla)"
              fill="url(#isla-base)"
              stroke="#7B3AD6"
              stroke-width="1.5"
              stroke-opacity="0.45"
            />
            <polygon [attr.points]="poliCara(isla, 'izq')" fill="#4A2280" />
            <polygon [attr.points]="poliCara(isla, 'der')" fill="#2A1049" />
            <polygon
              [attr.points]="poliTapa(isla)"
              [attr.fill]="isla.estado === 'bloqueada' ? 'url(#isla-top)' : 'url(#isla-top-on)'"
              [attr.stroke]="borde(isla)"
              stroke-width="2"
            />
            <!-- borde interior: da el escalón del terreno sobre la tapa -->
            <polygon
              [attr.points]="poliTapaInterior(isla)"
              fill="none"
              [attr.stroke]="isla.estado === 'bloqueada' ? '#241046' : '#C79BFF'"
              stroke-width="1.5"
              opacity="0.5"
            />
            <!-- cristales de decorado: rompen la superficie plana del rombo -->
            @for (cr of cristales(isla); track $index) {
              <polygon [attr.points]="cr.p" [attr.fill]="cr.color" [attr.opacity]="cr.op" />
            }
            <!-- anillo de foco de teclado (05 §7) -->
            <polygon [attr.points]="poliTapa(isla)" class="isla-foco" fill="none" stroke="none" />

            <!-- emblema hexagonal flotando sobre la isla, por encima del avatar -->
            <g [attr.transform]="'translate(' + isla.c.x + ',' + (isla.c.y - 108) + ')'">
              <polygon
                points="0,-26 23,-13 23,13 0,26 -23,13 -23,-13"
                [attr.fill]="relleno(isla.estado)"
                [attr.stroke]="isla.actual ? '#F3EAFF' : '#190236'"
                stroke-width="2"
                [attr.filter]="isla.estado === 'bloqueada' ? null : 'url(#neon)'"
                [class.anim-flotar]="isla.actual"
              />
              <text
                y="6"
                text-anchor="middle"
                font-size="15"
                [attr.fill]="isla.estado === 'bloqueada' ? '#8B7BA8' : '#FFFFFF'"
                style="font-family: var(--font-pixel)"
              >
                {{ glifo(isla) }}
              </text>
            </g>

            <!-- rótulo -->
            <text
              [attr.x]="isla.c.x"
              [attr.y]="isla.c.y + ESPESOR + BASE_LARGO + 26"
              text-anchor="middle"
              font-size="15"
              [attr.fill]="isla.estado === 'bloqueada' ? '#9A85BD' : '#F3EAFF'"
              style="font-family: var(--font-title)"
            >
              {{ isla.u.orden }}. {{ isla.u.nombre }}
            </text>
            <text
              [attr.x]="isla.c.x"
              [attr.y]="isla.c.y + ESPESOR + BASE_LARGO + 44"
              text-anchor="middle"
              font-size="9"
              [attr.fill]="isla.estado === 'bloqueada' ? '#FF2758' : '#B98CF0'"
              style="font-family: var(--font-pixel)"
            >
              {{ subtitulo(isla) }}
            </text>

            <!-- el avatar viaja con la isla actual: es el ancla del jugador en el mapa -->
            @if (isla.actual && !preview()) {
              <g class="anim-flotar pointer-events-none">
                <!-- los pies caen sobre el centro de la tapa; 64px de alto de sprite -->
                <foreignObject
                  [attr.x]="isla.c.x - 24"
                  [attr.y]="isla.c.y - 62"
                  width="48"
                  height="70"
                >
                  <ui-avatar-sprite [config]="avatarSrv.avatar()" [alto]="64" [sombra]="true" />
                </foreignObject>
              </g>
            }
          </g>
        }
      </svg>

      @if (!preview()) {
        <!-- HUD superior izquierdo -->
        <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
          <div class="pointer-events-auto">
            <ui-hud [xp]="xp()" [vidas]="vidas()" />
          </div>
          <div class="pointer-events-auto text-right">
            <h2 class="title-font text-2xl text-primary drop-shadow-[0_0_10px_#FF2758]">
              {{ store.roadmap()?.nombre ?? 'Roadmap' }}
            </h2>
            <p class="ui-font mt-1 text-[8px] text-accent">
              {{ completadas() }}/{{ islas().length }} UNIDADES COMPLETAS
            </p>
          </div>
        </div>

        <!-- barra inferior estilo gabinete -->
        <div
          class="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t-2 border-secondary bg-base-100/85 px-4 py-2 backdrop-blur-sm"
        >
          <button class="btn btn-xs btn-outline btn-secondary ui-font text-[8px]" (click)="encuadrar()">
            ⤢ CENTRAR
          </button>
          <button class="btn btn-xs btn-outline btn-secondary ui-font text-[8px]" (click)="zoom(1.2)">+</button>
          <button class="btn btn-xs btn-outline btn-secondary ui-font text-[8px]" (click)="zoom(0.83)">−</button>
          <a routerLink="/alumno/avatar" class="btn btn-xs btn-outline btn-primary ui-font text-[8px]">
            ✎ MI AVATAR
          </a>
          <span class="ui-font ml-auto text-[8px] opacity-50">ARRASTRÁ PARA RECORRER EL MAPA</span>
        </div>

        <!-- ficha de la isla seleccionada -->
        @if (sel(); as isla) {
          <!-- rail derecho: el mapa avanza hacia la derecha, así que la ficha vive del lado
               contrario a la isla actual y nunca tapa lo que el alumno acaba de tocar -->
          <div
            class="chaflan absolute right-4 top-24 w-80 border-2 border-primary bg-base-200/95 p-4 backdrop-blur"
          >
            <div class="flex items-start justify-between gap-2">
              <h3 class="title-font text-lg text-primary">{{ isla.u.nombre }}</h3>
              <button class="btn btn-ghost btn-xs" (click)="sel.set(null)" aria-label="Cerrar ficha">✕</button>
            </div>
            <p class="ui-font mt-1 text-[8px] text-accent">{{ subtitulo(isla) }}</p>

            <ul class="mt-3 flex flex-col gap-1 text-xs">
              @for (a of isla.u.actividades; track a.id) {
                <li class="flex items-center gap-2">
                  <span class="badge badge-outline badge-xs ui-font text-[7px]">{{ a.tipo }}</span>
                  <span class="truncate">{{ a.nombre }}</span>
                </li>
              } @empty {
                <li class="opacity-60">Sin actividades todavía.</li>
              }
            </ul>

            @if (isla.estado === 'bloqueada') {
              <p class="ui-font mt-3 text-[8px] leading-relaxed text-error">
                🔒 NECESITÁS {{ isla.u.umbralXpDesbloqueo - xp() }} XP MÁS
              </p>
            } @else {
              <button class="btn btn-primary btn-sm ui-font mt-3 w-full text-[8px]" (click)="entrar(isla)">
                ▶ ENTRAR A LA UNIDAD
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class Mapa {
  readonly preview = input(false);

  protected readonly store = inject(RoadmapStore);
  protected readonly avatarSrv = inject(AvatarService);
  private readonly data = inject(RoadmapDataPort);
  private readonly router = inject(Router);
  private readonly lienzo = viewChild.required<ElementRef<SVGSVGElement>>('lienzo');

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly SEMI_ANCHO = SEMI_ANCHO;
  protected readonly SEMI_ALTO = SEMI_ALTO;
  protected readonly ESPESOR = ESPESOR;
  protected readonly BASE_LARGO = BASE_LARGO;

  protected readonly sel = signal<Isla | null>(null);
  protected readonly xp = computed(() => this.progreso()?.xpTotal ?? 0);
  protected readonly vidas = computed(() => this.progreso()?.vidasVigentes ?? 0);

  protected readonly islas = computed<Isla[]>(() => {
    const us = this.store.unidades();
    const puntos = layoutIslas(us.length);
    const completos = new Set(
      (this.progreso()?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );
    const xp = this.xp();

    const items = us.map((u, i): Isla => {
      const v = puntos[i];
      const hechas = u.actividades.filter((a) => completos.has(a.id)).length;
      return {
        u,
        c: proyectar(v),
        piso: proyectar({ ...v, z: 0 }),
        estado: this.preview() ? 'disponible' : this.estadoDe(u, hechas, xp),
        actual: false,
        hechas,
        total: u.actividades.length,
      };
    });

    // "Acá estás": la primera unidad no completada que ya esté abierta.
    if (!this.preview()) {
      const actual = items.find((it) => it.estado === 'disponible');
      if (actual) actual.actual = true;
    }
    return items;
  });

  protected readonly completadas = computed(
    () => this.islas().filter((i) => i.estado === 'completada').length,
  );

  /** Encuadre natural del layout — de acá arranca la vista y a acá vuelve "centrar". */
  private readonly encuadreBase = computed(() => {
    // Se encuadra el extremo real de cada isla (rótulo abajo, emblema arriba, ancho de la
    // tapa a los lados), no solo su centro: si no, el margen recorta lo que sobresale.
    const pts = this.islas().flatMap((i) => [
      { x: i.c.x - SEMI_ANCHO, y: i.c.y },
      { x: i.c.x + SEMI_ANCHO, y: i.c.y },
      { x: i.c.x, y: i.c.y + ESPESOR + BASE_LARGO + 46 },
      { x: i.c.x, y: i.c.y - 136 },
    ]);
    return caja(pts, MARGEN);
  });

  private readonly vista = signal<{ x: number; y: number; w: number; h: number } | null>(null);

  protected readonly viewBox = computed(() => {
    const b = this.encuadreBase();
    if (this.preview()) return `${b.x} ${b.y} ${b.ancho} ${b.alto}`;
    const v = this.vista() ?? { x: b.x, y: b.y, w: b.ancho, h: b.alto };
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });

  protected readonly tramos = computed(() => {
    const is = this.islas();
    return is.slice(0, -1).map((a, i) => {
      const b = is[i + 1];
      const color =
        a.estado === 'completada'
          ? 'var(--color-node-done)'
          : a.actual || a.estado === 'disponible'
            ? 'var(--color-node-open)'
            : 'var(--color-node-locked)';
      return {
        id: `${a.u.id}->${b.u.id}`,
        d: camino(a.c, b.c),
        color,
        tenue: a.estado === 'bloqueada',
      };
    });
  });

  /**
   * Grilla isométrica del piso. Se generan las dos familias de rectas de pendiente ±½
   * (las direcciones del tile 2:1) cubriendo el encuadre completo, en vez de recorrer el
   * espacio de mundo: así la grilla nunca queda corta ni se dibujan líneas fuera de cuadro.
   */
  protected readonly grilla = computed(() => {
    const b = this.encuadreBase();
    const x1 = b.x;
    const x2 = b.x + b.ancho;
    const lineas: { a: Punto; b: Punto }[] = [];

    for (const m of [0.5, -0.5]) {
      // y = m·x + c; el rango de c que cruza la caja sale de evaluar en ambos bordes.
      const cMin = Math.min(b.y - m * x1, b.y - m * x2);
      const cMax = Math.max(b.y + b.alto - m * x1, b.y + b.alto - m * x2);
      for (let c = Math.ceil(cMin / TILE_H) * TILE_H; c <= cMax; c += TILE_H) {
        lineas.push({ a: { x: x1, y: m * x1 + c }, b: { x: x2, y: m * x2 + c } });
      }
    }
    return lineas;
  });

  // ---------- geometría por isla (el template no hace matemática) ----------

  protected poliTapa(i: Isla): string {
    return rombo(i.c, SEMI_ANCHO, SEMI_ALTO);
  }
  protected poliCara(i: Isla, lado: 'izq' | 'der'): string {
    return caraLateral(i.c, SEMI_ANCHO, SEMI_ALTO, ESPESOR, lado);
  }
  protected poliBase(i: Isla): string {
    return base(i.c, SEMI_ANCHO, SEMI_ALTO, ESPESOR, BASE_LARGO);
  }
  protected poliTapaInterior(i: Isla): string {
    return rombo(i.c, SEMI_ANCHO * 0.72, SEMI_ALTO * 0.72);
  }

  /**
   * Cristales sobre la tapa. Se ubican en coordenadas baricéntricas del rombo para que
   * caigan siempre dentro de la isla, y con ruido determinista por unidad: la unidad 3
   * tiene siempre los mismos cristales en el mismo lugar.
   */
  protected cristales(i: Isla): { p: string; color: string; op: number }[] {
    const semilla = i.u.orden * 37;
    const apagada = i.estado === 'bloqueada';
    return Array.from({ length: 3 }, (_, k) => {
      const r1 = frac(Math.sin((semilla + k) * 12.9898) * 43758.5453) - 0.5;
      const r2 = frac(Math.sin((semilla + k) * 78.233) * 43758.5453) - 0.5;
      // |u|+|v| ≤ 1 mantiene el punto dentro del rombo; 0.62 lo aleja del borde
      const u = r1 * 1.24;
      const v = r2 * (1 - Math.abs(u)) * 1.24;
      const px = i.c.x + (u + v) * SEMI_ANCHO * 0.62;
      const py = i.c.y + (v - u) * SEMI_ALTO * 0.62;
      const w = 5 + frac(Math.sin((semilla + k) * 31.416) * 43758.5453) * 5;
      const h = 14 + frac(Math.sin((semilla + k) * 55.7) * 43758.5453) * 16;
      return {
        p: `${px},${py - h} ${px + w},${py} ${px},${py + w * 0.5} ${px - w},${py}`,
        color: apagada ? '#3E2166' : k === 0 ? '#FF2758' : '#C79BFF',
        op: apagada ? 0.75 : 0.9,
      };
    });
  }

  // ---------- estado visual ----------

  protected relleno(e: EstadoIsla): string {
    return e === 'completada'
      ? 'var(--color-node-done)'
      : e === 'disponible'
        ? 'var(--color-node-open)'
        : 'var(--color-node-locked)';
  }

  protected borde(i: Isla): string {
    return i.actual ? '#FF2758' : i.estado === 'bloqueada' ? '#2D164A' : '#8B3DF5';
  }

  /** Estado también por ícono, nunca solo por color (05 §7). */
  protected glifo(i: Isla): string {
    return i.estado === 'completada' ? '✓' : i.estado === 'bloqueada' ? '🔒' : String(i.u.orden);
  }

  protected subtitulo(i: Isla): string {
    if (i.estado === 'bloqueada') return `REQUIERE ${i.u.umbralXpDesbloqueo} XP`;
    if (i.estado === 'completada') return 'COMPLETADA';
    return `${i.hechas}/${i.total} ACTIVIDADES`;
  }

  protected etiqueta(i: Isla): string {
    const est =
      i.estado === 'completada' ? 'completada' : i.estado === 'bloqueada' ? 'bloqueada' : 'disponible';
    return `Unidad ${i.u.orden}: ${i.u.nombre}, ${est}. ${this.subtitulo(i)}`;
  }

  protected seleccionar(i: Isla): void {
    this.sel.set(this.sel()?.u.id === i.u.id ? null : i);
  }

  protected entrar(i: Isla): void {
    this.router.navigate(['/alumno/unidad', i.u.id]);
  }

  // ---------- paneo y zoom (04 §9) ----------

  private ancla: { px: number; py: number; vx: number; vy: number } | null = null;
  protected readonly arrastrando = signal(false);

  protected tomar(ev: PointerEvent): void {
    if (this.preview()) return;
    const v = this.vistaActual();
    this.ancla = { px: ev.clientX, py: ev.clientY, vx: v.x, vy: v.y };
    this.arrastrando.set(true);
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  protected mover(ev: PointerEvent): void {
    if (!this.ancla) return;
    const caja = this.lienzo().nativeElement.getBoundingClientRect();
    const v = this.vistaActual();
    // px de pantalla → unidades de viewBox
    const escala = v.w / (caja.width || 1);
    this.vista.set({
      ...v,
      x: this.ancla.vx - (ev.clientX - this.ancla.px) * escala,
      y: this.ancla.vy - (ev.clientY - this.ancla.py) * escala,
    });
  }

  protected soltar(ev: PointerEvent): void {
    this.ancla = null;
    this.arrastrando.set(false);
    (ev.target as Element).releasePointerCapture?.(ev.pointerId);
  }

  protected rueda(ev: WheelEvent): void {
    if (this.preview()) return;
    ev.preventDefault();
    this.zoom(ev.deltaY < 0 ? 1.12 : 0.89);
  }

  /** Zoom alrededor del centro de la vista, acotado para no perder el mapa (04 §9). */
  protected zoom(factor: number): void {
    const b = this.encuadreBase();
    const v = this.vistaActual();
    const w = Math.min(b.ancho * 1.6, Math.max(b.ancho * 0.25, v.w / factor));
    const h = w * (v.h / v.w);
    this.vista.set({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h });
  }

  protected encuadrar(): void {
    this.vista.set(null);
  }

  private vistaActual(): { x: number; y: number; w: number; h: number } {
    const b = this.encuadreBase();
    return this.vista() ?? { x: b.x, y: b.y, w: b.ancho, h: b.alto };
  }

  private estadoDe(u: Unidad, hechas: number, xp: number): EstadoIsla {
    if (u.actividades.length > 0 && hechas === u.actividades.length) return 'completada';
    return xp >= u.umbralXpDesbloqueo ? 'disponible' : 'bloqueada';
  }
}
