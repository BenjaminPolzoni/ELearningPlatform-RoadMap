import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { defaultDescription, NodeStatus, XP_BY_DIFFICULTY } from '../../core/data/roadmap.models';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { toEmbedUrl } from './resource-embed.util';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import {
  BIOME_TO_WORLD_THEME,
  GeneratedWorld,
  generateVerticalWorld,
  nodeArt,
  nodeVerb,
  orthogonalRoute,
  QuestionData,
  roadJointSvg,
  startSignSvg,
  VerticalChallenge,
  WorldTheme,
} from './vertical-world.engine';
import { DIFFICULTY_LABEL } from '../../shared/labels';

interface WalkPuff {
  id: number;
  x: number;
  y: number;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  color: string;
}

@Component({
  selector: 'app-section-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink, UpperCasePipe],
  host: { class: 'block w-full h-full' },
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .map-viewport {
      flex: 1 1 0%;
      min-height: 0;
      width: 100%;
      /* No manual horizontal scroll: the camera moves scrollLeft by itself following the
         explorer. Vertical stays free (wheel/touch/keyboard) but clipped
         by onViewportScroll() so you can never see higher up than what you already
         unlocked — the bar is hidden anyway, the interaction keeps working. */
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: none;
      -ms-overflow-style: none;
      background: #382d23;
      position: relative;
    }
    .map-viewport::-webkit-scrollbar {
      display: none;
    }
    .map-world-zoom {
      position: relative;
    }
    /*
      In fullscreen, the panel must cover the WHOLE real viewport — but the
      fullscreened element (#mapPanel) carries Tailwind's position: relative (class relative in the
      template), and that author rule beats the fixed position the browser tries to
      apply to it via :fullscreen. Without this override, the panel keeps the width inherited
      from .vertical-world (cap of 1448px) instead of filling the whole monitor, and the map
      background (tile) does not cover the rest: the flat color of --ground shows.
    */
    .map-panel.expanded {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      z-index: 50;
    }
    .map-panel.expanded .map-viewport {
      height: 100dvh;
      max-height: none;
    }

    /* Confetti of the "Unidad completada" sign */
    @keyframes confetti-caida {
      0%   { transform: translateY(-10%) rotate(0deg); opacity: 1; }
      100% { transform: translateY(650%) rotate(540deg); opacity: 0.15; }
    }
    .confetti-piece {
      position: absolute;
      top: 0;
      width: 8px;
      height: 14px;
      animation-name: confetti-caida;
      animation-timing-function: ease-in;
      animation-iteration-count: infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .confetti-piece { animation: none; opacity: 0; }
    }
  `,
  template: `
    @if (section(); as u) {
      <div
        class="vertical-world relative flex flex-col w-full max-w-[1448px] h-full mx-auto overflow-hidden rounded-[20px] border-[6px] border-[#23242E] bg-base-300 shadow-[0_0_80px_rgba(139,92,246,0.18)]"
        [attr.data-theme]="theme()"
      >
        <!-- MAP AND NAVIGATION PANEL -->
        <div #mapPanel class="map-panel flex-1 min-h-0 relative flex flex-col" [class.expanded]="isExpanded()">
          <!-- Map toolbar -->
          <div
            class="flex-shrink-0 flex items-center justify-between border-b-2 border-[#2E303D] bg-[#1E202C] px-5 py-2 text-xs text-[#E0E2EC]"
          >
            <div class="flex items-center gap-3">
              <a
                routerLink="/student"
                class="btn btn-xs border border-primary/50 bg-[#252836] ui-font text-[8px] text-primary hover:border-primary hover:bg-[#303348]"
              >
                ← MUNDO
              </a>
              <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="ui-font text-[8px] tracking-wider text-emerald-300">
                MUNDO 0{{ u.order }} · {{ world().setting | uppercase }}
              </span>
            </div>

            <!-- Camera and fullscreen controls -->
            <div class="flex items-center gap-2">
              <!-- Neither "see goal" nor "go to start": the camera is only moved by the
                   explorer's own journey (see followPlayerScroll), never by the player
                   by hand — so it never peeks at a part of the world that has not been
                   unlocked yet. This button does stay: it reveals nothing new, it only re-centers
                   on the current position (in case the window changes size). -->
              <button
                type="button"
                class="btn btn-xs border border-white/20 bg-white/10 ui-font text-[8px] text-white hover:bg-white/20"
                (click)="scrollToPlayer()"
                title="Centrar en el explorador"
              >
                EXPLORADOR
              </button>
              <div class="mx-1 h-4 w-px bg-white/20"></div>
              <button
                type="button"
                class="btn btn-xs border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
                (click)="soundEnabled.set(!soundEnabled())"
                [title]="soundEnabled() ? 'Silenciar efectos' : 'Activar efectos de sonido'"
              >
                {{ soundEnabled() ? '♪' : '♪✕' }}
              </button>
              <button
                type="button"
                class="btn btn-xs border border-primary/50 bg-primary/20 text-xs text-primary hover:bg-primary/30"
                (click)="toggleFullscreen()"
                [title]="isExpanded() ? 'Reducir pantalla' : 'Ampliar a pantalla completa'"
              >
                {{ isExpanded() ? '✕' : '⛶' }}
              </button>
            </div>
          </div>

          <!-- VIEWPORT WITH VERTICAL SCROLL (Takes 100% of the width and height) -->
          <div #mapViewport class="map-viewport" (scroll)="onViewportScroll()">
            <!--
              Wrapper of the ALREADY scaled size: it is what gives the native scroll of
              .map-viewport a correct scrollHeight/scrollWidth. Inside, .map-world
              keeps its real size (1448 x worldHeight, the same one the path
              curves are calculated in) and grows with transform:scale()
              from the top-left corner — so the wrapper and the scaled
              visual result measure exactly the same.
            -->
            <div
              class="map-world-zoom"
              [style.width.px]="world().worldWidth * ZOOM"
              [style.height.px]="world().worldHeight * ZOOM"
            >
            <div
              class="map-world vertical-world relative overflow-hidden"
              [attr.data-theme]="theme()"
              [style.width.px]="world().worldWidth"
              [style.height.px]="world().worldHeight"
              [style.transform]="'scale(' + ZOOM + ')'"
              [style.background-color]="'var(--ground)'"
              [style.background-image]="'url(' + world().tile + ')'"
              style="background-repeat: repeat-y; background-size: 100% auto; background-position: center top; image-rendering: pixelated; transform-origin: top left;"
            >
              <!-- 1. SVG Terrain and Paths layer -->
              <div class="vertical-terrain">
                <!-- Computed Bezier paths -->
                <svg
                  class="vertical-road"
                  [attr.viewBox]="'0 0 ' + world().worldWidth + ' ' + world().worldHeight"
                  preserveAspectRatio="none"
                  shape-rendering="crispEdges"
                  aria-hidden="true"
                >
                  <!-- Bonus and recovery branches -->
                  @for (br of branchPaths(); track $index) {
                    <path [attr.d]="br" class="support-road-edge" />
                    <path [attr.d]="br" class="support-road" />
                  }
                  <!-- Main path with multiple layers -->
                  <path [attr.d]="roadPathD()" class="road-shadow" />
                  <path [attr.d]="roadPathD()" class="road-edge" />
                  <path [attr.d]="roadPathD()" class="road-sand" />
                  <!-- Final stretch: from the last challenge to the base of the castle/house -->
                  <path [attr.d]="castleApproachD()" class="road-shadow" />
                  <path [attr.d]="castleApproachD()" class="road-edge" />
                  <path [attr.d]="castleApproachD()" class="road-sand" />
                </svg>

                <!-- 16x16 connector rings at every stop and fork of the path -->
                @for (s of roadJoints(); track $index) {
                  <div
                    class="road-joint absolute pointer-events-none"
                    [style.left.%]="s[0]"
                    [style.top.%]="s[1]"
                    style="translate: -50% -50%; width: 28px; height: 28px;"
                    [innerHTML]="roadJointHtml()"
                  ></div>
                }




                <!-- START point at the base -->
                <div class="vertical-start" [style.top.%]="startTopPercent()">
                  <div class="w-12 h-12 mx-auto mb-1" [innerHTML]="startSignHtml()"></div>
                  <small>Tu aventura empieza aquí</small>
                </div>

                <!-- Milestones / Sectors on the ascent -->
                @for (m of milestones(); track m.id) {
                  <div class="ascent-milestone" [style.top.%]="m.y">
                    <span>↑</span> SECTOR {{ m.sector }}
                  </div>
                }
              </div>

              <!--
                Support signs for bonus and recovery: they go OUTSIDE .vertical-terrain
                (which has z-index:1) on purpose — there they always ended up behind the
                nodes (z-index:8) regardless of the sign's own z-index, and the node's
                badge (".node-sign") covered the title ("♥ RECUPERAR VIDA", etc.).
              -->
              @for (c of world().challenges; track c.id) {
                @if (c.optional) {
                  <div
                    class="support-sign"
                    [class.life-sign]="c.recovery"
                    [style.left.%]="c.x"
                    [style.top]="'calc(' + c.y + '% + 36px)'"
                  >
                    {{ c.recovery ? '♥ RECUPERAR VIDA' : '★ BONUS' }}
                    <small>{{ c.recovery ? 'Repaso · +1 corazón' : 'Desafío opcional' }}</small>
                  </div>
                }
              }

              <!-- 2. Walking dust particles -->
              @for (p of walkPuffs(); track p.id) {
                <div class="walk-puff" [style.left.px]="p.x" [style.top.px]="p.y"></div>
              }

              <!-- 3. Interactive Challenge Nodes -->
              @for (c of world().challenges; track c.id) {
                <div
                  class="map-node"
                  [class.available]="isAvailable(c)"
                  [class.completed]="isCompleted(c)"
                  [class.locked]="isLocked(c)"
                  [class.selected]="sel()?.id === c.id"
                  [style.left.%]="c.x"
                  [style.top.%]="c.y"
                  (click)="onNodeClick(c)"
                  [attr.aria-label]="c.title"
                  role="button"
                  tabindex="0"
                >
                  <!-- Ground shadow for available nodes -->
                  <div class="object-ground"></div>

                  <!-- Animated floating invitation ("¡GOLPEA!", "¡ABRE!", "¡DESPIERTA!") -->
                  @if (isAvailable(c) && !isCompleted(c)) {
                    <div class="node-invitation">
                      {{ nodeVerbText(c) }}
                    </div>
                  }

                  <!-- Node SVG sprite -->
                  <div [innerHTML]="nodeSvg(c)" class="w-full"></div>

                  <!-- Number plate or check -->
                  <div class="node-sign">
                    @if (isCompleted(c)) {
                      ✓
                    } @else if (c.recovery) {
                      ♥
                    } @else if (c.optional) {
                      ★
                    } @else {
                      {{ c.id }}
                    }
                  </div>
                </div>
              }

              <!-- 4. Walking Explorer Avatar -->
              <div
                class="explorer absolute pointer-events-none z-20"
                [style.left.%]="playerPos().x"
                [style.top.%]="playerPos().y"
                style="translate: -50% -75%; transition: none;"
              >
                <ui-avatar-sprite
                  [config]="avatarSrv.avatar()"
                  [height]="54"
                  [shadow]="true"
                  [walking]="isWalking()"
                  [celebrating]="celebrating()"
                  [facing]="facing()"
                />
              </div>

              <!-- 5. Floating Encounter Card (.encounter) — with the world ×ZOOM
                   larger, this card (position/size inherited from .map-world) also
                   grows ×ZOOM and its text/button end up leaving the viewport. The
                   inverse scale keeps it always at its normal size, regardless of the zoom
                   of the map (its position is not touched: that is still resolved in layout, before
                   applying any transform/scale). -->
              @if (sel(); as c) {
                <div
                  class="encounter"
                  [style.--encounter-x]="c.x + '%'"
                  [style.--encounter-y]="c.y + '%'"
                  [style.scale]="1 / ZOOM"
                  [class.below]="c.y < 15"
                >
                  <button type="button" class="encounter-close" (click)="sel.set(null)" aria-label="Cerrar">×</button>
                  <span class="encounter-kicker">
                    {{ c.recovery ? 'RECUPERACIÓN' : c.optional ? 'DESAFÍO BONUS' : 'DESAFÍO ' + c.id }} · {{ difficultyLabel[c.difficulty] ?? c.difficulty }}
                  </span>
                  <h3>{{ c.title }}</h3>
                  <p class="encounter-meta">{{ c.description }}</p>
                  
                  <button
                    type="button"
                    class="encounter-action"
                    [disabled]="isLocked(c) || isWalking()"
                    (click)="onEncounterAction(c)"
                  >
                    @if (isWalking()) {
                      CAMINANDO…
                    } @else if (isWalkingNext(c) || needsWalkToOptional(c)) {
                      ▶ CAMINAR HASTA AQUÍ →
                    } @else if (isCompleted(c)) {
                      REPASAR ACTIVIDAD (+0 XP)
                    } @else if (isLocked(c)) {
                      🔒 DESAFÍO BLOQUEADO
                    } @else {
                      ▶ ENTRAR AL DESAFÍO (+{{ c.xp }} XP)
                    }
                  </button>
                </div>
              }
            </div>
            </div>
          </div>

          <!--
            The modals go INSIDE #mapPanel (not as siblings of the panel) on purpose:
            the Fullscreen API only renders the subtree of the fullscreened element,
            so if they were outside, they would not be seen when completing a challenge in fullscreen.
          -->
          <!-- ACTIVITY AND QUESTIONS MODAL (Interactive quiz) -->
      @if (activeChallenge(); as c) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="modal-box max-w-xl border-4 border-primary bg-[#1C1E2B] p-6 text-white shadow-2xl chamfer">
            <!-- Modal Header -->
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

            <!-- Activity / Question content -->
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

                <!-- List of answer options -->
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

                <!-- Feedback in case of an incorrect answer -->
                @if (quizFeedback()) {
                  <div class="alert alert-error mt-4 text-xs ui-font py-2.5">
                    <span>{{ quizFeedback() }}</span>
                  </div>
                }
              } @else {
                <!-- Reward and Success screen -->
                <div class="flex flex-col items-center py-6 text-center">
                  <div class="text-5xl mb-3 animate-bounce">
                    {{ c.recovery ? '♥' : '🏆' }}
                  </div>
                  <span class="ui-font text-[9px] text-accent">
                    {{ isCompleted(c) ? '¡CONOCIMIENTO REFORZADO!' : c.recovery ? '¡VIDA RECUPERADA!' : '¡DESAFÍO COMPLETADO!' }}
                  </span>
                  <h3 class="title-font text-2xl text-primary mt-1">
                    {{ c.id === world().mainCount ? '¡HAS LLEGADO A LA META!' : '¡Excelente trabajo explorador!' }}
                  </h3>
                  <p class="mt-3 text-sm text-[#E0E2EC] max-w-md opacity-90">
                    {{ currentQuestion(c).explanation }}
                  </p>

                  <div class="mt-5 flex items-center gap-4 rounded-xl border border-primary/40 bg-black/40 px-5 py-2.5">
                    <span class="ui-font text-[9px] text-white/70">Recompensa obtenida:</span>
                    <strong class="ui-font text-sm text-accent">
                      +{{ c.xp }} XP
                      @if (c.recovery) {
                        · +1 VIDA ♥
                      }
                    </strong>
                  </div>
                </div>
              }
            </div>

            <!-- Modal action buttons -->
            <div class="modal-action border-t-2 border-white/10 pt-3">
              @if (c.type === 'theory') {
                <button
                  type="button"
                  class="btn btn-primary w-full ui-font text-[9px]"
                  [disabled]="isCompleted(c)"
                  (click)="onCompleteActivity(c)"
                >
                  {{ isCompleted(c) ? 'LECTURA REGISTRADA ✓' : 'MARCAR COMO LEÍDO Y CONTINUAR →' }}
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
                <button
                  type="button"
                  class="btn btn-primary w-full ui-font text-[9px]"
                  (click)="onCompleteActivity(c)"
                >
                  {{
                    c.optional
                      ? 'VOLVER AL MAPA →'
                      : c.id < world().mainCount
                        ? 'CONTINUAR AL DESAFÍO ' + (c.id + 1) + ' →'
                        : '¡FINALIZAR UNIDAD! →'
                  }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- SECTION COMPLETED SIGN (on finishing the last main challenge) -->
      @if (showUnitComplete()) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="pointer-events-none absolute inset-0 overflow-hidden">
            @for (p of confettiPieces(); track p.id) {
              <span
                class="confetti-piece"
                [style.left.%]="p.left"
                [style.background]="p.color"
                [style.animation-delay.s]="p.delay"
                [style.animation-duration.s]="p.duration"
                [style.rotate]="p.rotate + 'deg'"
              ></span>
            }
          </div>
          <div
            class="modal-box relative max-w-md border-4 border-primary bg-[#1C1E2B] p-8 text-center text-white shadow-2xl chamfer"
          >
            <button
              class="btn btn-ghost btn-sm absolute right-3 top-3 text-lg text-white/70 hover:text-white"
              (click)="showUnitComplete.set(false)"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <div class="text-6xl mb-3 animate-bounce">🏆</div>
            <span class="ui-font text-[9px] text-accent tracking-widest">¡UNIDAD COMPLETADA!</span>
            <h2 class="title-font mt-2 text-2xl text-primary">{{ u.name }}</h2>
            <p class="mt-3 text-sm text-[#E0E2EC] leading-relaxed opacity-90">
              Superaste los {{ world().mainCount }} desafíos de esta unidad. ¡Excelente trabajo, explorador!
            </p>
            <div class="mt-5 flex items-center justify-center gap-4 rounded-xl border border-primary/40 bg-black/40 px-5 py-2.5">
              <span class="ui-font text-[9px] text-white/70">XP total de la unidad:</span>
              <strong class="ui-font text-sm text-accent">+{{ unitTotalXp() }} XP</strong>
            </div>
            <button
              type="button"
              class="btn btn-primary w-full ui-font text-[9px] mt-6"
              routerLink="/student"
            >
              VOLVER AL ROADMAP →
            </button>
          </div>
        </div>
      }
        </div>
      </div>
    } @else {
      <div class="p-8 text-center text-white/70">
        <p>No se encontró la unidad solicitada.</p>
        <a routerLink="/student" class="btn btn-primary btn-sm mt-4">Volver al inicio</a>
      </div>
    }
  `,
})
export class SectionMap {
  protected readonly difficultyLabel: Record<string, string> = DIFFICULTY_LABEL;
  readonly id = input.required<string>();

  protected readonly avatarSrv = inject(AvatarService);
  private readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private readonly progress = toSignal(this.data.getProgress('stu-01', COURSE_SEED_ID));

  protected readonly mapViewport = viewChild<ElementRef<HTMLDivElement>>('mapViewport');
  protected readonly mapPanel = viewChild<ElementRef<HTMLDivElement>>('mapPanel');

  protected readonly section = computed(() => this.store.sectionById(this.id()));

  // Biome chosen by the teacher (editor.ts) takes precedence; if there is none or it does not yet have a 2D theme
  // (e.g. "Nether"), it falls back to the old heuristic by name/order — covers sections created
  // before the `biome` field existed.
  protected readonly theme = computed<WorldTheme>(() => {
    const u = this.section();
    if (!u) return 'desert';
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
  });

  // Challenge list and vertical world generation
  protected readonly world = computed<GeneratedWorld>(() => {
    const u = this.section();
    const currentTheme = this.theme();
    // The main path has to be exactly the content the teacher loaded —
    // no padding with ghost "Challenge 3", "Challenge 4" up to an arbitrary minimum.
    const count = u ? u.activities.length : 6;

    const baseChallenges: VerticalChallenge[] = Array.from({ length: count }, (_, i) => {
      const act = u?.activities[i];
      return {
        id: i + 1,
        activityId: act?.id,
        title: act?.name || `Desafío ${i + 1}`,
        type: act?.type || 'Práctico',
        difficulty: act?.difficulty || 'Inicial',
        minutes: 8,
        // The real XP the teacher loads (PAR-01, XP_BY_DIFFICULTY) — it used to be a
        // value made up by position (100 + i*25) that did not match the assigned
        // difficulty. 'milestone' has no difficulty: fixed reward. 'theory' is not evaluated:
        // it grants no XP.
        xp: act?.type === 'theory' ? 0 : act?.difficulty ? XP_BY_DIFFICULTY[act.difficulty] : 50,
        // If the teacher did not write a description, the same one suggested to them as a
        // placeholder in the editor (see defaultDescription in roadmap.models.ts).
        description: act?.description || defaultDescription(act?.type ?? 'practical-challenge'),
        resourceUrl: act?.resourceUrl,
        resourceType: act?.resourceType,
        x: 50,
        y: 50,
      };
    });

    // Adds optional challenges (Bonus and Recovery)
    baseChallenges.push(
      {
        id: count + 1,
        title: 'El tesoro oculto',
        type: 'Bonus',
        difficulty: 'Intermedia',
        minutes: 5,
        xp: 150,
        description: 'Desafío complementario opcional con XP extra.',
        optional: true,
        x: 88,
        y: 60,
      },
      {
        id: count + 2,
        title:
          currentTheme === 'jungle'
            ? 'Barril de provisiones'
            : currentTheme === 'castle'
              ? 'Fuente de alquimia'
              : currentTheme === 'snow'
                ? 'Hoguera del refugio'
                : currentTheme === 'nether'
                  ? 'Caldero de magma'
                  : 'Tubería de recuperación',
        type: 'Recuperación',
        difficulty: 'Inicial',
        minutes: 3,
        xp: 25,
        description: 'Repasa conceptos clave y recupera un corazón para seguir explorando.',
        optional: true,
        recovery: true,
        x: 12,
        y: 80,
      },
    );

    return generateVerticalWorld(currentTheme, baseChallenges);
  });

  // Progress and state synchronization with RoadmapStore
  protected readonly completedIds = signal<number[]>([]);
  protected readonly localLives = signal<number>(3);

  protected readonly lives = computed(() => this.store.progress()?.currentLives ?? this.localLives());

  // Positioning and interaction
  protected readonly sel = signal<VerticalChallenge | null>(null);
  protected readonly activeChallenge = signal<VerticalChallenge | null>(null);
  protected readonly selectedAnswer = signal<number | null>(null);
  protected readonly isQuizResolved = signal<boolean>(false);
  protected readonly quizFeedback = signal<string | null>(null);
  protected readonly soundEnabled = signal<boolean>(true);
  protected readonly isExpanded = signal<boolean>(false);

  // Camera: the world is rendered at its real size (1448×worldHeight) and scaled
  // with a CSS transform (not by changing the layout) — this way the nodes, which already hit
  // their `max-width` in CSS, also look bigger instead of just spreading further apart.
  protected readonly ZOOM = 1.6;

  // Avatar walk
  protected readonly playerPos = signal<{ x: number; y: number }>({ x: 50, y: 90.5 });
  protected readonly isWalking = signal<boolean>(false);
  protected readonly facing = signal<'right' | 'left'>('right');
  protected readonly walkPuffs = signal<WalkPuff[]>([]);
  // Id of the main path stop (0..mainCount) where the avatar is logically standing
  private readonly currentStopId = signal<number>(0);
  // Id of the optional challenge (bonus/recovery) the avatar is at; null = on the main path
  private readonly visitingOptionalId = signal<number | null>(null);
  private walkAnimId = 0;

  // Section closing (on completing the last main challenge)
  protected readonly celebrating = signal<boolean>(false);
  protected readonly showUnitComplete = signal<boolean>(false);
  protected readonly confettiPieces = signal<ConfettiPiece[]>([]);
  private celebrateTimeoutId = 0;

  protected readonly unitTotalXp = computed(() => {
    const w = this.world();
    const comp = this.completedIds();
    return w.challenges
      .filter((c) => !c.optional && comp.includes(c.id))
      .reduce((sum, c) => sum + c.xp, 0);
  });

  constructor() {
    // Reflects in the local state the challenges already completed in the persisted
    // progress — without this, `completedIds` started empty on every visit and re-entering
    // an already finished section showed everything locked again.
    effect(() => {
      const w = this.world();
      const p = this.store.progress();
      const complete = new Set(
        (p?.nodes ?? []).filter((n) => n.status === 'completed').map((n) => n.nodeId),
      );
      const persistedIds = w.challenges
        .filter((c) => c.activityId && complete.has(c.activityId))
        .map((c) => c.id);
      const current = untracked(() => this.completedIds());
      const missing = persistedIds.filter((id) => !current.includes(id));
      if (missing.length > 0) this.completedIds.set([...current, ...missing]);
    });

    // On loading or changing section, instantly places the player at the LAST completed
    // main challenge (or at the start if none was completed) — never at the
    // next one to solve: that stretch has to be walked by the player when tapping it.
    // `completedIds` is read untracked so that completing a challenge does not trigger
    // this instant jump again: that case is animated by `advanceToNext`.
    effect(() => {
      const w = this.world();
      const comp = untracked(() => this.completedIds());
      let lastCompleted = 0;
      for (let id = 1; id <= w.mainCount; id++) {
        if (!comp.includes(id)) break;
        lastCompleted = id;
      }
      const stop = w.stops[lastCompleted] ?? [50, 90];
      this.playerPos.set({ x: stop[0], y: stop[1] });
      this.currentStopId.set(lastCompleted);
      this.visitingOptionalId.set(null);
    });

    // Automatically centers the camera on the character's position on entering
    afterNextRender(() => {
      setTimeout(() => this.scrollToPlayer(), 200);
    });

    this.destroyRef.onDestroy(() => {
      if (this.walkAnimId) cancelAnimationFrame(this.walkAnimId);
      if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
    });
  }

  // Computed SVG routes
  protected readonly roadPathD = computed(() => {
    const w = this.world();
    const points = w.roads.slice(1).flatMap((road, i) => (i ? road.slice(1) : road));
    return points
      .map(([x, y], i) => `${i ? 'L' : 'M'}${(x / 100) * w.worldWidth},${(y / 100) * w.worldHeight}`)
      .join(' ');
  });

  protected readonly branchPaths = computed(() => {
    const w = this.world();
    return w.challenges
      .filter((c) => c.optional && c.branchFrom)
      .map((c) =>
        this.branchCurvePoints(c)
          .map(([x, y], i) => `${i ? 'L' : 'M'}${(x / 100) * w.worldWidth},${(y / 100) * w.worldHeight}`)
          .join(' '),
      );
  });

  protected readonly castleTopPercent = computed(() => {
    const w = this.world();
    const last = w.stops[w.mainCount] || [50, 10];
    return ((last[1] / 100) * w.worldHeight - 355) / (w.worldHeight / 100);
  });

  /**
   * Final stretch of the path, from the last main challenge to the base of the castle/house: without
   * it the trail ended at the last node and the goal floated, disconnected.
   * `.vertical-castle` measures 17.5% of the world's width with aspect-ratio 240:200 (see
   * styles.css); 0.92 approximates where the pixelated drawing touches the ground within that height.
   */
  protected readonly castleApproachD = computed(() => {
    const w = this.world();
    const last = w.stops[w.mainCount] ?? [50, 90];
    const svgHeightPx = (17.5 / 100) * w.worldWidth * (200 / 240);
    const baseYPx = (this.castleTopPercent() / 100) * w.worldHeight + svgHeightPx * 0.92;
    const target: [number, number] = [last[0], (baseYPx / w.worldHeight) * 100];
    return orthogonalRoute(last, target, w.worldWidth, w.worldHeight, 9)
      .map(([x, y], i) => `${i ? 'L' : 'M'}${(x / 100) * w.worldWidth},${(y / 100) * w.worldHeight}`)
      .join(' ');
  });

  protected readonly startTopPercent = computed(() => {
    const w = this.world();
    return ((w.worldHeight - 95) / w.worldHeight) * 100;
  });

  protected readonly roadJoints = computed(() => {
    const w = this.world();
    const joints: [number, number][] = [...w.stops];
    for (const c of w.challenges) {
      if (c.optional && c.branchFrom) {
        joints.push(c.branchFrom);
      }
    }
    return joints;
  });

  protected readonly milestones = computed(() => {
    const w = this.world();
    const count = Math.floor((w.mainCount - 1) / 4);
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      sector: String(i + 1).padStart(2, '0'),
      y: w.stops[(i + 1) * 4]?.[1] ?? 50,
    }));
  });

  // State helpers
  protected isCompleted(c: VerticalChallenge): boolean {
    return this.completedIds().includes(c.id);
  }

  protected isAvailable(c: VerticalChallenge): boolean {
    if (this.isCompleted(c)) return true;
    if (c.recovery) return true;
    if (c.optional) return this.completedIds().length >= 2;
    // Sequential: available if it is the first node or the previous one is completed
    return c.id === 1 || this.completedIds().includes(c.id - 1);
  }

  protected isLocked(c: VerticalChallenge): boolean {
    return !this.isAvailable(c);
  }

  /**
   * Only the main challenge immediately after the one the avatar is at triggers a
   * walk — same as the reference prototype (`awaitingWalk`/`walkingNext`): the rest
   * of the nodes (completed, bonus, recovery) are entered directly, without moving the avatar.
   */
  protected isWalkingNext(c: VerticalChallenge): boolean {
    return !c.optional && c.id === this.currentStopId() + 1 && this.isAvailable(c);
  }

  /** Optional challenges (bonus/recovery) are also walked to, following their branch. */
  protected needsWalkToOptional(c: VerticalChallenge): boolean {
    return !!c.optional && this.isAvailable(c) && this.visitingOptionalId() !== c.id;
  }

  protected nodeVerbText(c: VerticalChallenge): string {
    const status = this.isCompleted(c) ? 'completed' : this.isAvailable(c) ? 'available' : 'locked';
    return nodeVerb(this.theme(), status);
  }

  // Sanitized SVG Renderers
  protected roadJointHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(roadJointSvg(this.theme()));
  }

  protected startSignHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(startSignSvg);
  }

  protected nodeSvg(c: VerticalChallenge): SafeHtml {
    const status = this.isCompleted(c) ? 'completed' : this.isAvailable(c) ? 'available' : 'locked';
    return this.sanitizer.bypassSecurityTrustHtml(nodeArt(this.theme(), c, status, this.world().mainCount));
  }

  // Interaction and Walking
  /**
   * Tapping a node only opens its encounter card — the avatar never moves because of
   * this. It does re-center the camera on the avatar (with zoom, the card of a node far
   * from the center may end up cut off against the viewport edge) — and along the way leaves the
   * view exactly where the first frame of the walk will start if they tap
   * "walk here", so there is no abrupt jump before it starts moving.
   */
  protected onNodeClick(c: VerticalChallenge): void {
    if (this.isWalking()) return;
    this.sel.set(c);
    this.scrollToPlayer();
  }

  /** Encounter card action: walk (if needed) or enter directly. */
  protected onEncounterAction(c: VerticalChallenge): void {
    if (this.isLocked(c) || this.isWalking()) return;
    if (this.isWalkingNext(c)) {
      this.walkToNext(c);
      return;
    }
    if (this.needsWalkToOptional(c)) {
      this.walkToOptional(c);
      return;
    }
    // "Review activity" of a main challenge already completed and before the one
    // the avatar walks to (the immediate next one is already covered by `isWalkingNext` above):
    // it also walks there before opening it, instead of opening the card abruptly.
    if (!c.optional && c.id !== this.currentStopId()) {
      this.walkToCompleted(c);
      return;
    }
    this.openActivity(c);
  }

  /**
   * Walks along the real curved stretch of the path (not in a straight line) from the current position
   * to the next main challenge, at constant speed — same as `advanceExplorer`
   * in the reference prototype. On arrival, it reopens the card with the updated action.
   */
  private walkToNext(target: VerticalChallenge): void {
    this.sel.set(null);
    const segment = this.world().roads[target.id];
    this.walkAlongRoad(segment, () => {
      this.currentStopId.set(target.id);
      this.sel.set(target);
    });
  }

  /**
   * "Review activity" of an old main challenge (already completed, different from where
   * the avatar is standing): walks along the real stretch of the path — forward or backward,
   * concatenating the `roads` curves needed, same as `mainRoadToBranchPoint`
   * does for the branches — instead of going straight to the card.
   */
  private walkToCompleted(target: VerticalChallenge): void {
    this.sel.set(null);
    const segment = this.mainRoadTo(target.id);
    this.walkAlongRoad(segment, () => {
      this.currentStopId.set(target.id);
      this.openActivity(target);
    });
  }

  /** Stretch of the main path (real curves, not a straight line) between `currentStopId` and `targetId`, in either direction. */
  private mainRoadTo(targetId: number): [number, number][] {
    const w = this.world();
    const from = this.currentStopId();
    if (targetId === from) return [];

    const points: [number, number][] = [];
    const push = (pts: [number, number][]) => points.push(...(points.length ? pts.slice(1) : pts));
    if (targetId > from) {
      for (let id = from + 1; id <= targetId; id++) push(w.roads[id]);
    } else {
      for (let id = from; id > targetId; id--) push([...w.roads[id]].reverse());
    }
    return points;
  }

  /**
   * Walks to an optional challenge (bonus/recovery): first follows the real curve of the
   * main path up to the fork point and then the real curve of the branch — the
   * same ones drawn in the SVG — instead of cutting in a straight line across the map. On
   * arrival, it opens the activity directly (no second tap is needed, unlike what happens on
   * the main path).
   */
  private walkToOptional(target: VerticalChallenge): void {
    this.sel.set(null);
    const segment = this.routeToBranch(target);
    this.walkAlongRoad(segment, () => {
      this.visitingOptionalId.set(target.id);
      this.openActivity(target);
    });
  }

  /** On leaving an optional challenge, walks back to the main path along the same branch. */
  private walkBackToPath(): void {
    const optionalId = this.visitingOptionalId();
    if (optionalId === null) return;
    this.visitingOptionalId.set(null);

    const target = this.world().challenges.find((c) => c.id === optionalId);
    if (!target) return;
    this.walkAlongRoad([...this.routeToBranch(target)].reverse());
  }

  /**
   * Real points (not a straight line) from the avatar's current position to an optional
   * challenge: the stretch of the main path leading to its fork point (`branchFrom`,
   * in `roads[branchStopId][17]`) followed by the Bezier curve of the branch itself — the same curve
   * that `branchPaths()` draws in the SVG.
   */
  private routeToBranch(target: VerticalChallenge): [number, number][] {
    if (!target.branchFrom || target.branchStopId === undefined) {
      return [[this.playerPos().x, this.playerPos().y], [target.x, target.y]];
    }
    const toBranch = this.mainRoadToBranchPoint(target.branchStopId);
    const curve = this.branchCurvePoints(target);
    return [...toBranch, ...curve.slice(1)];
  }

  /**
   * Stretch of the main path (following the `roads` curves, not the stops in a straight line)
   * from the stop where the avatar is standing to the fork point
   * `roads[branchStopId][17]`, in either direction (the optional challenge may be
   * ahead of or behind where the player is).
   */
  private mainRoadToBranchPoint(branchStopId: number): [number, number][] {
    const w = this.world();
    const from = this.currentStopId();
    const points: [number, number][] = [];
    const push = (pts: [number, number][]) => points.push(...(points.length ? pts.slice(1) : pts));

    if (branchStopId === from) {
      push([...w.roads[branchStopId]].slice(17).reverse());
    } else if (branchStopId > from) {
      for (let id = from + 1; id < branchStopId; id++) push(w.roads[id]);
      push(w.roads[branchStopId].slice(0, 18));
    } else {
      for (let id = from; id > branchStopId; id--) push([...w.roads[id]].reverse());
      push([...w.roads[branchStopId]].slice(17).reverse());
    }
    return points;
  }

  /** Samples the branch's square-cornered stretch (same geometry that `branchPaths()` draws). */
  private branchCurvePoints(target: VerticalChallenge, steps = 17): [number, number][] {
    const w = this.world();
    return orthogonalRoute(target.branchFrom!, [target.x, target.y], w.worldWidth, w.worldHeight, steps);
  }

  /** Walks along the real curved stretch to the next challenge, without reopening any card. */
  private advanceToNext(): void {
    const w = this.world();
    const nextId = w.challenges.find((c) => !c.optional && !this.completedIds().includes(c.id))?.id ?? w.mainCount;
    if (nextId === this.currentStopId()) return;

    this.sel.set(null);
    const segment = w.roads[nextId];
    this.walkAlongRoad(segment, () => this.currentStopId.set(nextId));
  }

  /**
   * Animates the avatar along a stretch of the path (33 points of the Bezier curve) at a
   * constant ground speed, same as the reference prototype: each stretch lasts
   * as long as it takes to cover at ~120 units/sec, with a floor of 1200ms so that even a
   * short stretch feels like a walk and not like a jump.
   */
  private walkAlongRoad(segment: [number, number][], onArrive?: () => void): void {
    if (this.walkAnimId) cancelAnimationFrame(this.walkAnimId);
    if (!segment || segment.length < 2) {
      onArrive?.();
      return;
    }

    const w = this.world();
    const route = measureRoute(segment, w.worldWidth, w.worldHeight);
    const reducedMotion =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : Math.max(1200, (route.distance / 120) * 1000);

    this.isWalking.set(true);
    let elapsed = 0;
    let previousTime: number | undefined;
    let lastFootstep = -200;

    const step = (time: number) => {
      if (previousTime !== undefined) elapsed += Math.min(64, time - previousTime);
      previousTime = time;
      const progress = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const [x, y] = pointOnRoute(route, progress);

      // Clamp player within road bounds
      const clampedX = Math.max(10, Math.min(90, x));
      const clampedY = Math.max(2, Math.min(98, y));

      const dx = clampedX - this.playerPos().x;
      if (Math.abs(dx) > 0.001) this.facing.set(dx < 0 ? 'left' : 'right');
      this.playerPos.set({ x: clampedX, y: clampedY });
      // Camera glued to the player during the walk: the world moves to
      // keep them centered, instead of the avatar crossing a fixed viewport and
      // having to scroll by hand afterwards to find them again.
      this.followPlayerScroll(clampedX, clampedY);

      if (elapsed - lastFootstep > 180) {
        const puff: WalkPuff = { id: Date.now() + Math.random(), x: (clampedX / 100) * w.worldWidth, y: (clampedY / 100) * w.worldHeight };
        this.walkPuffs.update((list) => [...list.slice(-12), puff]);
        lastFootstep = elapsed;
      }

      if (progress < 1) {
        this.walkAnimId = requestAnimationFrame(step);
      } else {
        this.isWalking.set(false);
        onArrive?.();
      }
    };
    this.walkAnimId = requestAnimationFrame(step);
  }

  // Challenges and Interactive Activity
  protected openActivity(c: VerticalChallenge): void {
    this.sel.set(null);
    this.selectedAnswer.set(null);
    this.isQuizResolved.set(false);
    this.quizFeedback.set(null);
    this.activeChallenge.set(c);
  }

  protected closeActivity(): void {
    const wasOptional = this.activeChallenge()?.optional;
    this.activeChallenge.set(null);
    // On leaving a bonus/recovery, the avatar walks back to the main path.
    if (wasOptional) this.walkBackToPath();
  }

  protected currentQuestion(c: VerticalChallenge): QuestionData {
    return (
      this.world().questions[c.id] ?? {
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
      // Deduct a life if it is not review mode nor recovery
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
    const wasAlreadyCompleted = this.isCompleted(c);
    if (c.type === 'theory' && !wasAlreadyCompleted) {
      this.store.markContentRead(c.activityId ?? '', () => this.finishActivity(c));
      return;
    }
    this.finishActivity(c);
  }

  private finishActivity(c: VerticalChallenge): void {
    const wasAlreadyCompleted = this.isCompleted(c);
    if (!wasAlreadyCompleted) {
      this.completedIds.update((ids) => [...ids, c.id]);
      if (c.type !== 'theory') this.store.addProgress(c.xp, c.activityId, this.localLives());
    }
    if (c.recovery) {
      this.localLives.set(3);
      this.store.addProgress(0, undefined, 3);
    }
    this.closeActivity();

    // Only now (on closing/continuing) is the journey to the next challenge animated,
    // so the avatar does not "jump" while the activity modal was still open.
    if (!wasAlreadyCompleted && !c.optional) {
      if (c.id === this.world().mainCount) {
        this.celebrateUnitComplete();
      } else {
        this.advanceToNext();
      }
    }
  }

  /** Joy jump + fanfare + "Unidad completada" sign, on finishing the last challenge. */
  private celebrateUnitComplete(): void {
    this.sel.set(null);
    this.confettiPieces.set(this.buildConfetti());
    this.celebrating.set(true);
    this.playVictoryFanfare();

    if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
    // Lets the 4 jumps finish (4 × 0.75s, see .celebrating in avatar-sprite.ts) before
    // covering the scene with the sign.
    this.celebrateTimeoutId = window.setTimeout(() => {
      this.showUnitComplete.set(true);
      this.celebrating.set(false);
    }, 3000);
  }

  private buildConfetti(): ConfettiPiece[] {
    const colors = ['#FF2758', '#FFD447', '#3DDC97', '#4FC3F7', '#B388FF'];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.4,
      rotate: Math.random() * 360,
      color: colors[i % colors.length],
    }));
  }

  // Camera Navigation
  protected scrollToPlayer(): void {
    const el = this.mapViewport()?.nativeElement;
    if (!el) return;
    const w = this.world();
    const p = this.playerPos();
    el.scrollTo({
      top: (p.y / 100) * w.worldHeight * this.ZOOM - el.clientHeight / 2,
      left: (p.x / 100) * w.worldWidth * this.ZOOM - el.clientWidth / 2,
      behavior: 'smooth',
    });
  }

  /**
   * Same as `scrollToPlayer` but without its own CSS animation — it is called once per
   * frame from the `walkAlongRoad` loop (already hand-animated with RAF), so setting
   * `scrollTop`/`scrollLeft` directly keeps it from competing with the browser's own
   * `scrollTo({ behavior: 'smooth' })` and feeling like two cameras fighting.
   */
  private followPlayerScroll(xPercent: number, yPercent: number): void {
    const el = this.mapViewport()?.nativeElement;
    if (!el) return;
    const w = this.world();
    el.scrollTop = (yPercent / 100) * w.worldHeight * this.ZOOM - el.clientHeight / 2;
    el.scrollLeft = (xPercent / 100) * w.worldWidth * this.ZOOM - el.clientWidth / 2;
  }

  /**
   * Vertical scroll stays free (wheel/touch/keyboard) to review any stretch
   * ALREADY unlocked/passed, but no further: it clips `scrollTop` so that you can never
   * see, at the very top, a part of the world beyond the next available
   * challenge.
   *
   * Important: the limit is calculated with `completedIds` (what the student really
   * SOLVED), not with `currentStopId` — that one only marks where the avatar is STANDING, and
   * "walk here" already moves it to the next available node before it is solved.
   * If the limit used `currentStopId`, as soon as you walked to challenge 2 (without
   * completing it yet) you could already see/scroll up to 3, which is still locked.
   */
  protected onViewportScroll(): void {
    const el = this.mapViewport()?.nativeElement;
    if (!el) return;
    const w = this.world();
    const mainChallenges = w.challenges.filter((c) => !c.optional).sort((a, b) => a.id - b.id);
    const frontier = mainChallenges.find((c) => !this.isCompleted(c));
    const frontierId = frontier?.id ?? w.mainCount;
    const frontierY = w.stops[frontierId]?.[1] ?? 0;
    const minScrollTop = (frontierY / 100) * w.worldHeight * this.ZOOM - el.clientHeight / 2;
    if (el.scrollTop < minScrollTop) el.scrollTop = minScrollTop;
  }

  protected toggleFullscreen(): void {
    const panel = this.mapPanel()?.nativeElement;
    if (!panel) return;
    if (!document.fullscreenElement) {
      panel.requestFullscreen().catch(() => {});
      this.isExpanded.set(true);
    } else {
      document.exitFullscreen().catch(() => {});
      this.isExpanded.set(false);
    }
  }

  // Web Audio Sound Effects
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

  /** "Section completed" fanfare: ascending arpeggio longer than that of a single challenge. */
  private playVictoryFanfare(): void {
    if (!this.soundEnabled()) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {}
  }
}

interface Route {
  points: [number, number][];
  lengths: number[];
  distance: number;
}

/** Measures a stretch of the path (in % of the world) in real units, using the real width/height. */
function measureRoute(points: [number, number][], width: number, height: number): Route {
  const lengths = points
    .slice(1)
    .map((point, i) => Math.hypot(((point[0] - points[i][0]) * width) / 100, ((point[1] - points[i][1]) * height) / 100));
  return { points, lengths, distance: lengths.reduce((sum, n) => sum + n, 0) };
}

/** Point of the stretch at a fraction [0,1] of the journey, interpolating between the curve's points. */
function pointOnRoute(route: Route, fraction: number): [number, number] {
  let distance = Math.max(0, Math.min(1, fraction)) * route.distance;
  for (let i = 0; i < route.lengths.length; i++) {
    if (distance <= route.lengths[i]) {
      const t = route.lengths[i] ? distance / route.lengths[i] : 0;
      const [x0, y0] = route.points[i];
      const [x1, y1] = route.points[i + 1];
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    distance -= route.lengths[i];
  }
  return route.points[route.points.length - 1];
}
