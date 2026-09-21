import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StoreService } from '../../../core/educa/store.service';
import { UiBadge, UiCard } from '../shared/educa-ui';
import { EditorComponent, type EditorKind, type EditorResult } from './editor.component';
import type { Biome, TipoAnexo } from '../../../core/educa/models';

interface Editing {
  kind: EditorKind;
  unidadId?: string;
  moduloId?: string;
  anexoId?: string;
  heading: string;
  titulo: string;
  descripcion: string;
  color: string;
  bioma: Biome;
  tipo: TipoAnexo;
  url: string;
}

const ICON: Record<string, string> = {
  documento: '📄',
  video: '🎬',
  enlace: '🔗',
  imagen: '🖼️',
  ejercicio: '✏️',
};

const BIOMA_LABEL: Record<Biome, { icon: string; label: string }> = {
  pradera: { icon: '🌿', label: 'Pradera' },
  desierto: { icon: '🏜️', label: 'Desierto' },
  nieve: { icon: '❄️', label: 'Nieve' },
  lava: { icon: '🌋', label: 'Lava' },
};

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [RouterLink, UiBadge, UiCard, EditorComponent],
  // El shell raíz (app.html) es h-[98vh] con overflow hidden: esta vista scrollea
  // puertas adentro con altura acotada (h-full), igual que avatar-editor y catálogo.
  host: { class: 'block w-full h-full overflow-y-auto' },
  template: `
    @if (store.current(); as a) {
      <div class="mx-auto max-w-4xl p-6">
        <!-- Barra de navegación superior -->
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

        <!-- Encabezado de la asignatura -->
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold title-font text-primary">🧩 {{ a.nombre }}</h1>
          <ui-badge>🌍 {{ counts().unidades }} unidades</ui-badge>
          <ui-badge>🎯 {{ counts().modulos }} módulos</ui-badge>
          <ui-badge>📦 {{ counts().anexos }} anexos</ui-badge>
        </div>
        <p class="text-sm opacity-70 mt-1">{{ a.descripcion }}</p>

        <!-- Alta rápida de unidad -->
        <div class="mt-5 flex gap-2">
          <input #u placeholder="Nueva unidad (mundo/nivel)…" class="input input-bordered input-sm flex-1"
            (keydown.enter)="addUnidad(u.value); u.value=''" />
          <button (click)="addUnidad(u.value); u.value=''" class="btn btn-sm btn-primary ui-font text-[9px]">+ Unidad</button>
        </div>

        <!-- Lista de Unidades -->
        <div class="mt-6 grid gap-4">
          @for (un of a.unidades; track un.id) {
            <ui-card>
              <div class="flex items-center gap-3 flex-wrap">
                <span class="h-4 w-4 rounded-full shrink-0 shadow" [style.background]="un.color || '#6366f1'"></span>
                <strong class="text-base text-base-content">{{ $index + 1 }}. {{ un.titulo }}</strong>

                <!-- Badge de Bioma 3D -->
                <span class="badge badge-sm badge-outline gap-1 font-mono text-[10px] text-accent border-accent/40">
                  {{ biomaInfo(un.bioma).icon }} {{ biomaInfo(un.bioma).label }}
                </span>

                <span class="flex-1"></span>

                <div class="flex items-center gap-1">
                  <button (click)="store.moveUnidad(un.id, -1)" aria-label="Subir unidad" class="btn btn-xs btn-ghost" [disabled]="$index === 0">↑</button>
                  <button (click)="store.moveUnidad(un.id, 1)" aria-label="Bajar unidad" class="btn btn-xs btn-ghost" [disabled]="$last">↓</button>
                  <button (click)="editUnidad(un.id, un.titulo, un.descripcion, un.color || '#6366f1', un.bioma || 'pradera')" class="btn btn-xs btn-outline btn-primary">Editar</button>
                  <button (click)="store.removeUnidad(un.id)" class="btn btn-xs btn-ghost text-error">✕</button>
                </div>
              </div>

              @if (un.descripcion) {
                <p class="text-xs opacity-70 mt-1">{{ un.descripcion }}</p>
              }

              <!-- Alta rápida de módulo -->
              <div class="mt-3 flex gap-2">
                <input #m placeholder="Nuevo módulo (etapa)…" class="input input-bordered input-xs flex-1"
                  (keydown.enter)="store.addModulo(un.id, m.value); m.value=''" />
                <button (click)="store.addModulo(un.id, m.value); m.value=''" class="btn btn-xs btn-neutral ui-font text-[8px]">+ Módulo</button>
              </div>

              <!-- Módulos de la unidad -->
              <div class="mt-3 ml-2 sm:ml-5 grid gap-2.5">
                @for (mo of un.modulos; track mo.id) {
                  <div class="rounded-lg border border-base-300 bg-base-100/50 p-3">
                    <div class="flex items-center gap-2 text-sm flex-wrap">
                      <strong class="text-xs text-secondary">🎯 {{ mo.titulo }}</strong>
                      <span class="flex-1"></span>
                      <button (click)="store.moveModulo(un.id, mo.id, -1)" aria-label="Subir módulo" class="btn btn-xs btn-ghost" [disabled]="$index === 0">↑</button>
                      <button (click)="store.moveModulo(un.id, mo.id, 1)" aria-label="Bajar módulo" class="btn btn-xs btn-ghost" [disabled]="$last">↓</button>
                      <button (click)="editModulo(un.id, mo.id, mo.titulo, mo.descripcion)" class="btn btn-xs btn-ghost text-primary">Editar</button>
                      <button (click)="store.removeModulo(un.id, mo.id)" class="btn btn-xs btn-ghost text-error">✕</button>
                    </div>

                    @if (mo.descripcion) {
                      <p class="text-xs opacity-60 mt-0.5">{{ mo.descripcion }}</p>
                    }

                    <!-- Alta rápida de anexo -->
                    <div class="mt-2 flex gap-2">
                      <input #x placeholder="Nuevo anexo / actividad…" class="input input-bordered input-xs flex-1"
                        (keydown.enter)="store.addAnexo(un.id, mo.id, x.value); x.value=''" />
                      <button (click)="store.addAnexo(un.id, mo.id, x.value); x.value=''" class="btn btn-xs btn-neutral ui-font text-[8px]">+ Anexo</button>
                    </div>

                    <!-- Anexos del módulo -->
                    @for (an of mo.anexos; track an.id) {
                      <div class="mt-1.5 flex items-center gap-2 text-xs bg-base-200/40 rounded p-1.5">
                        <span class="text-sm shrink-0">{{ icon(an.tipo) }}</span>
                        <span class="font-medium truncate">{{ an.titulo }}</span>
                        <span class="badge badge-xs badge-neutral shrink-0">{{ an.tipo }}</span>
                        @if (an.url) {
                          <a [href]="an.url" target="_blank" rel="noopener" class="link link-primary text-[10px] truncate max-w-40">↗ enlace</a>
                        }
                        <span class="flex-1"></span>
                        <button (click)="editAnexo(un.id, mo.id, an.id, an.titulo, an.descripcion || '', an.tipo, an.url || '')" class="btn btn-xs btn-ghost text-primary">Editar</button>
                        <button (click)="store.removeAnexo(un.id, mo.id, an.id)" class="btn btn-xs btn-ghost text-error">✕</button>
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
            [initialTitulo]="e.titulo" [initialDescripcion]="e.descripcion"
            [initialColor]="e.color" [initialBioma]="e.bioma" [initialTipo]="e.tipo" [initialUrl]="e.url"
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

  biomaInfo(b?: Biome): { icon: string; label: string } {
    return BIOMA_LABEL[b ?? 'pradera'] ?? BIOMA_LABEL.pradera;
  }

  addUnidad(v: string): void {
    if (v.trim()) this.store.addUnidad(v.trim());
  }

  editUnidad(id: string, titulo: string, descripcion: string, color: string, bioma: Biome = 'pradera'): void {
    this.editing.set({ kind: 'unidad', unidadId: id, heading: 'Editar unidad', titulo, descripcion, color, bioma, tipo: 'documento', url: '' });
  }

  editModulo(unidadId: string, moduloId: string, titulo: string, descripcion: string): void {
    this.editing.set({ kind: 'modulo', unidadId, moduloId, heading: 'Editar módulo', titulo, descripcion, color: '#6366f1', bioma: 'pradera', tipo: 'documento', url: '' });
  }

  editAnexo(unidadId: string, moduloId: string, anexoId: string, titulo: string, descripcion: string, tipo: Editing['tipo'], url: string): void {
    this.editing.set({ kind: 'anexo', unidadId, moduloId, anexoId, heading: 'Editar anexo', titulo, descripcion, color: '#6366f1', bioma: 'pradera', tipo, url });
  }

  onSave(r: EditorResult): void {
    const e = this.editing();
    if (!e) return;
    if (e.kind === 'unidad' && e.unidadId)
      this.store.editUnidad(e.unidadId, { titulo: r.titulo, descripcion: r.descripcion, color: r.color, bioma: r.bioma });
    if (e.kind === 'modulo' && e.unidadId && e.moduloId)
      this.store.editModulo(e.unidadId, e.moduloId, { titulo: r.titulo, descripcion: r.descripcion });
    if (e.kind === 'anexo' && e.unidadId && e.moduloId && e.anexoId)
      this.store.editAnexo(e.unidadId, e.moduloId, e.anexoId, { titulo: r.titulo, descripcion: r.descripcion, tipo: r.tipo, url: r.url });
    this.editing.set(null);
  }
}
