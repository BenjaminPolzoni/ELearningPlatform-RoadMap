import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { SaveFeedbackService } from '../../core/services/save-feedback.service';
import { Actividad, TipoNodo, Unidad } from '../../core/data/roadmap.models';

const VIEW_W = 1000;
const VIEW_H = 620;
const NODE_W = 132;
const NODE_H = 58;
const PAD = 70;
const SNAP = 20;

/** Distancia del centro de un nodo a su borde, siguiendo la dirección unitaria (ux,uy). */
function bordeCaja(ux: number, uy: number): number {
  const hw = NODE_W / 2;
  const hh = NODE_H / 2;
  const tx = ux !== 0 ? hw / Math.abs(ux) : Infinity;
  const ty = uy !== 0 ? hh / Math.abs(uy) : Infinity;
  return Math.min(tx, ty);
}

const GLIFO: Record<TipoNodo, string> = {
  teoria: '≡',
  practica: '▤',
  desafio: '◆',
  boss: '★',
  hito: '❖',
};

interface NodoPos {
  a: Actividad;
  x: number;
  y: number;
}

interface AristaVisible {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
}

interface Arrastre {
  id: string;
  startX: number;
  startY: number;
  offX: number;
  offY: number;
  moved: boolean;
}

/**
 * Editor gráfico de nodos del roadmap (05-design-system.md §5/§6, checklist de aceptación
 * G9): SVG con los nodos de una unidad, arrastrables para fijar `posicion_x`/`posicion_y`,
 * y un editor de conexiones de prerequisitos por clic en dos nodos. La detección de ciclos
 * final vive en el backend (`DetectorCiclos`, ver openapi POST /conexiones), pero acá se
 * rechaza el auto-lazo y cualquier ciclo obvio *antes* de llamar al store, para no hacerle
 * pasar al profesor un viaje al servidor que sabemos que va a rebotar.
 *
 * SVG y no Canvas: cada nodo es un elemento del DOM, con foco y `aria-label` (05 §5/§7/§8).
 */
@Component({
  selector: 'app-nodo-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    :host {
      display: block;
    }
    .nodo:focus-visible {
      outline: none;
    }
    .nodo:focus-visible .foco {
      stroke: var(--color-primary);
      stroke-width: 3;
      stroke-dasharray: 5 4;
    }
  `,
  template: `
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <p class="ui-font text-[10px] opacity-70">
        @if (origen(); as o) {
          Elegí el nodo destino para conectarlo con <b>{{ nombreDe(o) }}</b> — o hacé clic en
          {{ nombreDe(o) }} de nuevo para cancelar.
        } @else {
          Arrastrá un nodo para reposicionarlo. Clic en dos nodos, en orden, para conectar un
          prerequisito.
        }
      </p>
      <div class="flex items-center gap-3 text-[10px] ui-font opacity-60">
        @for (t of tipos; track t) {
          <span class="flex items-center gap-1">
            <span [style.color]="colorTipo(t)">{{ GLIFO[t] }}</span>{{ t }}
          </span>
        }
      </div>
    </div>

    <div class="chaflan overflow-auto border-2 border-base-300 bg-base-100">
      <svg
        #lienzo
        [attr.viewBox]="'0 0 ' + VIEW_W + ' ' + VIEW_H"
        class="block"
        [style.min-width.px]="VIEW_W"
        [style.height.px]="VIEW_H"
        role="application"
        [attr.aria-label]="'Editor gráfico de nodos de ' + unidad().nombre"
      >
        <defs>
          <pattern id="nc-trama" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--color-base-300)" />
          </pattern>
          <marker id="nc-flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-secondary)" />
          </marker>
        </defs>

        <!-- fondo: grilla de referencia + click vacío limpia la selección en curso -->
        <rect width="100%" height="100%" fill="url(#nc-trama)" (click)="limpiarSeleccion()" />

        <!-- conexiones -->
        <g>
          @for (c of aristas(); track c.id) {
            <line
              [attr.x1]="c.x1" [attr.y1]="c.y1" [attr.x2]="c.x2" [attr.y2]="c.y2"
              [attr.stroke]="seleccion() === c.id ? 'var(--color-primary)' : 'var(--color-secondary)'"
              [attr.stroke-width]="seleccion() === c.id ? 3.5 : 2"
              marker-end="url(#nc-flecha)"
              class="cursor-pointer"
              (click)="seleccionarConexion(c.id, $event)"
            />
            <!-- hit area ancha e invisible: hace más fácil clickear la línea fina -->
            <line
              [attr.x1]="c.x1" [attr.y1]="c.y1" [attr.x2]="c.x2" [attr.y2]="c.y2"
              stroke="transparent" stroke-width="16" class="cursor-pointer"
              (click)="seleccionarConexion(c.id, $event)"
            />
          }
        </g>

        <!-- nodos -->
        @for (n of nodos(); track n.a.id) {
          <g
            class="nodo cursor-pointer"
            tabindex="0"
            role="button"
            [attr.aria-label]="etiquetaNodo(n.a)"
            (pointerdown)="onPointerDown($event, n.a.id, n.x, n.y)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="onPointerUp($event)"
            (keydown.enter)="clickNodo(n.a.id)"
            (keydown.space)="clickNodo(n.a.id); $event.preventDefault()"
          >
            <rect
              [attr.x]="n.x - NODE_W / 2" [attr.y]="n.y - NODE_H / 2"
              [attr.width]="NODE_W" [attr.height]="NODE_H" rx="3"
              [attr.fill]="origen() === n.a.id ? 'var(--color-primary)' : 'var(--color-base-200)'"
              [attr.fill-opacity]="origen() === n.a.id ? 0.22 : 1"
              [attr.stroke]="origen() === n.a.id ? 'var(--color-primary)' : colorTipo(n.a.tipo)"
              stroke-width="2"
            />
            <rect
              class="foco" fill="none" stroke="none"
              [attr.x]="n.x - NODE_W / 2 - 4" [attr.y]="n.y - NODE_H / 2 - 4"
              [attr.width]="NODE_W + 8" [attr.height]="NODE_H + 8" rx="4"
            />
            <text [attr.x]="n.x - NODE_W / 2 + 14" [attr.y]="n.y + 5" font-size="15" [attr.fill]="colorTipo(n.a.tipo)">
              {{ GLIFO[n.a.tipo] }}
            </text>
            <text [attr.x]="n.x + 6" [attr.y]="n.y + 4" text-anchor="middle" font-size="10" fill="var(--color-base-content)">
              {{ acortar(n.a.nombre) }}
              <title>{{ n.a.nombre }}</title>
            </text>
            @if (n.a.esObligatorio) {
              <circle [attr.cx]="n.x + NODE_W / 2 - 8" [attr.cy]="n.y - NODE_H / 2 + 8" r="4" fill="var(--color-primary)" />
            }
          </g>
        }

        <!-- confirmación inline para eliminar la conexión seleccionada, al final del SVG
             para quedar siempre por encima de nodos y líneas (ningún borrado es un solo
             clic sin vuelta atrás — ver confirm-button.ts para el equivalente HTML) -->
        @if (aristaSeleccionada(); as sel) {
          <g [attr.transform]="'translate(' + sel.mx + ',' + sel.my + ')'" (click)="$event.stopPropagation()">
            <rect x="-72" y="-14" width="144" height="28" rx="2" fill="var(--color-base-300)" stroke="var(--color-primary)" stroke-width="1.5" />
            <text x="-62" y="4" font-size="10" fill="var(--color-base-content)" class="ui-font">¿Eliminar?</text>
            <g class="cursor-pointer" (click)="eliminarConexionSeleccionada()">
              <rect x="8" y="-11" width="26" height="22" rx="2" fill="var(--color-error)" />
              <text x="21" y="4" text-anchor="middle" font-size="10" fill="var(--color-error-content)" class="ui-font">Sí</text>
            </g>
            <g class="cursor-pointer" (click)="seleccion.set(null)">
              <rect x="38" y="-11" width="26" height="22" rx="2" fill="var(--color-base-100)" stroke="var(--color-base-content)" stroke-width="1" stroke-opacity="0.3" />
              <text x="51" y="4" text-anchor="middle" font-size="10" fill="var(--color-base-content)" class="ui-font">No</text>
            </g>
          </g>
        }
      </svg>
    </div>
  `,
})
export class NodoCanvas {
  readonly unidad = input.required<Unidad>();

  private readonly store = inject(RoadmapStore);
  private readonly feedback = inject(SaveFeedbackService);
  private readonly lienzo = viewChild.required<ElementRef<SVGSVGElement>>('lienzo');

  protected readonly VIEW_W = VIEW_W;
  protected readonly VIEW_H = VIEW_H;
  protected readonly NODE_W = NODE_W;
  protected readonly NODE_H = NODE_H;
  protected readonly GLIFO = GLIFO;
  protected readonly tipos: TipoNodo[] = ['teoria', 'practica', 'desafio', 'boss', 'hito'];

  /** Posición mientras se arrastra o hasta que el store confirme el guardado (05 §6). */
  private readonly overrides = signal<Record<string, { x: number; y: number }>>({});
  protected readonly origen = signal<string | null>(null);
  protected readonly seleccion = signal<string | null>(null);

  protected readonly nodos = computed<NodoPos[]>(() => {
    const ov = this.overrides();
    return this.unidad().actividades.map((a) => {
      const o = ov[a.id];
      return { a, x: o?.x ?? a.posicionX, y: o?.y ?? a.posicionY };
    });
  });

  protected readonly conexiones = computed(() => {
    const ids = new Set(this.unidad().actividades.map((a) => a.id));
    return this.store.conexiones().filter((c) => ids.has(c.nodoOrigenId) && ids.has(c.nodoDestinoId));
  });

  protected readonly aristas = computed<AristaVisible[]>(() => {
    const porId = new Map(this.nodos().map((n) => [n.a.id, n]));
    return this.conexiones().flatMap((c): AristaVisible[] => {
      const o = porId.get(c.nodoOrigenId);
      const d = porId.get(c.nodoDestinoId);
      if (!o || !d) return [];
      const dx = d.x - o.x;
      const dy = d.y - o.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      // Distancia del centro al borde de la caja en esa dirección (intersección
      // rayo-rectángulo) — un offset fijo basado solo en NODE_W deja la flecha pegada al
      // nodo equivocado en conexiones verticales, donde el hueco entre cajas es angosto.
      const offO = bordeCaja(ux, uy) + 4;
      const offD = bordeCaja(ux, uy) + 14;
      return [
        {
          id: c.id,
          x1: o.x + ux * offO,
          y1: o.y + uy * offO,
          x2: d.x - ux * offD,
          y2: d.y - uy * offD,
          mx: (o.x + d.x) / 2,
          my: (o.y + d.y) / 2,
        },
      ];
    });
  });

  protected readonly aristaSeleccionada = computed(() => {
    const id = this.seleccion();
    return id ? (this.aristas().find((a) => a.id === id) ?? null) : null;
  });

  // ---------- arrastre (posición) ----------

  private arrastre: Arrastre | null = null;

  protected onPointerDown(ev: PointerEvent, id: string, x: number, y: number): void {
    ev.stopPropagation();
    const p = this.puntoSvg(ev);
    this.arrastre = { id, startX: p.x, startY: p.y, offX: p.x - x, offY: p.y - y, moved: false };
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
  }

  protected onPointerMove(ev: PointerEvent): void {
    if (!this.arrastre) return;
    const p = this.puntoSvg(ev);
    const dx = p.x - this.arrastre.startX;
    const dy = p.y - this.arrastre.startY;
    // Umbral: por debajo de 4px se trata como clic, no como arrastre (evita crear
    // conexiones accidentales al soltar un drag mínimo).
    if (!this.arrastre.moved && Math.hypot(dx, dy) < 4) return;
    this.arrastre.moved = true;
    const snap = (v: number) => Math.round(v / SNAP) * SNAP;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const nx = clamp(snap(p.x - this.arrastre.offX), PAD, VIEW_W - PAD);
    const ny = clamp(snap(p.y - this.arrastre.offY), PAD, VIEW_H - PAD);
    this.overrides.update((ov) => ({ ...ov, [this.arrastre!.id]: { x: nx, y: ny } }));
  }

  protected onPointerUp(ev: PointerEvent): void {
    const arrastre = this.arrastre;
    this.arrastre = null;
    if (!arrastre) return;
    (ev.currentTarget as Element).releasePointerCapture?.(ev.pointerId);
    if (!arrastre.moved) {
      this.clickNodo(arrastre.id);
      return;
    }
    const pos = this.overrides()[arrastre.id];
    if (!pos) return;
    this.store.moverNodo(this.unidad().id, arrastre.id, pos.x, pos.y, () => {
      // El store ya tiene la posición confirmada — soltamos el override local.
      this.overrides.update((ov) => {
        const copia = { ...ov };
        delete copia[arrastre.id];
        return copia;
      });
    });
  }

  private puntoSvg(ev: PointerEvent): { x: number; y: number } {
    const rect = this.lienzo().nativeElement.getBoundingClientRect();
    const sx = VIEW_W / (rect.width || 1);
    const sy = VIEW_H / (rect.height || 1);
    return { x: (ev.clientX - rect.left) * sx, y: (ev.clientY - rect.top) * sy };
  }

  // ---------- conexiones ----------

  protected clickNodo(id: string): void {
    this.seleccion.set(null);
    const o = this.origen();
    if (!o) {
      this.origen.set(id);
      return;
    }
    if (o === id) {
      this.origen.set(null);
      return;
    }
    if (this.conexiones().some((c) => c.nodoOrigenId === o && c.nodoDestinoId === id)) {
      this.feedback.error('Ya existe esa conexión');
      this.origen.set(null);
      return;
    }
    if (this.creariaCiclo(o, id)) {
      this.feedback.error('Esa conexión formaría un ciclo de prerequisitos');
      this.origen.set(null);
      return;
    }
    this.store.agregarConexion(o, id);
    this.origen.set(null);
  }

  /** DFS: ¿destino ya puede llegar a origen? Si sí, origen→destino cierra un ciclo. */
  private creariaCiclo(origenId: string, destinoId: string): boolean {
    const cs = this.conexiones();
    const visitados = new Set<string>();
    const pila = [destinoId];
    while (pila.length > 0) {
      const actual = pila.pop()!;
      if (actual === origenId) return true;
      if (visitados.has(actual)) continue;
      visitados.add(actual);
      for (const c of cs) if (c.nodoOrigenId === actual) pila.push(c.nodoDestinoId);
    }
    return false;
  }

  protected seleccionarConexion(id: string, ev: Event): void {
    ev.stopPropagation();
    this.origen.set(null);
    this.seleccion.set(this.seleccion() === id ? null : id);
  }

  protected eliminarConexionSeleccionada(): void {
    const id = this.seleccion();
    if (!id) return;
    this.store.quitarConexion(id);
    this.seleccion.set(null);
  }

  protected limpiarSeleccion(): void {
    this.origen.set(null);
    this.seleccion.set(null);
  }

  // ---------- presentación ----------

  protected nombreDe(id: string): string {
    return this.unidad().actividades.find((a) => a.id === id)?.nombre ?? '';
  }

  protected acortar(nombre: string): string {
    return nombre.length > 16 ? `${nombre.slice(0, 15)}…` : nombre;
  }

  protected etiquetaNodo(a: Actividad): string {
    const conectando = this.origen() ? `, origen seleccionado: ${this.nombreDe(this.origen()!)}` : '';
    return `${a.nombre}, ${a.tipo}${a.esObligatorio ? ', obligatorio' : ''}${conectando}`;
  }

  protected colorTipo(t: TipoNodo): string {
    switch (t) {
      case 'desafio':
        return 'var(--color-primary)';
      case 'boss':
        return 'var(--color-secondary)';
      case 'teoria':
        return 'var(--color-accent)';
      case 'hito':
        return 'var(--color-warning)';
      default:
        return 'var(--color-info)';
    }
  }
}
