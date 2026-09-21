import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/educa/store.service';
import { UiBadge, UiCard } from '../shared/educa-ui';
import { EditorComponent, type EditorKind, type EditorResult } from './editor.component';
import type { Biome, AttachmentType } from '../../../core/educa/models';

interface Editing {
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

const ICON: Record<string, string> = {
  documento: '📄',
  video: '🎬',
  enlace: '🔗',
  imagen: '🖼️',
  ejercicio: '✏️',
};

const BIOME_LABEL: Record<Biome, { icon: string; label: string }> = {
  pradera: { icon: '🌿', label: 'Pradera' },
  desierto: { icon: '🏜️', label: 'Desierto' },
  nieve: { icon: '❄️', label: 'Nieve' },
  lava: { icon: '🌋', label: 'Lava' },
};

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [RouterLink, UiBadge, UiCard, EditorComponent],
  // The root shell (app.html) is h-[98vh] with overflow hidden: this view scrolls
  // internally with bounded height (h-full), same as avatar-editor and catalog.
  host: { class: 'block w-full h-full overflow-y-auto' },
  template: `
    @if (store.current(); as a) {
      <div class="mx-auto max-w-4xl p-6">
        <!-- Top navigation bar -->
        <div class="flex items-center justify-between gap-4 border-b border-base-300 pb-4">
          <a routerLink="/profesor" class="btn btn-sm btn-ghost ui-font text-[9px]">
            ← Asignaturas
          </a>
          <div class="flex items-center gap-2">
            <a [routerLink]="['/profesor/map', a.id]" class="btn btn-sm btn-outline btn-accent ui-font text-[8px]">
              🗺️ Generar Mapa
            </a>
            <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Ver el mundo 3D tal como lo ve el alumno">
              👁️ Ver como alumno
            </a>
            <a routerLink="/login" class="btn btn-sm btn-ghost border border-neutral/40 ui-font text-[8px]" title="Cambiar de rol">
              👤 PROFESOR ▾
            </a>
          </div>
        </div>

        <!-- Subject header -->
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold title-font text-primary">🧩 {{ a.name }}</h1>
          <ui-badge>🌍 {{ counts().sections }} unidades</ui-badge>
          <ui-badge>🎯 {{ counts().modules }} módulos</ui-badge>
          <ui-badge>📦 {{ counts().attachments }} anexos</ui-badge>
        </div>
        <p class="text-sm opacity-70 mt-1">{{ a.description }}</p>

        <!-- Quick section creation -->
        <div class="mt-5 flex gap-2">
          <input #u placeholder="Nueva unidad (mundo/nivel)…" class="input input-bordered input-sm flex-1"
            (keydown.enter)="addSection(u.value); u.value=''" />
          <button (click)="addSection(u.value); u.value=''" class="btn btn-sm btn-primary ui-font text-[9px]">+ Unidad</button>
        </div>

        <!-- Section list -->
        <div class="mt-6 grid gap-4">
          @for (un of a.sections; track un.id) {
            <ui-card>
              <div class="flex items-center gap-3 flex-wrap">
                <span class="h-4 w-4 rounded-full shrink-0 shadow" [style.background]="un.color || '#6366f1'"></span>
                <strong class="text-base text-base-content">{{ $index + 1 }}. {{ un.title }}</strong>

                <!-- 3D Biome badge -->
                <span class="badge badge-sm badge-outline gap-1 font-mono text-[10px] text-accent border-accent/40">
                  {{ biomeInfo(un.biome).icon }} {{ biomeInfo(un.biome).label }}
                </span>

                <span class="flex-1"></span>

                <div class="flex items-center gap-1">
                  <button (click)="store.moveSection(un.id, -1)" aria-label="Subir unidad" class="btn btn-xs btn-ghost" [disabled]="$index === 0">↑</button>
                  <button (click)="store.moveSection(un.id, 1)" aria-label="Bajar unidad" class="btn btn-xs btn-ghost" [disabled]="$last">↓</button>
                  <button (click)="editSection(un.id, un.title, un.description, un.color || '#6366f1', un.biome || 'pradera')" class="btn btn-xs btn-outline btn-primary">Editar</button>
                  <button (click)="store.removeSection(un.id)" class="btn btn-xs btn-ghost text-error">✕</button>
                </div>
              </div>

              @if (un.description) {
                <p class="text-xs opacity-70 mt-1">{{ un.description }}</p>
              }

              <!-- Quick module creation -->
              <div class="mt-3 flex gap-2">
                <input #m placeholder="Nuevo módulo (etapa)…" class="input input-bordered input-xs flex-1"
                  (keydown.enter)="store.addModule(un.id, m.value); m.value=''" />
                <button (click)="store.addModule(un.id, m.value); m.value=''" class="btn btn-xs btn-neutral ui-font text-[8px]">+ Módulo</button>
              </div>

              <!-- Section modules -->
              <div class="mt-3 ml-2 sm:ml-5 grid gap-2.5">
                @for (mo of un.modules; track mo.id) {
                  <div class="rounded-lg border border-base-300 bg-base-100/50 p-3">
                    <div class="flex items-center gap-2 text-sm flex-wrap">
                      <strong class="text-xs text-secondary">🎯 {{ mo.title }}</strong>
                      <span class="flex-1"></span>
                      <button (click)="store.moveModule(un.id, mo.id, -1)" aria-label="Subir módulo" class="btn btn-xs btn-ghost" [disabled]="$index === 0">↑</button>
                      <button (click)="store.moveModule(un.id, mo.id, 1)" aria-label="Bajar módulo" class="btn btn-xs btn-ghost" [disabled]="$last">↓</button>
                      <button (click)="editModule(un.id, mo.id, mo.title, mo.description)" class="btn btn-xs btn-ghost text-primary">Editar</button>
                      <button (click)="store.removeModule(un.id, mo.id)" class="btn btn-xs btn-ghost text-error">✕</button>
                    </div>

                    @if (mo.description) {
                      <p class="text-xs opacity-60 mt-0.5">{{ mo.description }}</p>
                    }

                    <!-- Quick appendix creation -->
                    <div class="mt-2 flex gap-2">
                      <input #x placeholder="Nuevo anexo / actividad…" class="input input-bordered input-xs flex-1"
                        (keydown.enter)="store.addAttachment(un.id, mo.id, x.value); x.value=''" />
                      <button (click)="store.addAttachment(un.id, mo.id, x.value); x.value=''" class="btn btn-xs btn-neutral ui-font text-[8px]">+ Anexo</button>
                    </div>

                    <!-- Module appendices -->
                    @for (an of mo.attachments; track an.id) {
                      <div class="mt-1.5 flex items-center gap-2 text-xs bg-base-200/40 rounded p-1.5">
                        <span class="text-sm shrink-0">{{ icon(an.type) }}</span>
                        <span class="font-medium truncate">{{ an.title }}</span>
                        <span class="badge badge-xs badge-neutral shrink-0">{{ an.type }}</span>
                        @if (an.url) {
                          <a [href]="an.url" target="_blank" rel="noopener" class="link link-primary text-[10px] truncate max-w-40">↗ enlace</a>
                        }
                        <span class="flex-1"></span>
                        <button (click)="editAttachment(un.id, mo.id, an.id, an.title, an.description || '', an.type, an.url || '')" class="btn btn-xs btn-ghost text-primary">Editar</button>
                        <button (click)="store.removeAttachment(un.id, mo.id, an.id)" class="btn btn-xs btn-ghost text-error">✕</button>
                      </div>
                    }
                  </div>
                }
              </div>
            </ui-card>
          } @empty {
            <p class="opacity-60 text-center py-8">Vacío: añade tu primera unidad para empezar a construir el curso 👾</p>
          }
        </div>

        @if (editing(); as e) {
          <app-editor [kind]="e.kind" [heading]="e.heading"
            [initialTitle]="e.title" [initialDescription]="e.description"
            [initialColor]="e.color" [initialBiome]="e.biome" [initialType]="e.type" [initialUrl]="e.url"
            (cancel)="editing.set(null)" (saveResult)="onSave($event)" />
        }
      </div>
    } @else {
      <div class="p-6 text-center">
        <p class="opacity-70">Asignatura no encontrada.</p>
        <a routerLink="/profesor" class="btn btn-sm btn-primary mt-3">Volver al listado</a>
      </div>
    }
  `,
})
export class BuilderComponent {
  store = inject(StoreService);
  counts = this.store.counts;
  editing = signal<Editing | null>(null);

  constructor() {
    const route = inject(ActivatedRoute);
    const id = route.snapshot.paramMap.get('id') ?? '';
    this.store.open(id);
  }

  icon(t: string): string {
    return ICON[t] ?? '📦';
  }

  biomeInfo(b?: Biome): { icon: string; label: string } {
    return BIOME_LABEL[b ?? 'pradera'] ?? BIOME_LABEL.pradera;
  }

  addSection(v: string): void {
    if (v.trim()) this.store.addSection(v.trim());
  }

  editSection(id: string, title: string, description: string, color: string, biome: Biome = 'pradera'): void {
    this.editing.set({ kind: 'unidad', sectionId: id, heading: 'Editar unidad', title, description, color, biome, type: 'documento', url: '' });
  }

  editModule(sectionId: string, moduleId: string, title: string, description: string): void {
    this.editing.set({ kind: 'modulo', sectionId, moduleId, heading: 'Editar módulo', title, description, color: '#6366f1', biome: 'pradera', type: 'documento', url: '' });
  }

  editAttachment(sectionId: string, moduleId: string, attachmentId: string, title: string, description: string, type: Editing['type'], url: string): void {
    this.editing.set({ kind: 'anexo', sectionId, moduleId, attachmentId, heading: 'Editar anexo', title, description, color: '#6366f1', biome: 'pradera', type, url });
  }

  onSave(r: EditorResult): void {
    const e = this.editing();
    if (!e) return;
    if (e.kind === 'unidad' && e.sectionId)
      this.store.editSection(e.sectionId, { title: r.title, description: r.description, color: r.color, biome: r.biome });
    if (e.kind === 'modulo' && e.sectionId && e.moduleId)
      this.store.editModule(e.sectionId, e.moduleId, { title: r.title, description: r.description });
    if (e.kind === 'anexo' && e.sectionId && e.moduleId && e.attachmentId)
      this.store.editAttachment(e.sectionId, e.moduleId, e.attachmentId, { title: r.title, description: r.description, type: r.type, url: r.url });
    this.editing.set(null);
  }
}
