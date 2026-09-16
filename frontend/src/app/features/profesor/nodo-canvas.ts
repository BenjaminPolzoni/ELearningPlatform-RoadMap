import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Actividad, TipoNodo, Unidad } from '../../core/data/roadmap.models';

const VIEW_W = 420;
const NODE_W = 260;
const NODE_H = 56;
const GAP = 40;
const PAD_Y = 28;
const BTN = 22;

const GLIFO: Record<TipoNodo, string> = {
  teoria: '▤',
  'desafio-teorico': '◇',
  'desafio-practico': '◆',
  boss: '★',
  hito: '❖',
};

const ETIQUETA_TIPO: Record<TipoNodo, string> = {
  teoria: 'Contenido teórico',
  'desafio-teorico': 'Desafío teórico',
  'desafio-practico': 'Desafío práctico',
  boss: 'Boss',
  hito: 'Hito',
};

interface NodoFila {
  a: Actividad;
  y: number;
  primero: boolean;
  ultimo: boolean;
}

/**
 * Vista previa del camino de una unidad: los desafíos en el mismo orden en que los recorre
 * el alumno — de ABAJO hacia arriba, como el mapa vertical real (unidad-mapa.ts): el primer
 * desafío queda al pie y se va subiendo hacia la meta. Nada de posiciones libres ni
 * conexiones de prerequisito dibujadas a mano (eso se sacó, confundía más de lo que
 * ayudaba). Lo único que el profesor puede cambiar acá es el orden, con ▲▼ — mismo
 * `moverActividad` que ya usan las flechas ↑ ↓ de la lista de "Contenido"
 * (unidad-editor.ts), nada más que con una vista de camino en vez de una lista plana.
 */
@Component({
  selector: 'app-nodo-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    :host {
      display: block;
    }
  `,
  template: `
    <p class="ui-font text-[10px] opacity-70 mb-2">
      Así se va a ver el camino que recorre el alumno. Usá ▲▼ para cambiar el orden.
    </p>

    <div class="chaflan overflow-auto border-2 border-base-300 bg-base-100">
      <svg
        [attr.viewBox]="'0 0 ' + VIEW_W + ' ' + alto()"
        class="block mx-auto"
        [style.width.px]="VIEW_W"
        [style.height.px]="alto()"
        role="img"
        [attr.aria-label]="'Camino de la unidad ' + unidad().nombre + ', ' + filas().length + ' desafíos en orden'"
      >
        <defs>
          <marker id="nc-flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-secondary)" />
          </marker>
        </defs>

        <!-- camino: una flecha recta de cada desafío al siguiente, apuntando hacia arriba -->
        @for (fl of flechas(); track $index) {
          <line
            [attr.x1]="VIEW_W / 2" [attr.y1]="fl.y1"
            [attr.x2]="VIEW_W / 2" [attr.y2]="fl.y2"
            stroke="var(--color-secondary)" stroke-width="2"
            marker-end="url(#nc-flecha)"
          />
        }

        <!-- desafíos, en orden -->
        @for (f of filas(); track f.a.id) {
          <g [attr.aria-label]="etiquetaNodo(f.a)">
            <rect
              [attr.x]="VIEW_W / 2 - NODE_W / 2" [attr.y]="f.y"
              [attr.width]="NODE_W" [attr.height]="NODE_H" rx="4"
              fill="var(--color-base-200)"
              [attr.stroke]="colorTipo(f.a.tipo)"
              stroke-width="2"
            />
            <text [attr.x]="VIEW_W / 2 - NODE_W / 2 + 16" [attr.y]="f.y + NODE_H / 2 + 5" font-size="16" [attr.fill]="colorTipo(f.a.tipo)">
              {{ GLIFO[f.a.tipo] }}
            </text>
            <text [attr.x]="VIEW_W / 2 - NODE_W / 2 + 40" [attr.y]="f.y + NODE_H / 2 + 4" font-size="11" fill="var(--color-base-content)">
              {{ acortar(f.a.nombre) }}
              <title>{{ f.a.nombre }}</title>
            </text>
            @if (f.a.esObligatorio) {
              <circle [attr.cx]="VIEW_W / 2 + NODE_W / 2 - 10" [attr.cy]="f.y + 10" r="4" fill="var(--color-primary)" />
            }
          </g>

          <!-- reordenar: ▲ lo acerca a la meta (sube en el camino), ▼ lo acerca al inicio
               (baja) — como el primer desafío queda al pie, subir en el camino es "abajo"
               para moverActividad (índice más alto) y bajar es "arriba" (índice más bajo). -->
          <g
            role="button" tabindex="0"
            [attr.aria-label]="'subir ' + f.a.nombre + ' en el camino'"
            [attr.opacity]="f.ultimo ? 0.3 : 1"
            class="cursor-pointer"
            (click)="mover(f.a.id, 'abajo')"
            (keydown.enter)="mover(f.a.id, 'abajo')"
            (keydown.space)="mover(f.a.id, 'abajo'); $event.preventDefault()"
          >
            <rect
              [attr.x]="VIEW_W / 2 + NODE_W / 2 + 12" [attr.y]="f.y + NODE_H / 2 - BTN - 2"
              [attr.width]="BTN" [attr.height]="BTN" rx="3"
              fill="var(--color-base-200)" stroke="var(--color-base-300)" stroke-width="1"
            />
            <text
              [attr.x]="VIEW_W / 2 + NODE_W / 2 + 12 + BTN / 2" [attr.y]="f.y + NODE_H / 2 - BTN / 2 + 2"
              text-anchor="middle" font-size="12" fill="var(--color-base-content)"
            >▲</text>
          </g>
          <g
            role="button" tabindex="0"
            [attr.aria-label]="'bajar ' + f.a.nombre + ' en el camino'"
            [attr.opacity]="f.primero ? 0.3 : 1"
            class="cursor-pointer"
            (click)="mover(f.a.id, 'arriba')"
            (keydown.enter)="mover(f.a.id, 'arriba')"
            (keydown.space)="mover(f.a.id, 'arriba'); $event.preventDefault()"
          >
            <rect
              [attr.x]="VIEW_W / 2 + NODE_W / 2 + 12" [attr.y]="f.y + NODE_H / 2 + 2"
              [attr.width]="BTN" [attr.height]="BTN" rx="3"
              fill="var(--color-base-200)" stroke="var(--color-base-300)" stroke-width="1"
            />
            <text
              [attr.x]="VIEW_W / 2 + NODE_W / 2 + 12 + BTN / 2" [attr.y]="f.y + NODE_H / 2 + BTN / 2 + 4"
              text-anchor="middle" font-size="12" fill="var(--color-base-content)"
            >▼</text>
          </g>
        }
      </svg>
    </div>
  `,
})
export class NodoCanvas {
  readonly unidad = input.required<Unidad>();

  private readonly store = inject(RoadmapStore);

  protected readonly VIEW_W = VIEW_W;
  protected readonly NODE_W = NODE_W;
  protected readonly NODE_H = NODE_H;
  protected readonly GAP = GAP;
  protected readonly BTN = BTN;
  protected readonly GLIFO = GLIFO;

  // Fila 0 (primer desafío creado) va al pie del camino — mismo criterio que
  // unidad-mapa.ts (el ascenso empieza abajo y sube hacia la meta).
  protected readonly filas = computed<NodoFila[]>(() => {
    const actividades = this.unidad().actividades;
    const n = actividades.length;
    return actividades.map((a, i) => ({
      a,
      y: PAD_Y + (n - 1 - i) * (NODE_H + GAP),
      primero: i === 0,
      ultimo: i === n - 1,
    }));
  });

  protected readonly alto = computed(() => {
    const n = this.filas().length;
    return n === 0 ? PAD_Y * 2 + NODE_H : PAD_Y * 2 + n * NODE_H + (n - 1) * GAP;
  });

  /** Un tramo de flecha entre cada desafío y el siguiente, subiendo (y2 < y1). */
  protected readonly flechas = computed(() => {
    const fs = this.filas();
    const out: { y1: number; y2: number }[] = [];
    for (let i = 0; i < fs.length - 1; i++) {
      out.push({ y1: fs[i].y, y2: fs[i + 1].y + NODE_H });
    }
    return out;
  });

  protected mover(actividadId: string, direccion: 'arriba' | 'abajo'): void {
    this.store.moverActividad(this.unidad().id, actividadId, direccion);
  }

  protected acortar(nombre: string): string {
    return nombre.length > 22 ? `${nombre.slice(0, 21)}…` : nombre;
  }

  protected etiquetaNodo(a: Actividad): string {
    return `${a.nombre}, ${ETIQUETA_TIPO[a.tipo]}${a.esObligatorio ? ', obligatorio' : ''}`;
  }

  protected colorTipo(t: TipoNodo): string {
    switch (t) {
      case 'desafio-practico':
        return 'var(--color-primary)';
      case 'boss':
        return 'var(--color-secondary)';
      case 'desafio-teorico':
        return 'var(--color-accent)';
      case 'hito':
        return 'var(--color-warning)';
      case 'teoria':
        return 'var(--color-info)';
      default:
        return 'var(--color-info)';
    }
  }
}
