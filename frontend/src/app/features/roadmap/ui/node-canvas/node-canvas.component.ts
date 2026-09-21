import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RoadmapStore } from '../../data-access/roadmap/roadmap.store';
import { Activity, NodeType, Section } from '../../data-access/roadmap/roadmap.models';

const VIEW_W = 420;
const NODE_W = 260;
const NODE_H = 56;
const GAP = 40;
const PAD_Y = 28;
const BTN = 22;

const GLYPH: Record<NodeType, string> = {
  theory: '▤',
  'theoretical-challenge': '◇',
  'practical-challenge': '◆',
  boss: '★',
  milestone: '❖',
};

const TYPE_LABEL: Record<NodeType, string> = {
  theory: 'Contenido teórico',
  'theoretical-challenge': 'Desafío teórico',
  'practical-challenge': 'Desafío práctico',
  boss: 'Boss',
  milestone: 'Hito',
};

interface NodeRow {
  a: Activity;
  y: number;
  first: boolean;
  last: boolean;
}

/**
 * Preview of a section's path: the challenges in the same order the student goes through
 * them — from BOTTOM to TOP, like the real vertical map (section-map.ts): the first
 * challenge sits at the foot and it climbs toward the goal. No free positions nor
 * hand-drawn prerequisite connections (that was removed, it confused more than it
 * helped). The only thing the teacher can change here is the order, with ▲▼ — the same
 * `moveActivity` already used by the ↑ ↓ arrows of the "Content" list
 * (section-editor.ts), only with a path view instead of a flat list.
 */
@Component({
  selector: 'app-node-canvas',
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

    <div class="chamfer overflow-auto border-2 border-base-300 bg-base-100">
      <svg
        [attr.viewBox]="'0 0 ' + VIEW_W + ' ' + height()"
        class="block mx-auto"
        [style.width.px]="VIEW_W"
        [style.height.px]="height()"
        role="img"
        [attr.aria-label]="'Camino de la unidad ' + section().name + ', ' + rows().length + ' desafíos en orden'"
      >
        <defs>
          <marker id="nc-flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-secondary)" />
          </marker>
        </defs>

        <!-- path: a straight arrow from each challenge to the next, pointing upward -->
        @for (fl of arrows(); track $index) {
          <line
            [attr.x1]="VIEW_W / 2" [attr.y1]="fl.y1"
            [attr.x2]="VIEW_W / 2" [attr.y2]="fl.y2"
            stroke="var(--color-secondary)" stroke-width="2"
            marker-end="url(#nc-flecha)"
          />
        }

        <!-- challenges, in order -->
        @for (f of rows(); track f.a.id) {
          <g [attr.aria-label]="nodeLabel(f.a)">
            <rect
              [attr.x]="VIEW_W / 2 - NODE_W / 2" [attr.y]="f.y"
              [attr.width]="NODE_W" [attr.height]="NODE_H" rx="4"
              fill="var(--color-base-200)"
              [attr.stroke]="typeColor(f.a.type)"
              stroke-width="2"
            />
            <text [attr.x]="VIEW_W / 2 - NODE_W / 2 + 16" [attr.y]="f.y + NODE_H / 2 + 5" font-size="16" [attr.fill]="typeColor(f.a.type)">
              {{ GLYPH[f.a.type] }}
            </text>
            <text [attr.x]="VIEW_W / 2 - NODE_W / 2 + 40" [attr.y]="f.y + NODE_H / 2 + 4" font-size="11" fill="var(--color-base-content)">
              {{ truncate(f.a.name) }}
              <title>{{ f.a.name }}</title>
            </text>
            @if (f.a.isMandatory) {
              <circle [attr.cx]="VIEW_W / 2 + NODE_W / 2 - 10" [attr.cy]="f.y + 10" r="4" fill="var(--color-primary)" />
            }
          </g>

          <!-- reorder: ▲ brings it closer to the goal (goes up the path), ▼ brings it closer to the start
               (goes down) — since the first challenge is at the foot, going up the path is "down"
               for moveActivity (higher index) and going down is "up" (lower index). -->
          <g
            role="button" tabindex="0"
            [attr.aria-label]="'subir ' + f.a.name + ' en el camino'"
            [attr.opacity]="f.last ? 0.3 : 1"
            class="cursor-pointer"
            (click)="move(f.a.id, 'down')"
            (keydown.enter)="move(f.a.id, 'down')"
            (keydown.space)="move(f.a.id, 'down'); $event.preventDefault()"
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
            [attr.aria-label]="'bajar ' + f.a.name + ' en el camino'"
            [attr.opacity]="f.first ? 0.3 : 1"
            class="cursor-pointer"
            (click)="move(f.a.id, 'up')"
            (keydown.enter)="move(f.a.id, 'up')"
            (keydown.space)="move(f.a.id, 'up'); $event.preventDefault()"
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
export class NodeCanvasComponent {
  readonly section = input.required<Section>();

  private readonly store = inject(RoadmapStore);

  protected readonly VIEW_W = VIEW_W;
  protected readonly NODE_W = NODE_W;
  protected readonly NODE_H = NODE_H;
  protected readonly GAP = GAP;
  protected readonly BTN = BTN;
  protected readonly GLYPH = GLYPH;

  // Item 0 (first challenge created) goes at the foot of the path — same criterion as
  // section-map.ts (the ascent starts at the bottom and climbs toward the goal).
  protected readonly rows = computed<NodeRow[]>(() => {
    const activities = this.section().activities;
    const n = activities.length;
    return activities.map((a, i) => ({
      a,
      y: PAD_Y + (n - 1 - i) * (NODE_H + GAP),
      first: i === 0,
      last: i === n - 1,
    }));
  });

  protected readonly height = computed(() => {
    const n = this.rows().length;
    return n === 0 ? PAD_Y * 2 + NODE_H : PAD_Y * 2 + n * NODE_H + (n - 1) * GAP;
  });

  /** One arrow segment between each challenge and the next, going up (y2 < y1). */
  protected readonly arrows = computed(() => {
    const fs = this.rows();
    const out: { y1: number; y2: number }[] = [];
    for (let i = 0; i < fs.length - 1; i++) {
      out.push({ y1: fs[i].y, y2: fs[i + 1].y + NODE_H });
    }
    return out;
  });

  protected move(activityId: string, direction: 'up' | 'down'): void {
    this.store.moveActivity(this.section().id, activityId, direction);
  }

  protected truncate(name: string): string {
    return name.length > 22 ? `${name.slice(0, 21)}…` : name;
  }

  protected nodeLabel(a: Activity): string {
    return `${a.name}, ${TYPE_LABEL[a.type]}${a.isMandatory ? ', obligatorio' : ''}`;
  }

  protected typeColor(t: NodeType): string {
    switch (t) {
      case 'practical-challenge':
        return 'var(--color-primary)';
      case 'boss':
        return 'var(--color-secondary)';
      case 'theoretical-challenge':
        return 'var(--color-accent)';
      case 'milestone':
        return 'var(--color-warning)';
      case 'theory':
        return 'var(--color-info)';
      default:
        return 'var(--color-info)';
    }
  }
}
