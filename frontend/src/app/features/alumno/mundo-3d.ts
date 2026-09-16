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
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { descripcionPorDefecto, Unidad, XP_POR_DIFICULTAD } from '../../core/data/roadmap.models';
import { RankingPanel } from '../ranking/ranking-panel';
import { toEmbedUrl } from './recurso-embed.util';
import {
  BIOMA_A_WORLD_THEME,
  GeneratedWorld,
  generateVerticalWorld,
  QuestionData,
  VerticalChallenge,
  WorldTheme,
} from './vertical-world.engine';

/**
 * Contrato de mensajes que manda la escena Three.js al host vía
 * `window.parent.postMessage` cuando el jugador toca un nodo de desafío jugable en
 * su isla 3D (el teletransporte ciudad↔isla lo maneja el propio mundo 3D; ya no hace
 * falta navegar de ruta para eso).
 */
interface MensajeEnterActivity {
  type: 'enterActivity';
  unitId: string;
  actividadId: string;
}

function esMensajeEnterActivity(data: unknown): data is MensajeEnterActivity {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { type?: unknown }).type === 'enterActivity' &&
    typeof (data as { unitId?: unknown }).unitId === 'string' &&
    typeof (data as { actividadId?: unknown }).actividadId === 'string'
  );
}

/**
 * Mensaje que manda la escena Three.js cuando el jugador toca "Ver Ranking" cerca
 * del podio holográfico que está junto al Trofeo (ver `buildRankingPodium` en
 * index.html) — el mundo 3D no sabe nada del ranking en sí, solo avisa que hay que
 * mostrarlo; Angular ya tiene el `RankingPanel` completo (mismo componente que usa
 * el mapa 2D) y lo monta como overlay sobre el iframe.
 */
function esMensajeOpenRanking(data: unknown): data is { type: 'openRanking' } {
  return !!data && typeof data === 'object' && (data as { type?: unknown }).type === 'openRanking';
}

@Component({
  selector: 'app-mundo-3d',
  standalone: true,
  imports: [RouterLink, RankingPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mundo-3d">
      <div class="acciones-rol">
        @if (auth.rol() === 'PROFESOR') {
          <a routerLink="/profesor" class="btn-volver" title="Volver al editor del curso">← Editor</a>
        }
        <a class="cambiar-rol" (click)="cambiarRol()">⏻ Cambiar rol</a>
      </div>
      <iframe
        #frame
        title="Mundo 3D"
        [src]="mundo3dUrl"
        allow="autoplay; fullscreen; gamepad; pointer-lock"
        allowfullscreen
        (load)="onFrameLoad()"
      ></iframe>

      <!-- MODAL DE ACTIVIDAD Y PREGUNTAS (Quiz interactivo) — mismo componente visual
           que el mapa 2D (unidad-mapa.ts), reusado como overlay encima del iframe 3D
           persistente: tocar un nodo de desafío en la isla 3D abre esto en vez de
           navegar a otra ruta. -->
      @if (activeChallenge(); as c) {
        <div class="modal modal-open backdrop-blur-md z-50">
          <div class="modal-box max-w-xl border-4 border-primary bg-[#1C1E2B] p-6 text-white shadow-2xl chaflan">
            <div class="flex items-start justify-between gap-3 border-b-2 border-white/10 pb-3">
              <div>
                <span class="ui-font text-[8px] text-accent tracking-widest">
                  {{
                    c.type === 'teoria'
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
              @if (c.type === 'teoria') {
                <!-- Nodo de contenido teórico: material embebido (PDF/video/PPT vía link
                     externo), sin quiz — leer/ver alcanza para continuar. -->
                <p class="text-sm text-[#E0E2EC] opacity-90 mb-3">{{ c.description }}</p>
                <div class="rounded-lg overflow-hidden border border-white/10 bg-black/30" style="aspect-ratio: 16/9">
                  <iframe [src]="embedUrl(c)" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
                </div>
                <a [href]="c.recursoUrl" target="_blank" rel="noopener" class="link link-primary text-xs mt-2 inline-block">
                  Abrir en pestaña nueva ↗
                </a>
              } @else if (!isQuizResolved()) {
                <p class="text-base text-[#F3EAFF] leading-relaxed mb-4">
                  {{ currentQuestion(c).pregunta }}
                </p>

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

            <div class="modal-action border-t-2 border-white/10 pt-3">
              @if (c.type === 'teoria') {
                <button type="button" class="btn btn-primary w-full ui-font text-[9px]" (click)="onCompleteActivity(c)">
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
                <button type="button" class="btn btn-primary w-full ui-font text-[9px]" (click)="onCompleteActivity(c)">
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

      <!-- PANEL DE RANKING — mismo componente que usa el mapa 2D (mapa.ts), reusado
           como overlay encima del iframe 3D: tocar "Ver Ranking" en el podio junto
           al Trofeo abre esto en vez de una pantalla aparte. -->
      @if (rankingOpen()) {
        <app-ranking-panel (cerrar)="rankingOpen.set(false)" />
      }
    </div>
  `,
  styles: `
    .mundo-3d {
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
    .acciones-rol {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 20;
      display: flex;
      gap: 0.4rem;
    }
    .cambiar-rol,
    .btn-volver {
      padding: 0.3rem 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0.4rem;
      background: rgba(20, 20, 30, 0.65);
      color: #fff;
      font-size: 0.7rem;
      cursor: pointer;
      backdrop-filter: blur(4px);
      text-decoration: none;
    }
    .cambiar-rol:hover,
    .btn-volver:hover {
      background: rgba(20, 20, 30, 0.85);
    }
  `,
})
export class Mundo3d implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthMockService);
  private readonly store = inject(RoadmapStore);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  // Herramienta de exploración 3D (Three.js) que trajo el equipo de 3D — ver 3D/city_generator.html.
  // Se sirve como asset estático en frontend/public/mundo-3d/ (copia manual por ahora).
  protected readonly mundo3dUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('mundo-3d/index.html');

  private readonly onMensaje = (evento: MessageEvent): void => {
    if (esMensajeEnterActivity(evento.data)) {
      this.abrirDesafio(evento.data.unitId, evento.data.actividadId);
    } else if (esMensajeOpenRanking(evento.data)) {
      this.rankingOpen.set(true);
    }
  };

  protected readonly rankingOpen = signal(false);

  ngOnInit(): void {
    window.addEventListener('message', this.onMensaje);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMensaje);
  }

  protected cambiarRol(): void {
    this.auth.salir();
    this.router.navigate(['/login']);
  }

  // Contador, no boolean: un iframe sin `src` todavía dispara un `load` "fantasma"
  // sobre `about:blank` ANTES de que Angular termine de aplicar el binding `[src]`
  // (que navega recién en el próximo ciclo de detección de cambios). Con un boolean,
  // ese primer load ponía `cargado=true` y el `effect` mandaba el mensaje a esa
  // ventana fantasma que estaba por descartarse; cuando el iframe real terminaba de
  // cargar y disparaba SU propio `load`, `cargado` ya era `true` → la señal no
  // cambiaba de valor → el `effect` nunca se volvía a ejecutar → el mundo 3D real
  // jamás recibía las unidades/XP/vidas (se quedaba con los valores por defecto).
  private readonly cargas = signal(0);

  protected onFrameLoad(): void {
    this.cargas.update((n) => n + 1);
  }

  /**
   * Le manda al visor las unidades reales del curso (id, nombre, orden, bioma, si ya
   * está resuelta, y sus actividades con estado de completado) más el xp/vidas
   * vigentes del alumno — alimenta tanto la ficha del explorador como las islas de
   * desafíos 3D (una por unidad, ver `buildChallengeIsland` en index.html). Un
   * `effect` en vez de un solo envío al `load` del iframe: así la ciudad/islas se
   * actualizan solas apenas el alumno completa un desafío (ver `onCompleteActivity`
   * más abajo, que llama a `store.sumarProgreso` y dispara este mismo effect de nuevo).
   */
  private readonly sincronizarEstado = effect(() => {
    if (this.cargas() === 0) return;
    const contentWindow = this.frame()?.nativeElement.contentWindow;
    if (!contentWindow) return;

    const progreso = this.store.progreso();
    const completados = new Set(
      (progreso?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );
    // Misma definición de "unidad resuelta" que el mapa 2D (mapa.ts `islas`): solo mira
    // las actividades obligatorias, así una "Práctica libre" opcional sin hacer no la traba.
    const unidades = this.store.unidades().map((u) => {
      const obligatorias = u.actividades.filter((a) => a.esObligatorio);
      const resuelta = obligatorias.length > 0 && obligatorias.every((a) => completados.has(a.id));
      // Actividades viejas (de antes de que el editor pidiera dificultad al crearlas)
      // pueden no tenerla guardada — tratarlas como BASICO en vez de 0 XP, así no
      // quedan invisibles para el cálculo de progreso de la unidad.
      const xpDe = (a: (typeof u.actividades)[number]) => XP_POR_DIFICULTAD[a.dificultad ?? 'BASICO'];
      // XP de ESTA unidad (no el total del alumno): cuánto ganó de sus desafíos vs. cuánto
      // ganaría completando todos — es lo que muestra la ficha para la unidad en curso.
      const xpUnidad = u.actividades.filter((a) => completados.has(a.id)).reduce((sum, a) => sum + xpDe(a), 0);
      const xpUnidadMax = u.actividades.reduce((sum, a) => sum + xpDe(a), 0);
      return {
        id: u.id,
        nombre: u.nombre,
        orden: u.orden,
        bioma: u.bioma,
        resuelta,
        umbralXpDesbloqueo: u.umbralXpDesbloqueo,
        xpUnidad,
        xpUnidadMax,
        actividades: u.actividades.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          dificultad: a.dificultad,
          descripcion: a.descripcion,
          completada: completados.has(a.id),
        })),
      };
    });

    contentWindow.postMessage(
      {
        type: 'setUnidades',
        unidades,
        xpTotal: progreso?.xpTotal ?? 0,
        vidasVigentes: progreso?.vidasVigentes ?? 3,
      },
      '*',
    );
  });

  // Desafíos y Actividad Interactiva (isla 3D) — mismo modelo de datos e interacción
  // que unidad-mapa.ts (mapa 2D), portado como overlay sobre el iframe persistente en
  // vez de una ruta separada.
  protected readonly activeUnitId = signal<string | null>(null);
  protected readonly activeWorld = signal<GeneratedWorld | null>(null);
  protected readonly activeChallenge = signal<VerticalChallenge | null>(null);
  protected readonly selectedAnswer = signal<number | null>(null);
  protected readonly isQuizResolved = signal<boolean>(false);
  protected readonly quizFeedback = signal<string | null>(null);
  protected readonly soundEnabled = signal<boolean>(true);
  private readonly localVidas = signal<number>(3);

  protected readonly vidas = computed(() => this.store.progreso()?.vidasVigentes ?? this.localVidas());

  // Misma heurística de theme que unidad-mapa.ts: prioriza el bioma elegido por el
  // profesor y cae a nombre/orden para unidades viejas sin bioma o con uno sin tema 2D.
  private resolverTheme(u: Unidad): WorldTheme {
    if (u.bioma) {
      const temaDeBioma = BIOMA_A_WORLD_THEME[u.bioma];
      if (temaDeBioma) return temaDeBioma;
    }
    const nombre = u.nombre.toLowerCase();
    if (nombre.includes('desierto') || nombre.includes('fundamento') || u.orden === 1) return 'desert';
    if (nombre.includes('selva') || nombre.includes('control') || u.orden === 2) return 'jungle';
    if (nombre.includes('castillo') || (nombre.includes('funcion') && !nombre.includes('concurrencia')) || u.orden === 3)
      return 'castle';
    if (
      nombre.includes('nieve') ||
      nombre.includes('montaña') ||
      nombre.includes('taiga') ||
      nombre.includes('estructura de datos') ||
      u.orden === 4
    )
      return 'snow';
    if (
      nombre.includes('nether') ||
      nombre.includes('lava') ||
      nombre.includes('concurrencia') ||
      nombre.includes('redes') ||
      u.orden === 5
    )
      return 'nether';
    return (['desert', 'jungle', 'castle', 'snow', 'nether'] as const)[(u.orden - 1) % 5];
  }

  private abrirDesafio(unitId: string, actividadId: string): void {
    const u = this.store.unidadPorId(unitId);
    if (!u) return;

    const theme = this.resolverTheme(u);
    const baseChallenges: VerticalChallenge[] = u.actividades.map((act, i) => ({
      id: i + 1,
      actividadId: act.id,
      title: act.nombre,
      type: act.tipo,
      difficulty: act.dificultad || 'BASICO',
      minutes: 8,
      // 'teoria' no se evalúa: no otorga XP (ver mismo criterio en unidad-mapa.ts).
      xp: act.tipo === 'teoria' ? 0 : act.dificultad ? XP_POR_DIFICULTAD[act.dificultad] : 50,
      description: act.descripcion || descripcionPorDefecto(act.tipo),
      recursoUrl: act.recursoUrl,
      recursoTipo: act.recursoTipo,
      x: 50,
      y: 50,
    }));
    const world = generateVerticalWorld(theme, baseChallenges);
    const challenge = world.challenges.find((c) => c.actividadId === actividadId);
    if (!challenge) return;

    this.activeUnitId.set(unitId);
    this.activeWorld.set(world);
    this.openActivity(challenge);
  }

  protected openActivity(c: VerticalChallenge): void {
    this.selectedAnswer.set(null);
    this.isQuizResolved.set(false);
    this.quizFeedback.set(null);
    this.activeChallenge.set(c);
  }

  protected closeActivity(): void {
    this.activeChallenge.set(null);
    this.activeWorld.set(null);
    this.activeUnitId.set(null);
  }

  protected isCompleted(c: VerticalChallenge): boolean {
    if (!c.actividadId) return false;
    return (this.store.progreso()?.nodos ?? []).some((n) => n.nodoId === c.actividadId && n.estado === 'completado');
  }

  protected currentQuestion(c: VerticalChallenge): QuestionData {
    return (
      this.activeWorld()?.questions[c.id] ?? {
        pregunta: '¿Cuál es el propósito principal de esta actividad?',
        opciones: ['Aprender y validar los conceptos', 'Saltar al final sin responder', 'Ninguna de las anteriores'],
        correcta: 0,
        explicacion: '¡Excelente! Resolver las actividades te permite progresar y subir de nivel.',
      }
    );
  }

  /** URL embebible del material de un nodo 'teoria' (ver recurso-embed.util.ts). */
  protected embedUrl(c: VerticalChallenge): SafeResourceUrl {
    const url = toEmbedUrl(c.recursoTipo ?? 'pdf', c.recursoUrl ?? '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
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
      this.store.sumarProgreso(c.xp, c.actividadId, this.localVidas());
    }
    if (c.recovery) {
      this.localVidas.set(3);
      this.store.sumarProgreso(0, undefined, 3);
    }
    this.closeActivity();
    // El `effect` `sincronizarEstado` ya se dispara solo (store.progreso() cambió con
    // sumarProgreso) y le manda a la isla 3D el estado de actividades actualizado —
    // no hace falta un mensaje aparte para refrescar el nodo recién completado.
  }

  // Efectos de Sonido Web Audio — igual que unidad-mapa.ts.
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
