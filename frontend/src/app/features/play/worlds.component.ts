import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoreService } from '../../core/educa/store.service';
import type { Biome, Unidad } from '../../core/educa/models';
import { UiBadge } from '../profesor/shared/educa-ui';
import { VisitService } from '../../core/educa/visit.service';
import { genIslasLayout } from './world-gen';
import { AvatarPanel } from './avatar-panel';

// Mapa de islas del curso: una isla por unidad con el color y bioma que eligió el
// profesor. Click = seleccionar (ficha + Entrar), doble click / Enter = entrar al
// mundo hexagonal de la unidad. Reemplaza las tarjetas del hub en la misma ruta.
@Component({
  selector: 'app-worlds',
  standalone: true,
  imports: [RouterLink, UiBadge, AvatarPanel],
  host: { class: 'block w-full h-full overflow-y-auto' },
  template: `
    @if (store.current(); as a) {
      <div class="mx-auto max-w-5xl p-6">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <a routerLink="/alumno" class="text-sm text-gray-500 hover:underline">← Mis clases</a>
            <h1 class="mt-1 text-2xl font-bold">🌍 Islas de {{ a.nombre }}</h1>
            <p class="text-gray-500">Cada isla es una unidad. Elegí una y entrá a sus desafíos.</p>
          </div>
          <button (click)="panel.set(true)" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Modificar tu personaje 3D">
            🧍 Mi personaje
          </button>
        </div>

        <div class="mapa-mar mt-4 rounded-2xl border border-white/10" tabindex="0"
          (keydown.arrowright)="mover(1)" (keydown.arrowdown)="mover(1)"
          (keydown.arrowleft)="mover(-1)" (keydown.arrowup)="mover(-1)"
          (keydown.enter)="entrar()" role="listbox" aria-label="Islas del curso">
          <svg [attr.viewBox]="'0 0 ' + mapa().w + ' ' + mapa().h" class="block h-auto w-full" role="presentation">
            @for (f of filas(); track f) {
              <path [attr.d]="ola(f)" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="4" stroke-linecap="round" />
            }
            <path [attr.d]="mapa().ruta" fill="none" stroke="#f6d58c" stroke-opacity="0.65"
              stroke-width="5" stroke-dasharray="14 12" stroke-linecap="round" />
            @for (s of mapa().islas; track s.id) {
              <g (click)="elegir(s.id)" (dblclick)="entrar()" role="option" tabindex="0"
                [attr.aria-selected]="s.id === elegidaId()" [attr.aria-label]="nombreDe(s.id)"
                (keydown.enter)="elegir(s.id); entrar()" class="cursor-pointer">
                <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 12" fill="#f6d58c" fill-opacity="0.9" />
                <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r" [attr.fill]="colorDe(s.id)"
                  stroke="#ffffff" stroke-opacity="0.35" stroke-width="3" />
                @if (completa(s.id)) {
                  <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 5" fill="none"
                    stroke="#10b981" stroke-width="5" />
                }
                @if (s.id === elegidaId()) {
                  <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 5" fill="none"
                    stroke="#8b5cf6" stroke-width="6" />
                }
                <text [attr.x]="s.cx" [attr.y]="s.cy + 15" text-anchor="middle" font-size="42">{{ emojiDe(s.id) }}</text>
                @if (completa(s.id)) {
                  <text [attr.x]="s.cx + s.r - 8" [attr.y]="s.cy - s.r + 22" text-anchor="middle" font-size="26">✅</text>
                }
                <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 30" text-anchor="middle" font-size="24"
                  fill="#ede9fe" font-weight="bold">{{ tituloCorto(s.id) }}</text>
                <rect [attr.x]="s.cx - 58" [attr.y]="s.cy + s.r + 42" width="116" height="32" rx="9" fill="#000000" fill-opacity="0.55" />
                <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 66" text-anchor="middle" font-size="20" fill="#ffffff">⭐ {{ visitadasDe(s.id) }}/{{ anexosDe(s.id) }}</text>
              </g>
            }
          </svg>
        </div>

        @if (elegida(); as u) {
          <div class="card bg-base-200 border-2 border-primary mt-4">
            <div class="card-body gap-2">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-3xl">{{ biomaEmoji(u.bioma) }}</span>
                <div class="flex-1 min-w-0">
                  <h2 class="text-lg font-bold">{{ u.titulo }}</h2>
                  <p class="text-sm opacity-70">{{ u.descripcion || 'Sin descripción' }}</p>
                </div>
                <ui-badge>{{ u.modulos.length }} {{ u.modulos.length === 1 ? 'torre' : 'torres' }}</ui-badge>
                <ui-badge>⭐ {{ visitadasDe(u.id) }}/{{ anexosDe(u.id) }}</ui-badge>
              </div>
              <button (click)="entrar()" class="btn btn-sm btn-primary w-full ui-font text-[9px]">
                ENTRAR A LA ISLA →
              </button>
            </div>
          </div>
        }
      </div>

      @if (panel()) {
        <app-avatar-panel (cerrar)="panel.set(false)" />
      }
    } @else {
      <div class="p-6"><p>No encontrada.</p><a routerLink="/" class="underline">Volver</a></div>
    }
  `,
  styles: `
    .mapa-mar {
      background:
        radial-gradient(120% 90% at 50% 0%, #1d4e89 0%, transparent 60%),
        linear-gradient(180deg, #12365f 0%, #0b2545 60%, #081c36 100%);
    }
    .mapa-mar:focus-visible { outline: 2px solid #8b5cf6; outline-offset: 4px; }
    svg g:focus-visible { outline: none; }
    svg g:focus-visible circle { stroke: #8b5cf6; stroke-width: 6; }
  `,
})
export class WorldsComponent {
  store = inject(StoreService);
  private readonly visits = inject(VisitService);
  private readonly router = inject(Router);
  protected readonly panel = signal(false);

  protected readonly elegidaId = signal<string | null>(null);
  protected readonly elegida = computed(() =>
    this.store.current()?.unidades.find((x) => x.id === this.elegidaId()) ?? null,
  );

  protected readonly mapa = computed(() => {
    const unidades = this.store.current()?.unidades ?? [];
    return genIslasLayout(unidades.map((u) => ({ id: u.id, anexos: this.anexosDe(u.id) })));
  });

  protected readonly filas = computed(() => {
    const n = this.mapa().islas.length;
    return Array.from({ length: Math.ceil(n / 3) }, (_, f) => f);
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.store.open(id);
    this.elegidaId.set(this.store.current()?.unidades[0]?.id ?? null);
  }

  protected elegir(id: string): void {
    this.elegidaId.set(id);
  }

  protected mover(dir: 1 | -1): void {
    const ids = this.store.current()?.unidades.map((u) => u.id) ?? [];
    if (ids.length === 0) return;
    const i = ids.indexOf(this.elegidaId() ?? '');
    this.elegidaId.set(ids[(i + dir + ids.length) % ids.length]);
  }

  protected entrar(): void {
    const a = this.store.current();
    const uid = this.elegidaId();
    if (!a || !uid) return;
    this.router.navigate(['/play', a.id, uid]);
  }

  /** Onda decorativa por fila de islas. */
  protected ola(fila: number): string {
    const y = 60 + fila * 270;
    return `M80,${y} q40,-18 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0`;
  }

  private unidad(id: string): Unidad | undefined {
    return this.store.current()?.unidades.find((x) => x.id === id);
  }

  protected nombreDe(id: string): string {
    return this.unidad(id)?.titulo ?? id;
  }

  protected tituloCorto(id: string): string {
    const t = this.nombreDe(id);
    return t.length > 24 ? t.slice(0, 23) + '…' : t;
  }

  protected colorDe(id: string): string {
    return this.unidad(id)?.color || '#6366f1';
  }

  protected emojiDe(id: string): string {
    return this.biomaEmoji(this.unidad(id)?.bioma);
  }

  private anexoIds(unidadId: string): string[] {
    const u = this.unidad(unidadId);
    return u?.modulos.flatMap((m) => m.anexos.map((x) => x.id)) ?? [];
  }

  protected anexosDe(unidadId: string): number {
    return this.anexoIds(unidadId).length;
  }

  protected biomaEmoji(bioma: Biome | undefined): string {
    if (bioma === 'desierto') return '🏜️';
    if (bioma === 'nieve') return '❄️';
    if (bioma === 'lava') return '🌋';
    return '🌿';
  }

  protected visitadasDe(unidadId: string): number {
    const a = this.store.current();
    if (!a) return 0;
    const done = new Set(this.visits.list(a.id));
    return this.anexoIds(unidadId).filter((id) => done.has(id)).length;
  }

  protected completa(unidadId: string): boolean {
    const total = this.anexosDe(unidadId);
    return total > 0 && this.visitadasDe(unidadId) >= total;
  }
}
