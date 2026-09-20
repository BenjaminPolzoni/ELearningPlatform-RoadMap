import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { StoreService } from '../../core/educa/store.service';
import { SyncChannelService } from '../../core/educa/sync-channel.service';
import type { Biome, Unidad } from '../../core/educa/models';
import { UiBadge } from '../profesor/shared/educa-ui';
import { VisitService } from '../../core/educa/visit.service';
import { genIslasLayout } from './world-gen';
import { AvatarPanel } from './avatar-panel';
import { Archipielago3dService, type ArchipielagoUnidad } from './engine/archipielago-3d.service';

const MODO_STORAGE_KEY = 'educa_islas_modo';

// Mapa del archipiélago de islas del curso: una isla por unidad con su bioma,
// navegación interactiva en barquito y selector dual (3D Diorama / 2.5D Carta Náutica).
@Component({
  selector: 'app-worlds',
  standalone: true,
  imports: [RouterLink, UiBadge, AvatarPanel],
  host: { class: 'block w-full h-full overflow-hidden' },
  template: `
    @if (store.current(); as a) {
      <div class="relative w-full h-full flex flex-col bg-[#071326] text-white select-none overflow-hidden">
        <!-- Header HUD Superior -->
        <header class="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#0a192f]/90 backdrop-blur-md border-b border-white/10 flex-wrap">
          <div class="flex items-center gap-3">
            <a routerLink="/alumno" class="btn btn-ghost btn-xs text-xs font-mono text-gray-300 hover:text-white" title="Volver a mis clases">← Mis clases</a>
            <div>
              <h1 class="text-sm sm:text-base font-bold text-accent title-font flex items-center gap-1.5">
                🌍 Archipiélago de {{ a.nombre }}
              </h1>
              <p class="text-[10px] text-gray-400 hidden md:block">Zarpa en tu barquito por el mapa náutico 3D y explora cada isla.</p>
            </div>
          </div>

          <!-- Selector de Modo de Vista (Mapa 3D vs Carta Náutica) -->
          <div class="flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/15 shadow-inner" role="tablist" aria-label="Modo de vista">
            <button (click)="cambiarModo('3d')" class="btn btn-xs rounded-lg transition-all ui-font text-[8px] sm:text-[9px]"
              [class.btn-primary]="modo() === '3d'"
              [class.btn-ghost]="modo() !== '3d'"
              role="tab" [attr.aria-selected]="modo() === '3d'"
              title="Vista Diorama 3D interactiva en tiempo real sobre el mapa náutico">
              🗺️ Mapa 3D
            </button>
            <button (click)="cambiarModo('2.5d')" class="btn btn-xs rounded-lg transition-all ui-font text-[8px] sm:text-[9px]"
              [class.btn-primary]="modo() === '2.5d'"
              [class.btn-ghost]="modo() !== '2.5d'"
              role="tab" [attr.aria-selected]="modo() === '2.5d'"
              title="Vista Carta Náutica marítima ilustrada">
              🧭 Carta Náutica
            </button>
          </div>

          <button (click)="panel.set(true)" class="btn btn-xs sm:btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Modificar tu personaje 3D">
            🧍 Mi personaje
          </button>
        </header>

        <!-- Área Principal de Navegación -->
        <main class="relative flex-1 w-full h-[calc(100%-60px)] overflow-hidden">
          @if (modo() === '3d') {
            <!-- Canvas 3D Three.js -->
            <div class="relative w-full h-full" (pointerleave)="hoveredId.set(null)">
              <canvas #cv3d class="w-full h-full block cursor-crosshair active:cursor-grabbing"></canvas>
              <div class="absolute top-3 left-3 rounded-lg bg-black/60 backdrop-blur px-2.5 py-1 text-xs text-white/80 ui-font text-[8px] z-10 pointer-events-none">
                ⛵ Clic o arrastra en el agua para navegar · Clic en una isla para atracar
              </div>

              <!-- Ficha Flotante Glassmorphism en Hover sobre la Isla -->
              @if (hoveredUnidad(); as hu) {
                <div
                  class="pointer-events-none fixed z-30 w-72 rounded-2xl bg-slate-950/90 border border-amber-400/50 backdrop-blur-md shadow-2xl p-3.5 text-white transition-opacity duration-150 -translate-x-1/2"
                  [class.-translate-y-full]="!hoverPosClamped().flipY"
                  [class.-mt-4]="!hoverPosClamped().flipY"
                  [class.mt-4]="hoverPosClamped().flipY"
                  [style.left.px]="hoverPosClamped().x"
                  [style.top.px]="hoverPosClamped().y">
                  <div class="flex items-center gap-2.5 mb-2">
                    <span class="text-2xl p-1.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                      {{ biomaEmoji(hu.bioma) }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-xs font-bold text-amber-300 truncate title-font">{{ hu.titulo }}</h3>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="badge badge-xs badge-outline font-mono text-[8px] uppercase tracking-wider text-amber-200/90 border-amber-400/30">{{ biomaLabel(hu.bioma) }}</span>
                        @if (completa(hu.id)) {
                          <span class="badge badge-xs badge-success font-mono text-[8px]">✅ Completa</span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (hu.descripcion) {
                    <p class="text-[10px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">{{ hu.descripcion }}</p>
                  }

                  <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-[9px] text-slate-300">
                    <span class="flex items-center gap-1">🏰 {{ hu.modulos.length }} {{ hu.modulos.length === 1 ? 'torre' : 'torres' }}</span>
                    <span class="font-mono text-amber-300 font-bold">⭐ {{ visitadasDe(hu.id) }}/{{ anexosDe(hu.id) }}</span>
                  </div>

                  <div class="mt-2 text-[8px] text-sky-300/90 font-mono text-center bg-sky-950/40 rounded py-0.5 border border-sky-500/20">
                    ⛵ Clic para navegar y atracar
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Carta Náutica 2.5D Ilustrada -->
            <div class="mapa-nautico-container w-full h-full overflow-auto flex items-center justify-center p-4">
              <div class="mapa-pergamino relative rounded-2xl border-4 border-[#b48a4e] shadow-2xl p-2 w-full max-w-5xl"
                tabindex="0"
                (keydown.arrowright)="mover(1)" (keydown.arrowdown)="mover(1)"
                (keydown.arrowleft)="mover(-1)" (keydown.arrowup)="mover(-1)"
                (keydown.enter)="entrar()" role="listbox" aria-label="Islas del archipiélago">
                
                <svg [attr.viewBox]="'0 0 ' + mapa().w + ' ' + mapa().h" class="block h-auto w-full" role="presentation">
                  <defs>
                    <radialGradient id="oceanShine" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stop-color="#fff8e7" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0" />
                    </radialGradient>
                    <filter id="shadowDrop" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
                    </filter>
                  </defs>

                  <!-- Rosa de los vientos decorativa -->
                  <g transform="translate(140, 110) scale(0.65)" opacity="0.35" pointer-events="none">
                    <circle cx="0" cy="0" r="50" fill="none" stroke="#8b5a2b" stroke-width="2" stroke-dasharray="4 3" />
                    <polygon points="0,-75 14,-14 0,0 -14,-14" fill="#8b5a2b" />
                    <polygon points="0,-75 0,0 -14,-14" fill="#582f0e" />
                    <polygon points="75,0 14,14 0,0 14,-14" fill="#8b5a2b" />
                    <polygon points="75,0 0,0 14,-14" fill="#582f0e" />
                    <polygon points="0,75 -14,14 0,0 14,14" fill="#8b5a2b" />
                    <polygon points="0,75 0,0 14,14" fill="#582f0e" />
                    <polygon points="-75,0 -14,-14 0,0 -14,14" fill="#8b5a2b" />
                    <polygon points="-75,0 0,0 -14,14" fill="#582f0e" />
                    <text x="0" y="-82" text-anchor="middle" font-family="serif" font-weight="bold" font-size="22" fill="#582f0e">N</text>
                  </g>

                  <!-- Curvas de batimetría y ondas de agua -->
                  @for (f of filas(); track f) {
                    <path [attr.d]="ola(f)" fill="none" stroke="#a07844" stroke-opacity="0.22" stroke-width="2.5" stroke-linecap="round" />
                  }

                  <!-- Ruta marítima trazada -->
                  <path [attr.d]="mapa().ruta" fill="none" stroke="#a06020" stroke-opacity="0.6"
                    stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round" />

                  <!-- Islas del Archipiélago -->
                  @for (s of mapa().islas; track s.id) {
                    <g (click)="elegir(s.id)" (dblclick)="entrar()" role="option" tabindex="0"
                      [attr.aria-selected]="s.id === elegidaId()" [attr.aria-label]="nombreDe(s.id)"
                      (keydown.enter)="elegir(s.id); entrar()" class="cursor-pointer group">
                      
                      <!-- Playa exterior -->
                      <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 14"
                        [attr.fill]="colorPlaya(s.id)" fill-opacity="0.95" filter="url(#shadowDrop)" />
                      
                      <!-- Terreno del bioma -->
                      <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r"
                        [attr.fill]="colorDe(s.id)" stroke="#ffffff" stroke-opacity="0.4" stroke-width="3" />
                      
                      <!-- Anillo de completada o selección -->
                      @if (completa(s.id)) {
                        <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 6" fill="none"
                          stroke="#10b981" stroke-width="5" />
                      }
                      @if (s.id === elegidaId()) {
                        <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 6" fill="none"
                          stroke="#8b5cf6" stroke-width="6" class="animate-pulse" />
                      }

                      <!-- Icono del bioma -->
                      <text [attr.x]="s.cx" [attr.y]="s.cy + 15" text-anchor="middle" font-size="44">{{ emojiDe(s.id) }}</text>
                      
                      @if (completa(s.id)) {
                        <text [attr.x]="s.cx + s.r - 8" [attr.y]="s.cy - s.r + 22" text-anchor="middle" font-size="26">✅</text>
                      }

                      <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 28" text-anchor="middle" font-size="22"
                        fill="#2b1a09" font-weight="bold" font-family="sans-serif">{{ tituloCorto(s.id) }}</text>
                      
                      <rect [attr.x]="s.cx - 56" [attr.y]="s.cy + s.r + 38" width="112" height="28" rx="8" fill="#3b2311" fill-opacity="0.85" />
                      <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 58" text-anchor="middle" font-size="18" fill="#fef08a">⭐ {{ visitadasDe(s.id) }}/{{ anexosDe(s.id) }}</text>
                    </g>
                  }

                  <!-- Barquito 2.5D navegable -->
                  <g class="barco-2d transition-all duration-700 ease-out pointer-events-none"
                    [attr.transform]="'translate(' + barco2dPos().x + ',' + barco2dPos().y + ')'">
                    <!-- Casco -->
                    <path d="M-18,6 L-12,16 L12,16 L18,6 Z" fill="#854d0e" stroke="#451a03" stroke-width="2.5" />
                    <!-- Mástil -->
                    <line x1="0" y1="6" x2="0" y2="-22" stroke="#451a03" stroke-width="3" />
                    <!-- Vela -->
                    <path d="M0,-20 Q16,-8 0,4 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
                    <!-- Bandera -->
                    <polygon points="0,-22 9,-18 0,-14" fill="#ef4444" />
                    <!-- Onda de estela -->
                    <path d="M-22,14 Q-12,18 0,14 Q12,18 22,14" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
                  </g>
                </svg>
              </div>
            </div>
          }
        </main>

        <!-- Ficha Flotante Glassmorphism Arcade (Abajo) -->
        @if (elegida(); as u) {
          <aside class="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl bg-black/80 border-2 border-primary/70 backdrop-blur-md p-3.5 sm:p-4 text-white shadow-2xl chaflan z-30 transition-all" aria-live="polite">
            <div class="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <span class="text-3xl sm:text-4xl p-2 rounded-xl bg-white/10 border border-white/15 shadow-inner flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                {{ biomaEmoji(u.bioma) }}
              </span>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-lg font-bold text-accent title-font truncate">{{ u.titulo }}</h2>
                  <span class="badge badge-xs sm:badge-sm badge-outline font-mono text-[9px] sm:text-[10px]">{{ biomaLabel(u.bioma) }}</span>
                  @if (completa(u.id)) {
                    <span class="badge badge-xs sm:badge-sm badge-success font-mono text-[9px] sm:text-[10px]">✅ Completada</span>
                  }
                </div>
                <p class="text-xs text-gray-300 line-clamp-1 mt-0.5">{{ u.descripcion || 'Sin descripción' }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <ui-badge>{{ u.modulos.length }} {{ u.modulos.length === 1 ? 'torre' : 'torres' }}</ui-badge>
                  <ui-badge>⭐ {{ visitadasDe(u.id) }}/{{ anexosDe(u.id) }} estrellas</ui-badge>
                </div>
              </div>

              <button (click)="entrar()" [disabled]="atracando()" class="btn btn-primary btn-sm sm:btn-md ui-font text-[9px] sm:text-[10px] shadow-lg shrink-0 w-full sm:w-auto"
                title="Entrar a los desafíos de esta isla [Enter]">
                @if (atracando()) {
                  <span class="loading loading-spinner loading-xs"></span>
                  <span>⛵ ATRACANDO EN EL PUERTO...</span>
                } @else if (modo() === '3d' && !archipielago3d.estaAtracadoEn(u.id)) {
                  <span>⛵ ZARPAR HACIA ESTA ISLA →</span>
                } @else {
                  <span>⛵ ZARPAR / ENTRAR A LA ISLA →</span>
                }
              </button>
            </div>
          </aside>
        }

        @if (panel()) {
          <app-avatar-panel (cerrar)="panel.set(false)" />
        }

        <!-- Toast de Notificación en Tiempo Real -->
        @if (toast()) {
          <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-primary/95 text-primary-content px-4 py-2 text-xs font-bold shadow-2xl backdrop-blur border border-white/20 flex items-center gap-2 animate-bounce">
            <span>{{ toast() }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="p-6 text-white"><p>No encontrada.</p><a routerLink="/" class="underline text-primary">Volver</a></div>
    }
  `,
  styles: `
    .mapa-nautico-container {
      background:
        radial-gradient(120% 90% at 50% 0%, #1e3a5f 0%, transparent 60%),
        linear-gradient(180deg, #0b1f3a 0%, #061224 100%);
    }
    .mapa-pergamino {
      background:
        radial-gradient(circle at 50% 40%, #fdf6e2 0%, #faecd0 50%, #f1d7ac 100%);
      box-shadow: inset 0 0 40px rgba(92, 53, 17, 0.35), 0 16px 36px rgba(0, 0, 0, 0.6);
    }
    .mapa-pergamino:focus-visible { outline: 2px solid #8b5cf6; outline-offset: 4px; }
    svg g:focus-visible { outline: none; }
    svg g:focus-visible circle { stroke: #8b5cf6; stroke-width: 6; }
  `,
})
export class WorldsComponent implements AfterViewInit, OnDestroy {
  store = inject(StoreService);
  private readonly visits = inject(VisitService);
  private readonly router = inject(Router);
  protected readonly archipielago3d = inject(Archipielago3dService);
  private readonly syncChannel = inject(SyncChannelService);

  private readonly cv3d = viewChild<ElementRef<HTMLCanvasElement>>('cv3d');

  protected readonly cursoId: string;
  protected readonly panel = signal(false);
  protected readonly modo = signal<'3d' | '2.5d'>(this.detectarModoInicial());
  protected readonly atracando = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: any = null;
  private syncSub?: Subscription;

  protected readonly elegidaId = signal<string | null>(null);
  protected readonly elegida = computed(() =>
    this.store.current()?.unidades.find((x) => x.id === this.elegidaId()) ?? null,
  );

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly hoverPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  protected readonly hoveredUnidad = computed(() => {
    const id = this.hoveredId();
    if (!id) return null;
    return this.store.current()?.unidades.find((u) => u.id === id) ?? null;
  });
  protected readonly hoverPosClamped = computed(() => {
    const { x, y } = this.hoverPos();
    if (typeof window === 'undefined') return { x, y, flipY: false };
    const w = window.innerWidth || 800;
    const clampedX = Math.max(160, Math.min(w - 160, x));
    const flipY = y < 190;
    return { x: clampedX, y, flipY };
  });

  protected readonly mapa = computed(() => {
    const unidades = this.store.current()?.unidades ?? [];
    return genIslasLayout(unidades.map((u) => ({ id: u.id, anexos: this.anexosDe(u.id) })));
  });

  protected readonly filas = computed(() => {
    const n = this.mapa().islas.length;
    return Array.from({ length: Math.ceil(n / 3) }, (_, f) => f);
  });

  // Posición del barquito animado en la Carta Náutica 2.5D
  protected readonly barco2dPos = computed(() => {
    const eid = this.elegidaId();
    const isl = this.mapa().islas.find((s) => s.id === eid) ?? this.mapa().islas[0];
    if (!isl) return { x: 200, y: 150 };
    // Ubicado junto al borde de la isla
    return { x: isl.cx + isl.r * 0.8, y: isl.cy + isl.r * 0.4 };
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.cursoId = id;
    this.store.open(id);
    this.elegidaId.set(this.store.current()?.unidades[0]?.id ?? null);

    // Escuchar actualizaciones de unidades emitidas por el profesor en tiempo real
    this.syncSub = this.syncChannel.events$.subscribe((msg) => {
      if (msg.type === 'course_updated' && msg.courseId === this.cursoId) {
        this.recargarCursoEnCaliente();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.modo() === '3d') {
      this.iniciarMotor3d();
    }
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.archipielago3d.destroy();
  }

  private recargarCursoEnCaliente(): void {
    this.store.open(this.cursoId);
    const a = this.store.current();
    const unidadesActuales = a?.unidades ?? [];

    if (this.modo() === '3d') {
      const u3d: ArchipielagoUnidad[] = unidadesActuales.map((u) => ({
        id: u.id,
        titulo: u.titulo,
        bioma: u.bioma,
        anexos: this.anexosDe(u.id),
        visitadas: this.visitadasDe(u.id),
        completa: this.completa(u.id),
      }));
      this.archipielago3d.updateUnidades(u3d);
    }

    if (!unidadesActuales.some((u) => u.id === this.elegidaId())) {
      this.elegidaId.set(unidadesActuales[0]?.id ?? null);
    }

    this.mostrarToast('🗺️ Archipiélago actualizado');
  }

  private mostrarToast(msg: string): void {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 3200);
  }

  private detectarModoInicial(): '3d' | '2.5d' {
    if (typeof window === 'undefined') return '2.5d';
    try {
      const saved = localStorage.getItem(MODO_STORAGE_KEY);
      if (saved === '3d' || saved === '2.5d') return saved;
      // Probar si el entorno soporta WebGL (para compatibilidad en pruebas headless)
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return '2.5d';
    } catch {
      return '2.5d';
    }
    return '3d';
  }

  protected cambiarModo(m: '3d' | '2.5d'): void {
    this.modo.set(m);
    try {
      localStorage.setItem(MODO_STORAGE_KEY, m);
    } catch {}

    if (m === '3d') {
      setTimeout(() => this.iniciarMotor3d(), 50);
    } else {
      this.archipielago3d.destroy();
    }
  }

  private iniciarMotor3d(): void {
    const canvas = this.cv3d()?.nativeElement;
    const a = this.store.current();
    if (!canvas || !a) return;

    const unidadesPara3d: ArchipielagoUnidad[] = a.unidades.map((u) => ({
      id: u.id,
      titulo: u.titulo,
      bioma: u.bioma,
      anexos: this.anexosDe(u.id),
      visitadas: this.visitadasDe(u.id),
      completa: this.completa(u.id),
    }));

    this.archipielago3d.init(
      canvas,
      unidadesPara3d,
      {
        onSelect: (id) => this.elegir(id, true),
        onDock: (id) => this.elegir(id, false),
        onHover: (id, x, y) => {
          this.hoveredId.set(id);
          if (id && x !== undefined && y !== undefined) {
            this.hoverPos.set({ x, y });
          }
        },
      },
      this.elegidaId() ?? undefined,
    );
  }

  @HostListener('window:resize')
  protected onResize(): void {
    const canvas = this.cv3d()?.nativeElement;
    if (canvas && this.modo() === '3d') {
      this.archipielago3d.resize(canvas.clientWidth, canvas.clientHeight);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyGlobal(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Teclas 1-9 para seleccionar islas rápidamente
    const num = parseInt(e.key, 10);
    const unidades = this.store.current()?.unidades ?? [];
    if (!isNaN(num) && num >= 1 && num <= unidades.length) {
      this.elegir(unidades[num - 1].id, true);
    } else if (e.key === 'Enter') {
      this.entrar();
    }
  }

  protected elegir(id: string, navegar = true): void {
    const prev = this.elegidaId();
    this.elegidaId.set(id);
    if (this.modo() === '3d' && navegar && prev !== id && !this.atracando()) {
      this.archipielago3d.zarparHacia(id);
    }
  }

  protected mover(dir: 1 | -1): void {
    const ids = this.store.current()?.unidades.map((u) => u.id) ?? [];
    if (ids.length === 0) return;
    const i = ids.indexOf(this.elegidaId() ?? '');
    const nextId = ids[(i + dir + ids.length) % ids.length];
    this.elegir(nextId, true);
  }

  protected entrar(): void {
    const a = this.store.current();
    const uid = this.elegidaId();
    if (!a || !uid || this.atracando()) return;

    if (this.modo() === '3d') {
      if (this.archipielago3d.estaAtracadoEn(uid)) {
        this.router.navigate(['/play', a.id, uid]);
      } else {
        this.atracando.set(true);
        this.archipielago3d.zarparYAtracar(uid, () => {
          this.atracando.set(false);
          this.router.navigate(['/play', a.id, uid]);
        });
      }
    } else {
      this.router.navigate(['/play', a.id, uid]);
    }
  }

  protected ola(fila: number): string {
    const y = 60 + fila * 270;
    return `M80,${y} q40,-16 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0`;
  }

  private unidad(id: string): Unidad | undefined {
    return this.store.current()?.unidades.find((x) => x.id === id);
  }

  protected nombreDe(id: string): string {
    return this.unidad(id)?.titulo ?? id;
  }

  protected tituloCorto(id: string): string {
    const t = this.nombreDe(id);
    return t.length > 22 ? t.slice(0, 21) + '…' : t;
  }

  protected colorDe(id: string): string {
    const b = this.unidad(id)?.bioma;
    if (b === 'desierto') return '#f59e0b';
    if (b === 'nieve') return '#e0f2fe';
    if (b === 'lava') return '#1f242d';
    return this.unidad(id)?.color || '#22c55e';
  }

  protected colorPlaya(id: string): string {
    const b = this.unidad(id)?.bioma;
    if (b === 'lava') return '#44403c';
    if (b === 'nieve') return '#bae6fd';
    return '#fde68a';
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

  protected biomaLabel(bioma: Biome | undefined): string {
    if (bioma === 'desierto') return 'Desierto';
    if (bioma === 'nieve') return 'Nieve';
    if (bioma === 'lava') return 'Lava';
    return 'Pradera';
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
