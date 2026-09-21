import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../data-access/educa/store.service';
import { VisitService } from '../../data-access/educa/visit.service';
import type { Biome, AttachmentType } from '../../data-access/educa/models';
import { EntityEditorDialogComponent, type EditorKind, type EditorResult } from '../../ui/entity-editor-dialog/entity-editor-dialog.component';
import { ENTITY_KIND_LABEL } from '../../ui/labels';
import { RoleSwitchComponent } from '../../ui/role-switch/role-switch.component';

interface N {
  id: string;
  label: string;
  kind: 'subject' | 'section' | 'module' | 'attachment';
  detail: string;
  color: string;
  x: number;
  y: number;
  r: number;
  sectionId?: string;
  moduleId?: string;
  type?: AttachmentType;
  url?: string;
  visited?: boolean;
  passed?: boolean;
}

interface E {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Dlg {
  isNew: boolean;
  kind: EditorKind;
  sectionId?: string;
  moduleId?: string;
  attachmentId?: string;
  heading: string;
  title: string;
  description: string;
  color: string;
  biome: Biome;
  type: AttachmentType;
  url: string;
}

const DX = 220;
const DY = 150;

const ATTACHMENT_ICON: Record<string, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  image: '🖼️',
  exercise: '✏️',
};

function linesFor(s: string): string[] {
  const t = s.trim() || '(sin título)';
  if (t.length <= 16) return [t];
  const words = t.split(/\s+/);
  const l1: string[] = [];
  let len = 0;
  for (const w of words) {
    if (!l1.length || len + 1 + w.length <= 16) {
      l1.push(w);
      len += (l1.length > 1 ? 1 : 0) + w.length;
    } else break;
  }
  const rest = t.slice(l1.join(' ').length).trim();
  if (!rest) return [l1.join(' ')];
  return [l1.join(' '), rest.length > 17 ? rest.slice(0, 16) + '…' : rest];
}

@Component({
  selector: 'app-course-map-page',
  standalone: true,
  imports: [RouterLink, EntityEditorDialogComponent, RoleSwitchComponent],
  template: `
    @if (store.current(); as a) {
      <!-- Top bar -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-base-300 px-4 py-2 text-xs bg-base-200/60">
        <a [routerLink]="['/roadmap/teacher/build', a.id]" class="btn btn-xs btn-ghost ui-font text-[9px]">← Volver al editor</a>
        <span class="opacity-40">|</span>
        <span class="badge badge-sm badge-neutral">🏰 {{ a.name }}</span>
        <span class="badge badge-sm badge-neutral">🌍 {{ counts().sections }}</span>
        <span class="badge badge-sm badge-neutral">🎯 {{ counts().modules }}</span>
        <span class="badge badge-sm badge-neutral">📦 {{ counts().attachments }}</span>
        <span class="flex-1"></span>
        <app-role-switch />
        <button (click)="openNewSection()" class="btn btn-xs btn-primary ui-font text-[8px]">+ Unidad</button>
        <button (click)="toggleAll()" class="btn btn-xs btn-ghost ui-font text-[8px]">{{ allCollapsed() ? 'Expandir todo' : 'Colapsar todo' }}</button>
      </div>

      <div class="flex h-[calc(100vh-49px)] flex-col md:flex-row overflow-hidden">
        <!-- Interactive SVG canvas -->
        <div #wrap class="relative flex-1 touch-none select-none overflow-hidden bg-base-300/30"
          (pointerdown)="startPan($event)" (pointermove)="doPan($event)" (pointerup)="endPan()"
          (pointerleave)="endPan()" (wheel)="onWheel($event)" (keydown.escape)="select('')">
          <svg id="map" [attr.viewBox]="viewBox()" class="h-full w-full" role="img" [attr.aria-label]="'Mapa de ' + a.name">
            <g [attr.transform]="'translate(' + pan().x + ' ' + pan().y + ') scale(' + zoom() + ')'">
              @for (e of edges(); track e.x1 + '-' + e.y1 + '-' + e.x2) {
                <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2"
                  stroke="#6b7280" stroke-width="2" stroke-dasharray="6 4" opacity="0.6" />
              }
              @for (n of nodes(); track n.id) {
                <g [attr.transform]="'translate(' + n.x + ' ' + n.y + ')'"
                  (click)="select(n.id)" (dblclick)="onDbl(n)" (keydown.enter)="select(n.id)" tabindex="0" role="button"
                  [attr.aria-label]="n.label" class="cursor-pointer">
                  <title>{{ n.label }} · {{ kindLabel[n.kind] }}</title>
                  <circle [attr.r]="n.r" [attr.fill]="n.color" stroke="#ffffff" stroke-width="2.5" />
                  @if (n.visited) {
                    <circle [attr.r]="n.r + 4" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="4 3" />
                  }
                  <text y="5" text-anchor="middle" font-size="16">{{ emojiFor(n) }}</text>
                  @if (n.passed) {
                    <text [attr.x]="n.r - 6" [attr.y]="-n.r + 2" font-size="13">✅</text>
                  }
                  @if (n.kind === 'section' && isCollapsed(n.id)) {
                    <text y="-5" text-anchor="middle" font-size="11" fill="#fff">＋{{ hiddenCount(n.id) }}</text>
                  }
                  @for (ln of lines(n.label); track $index) {
                    <text [attr.y]="n.r + 16 + $index * 14" text-anchor="middle" font-size="11" class="fill-base-content font-bold">{{ ln }}</text>
                  }
                  @if (selected()?.id === n.id) {
                    <circle [attr.r]="n.r + 6" fill="none" stroke="#38bdf8" stroke-width="3" />
                  }
                </g>
              }
            </g>
          </svg>

          <!-- Zoom and Export controls -->
          <div class="absolute bottom-4 left-4 flex gap-1.5 bg-base-100/90 p-1.5 rounded-lg border border-base-300 shadow-lg">
            <button (click)="zoom.set(zoom() * 1.2)" class="btn btn-xs btn-ghost" aria-label="Acercar">+</button>
            <button (click)="zoom.set(zoom() / 1.2)" class="btn btn-xs btn-ghost" aria-label="Alejar">−</button>
            <button (click)="reset()" class="btn btn-xs btn-ghost ui-font text-[8px]">Reset</button>
            <button (click)="exportSvg()" class="btn btn-xs btn-ghost ui-font text-[8px]">SVG</button>
            <button (click)="exportPng()" class="btn btn-xs btn-ghost ui-font text-[8px]">PNG</button>
          </div>
        </div>

        <!-- Side Detail and Editing Panel -->
        <aside class="w-full md:w-80 border-t md:border-t-0 md:border-l border-base-300 bg-base-100 p-4 overflow-y-auto" aria-live="polite">
          @if (selected(); as s) {
            <div class="flex items-center justify-between">
              <span class="badge badge-sm badge-outline uppercase text-[9px] ui-font">{{ kindLabel[s.kind] }}</span>
              <button (click)="select('')" class="btn btn-ghost btn-xs text-xs">✕</button>
            </div>

            <h2 class="mt-2 text-base font-bold title-font text-primary break-words">{{ emojiFor(s) }} {{ s.label }}</h2>
            <p class="text-xs opacity-70 mt-1">{{ s.detail }}</p>

            @if (s.kind === 'section') {
              <div class="mt-3 p-2 rounded bg-base-200 text-xs">
                <p>🎯 {{ countsFor(s.id).modules }} módulos</p>
                <p>📦 {{ countsFor(s.id).attachments }} anexos</p>
              </div>
            }

            @if (s.kind === 'attachment' && s.url) {
              <a [href]="s.url" target="_blank" rel="noopener" class="mt-2 block truncate text-xs text-primary underline">
                ↗ {{ s.url }}
              </a>
            }

            <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button (click)="openEdit()" class="btn btn-sm btn-primary ui-font text-[8px]">✏️ Editar</button>
              <button (click)="removeSelected()" class="btn btn-sm btn-ghost text-error ui-font text-[8px]">🗑 Borrar</button>

              @if (s.kind === 'section' || s.kind === 'module') {
                <button (click)="moveSelected(-1)" class="btn btn-xs btn-neutral ui-font text-[8px]">↑ Subir</button>
                <button (click)="moveSelected(1)" class="btn btn-xs btn-neutral ui-font text-[8px]">↓ Bajar</button>
              }

              @if (s.kind === 'section') {
                <button (click)="openNewModule(s.id)" class="col-span-2 btn btn-xs btn-outline btn-secondary ui-font text-[8px]">+ Módulo en esta unidad</button>
                <button (click)="toggleCollapse(s.id)" class="col-span-2 btn btn-xs btn-ghost ui-font text-[8px]">{{ isCollapsed(s.id) ? 'Expandir rama' : 'Colapsar rama' }}</button>
              }

              @if (s.kind === 'module' && s.sectionId) {
                <button (click)="openNewAttachment(s.sectionId, s.id)" class="col-span-2 btn btn-xs btn-outline btn-secondary ui-font text-[8px]">+ Anexo en este módulo</button>
              }
            </div>
          } @else {
            <h2 class="text-sm font-bold title-font text-primary">🗺 Vista de Mapa</h2>
            <p class="text-xs opacity-70 mt-1">Selecciona cualquier nodo para ver sus propiedades y gestionarlo en tiempo real.</p>
            <p class="mt-3 text-xs opacity-60">{{ nodes().length }} nodos · {{ edges().length }} ramas</p>

            <div class="mt-4 grid gap-1.5">
              @for (u of a.sections; track u.id) {
                <button (click)="select(u.id)" class="flex items-center gap-2 p-2 rounded border border-base-300 text-left text-xs hover:bg-base-200 transition">
                  <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.background]="u.color || '#6366f1'"></span>
                  <span class="flex-1 truncate font-medium">{{ u.title }}</span>
                  <span class="text-[10px] opacity-60">{{ countsFor(u.id).modules }}🎯</span>
                </button>
              }
            </div>
          }
        </aside>
      </div>

      <!-- Editing modal -->
      @if (dlg(); as d) {
        <app-entity-editor-dialog [kind]="d.kind" [heading]="d.heading"
          [initialTitle]="d.title" [initialDescription]="d.description"
          [initialColor]="d.color" [initialBiome]="d.biome" [initialType]="d.type" [initialUrl]="d.url"
          (cancel)="dlg.set(null)" (saveResult)="onSave($event)" />
      }
    } @else {
      <div class="p-6 text-center">
        <p class="opacity-70">Asignatura no encontrada.</p>
        <a routerLink="/roadmap/teacher" class="btn btn-sm btn-primary mt-3">Volver al listado</a>
      </div>
    }
  `,
})
export class CourseMapPageComponent {
  protected readonly kindLabel = ENTITY_KIND_LABEL;
  store = inject(StoreService);
  private visits = inject(VisitService);
  counts = this.store.counts;
  zoom = signal(1);
  pan = signal({ x: 40, y: 40 });
  selId = signal('');
  collapsed = signal<string[]>([]);
  visitedIds = signal<string[]>([]);
  passedIds = signal<string[]>([]);
  dlg = signal<Dlg | null>(null);
  lines = (s: string): string[] => linesFor(s);
  private dragging = false;
  private last = { x: 0, y: 0 };

  nodes = computed<N[]>(() => {
    const a = this.store.current();
    if (!a) return [];
    const done = new Set(this.visitedIds());
    const passed = new Set(this.passedIds());
    void this.collapsed();
    const hide = new Set(this.collapsed());
    const ns: N[] = [{ id: a.id, label: a.name, kind: 'subject', detail: a.description, color: '#8b5cf6', x: 0, y: 0, r: 34 }];
    let ux = 0;
    for (const u of a.sections) {
      const uNode: N = { id: u.id, label: u.title, kind: 'section', detail: u.description, color: u.color || '#6366f1', x: ux, y: DY * 1.4, r: 26 };
      ns.push(uNode);
      if (hide.has(u.id)) {
        ux += DX * 1.5;
        continue;
      }
      let mx = ux - ((u.modules.length - 1) * DX) / 2;
      for (const m of u.modules) {
        const leafCount = Math.max(1, m.attachments.length);
        const cx = mx + ((leafCount - 1) * DX) / 2;
        ns.push({ id: m.id, label: m.title, kind: 'module', detail: m.description, color: '#22c55e', x: cx, y: DY * 2.8, r: 20, sectionId: u.id, moduleId: m.id, passed: passed.has(m.id) });
        m.attachments.forEach((x, i) => {
          ns.push({ id: x.id, label: x.title, kind: 'attachment', detail: `${x.type}${x.description ? ' — ' + x.description : ''}${x.url ? ' · ' + x.url : ''}`, color: '#f59e0b', x: mx + i * DX, y: DY * 4, r: 15, sectionId: u.id, moduleId: m.id, type: x.type, url: x.url, visited: done.has(x.id) });
        });
        mx += leafCount * DX;
      }
      ux = (u.modules.length ? mx : ux + DX) + DX / 2;
    }
    const kids = ns.filter((n) => n.kind === 'section');
    if (kids.length) ns[0].x = (kids[0].x + kids[kids.length - 1].x) / 2;
    return ns;
  });

  edges = computed<E[]>(() => {
    const a = this.store.current();
    if (!a) return [];
    const byId = new Map(this.nodes().map((n) => [n.id, n]));
    const es: E[] = [];
    const link = (f: string, t: string) => {
      const p = byId.get(f);
      const q = byId.get(t);
      if (p && q) es.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
    };
    for (const u of a.sections) {
      link(a.id, u.id);
      for (const m of u.modules) {
        link(u.id, m.id);
        for (const x of m.attachments) link(m.id, x.id);
      }
    }
    return es;
  });

  selected = computed(() => this.nodes().find((n) => n.id === this.selId()) ?? null);
  allCollapsed = computed(() => {
    const a = this.store.current();
    return !!a?.sections.length && a.sections.every((u) => this.collapsed().includes(u.id));
  });
  viewBox = computed(() => {
    const ns = this.nodes();
    if (!ns.length) return '0 0 800 600';
    const xs = ns.map((n) => n.x);
    const ys = ns.map((n) => n.y);
    const w = Math.max(...xs) - Math.min(...xs) + 480;
    const h = Math.max(...ys) - Math.min(...ys) + 340;
    return `${Math.min(...xs) - 240} -130 ${Math.max(w, 900)} ${Math.max(h, 760)}`;
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.store.open(id);
    this.refreshProgress();
  }

  emojiFor(n: Pick<N, 'kind' | 'type'>): string {
    if (n.kind === 'subject') return '🏰';
    if (n.kind === 'section') return '🌍';
    if (n.kind === 'module') return '🎯';
    return ATTACHMENT_ICON[n.type ?? ''] ?? '📦';
  }

  countsFor(sectionId: string): { modules: number; attachments: number; done: number } {
    const u = this.store.current()?.sections.find((x) => x.id === sectionId);
    if (!u) return { modules: 0, attachments: 0, done: 0 };
    const ids = u.modules.flatMap((m) => m.attachments.map((x) => x.id));
    const done = new Set(this.visitedIds());
    return { modules: u.modules.length, attachments: ids.length, done: ids.filter((id) => done.has(id)).length };
  }

  isCollapsed(sectionId: string): boolean {
    return this.collapsed().includes(sectionId);
  }

  hiddenCount(sectionId: string): number {
    const u = this.store.current()?.sections.find((x) => x.id === sectionId);
    if (!u) return 0;
    return u.modules.length + u.modules.reduce((n, m) => n + m.attachments.length, 0);
  }

  toggleCollapse(sectionId: string): void {
    this.collapsed.update((c) => (c.includes(sectionId) ? c.filter((x) => x !== sectionId) : [...c, sectionId]));
  }

  toggleAll(): void {
    if (this.allCollapsed()) this.collapsed.set([]);
    else this.collapsed.set(this.store.current()?.sections.map((u) => u.id) ?? []);
  }

  onDbl(n: N): void {
    if (n.kind === 'section') this.toggleCollapse(n.id);
  }

  select(id: string): void {
    this.selId.set(id);
  }

  reset(): void {
    this.zoom.set(1);
    this.pan.set({ x: 40, y: 40 });
  }

  openNewSection(): void {
    this.dlg.set({ isNew: true, kind: 'section', heading: 'Nueva unidad', title: '', description: '', color: '#6366f1', biome: 'meadow', type: 'document', url: '' });
  }

  openNewModule(sectionId: string): void {
    this.dlg.set({ isNew: true, kind: 'module', sectionId, heading: 'Nuevo módulo', title: '', description: '', color: '#6366f1', biome: 'meadow', type: 'document', url: '' });
  }

  openNewAttachment(sectionId: string, moduleId: string): void {
    this.dlg.set({ isNew: true, kind: 'attachment', sectionId, moduleId, heading: 'Nuevo anexo', title: '', description: '', color: '#6366f1', biome: 'meadow', type: 'document', url: '' });
  }

  openEdit(): void {
    const s = this.selected();
    const a = this.store.current();
    if (!s || !a) return;
    if (s.kind === 'subject') return;
    if (s.kind === 'section') {
      const u = a.sections.find((x) => x.id === s.id);
      if (!u) return;
      this.dlg.set({ isNew: false, kind: 'section', sectionId: u.id, heading: 'Editar unidad', title: u.title, description: u.description, color: u.color || '#6366f1', biome: u.biome || 'meadow', type: 'document', url: '' });
    } else if (s.kind === 'module' && s.sectionId) {
      const m = a.sections.find((x) => x.id === s.sectionId)?.modules.find((x) => x.id === s.id);
      if (!m) return;
      this.dlg.set({ isNew: false, kind: 'module', sectionId: s.sectionId, moduleId: m.id, heading: 'Editar módulo', title: m.title, description: m.description, color: '#6366f1', biome: 'meadow', type: 'document', url: '' });
    } else if (s.kind === 'attachment' && s.sectionId && s.moduleId) {
      const x = a.sections
        .find((u) => u.id === s.sectionId)
        ?.modules.find((m) => m.id === s.moduleId)
        ?.attachments.find((e) => e.id === s.id);
      if (!x) return;
      this.dlg.set({ isNew: false, kind: 'attachment', sectionId: s.sectionId, moduleId: s.moduleId, attachmentId: x.id, heading: 'Editar anexo', title: x.title, description: x.description || '', color: '#6366f1', biome: 'meadow', type: x.type, url: x.url || '' });
    }
  }

  onSave(r: EditorResult): void {
    const d = this.dlg();
    if (!d) return;
    if (d.isNew) {
      if (d.kind === 'section') {
        if (!r.title.trim()) return;
        this.store.addSection(r.title.trim());
        const all = this.store.current()?.sections ?? [];
        const u = all[all.length - 1];
        if (u) this.store.editSection(u.id, { description: r.description, color: r.color, biome: r.biome });
        if (u) this.selId.set(u.id);
      } else if (d.kind === 'module' && d.sectionId) {
        if (!r.title.trim()) return;
        this.store.addModule(d.sectionId, r.title.trim());
        const ms = this.store.current()?.sections.find((u) => u.id === d.sectionId)?.modules;
        const m = ms?.[ms.length - 1];
        if (m) this.store.editModule(d.sectionId, m.id, { description: r.description });
        if (m) this.selId.set(m.id);
      } else if (d.kind === 'attachment' && d.sectionId && d.moduleId) {
        if (!r.title.trim()) return;
        this.store.addAttachment(d.sectionId, d.moduleId, r.title.trim(), r.type ?? 'document');
        const xs = this.store.current()?.sections.find((u) => u.id === d.sectionId)?.modules.find((m) => m.id === d.moduleId)?.attachments;
        const x = xs?.[xs.length - 1];
        if (x) this.store.editAttachment(d.sectionId, d.moduleId, x.id, { description: r.description, type: r.type, url: r.url });
        if (x) this.selId.set(x.id);
      }
    } else {
      if (d.kind === 'section' && d.sectionId)
        this.store.editSection(d.sectionId, { title: r.title, description: r.description, color: r.color, biome: r.biome });
      if (d.kind === 'module' && d.sectionId && d.moduleId)
        this.store.editModule(d.sectionId, d.moduleId, { title: r.title, description: r.description });
      if (d.kind === 'attachment' && d.sectionId && d.moduleId && d.attachmentId)
        this.store.editAttachment(d.sectionId, d.moduleId, d.attachmentId, { title: r.title, description: r.description, type: r.type, url: r.url });
    }
    this.dlg.set(null);
  }

  removeSelected(): void {
    const s = this.selected();
    if (!s || s.kind === 'subject') return;
    if (s.kind === 'section') this.store.removeSection(s.id);
    else if (s.kind === 'module' && s.sectionId) this.store.removeModule(s.sectionId, s.id);
    else if (s.kind === 'attachment' && s.sectionId && s.moduleId) this.store.removeAttachment(s.sectionId, s.moduleId, s.id);
    this.selId.set('');
  }

  moveSelected(dir: -1 | 1): void {
    const s = this.selected();
    if (!s) return;
    if (s.kind === 'section') this.store.moveSection(s.id, dir);
    else if (s.kind === 'module' && s.sectionId) this.store.moveModule(s.sectionId, s.id, dir);
  }

  private refreshProgress(): void {
    const id = this.store.current()?.id ?? '';
    if (!id) return;
    this.visitedIds.set(this.visits.list(id));
    this.passedIds.set(this.visits.passed(id));
  }

  startPan(e: PointerEvent): void {
    this.dragging = true;
    this.last = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  doPan(e: PointerEvent): void {
    if (!this.dragging) return;
    const p = this.pan();
    this.pan.set({ x: p.x + (e.clientX - this.last.x), y: p.y + (e.clientY - this.last.y) });
    this.last = { x: e.clientX, y: e.clientY };
  }

  endPan(): void {
    this.dragging = false;
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.zoom.set(Math.min(3, Math.max(0.3, this.zoom() * (e.deltaY < 0 ? 1.1 : 0.9))));
  }

  private download(href: string, name: string): void {
    const l = document.createElement('a');
    l.href = href;
    l.download = name;
    l.click();
  }

  exportSvg(): void {
    const el = document.getElementById('map');
    if (!el) return;
    const blob = new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.download(url, 'mapa.svg');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  exportPng(): void {
    const el = document.getElementById('map');
    if (!el) return;
    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' }),
    );
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1600;
      c.height = 1200;
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(svgUrl);
      this.download(c.toDataURL('image/png'), 'mapa.png');
    };
    img.src = svgUrl;
  }
}
