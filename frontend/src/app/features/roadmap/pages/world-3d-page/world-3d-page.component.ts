import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthMockService } from '../../data-access/session/auth-mock.service';
import { RoadmapStore } from '../../data-access/roadmap/roadmap.store';
import { StoreService } from '../../data-access/educa/store.service';
import { COURSE_SEED_ID } from '../../data-access/mocks/seed';
import { defaultDescription, Section, XP_BY_DIFFICULTY } from '../../data-access/roadmap/roadmap.models';
import { RankingPanelComponent } from '../../ui/ranking-panel/ranking-panel.component';
import { toEmbedUrl } from '../../domain/resource-embed.util';
import { TutorialCardComponent } from '../../ui/tutorial-card/tutorial-card.component';
import { isTutorialScene, TutorialState } from '../../data-access/tutorial/tutorial-state';
import { RoleSwitchComponent } from '../../ui/role-switch/role-switch.component';
import {
  BIOME_TO_WORLD_THEME,
  GeneratedWorld,
  generateVerticalWorld,
  QuestionData,
  VerticalChallenge,
  WorldTheme,
} from '../../domain/vertical-world/vertical-world.engine';

/**
 * Contract of the messages the Three.js scene sends to the host via
 * `window.parent.postMessage` when the player touches a playable challenge node on
 * their 3D island (the city↔island teleport is handled by the 3D world itself; it is no longer
 * necessary to navigate to another route for that).
 */
interface MessageEnterActivity {
  type: 'enterActivity';
  unitId: string;
  activityId: string;
}

function isMessageEnterActivity(data: unknown): data is MessageEnterActivity {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { type?: unknown }).type === 'enterActivity' &&
    typeof (data as { unitId?: unknown }).unitId === 'string' &&
    typeof (data as { activityId?: unknown }).activityId === 'string'
  );
}

/**
 * Message to navigate to the Educa hexagonal map corresponding to the section.
 */
interface MessageOpenUnitPlay {
  type: 'openUnitPlay';
  unitId: string;
}

function isMessageOpenUnitPlay(data: unknown): data is MessageOpenUnitPlay {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { type?: unknown }).type === 'openUnitPlay' &&
    typeof (data as { unitId?: unknown }).unitId === 'string'
  );
}

/**
 * Message the Three.js scene sends when the player touches "Ver Ranking" near
 * the holographic podium next to the Trophy (see `buildRankingPodium` in
 * index.html) — the 3D world knows nothing about the ranking itself, it only signals that it has to be
 * shown; Angular already has the full `RankingPanel` (same component used by
 * the 2D map) and mounts it as an overlay over the iframe.
 */
function isMessageOpenRanking(data: unknown): data is { type: 'openRanking' } {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'openRanking';
}

/**
 * Message the Three.js scene sends when the player enters the hub's Temple
 * (see `Structures/Temple-dec.glb` in index.html) — opens the theory material
 * tab (static mock until the content service is connected).
 */
function isMessageOpenMaterials(data: unknown): data is { type: 'openMaterials' } {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'openMaterials';
}

@Component({
  selector: 'app-world-3d-page',
  standalone: true,
  imports: [RankingPanelComponent, TutorialCardComponent, RoleSwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="world-3d">
      <div class="role-actions">
        <app-role-switch [compact]="true" />
      </div>
      <iframe
        #frame
        title="Mundo 3D"
        [src]="world3dUrl"
        allow="autoplay; fullscreen; gamepad; pointer-lock"
        allowfullscreen
        (load)="onFrameLoad()"
      ></iframe>

      <div class="reward-announcement" role="status" aria-live="polite" aria-atomic="true">
        @if (rewardNotice(); as reward) {
          <div class="reward-toast">
            <span aria-hidden="true">✦</span>
            <div><strong>{{ reward.unitCompleted ? '¡Unidad completada!' : '¡Desafío completado!' }}</strong>
              <p>{{ reward.unitCompleted ? reward.unitName : 'Un paso más en tu camino' }}</p></div>
            @if (reward.xp > 0) { <b>+{{ reward.xp }} XP</b> }
          </div>
        }
      </div>

      @if (tutorialAvailable()) {
        @if (tutorialVisible()) {
          <app-tutorial-card class="tutorial-dock" [step]="tutorial.step()"
            [targetName]="tutorial.step() === 3 ? tutorial.destination()!.activityName : tutorial.destination()!.unitName"
            [returnToCity]="tutorial.scene()!.zone !== 'city' && tutorial.step() === 2"
            (skip)="skipTutorial()" />
        }
        @if (tutorial.helpEmpty()) {
          <section class="tutorial-notice tutorial-dock" role="status">
            <strong>Explorá a tu ritmo</strong>
            <p>Todavía no hay desafíos disponibles para practicar.</p>
            <p>WASD: moverte · Shift: correr · Rueda: zoom.</p>
            <button type="button" (click)="tutorial.helpEmpty.set(false); focusWorld()">Entendido</button>
          </section>
        }
        @if (tutorial.celebration()) {
          <div class="tutorial-notice tutorial-dock" role="status">✓ ¡Listo! Ya sabés explorar.
            <p>Podés repetir la guía desde Ayuda.</p>
          </div>
        }
        <button class="tutorial-help" type="button" aria-label="Repetir tutorial de primeros pasos"
          (click)="restartTutorial()"><span aria-hidden="true">?</span> Ayuda</button>
      }

      <!-- ACTIVITY AND QUESTIONS MODAL (Interactive quiz) — same visual component
           as the 2D map (section-map.ts), reused as an overlay on top of the persistent
           3D iframe: tapping a challenge node on the 3D island opens this instead of
           navigating to another route. -->
      @if (activeChallenge(); as c) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="modal-box max-w-xl border-4 border-primary bg-[#1C1E2B] p-6 text-white shadow-2xl chamfer">
            <div class="flex items-start justify-between gap-3 border-b-2 border-white/10 pb-3">
              <div>
                <span class="ui-font text-[8px] text-accent tracking-widest">
                  {{
                    c.type === 'theory'
                      ? 'CONTENIDO TEÓRICO'
                      : isCompleted(c)
                        ? 'MODO REPASO'
                        : c.recovery
                          ? 'RECUPERACIÓN DE VIDA'
                          : 'DESAFÍO ' + c.id
                  }} · ACTIVIDAD
                </span>
                <h2 class="title-font mt-1 text-xl text-primary">{{ c.title }}</h2>
              </div>
              <button
                class="btn btn-ghost btn-sm text-lg text-white/70 hover:text-white"
                (click)="closeActivity()"
                aria-label="Cerrar actividad"
              >
                ✕
              </button>
            </div>

            <div class="my-4">
              @if (c.type === 'theory') {
                <!-- Theory content node: embedded material (PDF/video/PPT via external
                     link), no quiz — reading/watching is enough to continue. -->
                <p class="text-sm text-[#E0E2EC] opacity-90 mb-3">{{ c.description }}</p>
                <div class="rounded-lg overflow-hidden border border-white/10 bg-black/30" style="aspect-ratio: 16/9">
                  <iframe [src]="embedUrl(c)" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
                </div>
                <a [href]="c.resourceUrl" target="_blank" rel="noopener" class="link link-primary text-xs mt-2 inline-block">
                  Abrir en pestaña nueva ↗
                </a>
              } @else if (!isQuizResolved()) {
                <p class="text-base text-[#F3EAFF] leading-relaxed mb-4">
                  {{ currentQuestion(c).question }}
                </p>

                <div class="flex flex-col gap-2.5" role="group" aria-label="Opciones de respuesta">
                  @for (opt of currentQuestion(c).options; track $index) {
                    <button
                      type="button"
                      class="flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all text-sm"
                      [class.border-primary]="selectedAnswer() === $index"
                      [class.bg-primary/20]="selectedAnswer() === $index"
                      [class.border-white/10]="selectedAnswer() !== $index"
                      [class.bg-black/30]="selectedAnswer() !== $index"
                      [class.hover:border-primary/50]="selectedAnswer() !== $index"
                      (click)="selectedAnswer.set($index)"
                    >
                      <span class="flex items-center gap-3">
                        <span class="ui-font text-[9px] text-accent">
                          {{ ['A', 'B', 'C', 'D'][$index] }}.
                        </span>
                        <span>{{ opt }}</span>
                      </span>
                      @if (selectedAnswer() === $index) {
                        <span class="text-primary font-bold">●</span>
                      }
                    </button>
                  }
                </div>

                @if (quizFeedback()) {
                  <div class="alert alert-error mt-4 text-xs ui-font py-2.5">
                    <span>{{ quizFeedback() }}</span>
                  </div>
                }
              } @else {
                <div class="flex flex-col items-center py-6 text-center">
                  <div class="text-5xl mb-3 animate-bounce">
                    {{ c.recovery ? '♥' : '🏆' }}
                  </div>
                  <span class="ui-font text-[9px] text-accent">
                    {{ isCompleted(c) ? '¡CONOCIMIENTO REFORZADO!' : c.recovery ? '¡VIDA RECUPERADA!' : '¡DESAFÍO COMPLETADO!' }}
                  </span>
                  <h3 class="title-font text-2xl text-primary mt-1">
                    {{ c.id === activeWorld()?.mainCount ? '¡HAS LLEGADO A LA META!' : '¡Excelente trabajo explorador!' }}
                  </h3>
                  <p class="mt-3 text-sm text-[#E0E2EC] max-w-md opacity-90">
                    {{ currentQuestion(c).explanation }}
                  </p>

                  <div class="mt-5 flex items-center gap-4 rounded-xl border border-primary/40 bg-black/40 px-5 py-2.5">
                    <span class="ui-font text-[9px] text-white/70">{{ isCompleted(c) ? 'Práctica completada' : 'Recompensa al continuar:' }}</span>
                    <strong class="ui-font text-sm text-accent">
                      @if (!isCompleted(c)) { +{{ c.xp }} XP }
                      @if (c.recovery) {
                        · +1 VIDA ♥
                      }
                    </strong>
                  </div>
                </div>
              }
            </div>

            <div class="modal-action border-t-2 border-white/10 pt-3">
              @if (saveError()) { <p role="alert" class="text-red-300 text-sm">{{ saveError() }}</p> }
              @if (c.type === 'theory') {
                <button type="button" [disabled]="savingProgress()" class="btn btn-primary w-full ui-font text-[9px]" (click)="onCompleteActivity(c)">
                  {{
                    c.id < (activeWorld()?.mainCount ?? c.id)
                      ? 'CONTINUAR AL DESAFÍO ' + (c.id + 1) + ' →'
                      : 'CONTINUAR →'
                  }}
                </button>
              } @else if (!isQuizResolved()) {
                <button
                  type="button"
                  class="btn btn-primary w-full ui-font text-[9px]"
                  [disabled]="selectedAnswer() === null"
                  (click)="checkAnswer(c)"
                >
                  COMPROBAR RESPUESTA →
                </button>
              } @else {
                <button type="button" [disabled]="savingProgress()" class="btn btn-primary w-full ui-font text-[9px]" (click)="onCompleteActivity(c)">
                  {{
                    c.optional
                      ? 'VOLVER AL MAPA →'
                      : c.id < (activeWorld()?.mainCount ?? c.id)
                        ? 'CONTINUAR AL DESAFÍO ' + (c.id + 1) + ' →'
                        : '¡FINALIZAR UNIDAD! →'
                  }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- RANKING PANEL — same component used by the 2D map (map.ts), reused
           as an overlay on top of the 3D iframe: tapping "Ver Ranking" on the podium next
           to the Trophy opens this instead of a separate screen. -->
      @if (rankingOpen()) {
        <app-ranking-panel (close)="rankingOpen.set(false)" />
      }
    </div>
  `,
  styles: `
    .reward-announcement { position: absolute; bottom: 145px; left: 50%; transform: translateX(-50%); z-index: 26; pointer-events: none; width: max-content; max-width: calc(100% - 40px); }
    .reward-toast { display: flex; align-items: center; gap: 18px; padding: 16px 22px; border: 1px solid #facc1570; border-radius: 12px; background: #121620f2; color: #fff8dd; box-shadow: 0 8px 32px #0005; animation: reward-in .2s ease-out; }
    .reward-toast > span { color: #facc15; font-size: 28px; }
    .reward-toast strong, .reward-toast b { font-family: var(--font-pixel); font-size: 11px; }
    .reward-toast b { color: #facc15; white-space: nowrap; }
    .reward-toast p { margin: 6px 0 0; font-size: 13px; color: #ded9c7; max-width: 320px; overflow-wrap: anywhere; }
    @keyframes reward-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .reward-toast { animation: none; } }
    .world-3d {
      position: fixed;
      inset: 0;
      background: #000;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .role-actions {
      position: absolute;
      top: 0.6rem;
      left: 0.6rem;
      z-index: 20;
      display: flex;
      gap: 0.4rem;
    }
    .tutorial-dock { position:absolute; left:20px; bottom:20px; z-index:25; }
    .tutorial-help { position:absolute; right:20px; bottom:20px; z-index:25;
      display:flex; align-items:center; gap:7px; border:1px solid #57747d; border-radius:6px;
      padding:8px 12px; background:#121620ed; color:#cfe9ed; font-size:12px; cursor:pointer; }
    .tutorial-help span { display:grid; place-items:center; border:1px solid #82b5bd;
      border-radius:50%; width:18px; height:18px; color:#7ffaff; }
    .tutorial-help:hover { border-color:#7ffaff; }
    .tutorial-help:focus-visible, .tutorial-notice button:focus-visible { outline:2px solid #7ffaff; outline-offset:4px; }
    .tutorial-notice { width:280px; padding:16px; border:1px solid #7ffaff80; border-radius:4px 14px 4px 4px;
      background:#121620f5; color:#e3f4f6; font-size:14px; box-shadow:0 8px 24px #0004; }
    .tutorial-notice p { margin:8px 0 0; color:#b9cbd2; line-height:1.5; font-size:13px; }
    .tutorial-notice button { margin-top:12px; color:#7ffaff; border:0; background:transparent; cursor:pointer; padding:6px; }
  `,
})
export class World3dPageComponent implements OnInit, OnDestroy {
  protected readonly savingProgress = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly rewardNotice = signal<{ xp: number; unitCompleted: boolean; unitName: string } | null>(null);
  private rewardTimer?: ReturnType<typeof setTimeout>;
  private rewardFallback?: ReturnType<typeof setTimeout>;
  private pendingReward: { type: 'celebrateProgress'; id: string; unitId: string; activityId: string;
    xp: number; unitCompleted: boolean; unitName: string } | null = null;
  private destroyed = false;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthMockService);
  private readonly store = inject(RoadmapStore);
  private readonly educaStore = inject(StoreService);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  protected readonly tutorial = new TutorialState((() => {
    try { return window.localStorage; } catch { return undefined; }
  })());
  protected readonly tutorialAvailable = computed(() => this.auth.role() === 'STUDENT' &&
    !!this.tutorial.scene()?.ready && !this.tutorial.scene()?.busy && !this.activeChallenge() && !this.rankingOpen() && !this.rewardNotice());
  protected readonly tutorialVisible = computed(() => this.tutorialAvailable() &&
    this.tutorial.status() === 'active' && !!this.tutorial.destination());

  private readonly synchronizeTutorial = effect(() => {
    const destination = this.tutorial.destination();
    this.sendTutorial({
      type: 'tutorialControl', visible: this.tutorialVisible(),
      step: this.tutorial.step(), attempt: this.tutorial.attempt(),
      unitId: destination?.unitId ?? null, activityId: destination?.activityId ?? null,
      paused: !!this.activeChallenge() || this.rankingOpen(),
    });
  });

  private sendTutorial(message: object): void {
    this.frame()?.nativeElement.contentWindow?.postMessage(message, window.location.origin);
  }
  protected focusWorld(): void { this.frame()?.nativeElement.contentWindow?.focus(); }
  protected skipTutorial(): void { this.tutorial.skip(); this.focusWorld(); }
  protected restartTutorial(): void { this.tutorial.restart(); this.focusWorld(); }

  // 3D exploration tool (Three.js) brought by the 3D team — see 3D/city_generator.html.
  // Served as a static asset in src/assets/roadmap/world-3d/ (manual copy for now).
  protected readonly world3dUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('/assets/roadmap/world-3d/index.html');

  private readonly onMessage = (event: MessageEvent): void => {
    // The embedded world is the only authorized sender, also for its earlier actions.
    const frameWin = this.frame()?.nativeElement?.contentWindow;
    if (frameWin && event.source !== frameWin) return;
    if (event.origin !== window.location.origin && event.origin !== 'null' && event.origin !== '') {
      if (!event.origin.startsWith('http://localhost') && !event.origin.startsWith('http://127.0.0.1')) return;
    }
    if (event.data?.type === 'celebrationStarted' && event.data.id === this.pendingReward?.id) {
      this.showReward();
      return;
    }
    if (isTutorialScene(event.data)) {
      if (this.auth.role() === 'STUDENT') this.tutorial.receiveScene(event.data);
      return;
    }
    if (event.data?.type === 'tutorialMoved' && Number.isInteger(event.data.attempt)) {
      if (this.tutorialVisible()) this.tutorial.moved(event.data.attempt);
      return;
    }
    if (isMessageEnterActivity(event.data)) {
      this.openChallenge(event.data.unitId, event.data.activityId);
    } else if (isMessageOpenRanking(event.data)) {
      this.rankingOpen.set(true);
    } else if (isMessageOpenMaterials(event.data)) {
      this.router.navigate(['/roadmap/student/materials']);
    } else if (isMessageOpenUnitPlay(event.data)) {
      console.log('[World3D Host] Processing openUnitPlay:', event.data);
      const course = this.educaStore.current() ?? this.educaStore.listAll()[0];
      const courseId = course?.id ?? COURSE_SEED_ID;
      console.log('[World3D Host] Navigating to /play:', courseId, event.data.unitId);
      this.router
        .navigate(['/roadmap/play', courseId, event.data.unitId])
        .catch(() => false)
        .then((success) => {
          console.log('[World3D Host] Router navigate result:', success);
          if (!success) {
            this.router.navigate(['/roadmap/student/play', event.data.unitId]).catch(() => false);
          }
        });
    }
  };

  protected readonly rankingOpen = signal(false);

  ngOnInit(): void {
    // The route carries the subject id (/alumno/curso/:id): it is opened in the
    // StoreService to sync the roadmap that this world shows.
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.educaStore.open(id);
    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.rewardTimer);
    clearTimeout(this.rewardFallback);
    window.removeEventListener('message', this.onMessage);
    this.tutorial.dispose();
  }


  // Counter, not a boolean: an iframe without a `src` yet fires a "phantom" `load`
  // on `about:blank` BEFORE Angular finishes applying the `[src]` binding
  // (which only navigates on the next change detection cycle). With a boolean,
  // that first load set `loaded=true` and the `effect` sent the message to that phantom
  // window that was about to be discarded; when the real iframe finished
  // loading and fired ITS own `load`, `loaded` was already `true` → the signal did not
  // change value → the `effect` never ran again → the real 3D world
  // never received the sections/XP/lives (it kept the default values).
  private readonly loads = signal(0);

  protected onFrameLoad(): void {
    this.tutorial.scene.set(null);
    this.loads.update((n) => n + 1);
  }

  /**
   * Sends the viewer the course's real sections (id, name, order, biome, whether it is already
   * solved, and its activities with completion status) plus the student's current
   * xp/lives — it feeds both the explorer's card and the 3D challenge
   * islands (one per section, see `buildChallengeIsland` in index.html). An
   * `effect` instead of a single send on the iframe's `load`: this way the city/islands
   * update by themselves as soon as the student completes a challenge (see `onCompleteActivity`
   * below, which calls `store.addProgress` and triggers this same effect again).
   */
  private readonly syncStatus = effect(() => {
    if (this.loads() === 0) return;
    const contentWindow = this.frame()?.nativeElement.contentWindow;
    if (!contentWindow) return;

    const progress = this.store.progress();
    const completed = new Set(
      (progress?.nodes ?? []).filter((n) => n.status === 'completed').map((n) => n.nodeId),
    );
    // Same definition of "solved section" as the 2D map (map.ts `islands`): it only looks at
    // the mandatory activities, so an optional "Free practice" left undone does not block it.
    const sections = [...this.store.sections()].sort((a, b) => a.order - b.order).map((u) => {
      const mandatory = u.activities.filter((a) => a.isMandatory);
      const solved = mandatory.length > 0 && mandatory.every((a) => completed.has(a.id));
      // Old activities (from before the editor asked for difficulty when creating them)
      // may not have it saved — treat them as BASICO instead of 0 XP, so they do not
      // become invisible to the section's progress calculation.
      const xpFor = (a: (typeof u.activities)[number]) => a.type === 'theory' ? 0 : XP_BY_DIFFICULTY[a.difficulty ?? 'BASIC'];
      // XP of THIS section (not the student's total): how much they earned from its challenges vs. how much
      // they would earn by completing all of them — it is what the card shows for the section in progress.
      const xpSection = u.activities.filter((a) => completed.has(a.id)).reduce((sum, a) => sum + xpFor(a), 0);
      const xpSectionMax = u.activities.reduce((sum, a) => sum + xpFor(a), 0);
      return {
        id: u.id,
        name: u.name,
        order: u.order,
        biome: u.biome,
        solved,
        xpThreshold: u.xpThreshold,
        xpSection,
        xpSectionMax,
        activities: u.activities.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          difficulty: a.difficulty,
          description: a.description,
          completed: completed.has(a.id),
        })),
      };
    });

    contentWindow.postMessage(
      {
        type: 'setSections',
        sections,
        xpTotal: progress?.xpTotal ?? 0,
        currentLives: progress?.currentLives ?? 3,
        // Mocked streak same as in map.ts (`streakDays = signal(10)`, no mechanics
        // yet) — it feeds the dynamic billboard of the 3D hub until there is a real calculation.
        streakDays: 10,
      },
      window.location.origin,
    );
  });

  // Challenges and Interactive Activity (3D island) — same data model and interaction
  // as section-map.ts (2D map), ported as an overlay over the persistent iframe instead
  // of a separate route.
  protected readonly activeUnitId = signal<string | null>(null);
  protected readonly activeWorld = signal<GeneratedWorld | null>(null);
  protected readonly activeChallenge = signal<VerticalChallenge | null>(null);
  protected readonly selectedAnswer = signal<number | null>(null);
  protected readonly isQuizResolved = signal<boolean>(false);
  protected readonly quizFeedback = signal<string | null>(null);
  protected readonly soundEnabled = signal<boolean>(true);
  private readonly localLives = signal<number>(3);

  protected readonly lives = computed(() => this.store.progress()?.currentLives ?? this.localLives());

  // Same theme heuristic as section-map.ts: prioritizes the biome chosen by the
  // teacher and falls back to name/order for old sections with no biome or with one with no 2D theme.
  private resolveTheme(u: Section): WorldTheme {
    if (u.biome) {
      const themeOfBiome = BIOME_TO_WORLD_THEME[u.biome];
      if (themeOfBiome) return themeOfBiome;
    }
    const name = u.name.toLowerCase();
    if (name.includes('desierto') || name.includes('fundamento') || u.order === 1) return 'desert';
    if (name.includes('selva') || name.includes('control') || u.order === 2) return 'jungle';
    if (name.includes('castillo') || (name.includes('funcion') && !name.includes('concurrencia')) || u.order === 3)
      return 'castle';
    if (
      name.includes('nieve') ||
      name.includes('montaña') ||
      name.includes('taiga') ||
      name.includes('estructura de datos') ||
      u.order === 4
    )
      return 'snow';
    if (
      name.includes('nether') ||
      name.includes('lava') ||
      name.includes('concurrencia') ||
      name.includes('redes') ||
      u.order === 5
    )
      return 'nether';
    if (name.includes('espacio') || name.includes('orbital') || name.includes('planeta')) return 'space';
    return (['desert', 'jungle', 'castle', 'snow', 'nether', 'space'] as const)[(u.order - 1) % 6];
  }

  private openChallenge(unitId: string, activityId: string): void {
    const u = this.store.sectionById(unitId);
    if (!u) return;

    const theme = this.resolveTheme(u);
    const baseChallenges: VerticalChallenge[] = u.activities.map((act, i) => ({
      id: i + 1,
      activityId: act.id,
      title: act.name,
      type: act.type,
      difficulty: act.difficulty || 'BASIC',
      minutes: 8,
      // 'theory' is not evaluated: it grants no XP (see the same criterion in section-map.ts).
      xp: act.type === 'theory' ? 0 : XP_BY_DIFFICULTY[act.difficulty ?? 'BASIC'],
      description: act.description || defaultDescription(act.type),
      resourceUrl: act.resourceUrl,
      resourceType: act.resourceType,
      x: 50,
      y: 50,
    }));
    const world = generateVerticalWorld(theme, baseChallenges);
    const challenge = world.challenges.find((c) => c.activityId === activityId);
    if (!challenge) return;

    this.activeUnitId.set(unitId);
    this.activeWorld.set(world);
    this.openActivity(challenge);
    this.tutorial.opened(unitId, activityId);
  }

  protected openActivity(c: VerticalChallenge): void {
    this.saveError.set(null);
    this.selectedAnswer.set(null);
    this.isQuizResolved.set(false);
    this.quizFeedback.set(null);
    this.activeChallenge.set(c);
  }

  protected closeActivity(): void {
    if (this.savingProgress()) return;
    this.activeChallenge.set(null);
    this.activeWorld.set(null);
    this.activeUnitId.set(null);
    if (!this.pendingReward && !this.rewardNotice()) this.tutorial.closedChallenge();
    this.focusWorld();
  }

  protected isCompleted(c: VerticalChallenge): boolean {
    if (!c.activityId) return false;
    return (this.store.progress()?.nodes ?? []).some((n) => n.nodeId === c.activityId && n.status === 'completed');
  }

  protected currentQuestion(c: VerticalChallenge): QuestionData {
    return (
      this.activeWorld()?.questions[c.id] ?? {
        question: '¿Cuál es el propósito principal de esta actividad?',
        options: ['Aprender y validar los conceptos', 'Saltar al final sin responder', 'Ninguna de las anteriores'],
        correct: 0,
        explanation: '¡Excelente! Resolver las actividades te permite progresar y subir de nivel.',
      }
    );
  }

  /** Embeddable URL of the material of a 'theory' node (see resource-embed.util.ts). */
  protected embedUrl(c: VerticalChallenge): SafeResourceUrl {
    const url = toEmbedUrl(c.resourceType ?? 'pdf', c.resourceUrl ?? '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected checkAnswer(c: VerticalChallenge): void {
    const ans = this.selectedAnswer();
    if (ans === null) return;
    const q = this.currentQuestion(c);

    if (ans === q.correct) {
      this.isQuizResolved.set(true);
      this.quizFeedback.set(null);
      this.playAudioTone(true);
    } else {
      this.playAudioTone(false);
      if (!this.isCompleted(c) && !c.recovery) {
        this.localLives.update((v) => Math.max(0, v - 1));
        this.store.addProgress(0, undefined, this.localLives());
      }
      this.quizFeedback.set(
        this.lives() === 0 && !c.recovery
          ? '¡Te has quedado sin vidas! Ve al nodo de recuperación para recargar tus corazones.'
          : 'Respuesta incorrecta. Revisa la consigna y vuelve a intentarlo.',
      );
    }
  }

  protected onCompleteActivity(c: VerticalChallenge): void {
    if (this.savingProgress() || this.activeChallenge() !== c || (c.type !== 'theory' && !this.isQuizResolved())) return;
    const wasAlreadyCompleted = this.isCompleted(c);
    if (wasAlreadyCompleted && !c.recovery) { this.closeActivity(); return; }
    const unitId = this.activeUnitId();
    const unit = unitId ? this.store.sectionById(unitId) : undefined;
    const previous = this.store.progress();
    const previousXp = previous?.xpTotal ?? 0;
    const required = unit?.activities.filter(a => a.isMandatory) ?? [];
    const wasResolved = required.length > 0 && required.every(a => previous?.nodes.some(n => n.nodeId === a.id && n.status === 'completed'));
    this.savingProgress.set(true);
    this.saveError.set(null);
    this.store.addProgress(wasAlreadyCompleted ? 0 : c.xp, c.activityId, c.recovery ? 3 : this.localLives(), confirmed => {
      if (this.destroyed) return;
      this.savingProgress.set(false);
      if (c.recovery) this.localLives.set(3);
      if (!c.recovery && c.type !== 'theory' && unitId && c.activityId &&
          confirmed.nodes.some(n => n.nodeId === c.activityId && n.status === 'completed')) {
        this.pendingReward = { type: 'celebrateProgress', id: crypto.randomUUID(), unitId, activityId: c.activityId,
          xp: Math.max(0, confirmed.xpTotal - previousXp), unitName: unit?.name ?? '',
          unitCompleted: !wasResolved && required.length > 0 && required.every(a => confirmed.nodes.some(n => n.nodeId === a.id && n.status === 'completed')) };
        this.sendTutorial(this.pendingReward);
        // A missing scene must never hide a successfully saved reward.
        clearTimeout(this.rewardFallback);
        this.rewardFallback = setTimeout(() => this.showReward(), 3000);
      }
      this.closeActivity();
    }, () => {
      if (this.destroyed) return;
      this.savingProgress.set(false);
      this.saveError.set('No se pudo guardar. Intentá continuar nuevamente.');
    });
    // The `syncStatus` `effect` already fires by itself (store.progress() changed with
    // addProgress) and sends the 3D island the updated activity state —
    // no separate message is needed to refresh the node just completed.
  }

  private showReward(): void {
    if (!this.pendingReward || this.destroyed) return;
    clearTimeout(this.rewardFallback);
    clearTimeout(this.rewardTimer);
    this.rewardNotice.set(this.pendingReward);
    this.pendingReward = null;
    this.rewardTimer = setTimeout(() => {
      this.rewardNotice.set(null);
      this.tutorial.closedChallenge();
    }, 2500);
  }

  // Web Audio Sound Effects — same as section-map.ts.
  private playAudioTone(success: boolean): void {
    if (!this.soundEnabled()) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (success) {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(146.83, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch {}
  }
}
