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
import { COURSE_SEED_ID } from '../../mocks/seed';
import {
  ATTACHMENT_EMOJI,
  genSectionWorld,
  type AttachmentMarker,
  type Avatar,
  type Biome,
  type ModulePlaced,
  type WorldLayout,
} from './world-gen';
import { genQuestion, type Question } from './math';
import { World3dService } from './engine/world-3d.service';
import { AudioService } from './engine/audio.service';
import type { View } from './engine/camera-controller';
import { AvatarModularService, type AvatarBuild } from './engine/avatar-modular.service';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

interface ShopItem {
  id: string;
  emoji: string;
  name: string;
  price: number;
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
          <strong class="truncate text-accent font-bold">{{ biomeEmoji() }} {{ title() }}</strong>
          <span class="rounded-full bg-green-600/80 px-2 py-0.5 text-xs font-mono">⭐ {{ visitedIds().length }}/{{ total() }}</span>
          <span class="rounded-full bg-amber-500/80 px-2 py-0.5 text-xs font-mono">🪙 {{ coins() }}</span>
          <span class="flex-1"></span>
          @if (avatarName()) {
            <span class="rounded-full bg-violet-600/80 px-2 py-0.5 text-xs font-mono" title="Tu personaje creado en la ciudad">🧍 {{ avatarName() }}</span>
          }
          <button (click)="toggleView()" class="btn btn-xs btn-outline btn-info ui-font text-[8px]"
            title="Cambiar cámara (V): Tercera → Primera → Libre">
            🎥 {{ view() === 'tercera' ? '3ª' : view() === 'primera' ? '1ª' : 'Libre' }}
          </button>
          <button (click)="toggleEffects()" class="btn btn-xs btn-outline ui-font text-[8px]"
            [class.btn-success]="theme.effects()"
            [class.btn-warning]="!theme.effects()"
            [title]="theme.effects() ? 'Desactivar efectos visuales (clima, volcanes, fauna) [X]' : 'Activar efectos visuales (clima, volcanes, fauna) [X]'">
            ✨ {{ theme.effects() ? 'FX: ON' : 'FX: OFF' }}
          </button>
        </div>
        <p class="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white/80 ui-font text-[8px]">{{ hint() }} · arrastrar cámara · rueda zoom</p>

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
            <p class="text-3xl">{{ emoji(rd.type) }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ rd.title }}</h2>
            <div class="mt-2 flex-1 overflow-y-auto text-sm leading-relaxed text-gray-300">{{ textReading(rd) }}</div>
            @if (rd.url) {
              <a [href]="rd.url" target="_blank" rel="noopener" class="mt-2 text-sm text-primary underline">Abrir recurso 🔗</a>
            }
            <button (click)="finishReading()" class="mt-3 btn btn-sm btn-primary w-full ui-font text-[8px]">Finalizar ✅</button>
          </aside>
        } @else if (challenge(); as ch) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-center text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">🗼</p>
            <h2 class="mt-1 font-bold text-primary title-font">Desafío: {{ ch.title }}</h2>
            @if (question(); as q) {
              <p class="mt-2 text-2xl font-bold font-mono text-accent">{{ q.text }}</p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                @for (o of q.options; track o) {
                  <button (click)="answer(o)" class="btn btn-sm btn-outline btn-primary font-mono text-base">{{ o }}</button>
                }
              </div>
              @if (wrongMsg()) { <p class="mt-2 text-xs text-error ui-font">{{ wrongMsg() }} ¡Inténtalo de nuevo! 💪</p> }
            }
            <button (click)="challenge.set(null)" class="mt-2 text-xs text-gray-400 underline ui-font">seguir explorando</button>
          </aside>
        } @else if (near(); as m) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">{{ emoji(m.type) }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ m.title }}</h2>
            @if (isVisited(m.attachmentId)) {
              <p class="mt-1 text-sm font-medium text-success">✅ Ya leído</p>
              <button (click)="startReading(m)" class="mt-2 btn btn-sm btn-secondary w-full ui-font text-[8px]">Releer 🔁</button>
            } @else {
              <button (click)="startReading(m)" class="mt-2 btn btn-sm btn-primary w-full ui-font text-[8px]">Leer 📖</button>
            }
          </aside>
        } @else if (nearTower(); as t) {
          <aside class="absolute right-2 top-16 w-72 rounded-xl bg-[#1C1E2B] border border-primary/40 p-4 text-center text-white shadow-2xl chaflan" aria-live="polite">
            <p class="text-3xl">{{ towerPassed(t.moduleId) ? '✅' : '🗼' }}</p>
            <h2 class="mt-1 font-bold text-primary title-font">{{ t.title }}</h2>
            @if (!towerPassed(t.moduleId)) {
              @if (canChallenge(t.moduleId)) {
                <button (click)="openChallenge(t)" class="mt-2 btn btn-sm btn-primary w-full ui-font text-[8px]">Desafío ⚔️</button>
              } @else {
                <button disabled class="mt-2 btn btn-sm btn-disabled w-full ui-font text-[8px]">🔒 Desafío ⚔️</button>
                <p class="mt-1 text-xs text-gray-400">📦 Lee los cofres {{ attachmentsRead(t.moduleId).done }}/{{ attachmentsRead(t.moduleId).total }} primero</p>
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
            (close)="closeShop()" />
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
  near = signal<AttachmentMarker | null>(null);
  nearTower = signal<ModulePlaced | null>(null);
  nearMarket = signal<ModulePlaced | null>(null);
  inShop = signal(false);
  coins = signal(100);
  owned = signal<string[]>([]);
  shop: ShopItem[] = [
    { id: 'espada', emoji: '🗡️', name: 'Espada de madera', price: 30, desc: 'Para practicar desafíos' },
    { id: 'escudo', emoji: '🛡️', name: 'Escudo', price: 25, desc: 'Protección mock' },
    { id: 'pocion', emoji: '🧪', name: 'Poción', price: 15, desc: 'Sabe a fresa (demo)' },
    { id: 'mapa', emoji: '🗺️', name: 'Mapa del tesoro', price: 50, desc: 'No lleva a ningún lado (demo)' },
  ];
  reading = signal<AttachmentMarker | null>(null);
  challenge = signal<ModulePlaced | null>(null);
  question = signal<Question | null>(null);
  wrongMsg = signal('');
  toast = signal<string | null>(null);
  atCastle = signal(false);
  visitedIds = signal<string[]>([]);
  passedIds = signal<string[]>([]);
  /** Class of the character created in the city (informative badge, no selector). */
  avatarName = signal('');
  /** Camera view: free (orbital), third (behind) or first (eyes). */
  view = signal<View>('libre');
  /** Movement help according to the view (in 3rd person A/D turn, they do not strafe). */
  hint = computed(() =>
    this.view() === 'tercera'
      ? 'W/S avanzar · A/D girar · Shift correr · V cámara · X efectos · entra en las 🏠'
      : 'WASD/flechas moverse · Shift correr · V cámara · X efectos · entra en las 🏠',
  );
  biome = signal<Biome>('pradera');
  biomeEmoji = computed(() =>
    this.biome() === 'desierto' ? '🏜️' : this.biome() === 'nieve' ? '❄️' : this.biome() === 'lava' ? '🌋' : '🌿',
  );
  total = computed(() => this.layout?.attachments.length ?? 0);
  emoji = (t: AttachmentMarker['type']): string => ATTACHMENT_EMOJI[t];
  textReading = (m: AttachmentMarker): string => m.description?.trim() || LOREM;

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

    // Listen to real-time events (removal or edition of the section)
    this.syncSub = this.syncChannel.events$.subscribe((msg) => {
      if (msg.type === 'unit_deleted') {
        if (msg.courseId === this.aid() && msg.unitId === this.activeUnitId()) {
          this.handleDeletedSection();
        }
      } else if (msg.type === 'course_updated') {
        if (msg.courseId === this.aid()) {
          this.handleCourseUpdated();
        }
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    let id = this.route.snapshot.paramMap.get('id') ?? '';
    let sectionId = this.route.snapshot.paramMap.get('unidadId') ?? '';
    if (!sectionId && id) {
      sectionId = id;
      id = '';
    }
    if (!id) {
      const all = this.store.listAll();
      const found = all.find((c) => c.sections.some((u) => u.id === sectionId));
      id = found ? found.id : (this.store.current()?.id || COURSE_SEED_ID);
    }
    this.aid.set(id);
    this.store.open(id);
    let u = this.store.current()?.sections.find((x) => x.id === sectionId);
    if (!u) {
      for (const course of this.store.listAll()) {
        const foundU = course.sections.find((x) => x.id === sectionId);
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
      const currentUnits = this.store.current()?.sections ?? [];
      const num = parseInt(sectionId.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= currentUnits.length) {
        u = currentUnits[num - 1];
      } else {
        u = currentUnits.find((x) => x.id.startsWith(sectionId) || sectionId.startsWith(x.id)) ?? currentUnits[0];
      }
    }
    if (!u) {
      const all = this.store.listAll();
      const fallbackCourse = all[0];
      if (fallbackCourse && fallbackCourse.sections.length > 0) {
        id = fallbackCourse.id;
        this.aid.set(id);
        this.store.open(id);
        const num = parseInt(sectionId.replace(/\D/g, ''), 10);
        if (!isNaN(num) && num >= 1 && num <= fallbackCourse.sections.length) {
          u = fallbackCourse.sections[num - 1];
        } else {
          u =
            fallbackCourse.sections.find((x) => x.id.startsWith(sectionId) || sectionId.startsWith(x.id)) ??
            fallbackCourse.sections[0];
        }
      }
    }
    if (!u) {
      this.missing.set(true);
      return;
    }
    this.activeUnitId.set(u.id);
    this.title.set(u.title);
    this.layout = genSectionWorld(u, id);
    this.biome.set(this.layout.biome ?? 'pradera');
    this.visitedIds.set(this.visits.list(id));
    this.passedIds.set(this.visits.passed(id));

    // Character created in the city (modular config); without config, legacy Knight.
    let avatarSpec: Avatar | AvatarBuild = 'Knight';
    const saved = this.avatarModular.read();
    if (saved) {
      this.avatarName.set(saved.characterClass);
      try {
        avatarSpec = await this.avatarModular.buildAvatar(saved);
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
          onNearAttachment: (attachment) => this.near.set(attachment),
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

  /** Toggles first/third person camera (also with the V key). */
  protected toggleView(): void {
    this.view.set(this.world3d.toggleView());
  }

  /** Toggles visual effects (weather, volcanoes, fauna) and updates the 3D engine. */
  protected toggleEffects(): void {
    const next = this.theme.toggleEffects();
    this.world3d.setEffectsEnabled(next);
    this.showToast(next ? '✨ Efectos activados' : '⏸️ Efectos desactivados');
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'v' || e.key === 'V') {
      this.toggleView();
    } else if (e.key === 'x' || e.key === 'X') {
      this.toggleEffects();
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
    return (this.layout?.modules ?? []).filter((m) => !m.moduleId.startsWith('__')).map((m) => m.moduleId);
  }

  towerPassed(moduleId: string): boolean {
    return this.passedIds().includes(moduleId);
  }

  isVisited(attachmentId: string): boolean {
    return this.visitedIds().includes(attachmentId);
  }

  private moduleComplete(moduleId: string): boolean {
    const done = new Set(this.visitedIds());
    const mine = (this.layout?.attachments ?? []).filter((x) => x.moduleId === moduleId);
    return this.towerPassed(moduleId) && mine.every((x) => done.has(x.attachmentId));
  }

  attachmentsRead(moduleId: string): { done: number; total: number } {
    const done = new Set(this.visitedIds());
    const mine = (this.layout?.attachments ?? []).filter((x) => x.moduleId === moduleId);
    return { done: mine.filter((x) => done.has(x.attachmentId)).length, total: mine.length };
  }

  canChallenge(moduleId: string): boolean {
    const r = this.attachmentsRead(moduleId);
    return r.total === 0 || r.done >= r.total;
  }

  allComplete(): boolean {
    return this.towerIds().every((id) => this.moduleComplete(id));
  }

  unlockedCount(): number {
    const ids = this.towerIds();
    let n = 0;
    for (let i = 0; i < ids.length; i++) {
      if (i === 0 || this.moduleComplete(ids[i - 1])) n++;
      else break;
    }
    return n;
  }

  isOpenGroup(key: string): boolean {
    if (key === '__start') return true;
    const ids = this.towerIds();
    if (key === '__end') return ids.every((id) => this.moduleComplete(id));
    const i = ids.indexOf(key);
    return i === 0 || (i > 0 && this.moduleComplete(ids[i - 1]));
  }

  private showToast(msg: string): void {
    window.clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = window.setTimeout(() => this.toast.set(null), 3000);
  }

  private checkNewClearSegment(): void {
    const n = this.unlockedCount();
    if (this.prevUnlocked >= 0 && n > this.prevUnlocked) {
      this.showToast('🌫️ ¡Nuevo tramo despejado!');
      this.audio.playUnlock();
    }
    this.prevUnlocked = n;
  }

  startReading(m: AttachmentMarker): void {
    this.audio.playClick();
    this.reading.set(m);
    this.challenge.set(null);
    this.world3d.startReading();
  }

  finishReading(): void {
    const m = this.reading();
    if (m && !this.visitedIds().includes(m.attachmentId)) {
      this.visitedIds.set(this.visits.mark(this.aid(), m.attachmentId));
      this.audio.playUnlock();
      if (!this.towerPassed(m.moduleId) && this.canChallenge(m.moduleId)) {
        this.showToast('⚔️ ¡Torre desbloqueada!');
      }
    }
    this.reading.set(null);
    this.world3d.finishReading();
    this.checkNewClearSegment();
    this.maybeCelebrate();
  }

  openChallenge(t: ModulePlaced, practice = false): void {
    this.audio.playClick();
    if (!practice && !this.canChallenge(t.moduleId)) {
      const r = this.attachmentsRead(t.moduleId);
      this.showToast(`🔒 Lee los cofres ${r.done}/${r.total} primero`);
      return;
    }
    this.challenge.set(t);
    this.wrongMsg.set('');
    this.question.set(genQuestion(`${this.aid()}:${t.moduleId}`));
  }

  answer(n: number): void {
    const q = this.question();
    const t = this.challenge();
    if (!q || !t) return;
    if (n === q.answer) {
      if (this.towerPassed(t.moduleId)) {
        this.challenge.set(null);
        this.audio.playUnlock();
        this.showToast('✅ ¡Correcto! (práctica)');
        return;
      }
      this.passedIds.set(this.visits.pass(this.aid(), t.moduleId));
      this.challenge.set(null);
      this.audio.playUnlock();
      this.showToast('✅ ¡Torre superada!');
      this.world3d.refreshVisibility();
      this.checkNewClearSegment();
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
    if (!item || this.owned().includes(id) || this.coins() < item.price) return;
    this.coins.set(this.coins() - item.price);
    this.owned.set([...this.owned(), id]);
    this.audio.playCoin();
    this.showToast(`🛒 ¡${item.name} comprado! (demo)`);
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

  private handleDeletedSection(): void {
    this.showToast('⚠️ Esta unidad fue eliminada por el profesor');
    setTimeout(() => {
      this.router.navigate(['/play', this.aid()]);
    }, 1400);
  }

  private handleCourseUpdated(): void {
    this.store.open(this.aid());
    const u = this.store.current()?.sections.find((x) => x.id === this.activeUnitId());
    if (!u) {
      this.handleDeletedSection();
      return;
    }
    if (this.title() !== u.title) {
      this.title.set(u.title);
      this.showToast(`📝 Unidad actualizada: ${u.title}`);
    }
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.world3d.destroy();
  }
}
