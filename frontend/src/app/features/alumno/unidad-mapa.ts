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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { EstadoNodo } from '../../core/data/roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { Lives } from './lives';
import {
  castleArt,
  fortressArt,
  GeneratedWorld,
  generateVerticalWorld,
  nodeArt,
  nodeVerb,
  QuestionData,
  renderWorldScenery,
  templeArt,
  VerticalChallenge,
  WorldTheme,
} from './vertical-world.engine';

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
  selector: 'app-unidad-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink, UpperCasePipe, Lives],
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
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #a57b40 #ebbd64;
      background: #382d23;
      position: relative;
    }
    .map-panel.expanded .map-viewport {
      height: 100dvh;
      max-height: none;
    }

    /* Confetti del cartel "Unidad completada" */
    @keyframes confetti-caida {
      0%   { transform: translateY(-10%) rotate(0deg); opacity: 1; }
      100% { transform: translateY(650%) rotate(540deg); opacity: 0.15; }
    }
    .confetti-pieza {
      position: absolute;
      top: 0;
      width: 8px;
      height: 14px;
      animation-name: confetti-caida;
      animation-timing-function: ease-in;
      animation-iteration-count: infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .confetti-pieza { animation: none; opacity: 0; }
    }
  `,
  template: `
    @if (unidad(); as u) {
      <div
        class="vertical-world relative flex flex-col w-full max-w-[1448px] h-full mx-auto overflow-hidden rounded-[20px] border-[6px] border-[#23242E] bg-base-300 shadow-[0_0_80px_rgba(139,92,246,0.18)]"
        [attr.data-theme]="theme()"
      >
        <!-- TOPBAR RETRO -->
        <header
          class="flex-shrink-0 flex flex-wrap items-center justify-between gap-4 border-b-4 border-[#23242E] bg-[#161722] px-6 py-2.5 text-white"
        >
          <!-- Breadcrumb / Volver -->
          <div class="flex items-center gap-3">
            <a
              routerLink="/alumno"
              class="btn btn-sm border-2 border-primary/50 bg-[#252836] ui-font text-[9px] text-primary hover:border-primary hover:bg-[#303348]"
            >
              ← MI CURSO
            </a>
            <span class="opacity-40">/</span>
            <span class="title-font text-sm text-[#F3EAFF]">Unidad {{ u.orden }}</span>
            <span class="opacity-40">·</span>
            <span class="ui-font text-[9px] text-accent">{{ u.nombre }}</span>
          </div>

          <!-- HUD flotante superior (Vidas, Racha, XP) -->
          <div class="flex items-center gap-6">
            <!-- Vidas -->
            <div class="flex items-center gap-2 rounded-lg border border-red-900/50 bg-black/40 px-3 py-1.5">
              <span class="ui-font text-[8px] text-red-400">VIDAS</span>
              <app-lives [current]="vidas()" [size]="18" />
            </div>

            <!-- Racha -->
            <div class="flex items-center gap-2 rounded-lg border border-amber-900/50 bg-black/40 px-3 py-1.5">
              <span class="text-amber-400">⚡</span>
              <div>
                <strong class="ui-font text-[10px] text-amber-300">7 DÍAS</strong>
                <span class="block ui-font text-[7px] opacity-60">EN RACHA</span>
              </div>
            </div>

            <!-- XP Total -->
            <div class="flex items-center gap-2 rounded-lg border border-purple-900/50 bg-black/40 px-3 py-1.5">
              <span class="text-purple-400">★</span>
              <div>
                <strong class="ui-font text-[11px] text-purple-200">{{ xp() }}</strong>
                <span class="ml-1 ui-font text-[8px] text-purple-400">XP</span>
              </div>
            </div>
          </div>
        </header>

        <!-- PANEL DE MAPA Y NAVEGACIÓN -->
        <div #mapPanel class="map-panel flex-1 min-h-0 relative flex flex-col" [class.expanded]="isExpanded()">
          <!-- Toolbar del Mapa -->
          <div
            class="flex-shrink-0 flex items-center justify-between border-b-2 border-[#2E303D] bg-[#1E202C] px-5 py-2 text-xs text-[#E0E2EC]"
          >
            <div class="flex items-center gap-3">
              <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="ui-font text-[8px] tracking-wider text-emerald-300">
                MUNDO 0{{ u.orden }} · {{ world().setting | uppercase }}
              </span>
            </div>

            <!-- Controles de cámara y pantalla completa -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-xs border border-white/20 bg-white/10 ui-font text-[8px] text-white hover:bg-white/20"
                (click)="scrollToGoal()"
                title="Ver meta final en la cumbre"
              >
                ↑ META
              </button>
              <button
                type="button"
                class="btn btn-xs border border-white/20 bg-white/10 ui-font text-[8px] text-white hover:bg-white/20"
                (click)="scrollToPlayer()"
                title="Centrar en el explorador"
              >
                EXPLORADOR
              </button>
              <button
                type="button"
                class="btn btn-xs border border-white/20 bg-white/10 ui-font text-[8px] text-white hover:bg-white/20"
                (click)="scrollToStart()"
                title="Ir al inicio del camino"
              >
                ↓ INICIO
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

          <!-- VIEWPORT CON SCROLL VERTICAL (Ocupa 100% del ancho y alto) -->
          <div #mapViewport class="map-viewport">
            <div
              class="map-world relative w-full overflow-hidden"
              [style.height.px]="world().worldHeight"
              [style.background]="'var(--ground) url(' + world().tile + ') repeat-y'"
              style="background-size: 100% auto; image-rendering: pixelated;"
            >
              <!-- 1. Capa de Terreno y Caminos SVG -->
              <div class="vertical-terrain">
                <!-- Caminos Bezier calculados -->
                <svg
                  class="vertical-road"
                  [attr.viewBox]="'0 0 ' + world().worldWidth + ' ' + world().worldHeight"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <!-- Ramales de bonus y recuperación -->
                  @for (br of branchPaths(); track $index) {
                    <path [attr.d]="br" class="support-road-edge" />
                    <path [attr.d]="br" class="support-road" />
                  }
                  <!-- Camino principal con múltiples capas -->
                  <path [attr.d]="roadPathD()" class="road-shadow" />
                  <path [attr.d]="roadPathD()" class="road-edge" />
                  <path [attr.d]="roadPathD()" class="road-sand" />
                  <path [attr.d]="roadPathD()" class="road-center" />
                </svg>

                <!-- Escenario Procedural (Monedas, Casas Hongo, Nubes, Flores, Antorchas, etc.) -->
                <div [innerHTML]="scenerySvg()" class="pointer-events-none"></div>

                <!-- Meta en la cumbre (Castillo / Templo / Fortaleza) -->
                <div class="vertical-castle" [style.top.%]="castleTopPercent()">
                  <div [innerHTML]="castleGoalSvg()"></div>
                  <span>LA META DE TU AVENTURA</span>
                </div>

                <!-- Punto de partida START en la base -->
                <div class="vertical-start" [style.top.%]="startTopPercent()">
                  <span>START</span>
                  <small>Tu aventura empieza aquí</small>
                </div>

                <!-- Hitos / Sectores en el ascenso -->
                @for (m of milestones(); track m.id) {
                  <div class="ascent-milestone" [style.top.%]="m.y">
                    <span>↑</span> SECTOR {{ m.sector }}
                  </div>
                }
              </div>

              <!--
                Letreros de soporte para bonus y recuperación: van FUERA de .vertical-terrain
                (que tiene z-index:1) a propósito — ahí quedaban siempre por detrás de los
                nodos (z-index:8) sin importar el z-index propio del letrero, y el badge del
                nodo (".node-sign") tapaba el título ("♥ RECUPERAR VIDA", etc.).
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

              <!-- 2. Partículas de polvo de caminata -->
              @for (p of walkPuffs(); track p.id) {
                <div class="walk-puff" [style.left.px]="p.x" [style.top.px]="p.y"></div>
              }

              <!-- 3. Nodos de Desafíos Interactivos -->
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
                  <!-- Sombra en suelo para nodos disponibles -->
                  <div class="object-ground"></div>

                  <!-- Invitación flotante animada ("¡GOLPEA!", "¡ABRE!", "¡DESPIERTA!") -->
                  @if (isAvailable(c) && !isCompleted(c)) {
                    <div class="node-invitation">
                      {{ nodeVerbText(c) }}
                    </div>
                  }

                  <!-- Sprite SVG del Nodo -->
                  <div [innerHTML]="nodeSvg(c)" class="w-full"></div>

                  <!-- Placa de número o check -->
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

              <!-- 4. Avatar del Explorador Caminando -->
              <div
                class="explorer absolute pointer-events-none z-20"
                [style.left.%]="playerPos().x"
                [style.top.%]="playerPos().y"
                style="translate: -50% -75%; transition: none;"
              >
                <ui-avatar-sprite
                  [config]="avatarSrv.avatar()"
                  [alto]="54"
                  [sombra]="true"
                  [caminando]="isWalking()"
                  [celebrando]="celebrating()"
                  [mirando]="facing()"
                />
              </div>

              <!-- 5. Tarjeta de Encuentro Flotante (.encounter) -->
              @if (sel(); as c) {
                <div
                  class="encounter"
                  [style.--encounter-x]="c.x + '%'"
                  [style.--encounter-y]="c.y + '%'"
                  [class.below]="c.y < 15"
                >
                  <button type="button" class="encounter-close" (click)="sel.set(null)" aria-label="Cerrar">×</button>
                  <span class="encounter-kicker">
                    {{ c.recovery ? 'RECUPERACIÓN' : c.optional ? 'DESAFÍO BONUS' : 'DESAFÍO ' + c.id }} · {{ c.difficulty }}
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

          <!-- LEYENDA DEL MAPA INFERIOR -->
          <footer
            class="flex-shrink-0 flex flex-wrap items-center justify-center gap-6 border-t-2 border-[#2E303D] bg-[#161722] px-6 py-2.5 text-xs text-[#B4B7C9]"
          >
            <span class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-900/60 text-emerald-400 font-bold text-[10px]">✓</span>
              Completado
            </span>
            <span class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-900/60 text-amber-400 font-bold text-[10px]">●</span>
              Disponible
            </span>
            <span class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 text-[10px]">🔒</span>
              Bloqueado
            </span>
            <span class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-900/60 text-purple-400 font-bold text-[10px]">★</span>
              Bonus
            </span>
            <span class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-red-900/60 text-red-400 font-bold text-[10px]">♥</span>
              Recuperar vida
            </span>
          </footer>

          <!--
            Los modales van DENTRO de #mapPanel (no como hermanos del panel) a propósito:
            la Fullscreen API solo renderiza el subárbol del elemento fullscreenizado, así
            que si quedaran afuera, no se verían al completar un desafío en pantalla completa.
          -->
          <!-- MODAL DE ACTIVIDAD Y PREGUNTAS (Quiz interactivo) -->
      @if (activeChallenge(); as c) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="modal-box max-w-xl border-4 border-primary bg-[#1C1E2B] p-6 text-white shadow-2xl chaflan">
            <!-- Header Modal -->
            <div class="flex items-start justify-between gap-3 border-b-2 border-white/10 pb-3">
              <div>
                <span class="ui-font text-[8px] text-accent tracking-widest">
                  {{ isCompleted(c) ? 'MODO REPASO' : c.recovery ? 'RECUPERACIÓN DE VIDA' : 'DESAFÍO ' + c.id }} · ACTIVIDAD
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

            <!-- Contenido de la Actividad / Pregunta -->
            <div class="my-4">
              @if (!isQuizResolved()) {
                <p class="text-base text-[#F3EAFF] leading-relaxed mb-4">
                  {{ currentQuestion(c).pregunta }}
                </p>

                <!-- Lista de opciones de respuesta -->
                <div class="flex flex-col gap-2.5" role="group" aria-label="Opciones de respuesta">
                  @for (opt of currentQuestion(c).opciones; track $index) {
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

                <!-- Feedback en caso de respuesta incorrecta -->
                @if (quizFeedback()) {
                  <div class="alert alert-error mt-4 text-xs ui-font py-2.5">
                    <span>{{ quizFeedback() }}</span>
                  </div>
                }
              } @else {
                <!-- Pantalla de Recompensa y Éxito -->
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
                    {{ currentQuestion(c).explicacion }}
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

            <!-- Botones de Acción del Modal -->
            <div class="modal-action border-t-2 border-white/10 pt-3">
              @if (!isQuizResolved()) {
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

      <!-- CARTEL DE UNIDAD COMPLETADA (al terminar el último desafío principal) -->
      @if (showUnitComplete()) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="pointer-events-none absolute inset-0 overflow-hidden">
            @for (p of confettiPieces(); track p.id) {
              <span
                class="confetti-pieza"
                [style.left.%]="p.left"
                [style.background]="p.color"
                [style.animation-delay.s]="p.delay"
                [style.animation-duration.s]="p.duration"
                [style.rotate]="p.rotate + 'deg'"
              ></span>
            }
          </div>
          <div
            class="modal-box relative max-w-md border-4 border-primary bg-[#1C1E2B] p-8 text-center text-white shadow-2xl chaflan"
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
            <h2 class="title-font mt-2 text-2xl text-primary">{{ u.nombre }}</h2>
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
              routerLink="/alumno"
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
        <a routerLink="/alumno" class="btn btn-primary btn-sm mt-4">Volver al inicio</a>
      </div>
    }
  `,
})
export class UnidadMapa {
  readonly id = input.required<string>();

  protected readonly avatarSrv = inject(AvatarService);
  private readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly mapViewport = viewChild<ElementRef<HTMLDivElement>>('mapViewport');
  protected readonly mapPanel = viewChild<ElementRef<HTMLDivElement>>('mapPanel');

  protected readonly unidad = computed(() => this.store.unidadPorId(this.id()));

  // Determina el tema según el nombre u orden de la unidad
  protected readonly theme = computed<WorldTheme>(() => {
    const u = this.unidad();
    if (!u) return 'desert';
    const nombre = u.nombre.toLowerCase();
    if (nombre.includes('desierto') || nombre.includes('fundamento') || u.orden === 1) return 'desert';
    if (nombre.includes('selva') || nombre.includes('control') || u.orden === 2) return 'jungle';
    if (nombre.includes('castillo') || nombre.includes('fortaleza') || nombre.includes('funcion') || u.orden === 3)
      return 'castle';
    return (['desert', 'jungle', 'castle'] as const)[(u.orden - 1) % 3];
  });

  // Lista de desafíos y generación del mundo vertical
  protected readonly world = computed<GeneratedWorld>(() => {
    const u = this.unidad();
    const currentTheme = this.theme();
    const count = u ? Math.max(4, u.actividades.length) : 6;

    const baseChallenges: VerticalChallenge[] = Array.from({ length: count }, (_, i) => {
      const act = u?.actividades[i];
      return {
        id: i + 1,
        actividadId: act?.id,
        title: act?.nombre || `Desafío ${i + 1}`,
        type: act?.tipo || 'Práctico',
        difficulty: act?.dificultad || 'Inicial',
        minutes: 8,
        xp: 100 + i * 25,
        description: act?.descripcion || `Aprende y consolida los fundamentos del desafío ${i + 1}.`,
        x: 50,
        y: 50,
      };
    });

    // Añade desafíos opcionales (Bonus y Recuperación)
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
        title: currentTheme === 'jungle' ? 'Barril de provisiones' : currentTheme === 'castle' ? 'Fuente de alquimia' : 'Tubería de recuperación',
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

  // Sincronización de progreso y estados con RoadmapStore
  protected readonly completedIds = signal<number[]>([1]);
  protected readonly localVidas = signal<number>(3);

  protected readonly vidas = computed(() => this.store.progreso()?.vidasVigentes ?? this.localVidas());
  protected readonly xp = computed(() => this.store.progreso()?.xpTotal ?? 0);

  // Posicionamiento e interacción
  protected readonly sel = signal<VerticalChallenge | null>(null);
  protected readonly activeChallenge = signal<VerticalChallenge | null>(null);
  protected readonly selectedAnswer = signal<number | null>(null);
  protected readonly isQuizResolved = signal<boolean>(false);
  protected readonly quizFeedback = signal<string | null>(null);
  protected readonly soundEnabled = signal<boolean>(true);
  protected readonly isExpanded = signal<boolean>(false);

  // Caminata del Avatar
  protected readonly playerPos = signal<{ x: number; y: number }>({ x: 50, y: 90.5 });
  protected readonly isWalking = signal<boolean>(false);
  protected readonly facing = signal<'derecha' | 'izquierda'>('derecha');
  protected readonly walkPuffs = signal<WalkPuff[]>([]);
  // Id del stop del camino principal (0..mainCount) donde está parado lógicamente el avatar
  private readonly currentStopId = signal<number>(0);
  // Id del desafío opcional (bonus/recuperación) en el que está el avatar; null = en el camino principal
  private readonly visitingOptionalId = signal<number | null>(null);
  private walkAnimId = 0;

  // Cierre de unidad (al completar el último desafío principal)
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
    // Al cargar o cambiar de unidad, posiciona instantáneamente al jugador en el ÚLTIMO
    // desafío principal completado (o en el inicio si no completó ninguno) — nunca en el
    // próximo por resolver: ese tramo lo tiene que caminar el propio jugador al tocarlo.
    // `completedIds` se lee sin trackear para que completar un desafío no vuelva a disparar
    // este salto instantáneo: ese caso lo anima `advanceToNext`.
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

    // Centra la cámara automáticamente en la posición del personaje al entrar
    afterNextRender(() => {
      setTimeout(() => this.scrollToPlayer(), 200);
    });

    this.destroyRef.onDestroy(() => {
      if (this.walkAnimId) cancelAnimationFrame(this.walkAnimId);
      if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
    });
  }

  // Rutas SVG calculadas
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
      .map((c) => {
        const [x, y] = c.branchFrom!;
        return `M${(x / 100) * w.worldWidth},${(y / 100) * w.worldHeight} Q${((x + c.x) / 200) * w.worldWidth},${(y / 100) * w.worldHeight + 24} ${(c.x / 100) * w.worldWidth},${(c.y / 100) * w.worldHeight}`;
      });
  });

  protected readonly castleTopPercent = computed(() => {
    const w = this.world();
    const last = w.stops[w.mainCount] || [50, 10];
    return ((last[1] / 100) * w.worldHeight - 355) / (w.worldHeight / 100);
  });

  protected readonly startTopPercent = computed(() => {
    const w = this.world();
    return ((w.worldHeight - 95) / w.worldHeight) * 100;
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

  // Helpers de Estado
  protected isCompleted(c: VerticalChallenge): boolean {
    return this.completedIds().includes(c.id);
  }

  protected isAvailable(c: VerticalChallenge): boolean {
    if (this.isCompleted(c)) return true;
    if (c.recovery) return true;
    if (c.optional) return this.completedIds().length >= 2;
    // Secuencial: disponible si es el primer nodo o el anterior está completado
    return c.id === 1 || this.completedIds().includes(c.id - 1);
  }

  protected isLocked(c: VerticalChallenge): boolean {
    return !this.isAvailable(c);
  }

  /**
   * Solo el desafío principal inmediatamente siguiente al que camina el avatar dispara una
   * caminata — igual que el prototipo de referencia (`awaitingWalk`/`walkingNext`): al resto
   * de los nodos (completados, bonus, recuperación) se entra directo, sin desplazar al avatar.
   */
  protected isWalkingNext(c: VerticalChallenge): boolean {
    return !c.optional && c.id === this.currentStopId() + 1 && this.isAvailable(c);
  }

  /** Los desafíos opcionales (bonus/recuperación) también se caminan, siguiendo su ramal. */
  protected needsWalkToOptional(c: VerticalChallenge): boolean {
    return !!c.optional && this.isAvailable(c) && this.visitingOptionalId() !== c.id;
  }

  protected nodeVerbText(c: VerticalChallenge): string {
    const status = this.isCompleted(c) ? 'completed' : this.isAvailable(c) ? 'available' : 'locked';
    return nodeVerb(this.theme(), status);
  }

  // Renderizadores SVG Sanitizados
  protected scenerySvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderWorldScenery(this.world(), this.completedIds()));
  }

  protected castleGoalSvg(): SafeHtml {
    const t = this.theme();
    const raw = t === 'jungle' ? templeArt : t === 'castle' ? fortressArt : castleArt;
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  protected nodeSvg(c: VerticalChallenge): SafeHtml {
    const status = this.isCompleted(c) ? 'completed' : this.isAvailable(c) ? 'available' : 'locked';
    return this.sanitizer.bypassSecurityTrustHtml(nodeArt(this.theme(), c, status, this.world().mainCount));
  }

  // Interacción y Caminata
  /** Tocar un nodo solo abre su tarjeta de encuentro — el avatar nunca se mueve por esto. */
  protected onNodeClick(c: VerticalChallenge): void {
    if (this.isWalking()) return;
    this.sel.set(c);
  }

  /** Acción de la tarjeta de encuentro: caminar (si hace falta) o entrar directo. */
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
    this.openActivity(c);
  }

  /**
   * Camina por el tramo curvo real del camino (no en línea recta) desde la posición actual
   * hasta el próximo desafío principal, a velocidad constante — igual que `advanceExplorer`
   * en el prototipo de referencia. Al llegar, reabre la tarjeta ya con la acción actualizada.
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
   * Camina hasta un desafío opcional (bonus/recuperación) pasando por su punto de bifurcación
   * en el camino principal, en vez de cortar en línea recta a través del mapa. Al llegar, abre
   * la actividad directamente (no hace falta un segundo toque, como sí ocurre en el camino
   * principal).
   */
  private walkToOptional(target: VerticalChallenge): void {
    this.sel.set(null);
    const from: [number, number] = [this.playerPos().x, this.playerPos().y];
    const segment: [number, number][] = target.branchFrom
      ? [from, target.branchFrom, [target.x, target.y]]
      : [from, [target.x, target.y]];
    this.walkAlongRoad(segment, () => {
      this.visitingOptionalId.set(target.id);
      this.openActivity(target);
    });
  }

  /** Al salir de un desafío opcional, camina de vuelta al camino principal por el mismo ramal. */
  private walkBackToPath(): void {
    const optionalId = this.visitingOptionalId();
    if (optionalId === null) return;
    this.visitingOptionalId.set(null);

    const w = this.world();
    const c = w.challenges.find((ch) => ch.id === optionalId);
    const from: [number, number] = [this.playerPos().x, this.playerPos().y];
    const mainStop = w.stops[this.currentStopId()] ?? [50, 90];
    const segment: [number, number][] = c?.branchFrom ? [from, c.branchFrom, mainStop] : [from, mainStop];
    this.walkAlongRoad(segment);
  }

  /** Camina por el tramo curvo real hasta el próximo desafío, sin reabrir ninguna tarjeta. */
  private advanceToNext(): void {
    const w = this.world();
    const nextId = w.challenges.find((c) => !c.optional && !this.completedIds().includes(c.id))?.id ?? w.mainCount;
    if (nextId === this.currentStopId()) return;

    this.sel.set(null);
    const segment = w.roads[nextId];
    this.walkAlongRoad(segment, () => this.currentStopId.set(nextId));
  }

  /**
   * Anima al avatar a lo largo de un tramo del camino (33 puntos de la curva Bezier) a
   * velocidad de suelo constante, igual que el prototipo de referencia: cada tramo dura lo
   * que tarde en recorrerse a ~120 unidades/seg, con un piso de 1200ms para que incluso un
   * tramo corto se sienta como una caminata y no como un salto.
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

      const dx = x - this.playerPos().x;
      if (Math.abs(dx) > 0.001) this.facing.set(dx < 0 ? 'izquierda' : 'derecha');
      this.playerPos.set({ x, y });

      if (elapsed - lastFootstep > 180) {
        const puff: WalkPuff = { id: Date.now() + Math.random(), x: (x / 100) * w.worldWidth, y: (y / 100) * w.worldHeight };
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

  // Desafíos y Actividad Interactiva
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
    // Al salir de un bonus/recuperación, el avatar vuelve caminando al camino principal.
    if (wasOptional) this.walkBackToPath();
  }

  protected currentQuestion(c: VerticalChallenge): QuestionData {
    return (
      this.world().questions[c.id] ?? {
        pregunta: '¿Cuál es el propósito principal de esta actividad?',
        opciones: ['Aprender y validar los conceptos', 'Saltar al final sin responder', 'Ninguna de las anteriores'],
        correcta: 0,
        explicacion: '¡Excelente! Resolver las actividades te permite progresar y subir de nivel.',
      }
    );
  }

  protected checkAnswer(c: VerticalChallenge): void {
    const ans = this.selectedAnswer();
    if (ans === null) return;
    const q = this.currentQuestion(c);

    if (ans === q.correcta) {
      this.isQuizResolved.set(true);
      this.quizFeedback.set(null);
      this.playAudioTone(true);
    } else {
      this.playAudioTone(false);
      // Descuenta una vida si no es modo repaso ni recuperación
      if (!this.isCompleted(c) && !c.recovery) {
        this.localVidas.update((v) => Math.max(0, v - 1));
        this.store.sumarProgreso(0, undefined, this.localVidas());
      }
      this.quizFeedback.set(
        this.vidas() === 0 && !c.recovery
          ? '¡Te has quedado sin vidas! Ve al nodo de recuperación para recargar tus corazones.'
          : 'Respuesta incorrecta. Revisa la consigna y vuelve a intentarlo.',
      );
    }
  }

  protected onCompleteActivity(c: VerticalChallenge): void {
    const wasAlreadyCompleted = this.isCompleted(c);
    if (!wasAlreadyCompleted) {
      this.completedIds.update((ids) => [...ids, c.id]);
      this.store.sumarProgreso(c.xp, c.actividadId, this.localVidas());
    }
    if (c.recovery) {
      this.localVidas.set(3);
      this.store.sumarProgreso(0, undefined, 3);
    }
    this.closeActivity();

    // Recién ahora (al cerrar/continuar) se anima el recorrido hacia el próximo desafío,
    // para que el avatar no "salte" mientras el modal de la actividad seguía abierto.
    if (!wasAlreadyCompleted && !c.optional) {
      if (c.id === this.world().mainCount) {
        this.celebrateUnitComplete();
      } else {
        this.advanceToNext();
      }
    }
  }

  /** Salto de alegría + fanfarria + cartel "Unidad completada", al terminar el último desafío. */
  private celebrateUnitComplete(): void {
    this.sel.set(null);
    this.confettiPieces.set(this.buildConfetti());
    this.celebrating.set(true);
    this.playVictoryFanfare();

    if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
    // Deja terminar los 4 saltos (4 × 0.75s, ver .celebrando en avatar-sprite.ts) antes de
    // tapar la escena con el cartel.
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

  // Navegación de Cámara
  protected scrollToGoal(): void {
    const el = this.mapViewport()?.nativeElement;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected scrollToStart(): void {
    const el = this.mapViewport()?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  protected scrollToPlayer(): void {
    const el = this.mapViewport()?.nativeElement;
    if (!el) return;
    const w = this.world();
    const playerY = (this.playerPos().y / 100) * w.worldHeight;
    el.scrollTo({ top: playerY - el.clientHeight / 2, behavior: 'smooth' });
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

  // Efectos de Sonido Web Audio
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

  /** Fanfarria de "unidad completada": arpegio ascendente más largo que el de un desafío suelto. */
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

/** Mide un tramo del camino (en % del mundo) en unidades reales, usando el ancho/alto real. */
function measureRoute(points: [number, number][], width: number, height: number): Route {
  const lengths = points
    .slice(1)
    .map((point, i) => Math.hypot(((point[0] - points[i][0]) * width) / 100, ((point[1] - points[i][1]) * height) / 100));
  return { points, lengths, distance: lengths.reduce((sum, n) => sum + n, 0) };
}

/** Punto del tramo a una fracción [0,1] del recorrido, interpolando entre los puntos de la curva. */
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
