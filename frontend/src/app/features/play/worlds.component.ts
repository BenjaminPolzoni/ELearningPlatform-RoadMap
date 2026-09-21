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
import type { Biome, Section } from '../../core/educa/models';
import { UiBadge } from '../teacher/shared/educa-ui';
import { VisitService } from '../../core/educa/visit.service';
import { genIslandsLayout } from './world-gen';
import { AvatarPanel } from './avatar-panel';
import { Archipelago3dService, type ArchipelagoSection } from './engine/archipelago-3d.service';

const MODE_STORAGE_KEY = 'educa_islas_modo';

// Map of the course's island archipelago: one island per section with its biome,
// interactive navigation by little boat and a dual selector (3D Diorama / 2.5D Nautical Chart).
@Component({
  selector: 'app-worlds',
  standalone: true,
  imports: [RouterLink, UiBadge, AvatarPanel],
  host: { class: 'block w-full h-full overflow-hidden' },
  template: `
    @if (store.current(); as a) {
      <div class="relative w-full h-full flex flex-col bg-[#071326] text-white select-none overflow-hidden">
        <!-- Top HUD Header -->
        <header class="relative z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-[#0a192f]/90 backdrop-blur-md border-b border-white/10 flex-wrap">
          <div class="flex items-center gap-3">
            <a routerLink="/alumno" class="btn btn-ghost btn-xs text-xs font-mono text-gray-300 hover:text-white" title="Volver a mis clases">← Mis clases</a>
            <div>
              <h1 class="text-sm sm:text-base font-bold text-accent title-font flex items-center gap-1.5">
                🌍 Archipiélago de {{ a.name }}
              </h1>
              <p class="text-[10px] text-gray-400 hidden md:block">Zarpa en tu barquito por el mapa náutico 3D y explora cada isla.</p>
            </div>
          </div>

          <!-- View mode selector (3D map vs Nautical Chart) -->
          <div class="flex items-center gap-1 rounded-xl bg-black/60 p-1 border border-white/15 shadow-inner" role="tablist" aria-label="Modo de vista">
            <button (click)="changeMode('3d')" class="btn btn-xs rounded-lg transition-all ui-font text-[8px] sm:text-[9px]"
              [class.btn-primary]="mode() === '3d'"
              [class.btn-ghost]="mode() !== '3d'"
              role="tab" [attr.aria-selected]="mode() === '3d'"
              title="Vista Diorama 3D interactiva en tiempo real sobre el mapa náutico">
              🗺️ Mapa 3D
            </button>
            <button (click)="changeMode('2.5d')" class="btn btn-xs rounded-lg transition-all ui-font text-[8px] sm:text-[9px]"
              [class.btn-primary]="mode() === '2.5d'"
              [class.btn-ghost]="mode() !== '2.5d'"
              role="tab" [attr.aria-selected]="mode() === '2.5d'"
              title="Vista Carta Náutica marítima ilustrada">
              🧭 Carta Náutica
            </button>
          </div>

          <button (click)="panel.set(true)" class="btn btn-xs sm:btn-sm btn-outline btn-secondary ui-font text-[8px]" title="Modificar tu personaje 3D">
            🧍 Mi personaje
          </button>
        </header>

        <!-- Main Navigation Area -->
        <main class="relative flex-1 w-full h-[calc(100%-60px)] overflow-hidden">
          @if (mode() === '3d') {
            <!-- Three.js 3D Canvas -->
            <div class="relative w-full h-full" (pointerleave)="hoveredId.set(null)">
              <canvas #cv3d class="w-full h-full block cursor-crosshair active:cursor-grabbing"></canvas>
              <div class="absolute top-3 left-3 rounded-lg bg-black/60 backdrop-blur px-2.5 py-1 text-xs text-white/80 ui-font text-[8px] z-10 pointer-events-none">
                ⛵ Clic o arrastra en el agua para navegar · Clic en una isla para atracar
              </div>

              <!-- Glassmorphism Floating Card on Hover over the Island -->
              @if (hoveredSection(); as hu) {
                <div
                  class="pointer-events-none fixed z-30 w-72 rounded-2xl bg-slate-950/90 border border-amber-400/50 backdrop-blur-md shadow-2xl p-3.5 text-white transition-opacity duration-150 -translate-x-1/2"
                  [class.-translate-y-full]="!hoverPosClamped().flipY"
                  [class.-mt-4]="!hoverPosClamped().flipY"
                  [class.mt-4]="hoverPosClamped().flipY"
                  [style.left.px]="hoverPosClamped().x"
                  [style.top.px]="hoverPosClamped().y">
                  <div class="flex items-center gap-2.5 mb-2">
                    <span class="text-2xl p-1.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
                      {{ biomeEmoji(hu.biome) }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-xs font-bold text-amber-300 truncate title-font">{{ hu.title }}</h3>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="badge badge-xs badge-outline font-mono text-[8px] uppercase tracking-wider text-amber-200/90 border-amber-400/30">{{ biomeLabel(hu.biome) }}</span>
                        @if (complete(hu.id)) {
                          <span class="badge badge-xs badge-success font-mono text-[8px]">✅ Completa</span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (hu.description) {
                    <p class="text-[10px] text-slate-300 line-clamp-2 mb-2 leading-relaxed">{{ hu.description }}</p>
                  }

                  <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-[9px] text-slate-300">
                    <span class="flex items-center gap-1">🏰 {{ hu.modules.length }} {{ hu.modules.length === 1 ? 'torre' : 'torres' }}</span>
                    <span class="font-mono text-amber-300 font-bold">⭐ {{ visitedOf(hu.id) }}/{{ attachmentsOf(hu.id) }}</span>
                  </div>

                  <div class="mt-2 text-[8px] text-sky-300/90 font-mono text-center bg-sky-950/40 rounded py-0.5 border border-sky-500/20">
                    ⛵ Clic para navegar y atracar
                  </div>
                </div>
              }
            </div>
          } @else {
            <!-- Illustrated 2.5D Nautical Chart -->
            <div class="mapa-nautico-container w-full h-full overflow-auto flex items-center justify-center p-4">
              <div class="mapa-pergamino relative rounded-2xl border-4 border-[#b48a4e] shadow-2xl p-2 w-full max-w-5xl"
                tabindex="0"
                (keydown.arrowright)="move(1)" (keydown.arrowdown)="move(1)"
                (keydown.arrowleft)="move(-1)" (keydown.arrowup)="move(-1)"
                (keydown.enter)="enter()" role="listbox" aria-label="Islas del archipiélago">
                
                <svg [attr.viewBox]="'0 0 ' + map().w + ' ' + map().h" class="block h-auto w-full" role="presentation">
                  <defs>
                    <radialGradient id="oceanShine" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stop-color="#fff8e7" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0" />
                    </radialGradient>
                    <filter id="shadowDrop" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
                    </filter>
                  </defs>

                  <!-- Decorative compass rose -->
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

                  <!-- Bathymetry curves and water ripples -->
                  @for (f of rows(); track f) {
                    <path [attr.d]="wave(f)" fill="none" stroke="#a07844" stroke-opacity="0.22" stroke-width="2.5" stroke-linecap="round" />
                  }

                  <!-- Traced sea route -->
                  <path [attr.d]="map().route" fill="none" stroke="#a06020" stroke-opacity="0.6"
                    stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round" />

                  <!-- Archipelago Islands -->
                  @for (s of map().islands; track s.id) {
                    <g (click)="choose(s.id)" (dblclick)="enter()" role="option" tabindex="0"
                      [attr.aria-selected]="s.id === chosenId()" [attr.aria-label]="nameOf(s.id)"
                      (keydown.enter)="choose(s.id); enter()" class="cursor-pointer group">
                      
                      <!-- Outer beach -->
                      <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 14"
                        [attr.fill]="beachColor(s.id)" fill-opacity="0.95" filter="url(#shadowDrop)" />
                      
                      <!-- Biome terrain -->
                      <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r"
                        [attr.fill]="colorFor(s.id)" stroke="#ffffff" stroke-opacity="0.4" stroke-width="3" />
                      
                      <!-- Completed or selected ring -->
                      @if (complete(s.id)) {
                        <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 6" fill="none"
                          stroke="#10b981" stroke-width="5" />
                      }
                      @if (s.id === chosenId()) {
                        <circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r + 6" fill="none"
                          stroke="#8b5cf6" stroke-width="6" class="animate-pulse" />
                      }

                      <!-- Biome icon -->
                      <text [attr.x]="s.cx" [attr.y]="s.cy + 15" text-anchor="middle" font-size="44">{{ emojiFor(s.id) }}</text>
                      
                      @if (complete(s.id)) {
                        <text [attr.x]="s.cx + s.r - 8" [attr.y]="s.cy - s.r + 22" text-anchor="middle" font-size="26">✅</text>
                      }

                      <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 28" text-anchor="middle" font-size="22"
                        fill="#2b1a09" font-weight="bold" font-family="sans-serif">{{ shortTitle(s.id) }}</text>
                      
                      <rect [attr.x]="s.cx - 56" [attr.y]="s.cy + s.r + 38" width="112" height="28" rx="8" fill="#3b2311" fill-opacity="0.85" />
                      <text [attr.x]="s.cx" [attr.y]="s.cy + s.r + 58" text-anchor="middle" font-size="18" fill="#fef08a">⭐ {{ visitedOf(s.id) }}/{{ attachmentsOf(s.id) }}</text>
                    </g>
                  }

                  <!-- Navigable 2.5D little boat -->
                  <g class="barco-2d transition-all duration-700 ease-out pointer-events-none"
                    [attr.transform]="'translate(' + boat2dPos().x + ',' + boat2dPos().y + ')'">
                    <!-- Hull -->
                    <path d="M-18,6 L-12,16 L12,16 L18,6 Z" fill="#854d0e" stroke="#451a03" stroke-width="2.5" />
                    <!-- Mast -->
                    <line x1="0" y1="6" x2="0" y2="-22" stroke="#451a03" stroke-width="3" />
                    <!-- Sail -->
                    <path d="M0,-20 Q16,-8 0,4 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
                    <!-- Flag -->
                    <polygon points="0,-22 9,-18 0,-14" fill="#ef4444" />
                    <!-- Wake ripple -->
                    <path d="M-22,14 Q-12,18 0,14 Q12,18 22,14" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
                  </g>
                </svg>
              </div>
            </div>
          }
        </main>

        <!-- Floating Glassmorphism Arcade Card (Bottom) -->
        @if (chosen(); as u) {
          <aside class="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl rounded-2xl bg-black/80 border-2 border-primary/70 backdrop-blur-md p-3.5 sm:p-4 text-white shadow-2xl chaflan z-30 transition-all" aria-live="polite">
            <div class="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <span class="text-3xl sm:text-4xl p-2 rounded-xl bg-white/10 border border-white/15 shadow-inner flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shrink-0">
                {{ biomeEmoji(u.biome) }}
              </span>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-base sm:text-lg font-bold text-accent title-font truncate">{{ u.title }}</h2>
                  <span class="badge badge-xs sm:badge-sm badge-outline font-mono text-[9px] sm:text-[10px]">{{ biomeLabel(u.biome) }}</span>
                  @if (complete(u.id)) {
                    <span class="badge badge-xs sm:badge-sm badge-success font-mono text-[9px] sm:text-[10px]">✅ Completada</span>
                  }
                </div>
                <p class="text-xs text-gray-300 line-clamp-1 mt-0.5">{{ u.description || 'Sin descripción' }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <ui-badge>{{ u.modules.length }} {{ u.modules.length === 1 ? 'torre' : 'torres' }}</ui-badge>
                  <ui-badge>⭐ {{ visitedOf(u.id) }}/{{ attachmentsOf(u.id) }} estrellas</ui-badge>
                </div>
              </div>

              <button (click)="enter()" [disabled]="docking()" class="btn btn-primary btn-sm sm:btn-md ui-font text-[9px] sm:text-[10px] shadow-lg shrink-0 w-full sm:w-auto"
                title="Entrar a los desafíos de esta isla [Enter]">
                @if (docking()) {
                  <span class="loading loading-spinner loading-xs"></span>
                  <span>⛵ ATRACANDO EN EL PUERTO...</span>
                } @else if (mode() === '3d' && !archipelago3d.isDockedIn(u.id)) {
                  <span>⛵ ZARPAR HACIA ESTA ISLA →</span>
                } @else {
                  <span>⛵ ZARPAR / ENTRAR A LA ISLA →</span>
                }
              </button>
            </div>
          </aside>
        }

        @if (panel()) {
          <app-avatar-panel (close)="panel.set(false)" />
        }

        <!-- Real-Time Notification Toast -->
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
  protected readonly archipelago3d = inject(Archipelago3dService);
  private readonly syncChannel = inject(SyncChannelService);

  private readonly cv3d = viewChild<ElementRef<HTMLCanvasElement>>('cv3d');

  protected readonly courseId: string;
  protected readonly panel = signal(false);
  protected readonly mode = signal<'3d' | '2.5d'>(this.detectModeInitial());
  protected readonly docking = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer: any = null;
  private syncSub?: Subscription;

  protected readonly chosenId = signal<string | null>(null);
  protected readonly chosen = computed(() =>
    this.store.current()?.sections.find((x) => x.id === this.chosenId()) ?? null,
  );

  protected readonly hoveredId = signal<string | null>(null);
  protected readonly hoverPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  protected readonly hoveredSection = computed(() => {
    const id = this.hoveredId();
    if (!id) return null;
    return this.store.current()?.sections.find((u) => u.id === id) ?? null;
  });
  protected readonly hoverPosClamped = computed(() => {
    const { x, y } = this.hoverPos();
    if (typeof window === 'undefined') return { x, y, flipY: false };
    const w = window.innerWidth || 800;
    const clampedX = Math.max(160, Math.min(w - 160, x));
    const flipY = y < 190;
    return { x: clampedX, y, flipY };
  });

  protected readonly map = computed(() => {
    const sections = this.store.current()?.sections ?? [];
    return genIslandsLayout(sections.map((u) => ({ id: u.id, attachments: this.attachmentsOf(u.id) })));
  });

  protected readonly rows = computed(() => {
    const n = this.map().islands.length;
    return Array.from({ length: Math.ceil(n / 3) }, (_, f) => f);
  });

  // Position of the animated little boat on the 2.5D Nautical Chart
  protected readonly boat2dPos = computed(() => {
    const eid = this.chosenId();
    const isl = this.map().islands.find((s) => s.id === eid) ?? this.map().islands[0];
    if (!isl) return { x: 200, y: 150 };
    // Located next to the island's edge
    return { x: isl.cx + isl.r * 0.8, y: isl.cy + isl.r * 0.4 };
  });

  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    this.courseId = id;
    this.store.open(id);
    this.chosenId.set(this.store.current()?.sections[0]?.id ?? null);

    // Listen to section updates emitted by the teacher in real time
    this.syncSub = this.syncChannel.events$.subscribe((msg) => {
      if (msg.type === 'course_updated' && msg.courseId === this.courseId) {
        this.reloadCourseHot();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.mode() === '3d') {
      this.startEngine3d();
    }
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.archipelago3d.destroy();
  }

  private reloadCourseHot(): void {
    this.store.open(this.courseId);
    const a = this.store.current();
    const currentSections = a?.sections ?? [];

    if (this.mode() === '3d') {
      const u3d: ArchipelagoSection[] = currentSections.map((u) => ({
        id: u.id,
        title: u.title,
        biome: u.biome,
        attachments: this.attachmentsOf(u.id),
        visited: this.visitedOf(u.id),
        complete: this.complete(u.id),
      }));
      this.archipelago3d.updateSections(u3d);
    }

    if (!currentSections.some((u) => u.id === this.chosenId())) {
      this.chosenId.set(currentSections[0]?.id ?? null);
    }

    this.showToast('🗺️ Archipiélago actualizado');
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
    }, 3200);
  }

  private detectModeInitial(): '3d' | '2.5d' {
    if (typeof window === 'undefined') return '2.5d';
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === '3d' || saved === '2.5d') return saved;
      // Test whether the environment supports WebGL (for compatibility in headless tests)
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return '2.5d';
    } catch {
      return '2.5d';
    }
    return '3d';
  }

  protected changeMode(m: '3d' | '2.5d'): void {
    this.mode.set(m);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, m);
    } catch {}

    if (m === '3d') {
      setTimeout(() => this.startEngine3d(), 50);
    } else {
      this.archipelago3d.destroy();
    }
  }

  private startEngine3d(): void {
    const canvas = this.cv3d()?.nativeElement;
    const a = this.store.current();
    if (!canvas || !a) return;

    const sectionsFor3d: ArchipelagoSection[] = a.sections.map((u) => ({
      id: u.id,
      title: u.title,
      biome: u.biome,
      attachments: this.attachmentsOf(u.id),
      visited: this.visitedOf(u.id),
      complete: this.complete(u.id),
    }));

    this.archipelago3d.init(
      canvas,
      sectionsFor3d,
      {
        onSelect: (id) => this.choose(id, true),
        onDock: (id) => this.choose(id, false),
        onHover: (id, x, y) => {
          this.hoveredId.set(id);
          if (id && x !== undefined && y !== undefined) {
            this.hoverPos.set({ x, y });
          }
        },
      },
      this.chosenId() ?? undefined,
    );
  }

  @HostListener('window:resize')
  protected onResize(): void {
    const canvas = this.cv3d()?.nativeElement;
    if (canvas && this.mode() === '3d') {
      this.archipelago3d.resize(canvas.clientWidth, canvas.clientHeight);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyGlobal(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Keys 1-9 to select islands quickly
    const num = parseInt(e.key, 10);
    const sections = this.store.current()?.sections ?? [];
    if (!isNaN(num) && num >= 1 && num <= sections.length) {
      this.choose(sections[num - 1].id, true);
    } else if (e.key === 'Enter') {
      this.enter();
    }
  }

  protected choose(id: string, navigate = true): void {
    const prev = this.chosenId();
    this.chosenId.set(id);
    if (this.mode() === '3d' && navigate && prev !== id && !this.docking()) {
      this.archipelago3d.sailToward(id);
    }
  }

  protected move(dir: 1 | -1): void {
    const ids = this.store.current()?.sections.map((u) => u.id) ?? [];
    if (ids.length === 0) return;
    const i = ids.indexOf(this.chosenId() ?? '');
    const nextId = ids[(i + dir + ids.length) % ids.length];
    this.choose(nextId, true);
  }

  protected enter(): void {
    const a = this.store.current();
    const uid = this.chosenId();
    if (!a || !uid || this.docking()) return;

    if (this.mode() === '3d') {
      if (this.archipelago3d.isDockedIn(uid)) {
        this.router.navigate(['/play', a.id, uid]);
      } else {
        this.docking.set(true);
        this.archipelago3d.sailYDock(uid, () => {
          this.docking.set(false);
          this.router.navigate(['/play', a.id, uid]);
        });
      }
    } else {
      this.router.navigate(['/play', a.id, uid]);
    }
  }

  protected wave(row: number): string {
    const y = 60 + row * 270;
    return `M80,${y} q40,-16 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0`;
  }

  private section(id: string): Section | undefined {
    return this.store.current()?.sections.find((x) => x.id === id);
  }

  protected nameOf(id: string): string {
    return this.section(id)?.title ?? id;
  }

  protected shortTitle(id: string): string {
    const t = this.nameOf(id);
    return t.length > 22 ? t.slice(0, 21) + '…' : t;
  }

  protected colorFor(id: string): string {
    const b = this.section(id)?.biome;
    if (b === 'desierto') return '#f59e0b';
    if (b === 'nieve') return '#e0f2fe';
    if (b === 'lava') return '#1f242d';
    return this.section(id)?.color || '#22c55e';
  }

  protected beachColor(id: string): string {
    const b = this.section(id)?.biome;
    if (b === 'lava') return '#44403c';
    if (b === 'nieve') return '#bae6fd';
    return '#fde68a';
  }

  protected emojiFor(id: string): string {
    return this.biomeEmoji(this.section(id)?.biome);
  }

  private attachmentIds(sectionId: string): string[] {
    const u = this.section(sectionId);
    return u?.modules.flatMap((m) => m.attachments.map((x) => x.id)) ?? [];
  }

  protected attachmentsOf(sectionId: string): number {
    return this.attachmentIds(sectionId).length;
  }

  protected biomeEmoji(biome: Biome | undefined): string {
    if (biome === 'desierto') return '🏜️';
    if (biome === 'nieve') return '❄️';
    if (biome === 'lava') return '🌋';
    return '🌿';
  }

  protected biomeLabel(biome: Biome | undefined): string {
    if (biome === 'desierto') return 'Desierto';
    if (biome === 'nieve') return 'Nieve';
    if (biome === 'lava') return 'Lava';
    return 'Pradera';
  }

  protected visitedOf(sectionId: string): number {
    const a = this.store.current();
    if (!a) return 0;
    const done = new Set(this.visits.list(a.id));
    return this.attachmentIds(sectionId).filter((id) => done.has(id)).length;
  }

  protected complete(sectionId: string): boolean {
    const total = this.attachmentsOf(sectionId);
    return total > 0 && this.visitedOf(sectionId) >= total;
  }
}
