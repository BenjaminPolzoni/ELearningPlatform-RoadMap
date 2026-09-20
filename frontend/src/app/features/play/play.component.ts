import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { StoreService } from '../../core/educa/store.service';
import { SyncChannelService } from '../../core/educa/sync-channel.service';
import { VisitService } from '../../core/educa/visit.service';
import { ThemeService } from '../../core/theme.service';
import { CURSO_SEED_ID } from '../../mocks/seed';
import {
  ANEXO_EMOJI,
  genUnidadWorld,
  type AnexoMarker,
  type Avatar,
  type Biome,
  type ModuloPlaced,
  type WorldLayout,
} from './world-gen';
import { genQuestion, type Question } from './math';
import { World3dService } from './engine/world-3d.service';
import { AudioService } from './engine/audio.service';
import type { Vista } from './engine/camera-controller';
import { AvatarModularService, type AvatarBuild } from './engine/avatar-modular.service';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

interface ShopItem {
  id: string;
  emoji: string;
  nombre: string;
  precio: number;
  desc: string;
}

import { DungeonShopModalComponent } from './dungeon-shop-modal';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [RouterLink, DungeonShopModalComponent],
  providers: [World3dService],
  template: `
    @if (missing()) {
      <div class="p-6 text-center text-white">
        <p>Mundo no encontrado.</p>
        <a routerLink="/alumno" class="btn btn-sm btn-primary mt-3 ui-font text-[9px]">← Volver a Mis clases</a>
      </div>
    } @else {
      <div class="relative h-[calc(100dvh-57px)] w-full overflow-hidden"
        [class.bg-[#1a110b]]="theme.environment() === 'tabletop'"
        [class.bg-[#0f0b1a]]="theme.environment() === 'arcade'">
        <canvas #cv class="block h-full w-full touch-none"></canvas>

        <div class="absolute left-2 right-2 top-2 flex flex-wrap items-center gap-2 rounded-xl bg-black/60 p-2 text-sm text-white backdrop-blur border border-white/10 shadow-lg">
          <a routerLink="/alumno" class="btn btn-xs btn-outline btn-accent ui-font text-[8px]" title="Volver a Mis clases">← Mis clases</a>
          @if (aid()) {
            <a [routerLink]="['/play', aid()]" class="btn btn-xs btn-ghost ui-font text-[8px]">Mundos</a>
          }
          <strong class="truncate text-accent font-bold">{{ biomaEmoji() }} {{ title() }}</strong>
          <span class="rounded-full bg-green-600/80 px-2 py-0.5 text-xs font-mono">⭐ {{ visitedIds().length }}/{{ total() }}</span>
          <span class="rounded-full bg-amber-500/80 px-2 py-0.5 text-xs font-mono">🪙 {{ coins() }}</span>
          <span class="flex-1"></span>
          @if (avatarNombre()) {
            <span class="rounded-full bg-violet-600/80 px-2 py-0.5 text-xs font-mono" title="Tu personaje creado en la ciudad">🧍 {{ avatarNombre() }}</span>
          }
          <button (click)="alternarVista()" class="btn btn-xs btn-outline btn-info ui-font text-[8px]"
            title="Cambiar cámara (V): Tercera → Primera → Libre">
            🎥 {{ vista() === 'tercera' ? '3ª' : vista() === 'primera' ? '1ª' : 'Libre' }}
          </button>
          <button (click)="alternarEfectos()" class="btn btn-xs btn-outline ui-font text-[8px]"
            [class.btn-success]="theme.effects()"
            [class.btn-warning]="!theme.effects()"
            [title]="theme.effects() ? 'Desactivar efectos visuales (clima, volcanes, fauna) [X]' : 'Activar efectos visuales (clima, volcanes, fauna) [X]'">
            ✨ {{ theme.effects() ? 'FX: ON' : 'FX: OFF' }}
          </button>
        </div>
        <p class="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white/80 ui-font text-[8px]">{{ ayuda() }} · arrastrar cámara · rueda zoom</p>

        @if (atCastle()) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-center text-white shadow-2xl chaflan" aria-live="polite">
            @if (allComplete()) {
              <p class="text-3xl animate-bounce">🏆</p>
              <h2 class="mt-1 font-bold text-primary title-font">¡Unidad completada!</h2>
              <p class="text-sm text-gray-400">{{ title() }} · {{ visitedIds().length }}/{{ total() }} cofres</p>
              <a routerLink="/alumno" class="btn btn-primary btn-sm mt-3 w-full ui-font text-[8px]">← MIS CLASES</a>
            } @else {
              <p class="text-3xl">🔒</p>
              <h2 class="mt-1 font-bold text-primary title-font">El castillo aguarda…</h2>
              <p class="text-sm text-gray-400">Completa torres y cofres. Sigue el camino 👣</p>
            }
          </aside>
        } @else if (reading(); as rd) {
          <aside class="absolute bottom-2 right-2 top-16 flex w-80 flex-col rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">{{ emoji(rd.tipo) }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ rd.titulo }}</h2>
            <div class="mt-2 flex-1 overflow-y-auto text-sm leading-relaxed text-gray-300">{{ textoLectura(rd) }}</div>
            @if (rd.url) {
              <a [href]="rd.url" target="_blank" rel="noopener" class="mt-2 text-sm text-primary underline">Abrir recurso 🔗</a>
            }
            <button (click)="finishReading()" class="mt-3 btn btn-sm btn-primary w-full ui-font text-[8px]">Finalizar ✅</button>
          </aside>
        } @else if (challenge(); as ch) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-center text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">🗼</p>
            <h2 class="mt-1 font-bold text-primary title-font">Desafío: {{ ch.titulo }}</h2>
            @if (question(); as q) {
              <p class="mt-2 text-2xl font-bold font-mono text-accent">{{ q.texto }}</p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                @for (o of q.opciones; track o) {
                  <button (click)="answer(o)" class="btn btn-sm btn-outline btn-primary font-mono text-base">{{ o }}</button>
                }
              </div>
              @if (wrongMsg()) { <p class="mt-2 text-xs text-error ui-font">{{ wrongMsg() }} ¡Inténtalo de nuevo! 💪</p> }
            }
            <button (click)="challenge.set(null)" class="mt-2 text-xs text-gray-400 underline ui-font">seguir explorando</button>
          </aside>
        } @else if (near(); as m) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">{{ emoji(m.tipo) }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ m.titulo }}</h2>
            @if (isVisited(m.anexoId)) {
              <p class="mt-1 text-sm font-medium text-success">✅ Ya leído</p>
              <button (click)="startReading(m)" class="mt-2 btn btn-sm btn-secondary w-full ui-font text-[8px]">Releer 🔁</button>
            } @else {
              <button (click)="startReading(m)" class="mt-2 btn btn-sm btn-primary w-full ui-font text-[8px]">Leer 📖</button>
            }
          </aside>
        } @else if (nearTower(); as t) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-center text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">{{ towerPassed(t.moduloId) ? '✅' : '🗼' }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ t.titulo }}</h2>
            @if (!towerPassed(t.moduloId)) {
              @if (canChallenge(t.moduloId)) {
                <button (click)="openChallenge(t)" class="mt-2 btn btn-sm btn-primary w-full ui-font text-[8px]">Desafío ⚔️</button>
              } @else {
                <button disabled class="mt-2 btn btn-sm btn-disabled w-full ui-font text-[8px]">🔒 Desafío ⚔️</button>
                <p class="mt-1 text-xs text-gray-400">📦 Lee los cofres {{ anexosRead(t.moduloId).done }}/{{ anexosRead(t.moduloId).total }} primero</p>
              }
            } @else {
              <p class="text-sm text-success font-medium">Torre superada ✅</p>
              <button (click)="openChallenge(t, true)" class="mt-2 btn btn-sm btn-secondary w-full ui-font text-[8px]">Repetir 🔁</button>
            }
          </aside>
        } @else if (nearMarket() && !inShop()) {
          <aside class="absolute left-1/2 bottom-20 -translate-x-1/2 z-30 flex items-center gap-3.5 rounded-2xl bg-[#1C1E2B]/95 border-2 border-amber-400/80 backdrop-blur-md px-5 py-3.5 text-white shadow-2xl chaflan pointer-events-auto transition-all animate-bounce" aria-live="polite">
            <span class="text-3xl filter drop-shadow">🏪</span>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-bold text-amber-300 title-font text-xs sm:text-sm tracking-wide">Mercado del Calabozo</h2>
                <span class="badge badge-warning badge-xs font-mono text-[8px] font-bold">ABIERTO</span>
              </div>
              <p class="text-[10px] text-gray-300 mt-0.5">Pulsa <kbd class="kbd kbd-xs bg-amber-500/20 text-amber-300 border-amber-400/50 font-mono font-bold">E</kbd> o pulsa para entrar al bazar 3D</p>
            </div>
            <button (click)="openShop()" class="btn btn-sm bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold border-none ui-font text-[10px] shadow-lg ml-2 px-3.5 py-1">
              Entrar 🚪
            </button>
          </aside>
        }

        @if (inShop()) {
          <app-dungeon-shop-modal
            [(coins)]="coins"
            [(owned)]="owned"
            (cerrar)="closeShop()" />
        }

        @if (toast()) {
          <p class="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black/80 border border-white/20 px-4 py-2 text-xs text-white shadow-lg ui-font">{{ toast() }}</p>
        }

        @if (loading()) {
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white z-50">
            <span class="loading loading-spinner loading-lg text-primary mb-3"></span>
            <p class="ui-font text-xs tracking-wider">Cargando mundo hexagonal… {{ pct() }}%</p>
          </div>
        }
        @if (error()) {
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white z-50">
            <p class="text-error ui-font text-sm">😢 {{ error() }}</p>
            <button (click)="reload()" class="btn btn-sm btn-primary ui-font text-[8px]">Reintentar</button>
          </div>
        }
      </div>
    }
  `,
})
export class PlayComponent implements AfterViewInit, OnDestroy {
  private store = inject(StoreService);
  private visits = inject(VisitService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private syncChannel = inject(SyncChannelService);
  private world3d = inject(World3dService);
  private audio = inject(AudioService);
  private avatarModular = inject(AvatarModularService);
  public theme = inject(ThemeService);
  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');

  aid = signal('');
  activeUnitId = signal('');
  title = signal('');
  missing = signal(false);
  loading = signal(true);
  pct = signal(0);
  error = signal('');
  near = signal<AnexoMarker | null>(null);
  nearTower = signal<ModuloPlaced | null>(null);
  nearMarket = signal<ModuloPlaced | null>(null);
  inShop = signal(false);
  coins = signal(100);
  owned = signal<string[]>([]);
  shop: ShopItem[] = [
    { id: 'espada', emoji: '🗡️', nombre: 'Espada de madera', precio: 30, desc: 'Para practicar desafíos' },
    { id: 'escudo', emoji: '🛡️', nombre: 'Escudo', precio: 25, desc: 'Protección mock' },
    { id: 'pocion', emoji: '🧪', nombre: 'Poción', precio: 15, desc: 'Sabe a fresa (demo)' },
    { id: 'mapa', emoji: '🗺️', nombre: 'Mapa del tesoro', precio: 50, desc: 'No lleva a ningún lado (demo)' },
  ];
  reading = signal<AnexoMarker | null>(null);
  challenge = signal<ModuloPlaced | null>(null);
  question = signal<Question | null>(null);
  wrongMsg = signal('');
  toast = signal<string | null>(null);
  atCastle = signal(false);
  visitedIds = signal<string[]>([]);
  passedIds = signal<string[]>([]);
  /** Clase del personaje creado en la ciudad (insignia informativa, sin selector). */
  avatarNombre = signal('');
  /** Vista de cámara: libre (orbital), tercera (detrás) o primera (ojos). */
  vista = signal<Vista>('libre');
  /** Ayuda de movimiento según la vista (en 3ª A/D giran, no strafean). */
  ayuda = computed(() =>
    this.vista() === 'tercera'
      ? 'W/S avanzar · A/D girar · Shift correr · V cámara · X efectos · entra en las 🏠'
      : 'WASD/flechas moverse · Shift correr · V cámara · X efectos · entra en las 🏠',
  );
  bioma = signal<Biome>('pradera');
  biomaEmoji = computed(() =>
    this.bioma() === 'desierto' ? '🏜️' : this.bioma() === 'nieve' ? '❄️' : this.bioma() === 'lava' ? '🌋' : '🌿',
  );
  total = computed(() => this.layout?.anexos.length ?? 0);
  emoji = (t: AnexoMarker['tipo']): string => ANEXO_EMOJI[t];
  textoLectura = (m: AnexoMarker): string => m.descripcion?.trim() || LOREM;

  private layout: WorldLayout | null = null;
  private prevUnlocked = -1;
  private toastTimer = 0;
  private celebrated = false;
  private syncSub?: Subscription;

  constructor() {
    effect(() => {
      const currentEnv = this.theme.environment();
      this.world3d.applyTheme(currentEnv);
    });
    effect(() => {
      this.world3d.setEffectsEnabled(this.theme.effects());
    });

    // Escuchar eventos en tiempo real (eliminación o edición de la unidad)
    this.syncSub = this.syncChannel.events$.subscribe((msg) => {
      if (msg.type === 'unit_deleted') {
        if (msg.courseId === this.aid() && msg.unitId === this.activeUnitId()) {
          this.manejarUnidadEliminada();
        }
      } else if (msg.type === 'course_updated') {
        if (msg.courseId === this.aid()) {
          this.manejarCursoActualizado();
        }
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    let id = this.route.snapshot.paramMap.get('id') ?? '';
    let unidadId = this.route.snapshot.paramMap.get('unidadId') ?? '';
    if (!unidadId && id) {
      unidadId = id;
      id = '';
    }
    if (!id) {
      const all = this.store.listAll();
      const found = all.find((c) => c.unidades.some((u) => u.id === unidadId));
      id = found ? found.id : (this.store.current()?.id || CURSO_SEED_ID);
    }
    this.aid.set(id);
    this.store.open(id);
    let u = this.store.current()?.unidades.find((x) => x.id === unidadId);
    if (!u) {
      for (const course of this.store.listAll()) {
        const foundU = course.unidades.find((x) => x.id === unidadId);
        if (foundU) {
          id = course.id;
          this.aid.set(id);
          this.store.open(id);
          u = foundU;
          break;
        }
      }
    }
    if (!u) {
      const currentUnits = this.store.current()?.unidades ?? [];
      const num = parseInt(unidadId.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= currentUnits.length) {
        u = currentUnits[num - 1];
      } else {
        u = currentUnits.find((x) => x.id.startsWith(unidadId) || unidadId.startsWith(x.id)) ?? currentUnits[0];
      }
    }
    if (!u) {
      const all = this.store.listAll();
      const fallbackCourse = all[0];
      if (fallbackCourse && fallbackCourse.unidades.length > 0) {
        id = fallbackCourse.id;
        this.aid.set(id);
        this.store.open(id);
        const num = parseInt(unidadId.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num >= 1 && num <= fallbackCourse.unidades.length) {
          u = fallbackCourse.unidades[num - 1];
        } else {
          u =
            fallbackCourse.unidades.find((x) => x.id.startsWith(unidadId) || unidadId.startsWith(x.id)) ??
            fallbackCourse.unidades[0];
        }
      }
    }
    if (!u) {
      this.missing.set(true);
      return;
    }
    this.activeUnitId.set(u.id);
    this.title.set(u.titulo);
    this.layout = genUnidadWorld(u, id);
    this.bioma.set(this.layout.bioma ?? 'pradera');
    this.visitedIds.set(this.visits.list(id));
    this.passedIds.set(this.visits.passed(id));

    // Personaje creado en la ciudad (config modular); sin config, Knight legado.
    let avatarSpec: Avatar | AvatarBuild = 'Knight';
    const guardado = this.avatarModular.leer();
    if (guardado) {
      this.avatarNombre.set(guardado.characterClass);
      try {
        avatarSpec = await this.avatarModular.buildAvatar(guardado);
      } catch {
        avatarSpec = 'Knight';
      }
    }

    this.world3d
      .init(
        this.cv().nativeElement,
        this.layout,
        avatarSpec,
        {
          onProgress: (p) => this.pct.set(p),
          onNearAnexo: (anexo) => this.near.set(anexo),
          onNearTower: (tower) => this.nearTower.set(tower),
          onNearMarket: (market) => this.nearMarket.set(market),
          onAtCastle: (atCastle) => {
            this.atCastle.set(atCastle);
            if (atCastle) this.maybeCelebrate();
          },
          onHitFogBarrier: () => this.showToast('🌫️ Completa este tramo para avanzar'),
          isOpenGroup: (key) => this.isOpenGroup(key),
          unlockedCount: () => this.unlockedCount(),
          towerIds: () => this.towerIds(),
        },
        this.theme.environment(),
      )
      .then(() => {
        this.world3d.setEffectsEnabled(this.theme.effects());
        this.loading.set(false);
      })
      .catch((e) => {
        this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el mundo');
        this.loading.set(false);
      });
  }

  reload(): void {
    window.location.reload();
  }

  /** Conmuta cámara primera/tercera persona (también con la tecla V). */
  protected alternarVista(): void {
    this.vista.set(this.world3d.alternarVista());
  }

  /** Conmuta efectos visuales (clima, volcanes, fauna) y actualiza el motor 3D. */
  protected alternarEfectos(): void {
    const next = this.theme.toggleEffects();
    this.world3d.setEffectsEnabled(next);
    this.showToast(next ? '✨ Efectos activados' : '⏸️ Efectos desactivados');
  }

  @HostListener('document:keydown', ['$event'])
  protected onTeclaVista(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'v' || e.key === 'V') {
      this.alternarVista();
    } else if (e.key === 'x' || e.key === 'X') {
      this.alternarEfectos();
    } else if (
      (e.key === 'e' || e.key === 'E' || e.key === 'Enter') &&
      this.nearMarket() &&
      !this.inShop() &&
      !this.reading() &&
      !this.challenge()
    ) {
      e.preventDefault();
      this.openShop();
    }
  }

  towerIds(): string[] {
    return (this.layout?.modulos ?? []).filter((m) => !m.moduloId.startsWith('__')).map((m) => m.moduloId);
  }

  towerPassed(moduloId: string): boolean {
    return this.passedIds().includes(moduloId);
  }

  isVisited(anexoId: string): boolean {
    return this.visitedIds().includes(anexoId);
  }

  private moduloComplete(moduloId: string): boolean {
    const done = new Set(this.visitedIds());
    const mine = (this.layout?.anexos ?? []).filter((x) => x.moduloId === moduloId);
    return this.towerPassed(moduloId) && mine.every((x) => done.has(x.anexoId));
  }

  anexosRead(moduloId: string): { done: number; total: number } {
    const done = new Set(this.visitedIds());
    const mine = (this.layout?.anexos ?? []).filter((x) => x.moduloId === moduloId);
    return { done: mine.filter((x) => done.has(x.anexoId)).length, total: mine.length };
  }

  canChallenge(moduloId: string): boolean {
    const r = this.anexosRead(moduloId);
    return r.total === 0 || r.done >= r.total;
  }

  allComplete(): boolean {
    return this.towerIds().every((id) => this.moduloComplete(id));
  }

  unlockedCount(): number {
    const ids = this.towerIds();
    let n = 0;
    for (let i = 0; i < ids.length; i++) {
      if (i === 0 || this.moduloComplete(ids[i - 1])) n++;
      else break;
    }
    return n;
  }

  isOpenGroup(key: string): boolean {
    if (key === '__start') return true;
    const ids = this.towerIds();
    if (key === '__end') return ids.every((id) => this.moduloComplete(id));
    const i = ids.indexOf(key);
    return i === 0 || (i > 0 && this.moduloComplete(ids[i - 1]));
  }

  private showToast(msg: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = window.setTimeout(() => this.toast.set(null), 3000);
  }

  private checkNewTramoDespejado(): void {
    const n = this.unlockedCount();
    if (this.prevUnlocked >= 0 && n > this.prevUnlocked) {
      this.showToast('🌫️ ¡Nuevo tramo despejado!');
      this.audio.playUnlock();
    }
    this.prevUnlocked = n;
  }

  startReading(m: AnexoMarker): void {
    this.audio.playClick();
    this.reading.set(m);
    this.challenge.set(null);
    this.world3d.startReading();
  }

  finishReading(): void {
    const m = this.reading();
    if (m && !this.visitedIds().includes(m.anexoId)) {
      this.visitedIds.set(this.visits.mark(this.aid(), m.anexoId));
      this.audio.playUnlock();
      if (!this.towerPassed(m.moduloId) && this.canChallenge(m.moduloId)) {
        this.showToast('⚔️ ¡Torre desbloqueada!');
      }
    }
    this.reading.set(null);
    this.world3d.finishReading();
    this.checkNewTramoDespejado();
    this.maybeCelebrate();
  }

  openChallenge(t: ModuloPlaced, practice = false): void {
    this.audio.playClick();
    if (!practice && !this.canChallenge(t.moduloId)) {
      const r = this.anexosRead(t.moduloId);
      this.showToast(`🔒 Lee los cofres ${r.done}/${r.total} primero`);
      return;
    }
    this.challenge.set(t);
    this.wrongMsg.set('');
    this.question.set(genQuestion(`${this.aid()}:${t.moduloId}`));
  }

  answer(n: number): void {
    const q = this.question();
    const t = this.challenge();
    if (!q || !t) return;
    if (n === q.respuesta) {
      if (this.towerPassed(t.moduloId)) {
        this.challenge.set(null);
        this.audio.playUnlock();
        this.showToast('✅ ¡Correcto! (práctica)');
        return;
      }
      this.passedIds.set(this.visits.pass(this.aid(), t.moduloId));
      this.challenge.set(null);
      this.audio.playUnlock();
      this.showToast('✅ ¡Torre superada!');
      this.world3d.refreshVisibility();
      this.checkNewTramoDespejado();
      this.maybeCelebrate();
    } else {
      this.wrongMsg.set('❌ Esa no es.');
    }
  }

  private maybeCelebrate(): void {
    if (this.celebrated || !this.allComplete()) return;
    this.celebrated = true;
    this.audio.playFanfare();
    this.showToast('🏆 ¡Unidad completada!');
    this.world3d.startCelebration();
  }

  buy(id: string): void {
    const item = this.shop.find((x) => x.id === id);
    if (!item || this.owned().includes(id) || this.coins() < item.precio) return;
    this.coins.set(this.coins() - item.precio);
    this.owned.set([...this.owned(), id]);
    this.audio.playCoin();
    this.showToast(`🛒 ¡${item.nombre} comprado! (demo)`);
  }

  openShop(): void {
    this.audio.playClick();
    this.world3d.startReading();
    this.inShop.set(true);
  }

  closeShop(): void {
    this.inShop.set(false);
    this.world3d.finishReading();
  }

  private manejarUnidadEliminada(): void {
    this.showToast('⚠️ Esta unidad fue eliminada por el profesor');
    setTimeout(() => {
      this.router.navigate(['/play', this.aid()]);
    }, 1400);
  }

  private manejarCursoActualizado(): void {
    this.store.open(this.aid());
    const u = this.store.current()?.unidades.find((x) => x.id === this.activeUnitId());
    if (!u) {
      this.manejarUnidadEliminada();
      return;
    }
    if (this.title() !== u.titulo) {
      this.title.set(u.titulo);
      this.showToast(`📝 Unidad actualizada: ${u.titulo}`);
    }
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.world3d.destroy();
  }
}
