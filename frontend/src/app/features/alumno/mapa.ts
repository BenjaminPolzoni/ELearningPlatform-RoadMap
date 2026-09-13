import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Unidad } from '../../core/data/roadmap.models';
import {
  base,
  caja,
  camino,
  caraLateral,
  layoutIslas,
  proyectar,
  Punto,
  frac,
  rombo,
  TILE_H,
} from '../../core/iso/iso';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { InventoryModal, InventoryMode } from '../../shared/ui/inventory-modal';
import { Lives } from './lives';
import { FIRE_COLORS, FIRE_GRID } from './racha';
import { RankingPanel } from '../ranking/ranking-panel';
import { PixelIcon } from '../../shared/pixel-icon';

type EstadoIsla = 'bloqueada' | 'disponible' | 'completada';
type JoyDir = 'left' | 'right' | 'up' | 'down';

interface Isla {
  u: Unidad;
  c: Punto;
  piso: Punto;
  estado: EstadoIsla;
  actual: boolean;
  hechas: number;
  total: number;
}

// --- geometría de la isla, en px de pantalla ---
const SEMI_ANCHO = 86;
const SEMI_ALTO = 43;
const ESPESOR = 24;
const BASE_LARGO = 70;
const MARGEN = 90;

/**
 * Mapa 2.5D del curso (E2) con chasis completo de Consola Arcade EduQuest TV:
 * - Navbar superior con marca neón, rol y botón circular de avatar.
 * - Panel derecho acrílico edge-lit con estadísticas del jugador (Nivel, XP líquida, Vidas, Racha).
 * - Panel inferior metálico con Joystick 45° interactivo y botonera Sanwa (Ranking, Insignias, Mochila, System).
 * - Pantalla central con viñeta CRT y mapa isométrico SVG.
 */
@Component({
  selector: 'app-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink, InventoryModal, RankingPanel, Lives, PixelIcon],
  host: { class: 'block w-full h-full' },
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .isla-hit:focus-visible {
      outline: none;
    }
    .isla-hit:focus-visible .isla-foco {
      stroke: #f3eaff;
      stroke-width: 3;
      stroke-dasharray: 6 4;
    }
  `,
  template: `
    @if (preview()) {
      <!-- Modo preview embebido en el editor del profesor: sin chasis arcade ni HUD -->
      <div class="escena-neon relative overflow-hidden border-2 border-secondary" style="height: 300px">
        <svg #lienzo [attr.viewBox]="viewBox()" class="block h-full w-full select-none" role="img">
          <defs>
            <linearGradient id="isla-top" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3E2166" />
              <stop offset="100%" stop-color="#241046" />
            </linearGradient>
            <linearGradient id="isla-top-on" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#9D57FF" />
              <stop offset="100%" stop-color="#5A1BA8" />
            </linearGradient>
            <linearGradient id="isla-base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#54299B" />
              <stop offset="45%" stop-color="#331255" />
              <stop offset="100%" stop-color="#1B0838" />
            </linearGradient>
            <filter id="neon" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g opacity="0.16" stroke="#8B3DF5" stroke-width="1">
            @for (l of grilla(); track $index) {
              <line [attr.x1]="l.a.x" [attr.y1]="l.a.y" [attr.x2]="l.b.x" [attr.y2]="l.b.y" />
            }
          </g>
          <g fill="none" stroke-linecap="round">
            @for (t of tramos(); track t.id) {
              <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="11" opacity="0.28" filter="url(#neon)" />
              <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="4" [attr.opacity]="t.tenue ? 0.4 : 0.95" />
            }
          </g>
          @for (isla of islas(); track isla.u.id) {
            <g class="isla-hit">
              <ellipse [attr.cx]="isla.piso.x" [attr.cy]="isla.piso.y + 30" [attr.rx]="SEMI_ANCHO * 0.82" [attr.ry]="SEMI_ALTO * 0.5" fill="#0E0120" opacity="0.5" />
              <polygon [attr.points]="poliBase(isla)" fill="url(#isla-base)" stroke="#7B3AD6" stroke-width="1.5" stroke-opacity="0.45" />
              <polygon [attr.points]="poliCara(isla, 'izq')" fill="#4A2280" />
              <polygon [attr.points]="poliCara(isla, 'der')" fill="#2A1049" />
              <polygon [attr.points]="poliTapa(isla)" fill="url(#isla-top-on)" [attr.stroke]="borde(isla)" stroke-width="2" />
              <text [attr.x]="isla.c.x" [attr.y]="isla.c.y + ESPESOR + BASE_LARGO + 26" text-anchor="middle" font-size="15" fill="#F3EAFF" style="font-family: var(--font-title)">
                {{ isla.u.orden }}. {{ isla.u.nombre }}
              </text>
            </g>
          }
        </svg>
      </div>
    } @else {
      <!-- ==================== CHASIS COMPLETO EDUQUEST TV ==================== -->
      <div class="w-full h-full flex flex-col rounded-[20px] bg-[#17181F] border-[6px] border-[#23242E] shadow-[0_0_80px_rgba(139,92,246,0.18)] overflow-hidden">
        
        <!-- 1. NAVBAR ARCADE SUPERIOR -->
        <header class="flex-shrink-0 relative z-10">
          <nav class="navbar flex h-12 flex-shrink-0 items-center justify-between gap-4 px-4 border-b-4 border-[#8B5CF6] bg-gradient-to-r from-[#12102B] via-[#0D0B1E] to-[#12102B]">
            <div class="flex items-center gap-3">
              <span class="text-2xl drop-shadow-[0_0_10px_rgba(255,214,10,0.8)]">🎯</span>
              <div class="leading-tight">
                <div class="text-lg font-black tracking-wide text-[#7FFAFF] glow-cyan">
                  EDUQUEST
                </div>
                <div class="text-[9px] uppercase tracking-[0.3em] text-base-content/50">
                  Roadmap Gamificado
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              @if (auth.rol() === 'PROFESOR') {
                <a
                  routerLink="/profesor"
                  class="btn btn-xs border border-white/20 bg-white/10 ui-font text-[8px] text-white hover:bg-white/20"
                  title="Volver al editor del curso"
                >
                  ← EDITOR
                </a>
              }
              <a
                routerLink="/login"
                class="badge badge-outline ui-font text-[9px] cursor-pointer transition-colors flex items-center gap-1 border-[#00E5FF] text-[#7FFAFF] hover:bg-[#00E5FF]/15"
                title="Cambiar de rol / volver al selector"
              >
                <span>{{ auth.rol() ?? 'ALUMNO' }}</span>
                <span class="text-[8px] opacity-70">▾</span>
              </a>

              <a
                routerLink="/alumno/avatar"
                class="btn btn-circle btn-sm bg-[#1B1740] border-2 border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.6)] flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
                title="Personalizar mi avatar"
              >
                <ui-avatar-sprite [config]="avatarSrv.avatar()" [alto]="48" />
              </a>
            </div>
          </nav>
        </header>

        <!-- 2. CUERPO PRINCIPAL (Split Layout) -->
        <div class="flex flex-row flex-1 min-h-0 bg-[#0D0B1E]">
          
          <!-- A. ÁREA IZQUIERDA (Pantalla SVG + Control Deck Inferior) -->
          <div class="flex-1 flex flex-col h-full min-w-0">
            
            <!-- Canvas del Mapa SVG (Top) -->
            <div
              #mapaContenedor
              class="flex-1 min-h-0 flex flex-col relative rounded-[10px] border-2 border-[#8B5CF6]/40 bg-[#0D0B1E] overflow-hidden m-2"
            >
              
              <!-- Viñeta CRT sobre el mapa -->
              <div
                class="pointer-events-none absolute inset-0 z-[55]"
                style="background: radial-gradient(ellipse at center, transparent 62%, rgba(0, 0, 0, 0.55) 100%);"
              ></div>

              <!-- Ambient Glow -->
              <div
                class="absolute inset-0 pointer-events-none"
                style="background: radial-gradient(circle at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 60%)"
              ></div>

              <!-- Título flotante superior del mapa -->
              <div class="absolute top-2 left-1/2 -translate-x-1/2 text-center z-40 pointer-events-none">
                <h2 class="text-base font-black tracking-wide text-[#7FFAFF] glow-cyan">
                  {{ store.roadmap()?.nombre ?? 'ROADMAP' }} 🗺️
                </h2>
                <p class="text-[10px] text-base-content/40">
                  {{ completadas() }}/{{ islas().length }} UNIDADES COMPLETAS · Clic nodo o Joystick para navegar
                </p>
              </div>

              <!-- Contenedor SVG Interactivo -->
              <svg
                #lienzo
                [attr.viewBox]="viewBox()"
                class="block h-full w-full select-none"
                [class.cursor-grab]="!arrastrando()"
                [class.cursor-grabbing]="arrastrando()"
                (pointerdown)="tomar($event)"
                (pointermove)="mover($event)"
                (pointerup)="soltar($event)"
                (pointercancel)="soltar($event)"
                (wheel)="rueda($event)"
                role="application"
                [attr.aria-label]="'Mapa del curso: ' + islas().length + ' unidades'"
              >
                <defs>
                  <linearGradient id="isla-top" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3E2166" />
                    <stop offset="100%" stop-color="#241046" />
                  </linearGradient>
                  <linearGradient id="isla-top-on" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8FF7FF" />
                    <stop offset="100%" stop-color="#00A8BF" />
                  </linearGradient>
                  <linearGradient id="isla-top-done" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#7FC4CE" />
                    <stop offset="100%" stop-color="#2C5B64" />
                  </linearGradient>
                  <linearGradient id="isla-base" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2A4A52" />
                    <stop offset="45%" stop-color="#1B3238" />
                    <stop offset="100%" stop-color="#0D1A1D" />
                  </linearGradient>
                  <filter id="neon" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="7" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <!-- Piso: grilla isométrica -->
                <g opacity="0.16" stroke="#8B3DF5" stroke-width="1">
                  @for (l of grilla(); track $index) {
                    <line [attr.x1]="l.a.x" [attr.y1]="l.a.y" [attr.x2]="l.b.x" [attr.y2]="l.b.y" />
                  }
                </g>

                <!-- Caminos de neón -->
                <g fill="none" stroke-linecap="round">
                  @for (t of tramos(); track t.id) {
                    <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="11" opacity="0.28" filter="url(#neon)" />
                    <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="4" [attr.opacity]="t.tenue ? 0.4 : 0.95" />
                    @if (!t.tenue) {
                      <path
                        [attr.d]="t.d"
                        stroke="#F3EAFF"
                        stroke-width="2"
                        stroke-dasharray="3 13"
                        opacity="0.9"
                        class="anim-fluir"
                      />
                    }
                  }
                </g>

                <!-- Islas flotantes -->
                @for (isla of islas(); track isla.u.id) {
                  <g
                    class="isla-hit cursor-pointer"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="etiqueta(isla)"
                    (click)="seleccionar(isla)"
                    (keydown.enter)="seleccionar(isla)"
                    (keydown.space)="seleccionar(isla)"
                  >
                    <!-- Sombra proyectada -->
                    <ellipse
                      [attr.cx]="isla.piso.x"
                      [attr.cy]="isla.piso.y + 30"
                      [attr.rx]="SEMI_ANCHO * 0.82"
                      [attr.ry]="SEMI_ALTO * 0.5"
                      fill="#0E0120"
                      opacity="0.5"
                    />

                    <!-- Halo de isla activa -->
                    @if (isla.actual) {
                      <ellipse
                        [attr.cx]="isla.c.x"
                        [attr.cy]="isla.c.y + 6"
                        [attr.rx]="SEMI_ANCHO * 1.25"
                        [attr.ry]="SEMI_ALTO * 0.95"
                        fill="#FFFFFF"
                        opacity="0.3"
                        filter="url(#neon)"
                        class="anim-latir"
                      />
                    }

                    <!-- Geometría volumétrica -->
                    <polygon
                      [attr.points]="poliBase(isla)"
                      fill="url(#isla-base)"
                      stroke="#3FA8B8"
                      stroke-width="1.5"
                      stroke-opacity="0.45"
                    />
                    <polygon [attr.points]="poliCara(isla, 'izq')" fill="#234048" />
                    <polygon [attr.points]="poliCara(isla, 'der')" fill="#14282C" />
                    <polygon
                      [attr.points]="poliTapa(isla)"
                      [attr.fill]="
                        isla.estado === 'bloqueada'
                          ? 'url(#isla-top)'
                          : isla.estado === 'completada'
                            ? 'url(#isla-top-done)'
                            : 'url(#isla-top-on)'
                      "
                      [attr.stroke]="borde(isla)"
                      stroke-width="2"
                    />
                    <polygon
                      [attr.points]="poliTapaInterior(isla)"
                      fill="none"
                      [attr.stroke]="isla.estado === 'bloqueada' ? '#241046' : '#C79BFF'"
                      stroke-width="1.5"
                      opacity="0.5"
                    />

                    <!-- Cristales -->
                    @for (cr of cristales(isla); track $index) {
                      <polygon [attr.points]="cr.p" [attr.fill]="cr.color" [attr.opacity]="cr.op" />
                    }
                    <polygon [attr.points]="poliTapa(isla)" class="isla-foco" fill="none" stroke="none" />

                    <!-- Emblema hexagonal flotante -->
                    <g [attr.transform]="'translate(' + isla.c.x + ',' + (isla.c.y - 108) + ')'">
                      <polygon
                        points="0,-26 23,-13 23,13 0,26 -23,13 -23,-13"
                        [attr.fill]="relleno(isla.estado)"
                        [attr.stroke]="isla.actual ? '#F3EAFF' : '#190236'"
                        stroke-width="2"
                        [attr.filter]="isla.estado === 'bloqueada' ? null : 'url(#neon)'"
                        [class.anim-flotar]="isla.actual"
                      />
                      <text
                        y="6"
                        text-anchor="middle"
                        font-size="15"
                        [attr.fill]="isla.estado === 'bloqueada' ? '#8B7BA8' : '#FFFFFF'"
                        style="font-family: var(--font-pixel)"
                      >
                        {{ glifo(isla) }}
                      </text>
                    </g>

                    <!-- Rótulos -->
                    <text
                      [attr.x]="isla.c.x"
                      [attr.y]="isla.c.y + ESPESOR + BASE_LARGO + 26"
                      text-anchor="middle"
                      font-size="15"
                      [attr.fill]="isla.estado === 'bloqueada' ? '#9A85BD' : '#F3EAFF'"
                      style="font-family: var(--font-title)"
                    >
                      {{ isla.u.orden }}. {{ isla.u.nombre }}
                    </text>
                    <text
                      [attr.x]="isla.c.x"
                      [attr.y]="isla.c.y + ESPESOR + BASE_LARGO + 44"
                      text-anchor="middle"
                      font-size="9"
                      [attr.fill]="isla.estado === 'bloqueada' ? '#FF2758' : '#B98CF0'"
                      style="font-family: var(--font-pixel)"
                    >
                      {{ subtitulo(isla) }}
                    </text>

                  </g>
                }

                <!-- Avatar del jugador: sigue la unidad clickeada (salto visual),
                     por defecto la unidad 'actual' real de progreso -->
                @if (avatarIsla(); as isla) {
                  <g class="anim-flotar pointer-events-none">
                    <foreignObject
                      class="avatar-jump"
                      [attr.x]="isla.c.x - 24"
                      [attr.y]="isla.c.y - 62"
                      width="48"
                      height="70"
                    >
                      <ui-avatar-sprite [config]="avatarSrv.avatar()" [alto]="64" [sombra]="true" />
                    </foreignObject>
                  </g>
                }
              </svg>

              <!-- Tarjeta de unidad seleccionada: aparece al lado del nodo clickeado -->
              @if (sel(); as isla) {
                <div
                  #fichaUnidad
                  class="chaflan absolute w-80 border-2 border-[#00E5FF] bg-base-200/95 p-4 backdrop-blur z-50 shadow-2xl"
                  [style.left.px]="fichaPos()?.x ?? 16"
                  [style.top.px]="fichaPos()?.y ?? 56"
                >
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="title-font text-lg text-[#7FFAFF]">{{ isla.u.nombre }}</h3>
                    <button class="btn btn-ghost btn-xs" (click)="sel.set(null)" aria-label="Cerrar ficha">✕</button>
                  </div>
                  <p class="ui-font mt-1 text-[8px] text-accent">{{ subtitulo(isla) }}</p>

                  <ul class="mt-3 flex flex-col gap-1 text-xs">
                    @for (a of isla.u.actividades; track a.id) {
                      <li class="flex items-center gap-2">
                        <span class="badge badge-outline badge-xs ui-font text-[7px]">{{ a.tipo }}</span>
                        <span class="truncate">{{ a.nombre }}</span>
                      </li>
                    } @empty {
                      <li class="opacity-60">Sin actividades todavía.</li>
                    }
                  </ul>

                  @if (isla.estado === 'bloqueada') {
                    @if (motivoBloqueo(isla); as m) {
                      <p class="mt-3 text-xs leading-relaxed text-white/70">
                        🔒 {{ m.pre }}<b class="text-[#FFD60A]">{{ m.resaltado }}</b>{{ m.post }}
                      </p>
                    }
                  } @else {
                    <button
                      class="btn btn-sm ui-font mt-3 w-full text-[8px] border-none"
                      style="background: #00E5FF; color: #0D0B1E"
                      (click)="entrar(isla)"
                    >
                      ▶ ENTRAR A LA UNIDAD
                    </button>
                  }
                </div>
              }
            </div>

            <!-- B. ARCADE DECK INFERIOR (Gabinete con Joystick y Botonera Sanwa) -->
            <footer
              class="cabinet-metal cabinet-neon relative z-20 flex-shrink-0 flex items-center justify-between gap-3 px-8 py-2 border-t-[6px] border-[#23242E]"
              style="max-height: 25%"
            >
              <!-- Screws / bolts: 4 corners -->
              <span class="screw-metal absolute top-3 left-3 w-4 h-4 rounded-full pointer-events-none z-20"></span>
              <span class="screw-metal absolute top-3 right-3 w-4 h-4 rounded-full pointer-events-none z-20"></span>
              <span class="screw-metal absolute bottom-3 left-3 w-4 h-4 rounded-full pointer-events-none z-20"></span>
              <span class="screw-metal absolute bottom-3 right-3 w-4 h-4 rounded-full pointer-events-none z-20"></span>

              <!-- ============ ZONE 1: joystick + silkscreen branding ============ -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <div class="flex items-center gap-2 flex-shrink-0">
                  <!-- joystick (45° pink ball, sequential gate light, keyboard arrows) -->
                  <div class="relative w-44 h-44 flex-shrink-0 -mt-8" style="perspective: 460px">
                    <div
                      #joystickBase
                      class="absolute inset-0 cursor-crosshair"
                      (pointerdown)="onJoyDown($event)"
                      (pointermove)="onJoyMove($event)"
                    >
                      <!-- sequential idle light + active direction -->
                      <span
                        class="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 text-xs font-black"
                        [class.gate-arrow]="activeJoy() !== 'up'"
                        [class.glow-pink-txt]="activeJoy() === 'up'"
                        >▲</span
                      >
                      <span
                        class="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-black"
                        [class.gate-arrow]="activeJoy() !== 'down'"
                        [class.glow-pink-txt]="activeJoy() === 'down'"
                        >▼</span
                      >
                      <span
                        class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-xs font-black"
                        [class.gate-arrow]="activeJoy() !== 'left'"
                        [class.glow-pink-txt]="activeJoy() === 'left'"
                        >◄</span
                      >
                      <span
                        class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs font-black"
                        [class.gate-arrow]="activeJoy() !== 'right'"
                        [class.glow-pink-txt]="activeJoy() === 'right'"
                        >►</span
                      >

                      <!-- static mounting plate (8-way gate seen at 45°) -->
                      <div
                        class="absolute left-1/2 bottom-3 -translate-x-1/2 w-32 h-[92px] rounded-[50%]"
                        style="
                          background: radial-gradient(ellipse at 40% 34%, #4a4c5a 0%, #262731 45%, #17181f 100%);
                          box-shadow:
                            inset 0 4px 8px rgba(255, 255, 255, 0.1),
                            inset 0 -6px 10px rgba(0, 0, 0, 0.7),
                            0 6px 12px rgba(0, 0, 0, 0.5),
                            0 0 0 2px rgba(255, 45, 45, 0.4),
                            0 0 16px rgba(255, 45, 45, 0.35);
                        "
                      >
                        <div
                          class="absolute inset-5 rounded-[50%] border-2 border-[#5A5C6A]"
                          style="
                            background: radial-gradient(ellipse at center, #1b1c26 0%, #12131b 70%);
                            clip-path: polygon(50% 8%, 94% 32%, 94% 68%, 50% 92%, 6% 68%, 6% 32%);
                          "
                        ></div>
                        <span
                          class="absolute top-1 left-8 w-1.5 h-1.5 rounded-full bg-[#2E303A] border border-black/50"
                        ></span>
                        <span
                          class="absolute top-1 right-8 w-1.5 h-1.5 rounded-full bg-[#2E303A] border border-black/50"
                        ></span>
                        <span
                          class="absolute bottom-1 left-8 w-1.5 h-1.5 rounded-full bg-[#2E303A] border border-black/50"
                        ></span>
                        <span
                          class="absolute bottom-1 right-8 w-1.5 h-1.5 rounded-full bg-[#2E303A] border border-black/50"
                        ></span>
                      </div>

                      <!-- ball shadow on plate -->
                      <div
                        class="absolute left-1/2 bottom-16 -translate-x-1/2 w-14 h-4 rounded-[50%] bg-black/45 blur-sm pointer-events-none"
                      ></div>

                      <!-- stick + ball: only tilts (origin at base), anillo de energía rojo -->
                      <div
                        class="absolute inset-0 pointer-events-none transition-transform duration-100"
                        [style.transform]="joystickTilt()"
                        style="transform-origin: center 88%"
                      >
                        <div
                          class="absolute left-1/2 bottom-[54px] -translate-x-1/2 w-[20px] h-[42px] rounded-[3px]"
                          style="
                            background: linear-gradient(90deg, #9aa0ac 0%, #eef1f6 45%, #7b818f 100%);
                            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
                          "
                        ></div>
                        <span class="joy-energy-ring absolute left-1/2 bottom-[86px] -translate-x-1/2 w-18 h-18 rounded-full"></span>
                        <span class="joy-energy-ring ring-delay absolute left-1/2 bottom-[86px] -translate-x-1/2 w-18 h-18 rounded-full"></span>
                        <div
                          class="absolute left-1/2 bottom-[78px] -translate-x-1/2 w-[34px] h-[12px] rounded-full joy-ball-collar"
                        ></div>
                        <div
                          class="absolute left-1/2 bottom-[86px] -translate-x-1/2 w-18 h-18 rounded-full joy-ball-red"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <!-- silkscreen branding printed on the metal -->
                  <div class="flex flex-col items-center gap-3 flex-shrink-0">
                    <svg class="invader-ico" viewBox="0 0 9 8" shape-rendering="crispEdges" aria-hidden="true">
                      <rect x="2" y="0" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="6" y="0" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="3" y="1" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="1" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="2" y="2" width="5" height="1" fill="#8B5CF6"/>
                      <rect x="1" y="3" width="2" height="1" fill="#8B5CF6"/>
                      <rect x="4" y="3" width="1" height="1" fill="#00E5FF"/>
                      <rect x="6" y="3" width="2" height="1" fill="#8B5CF6"/>
                      <rect x="0" y="4" width="9" height="1" fill="#8B5CF6"/>
                      <rect x="0" y="5" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="2" y="5" width="5" height="1" fill="#8B5CF6"/>
                      <rect x="8" y="5" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="0" y="6" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="2" y="6" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="6" y="6" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="8" y="6" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="3" y="7" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="7" width="1" height="1" fill="#8B5CF6"/>
                    </svg>
                    <div class="silkscreen silkscreen-blink text-[9px] text-center leading-relaxed">
                      EDU-JOY<br />INSERT COIN
                    </div>
                    <div
                      class="w-1.5 h-8 rounded-sm bg-black/80 coin-slot-glow"
                      style="border: 2px solid #ffd60a"
                    ></div>
                  </div>

                  <!-- cooling vents -->
                  <div class="vents w-2.5 h-28 rounded-sm flex-shrink-0"></div>
                </div>
              </div>

              <div class="flex-1"></div>

              <!-- ============ ZONE 3: diamond gate of equal push-buttons ============ -->
              <div
                class="flex-1 flex items-center justify-end gap-6 pr-12 h-full"
                style="transform: translateY(-5px)"
              >
                <!-- top-center: RANKING -->
                <button
                  type="button"
                  class="abtn abtn-rank w-28 h-28"
                  (click)="rankOpen.set(true)"
                  aria-label="Abrir Ranking"
                  title="Ranking de la cohorte"
                >
                  <span
                    class="abtn-cap"
                    style="
                      background: radial-gradient(circle at 40% 30%, #b79dff 0%, #8b5cf6 55%, #5b2fc1 100%);
                      box-shadow:
                        inset 0 -8px 12px rgba(0, 0, 0, 0.55),
                        inset 0 4px 8px rgba(255, 255, 255, 0.55),
                        0 0 22px rgba(139, 92, 246, 0.65);
                    "
                  >
                    <svg class="pixel-ico" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">
                      <rect x="1" y="0" width="7" height="1" fill="#1A1225"/>
                      <rect x="0" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="1" width="2" height="1" fill="#8B5CF6"/>
                      <rect x="3" y="1" width="1" height="1" fill="#FFFFFF"/>
                      <rect x="4" y="1" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="1" width="1" height="1" fill="#FFFFFF"/>
                      <rect x="6" y="1" width="2" height="1" fill="#8B5CF6"/>
                      <rect x="8" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="2" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="2" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="2" y="2" width="5" height="1" fill="#8B5CF6"/>
                      <rect x="7" y="2" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="8" y="2" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="3" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="3" y="3" width="3" height="1" fill="#8B5CF6"/>
                      <rect x="6" y="3" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="7" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="4" width="1" height="1" fill="#1A1225"/>
                      <rect x="3" y="4" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="4" y="4" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="4" width="1" height="1" fill="#5B2FC1"/>
                      <rect x="6" y="4" width="1" height="1" fill="#1A1225"/>
                      <rect x="3" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="4" y="5" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="6" width="2" height="1" fill="#1A1225"/>
                      <rect x="4" y="6" width="1" height="1" fill="#8B5CF6"/>
                      <rect x="5" y="6" width="2" height="1" fill="#1A1225"/>
                      <rect x="1" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="7" width="5" height="1" fill="#8B5CF6"/>
                      <rect x="7" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="8" width="9" height="1" fill="#1A1225"/>
                    </svg>
                    <span
                      class="neon-cap text-[9px] text-[#241055]"
                      style="text-shadow: 0 0 4px rgba(0, 0, 0, 0.5)"
                    >
                      RANKING
                    </span>
                  </span>
                </button>

                <!-- middle-left: INSIGNIAS -->
                <button
                  type="button"
                  class="abtn abtn-badge w-28 h-28"
                  (click)="inventoryModal.set('insignias')"
                  aria-label="Abrir Insignias"
                  title="Insignias y logros"
                >
                  <span
                    class="abtn-cap"
                    style="
                      background: radial-gradient(circle at 40% 30%, #ffed99 0%, #ffd60a 55%, #b89600 100%);
                      box-shadow:
                        inset 0 -6px 10px rgba(0, 0, 0, 0.5),
                        inset 0 3px 6px rgba(255, 255, 255, 0.6),
                        0 0 18px rgba(255, 214, 10, 0.55);
                    "
                  >
                    <svg class="pixel-ico" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">
                      <rect x="3" y="0" width="2" height="1" fill="#1A1225"/>
                      <rect x="6" y="0" width="2" height="1" fill="#1A1225"/>
                      <rect x="3" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="4" y="1" width="1" height="1" fill="#FFD60A"/>
                      <rect x="6" y="1" width="1" height="1" fill="#FFD60A"/>
                      <rect x="7" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="3" y="2" width="1" height="1" fill="#1A1225"/>
                      <rect x="4" y="2" width="1" height="1" fill="#FFD60A"/>
                      <rect x="6" y="2" width="1" height="1" fill="#FFD60A"/>
                      <rect x="7" y="2" width="1" height="1" fill="#1A1225"/>
                      <rect x="4" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="6" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="4" width="7" height="1" fill="#1A1225"/>
                      <rect x="1" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="5" width="3" height="1" fill="#FFD60A"/>
                      <rect x="5" y="5" width="1" height="1" fill="#FFFFFF"/>
                      <rect x="6" y="5" width="3" height="1" fill="#FFD60A"/>
                      <rect x="9" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="6" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="6" width="9" height="1" fill="#FFD60A"/>
                      <rect x="10" y="6" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="7" width="1" height="1" fill="#FFD60A"/>
                      <rect x="2" y="7" width="1" height="1" fill="#B89600"/>
                      <rect x="3" y="7" width="5" height="1" fill="#FFD60A"/>
                      <rect x="8" y="7" width="1" height="1" fill="#B89600"/>
                      <rect x="9" y="7" width="1" height="1" fill="#FFD60A"/>
                      <rect x="10" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="8" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="8" width="9" height="1" fill="#FFD60A"/>
                      <rect x="10" y="8" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="9" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="9" width="2" height="1" fill="#FFD60A"/>
                      <rect x="4" y="9" width="1" height="1" fill="#B89600"/>
                      <rect x="5" y="9" width="1" height="1" fill="#FFD60A"/>
                      <rect x="6" y="9" width="1" height="1" fill="#B89600"/>
                      <rect x="7" y="9" width="2" height="1" fill="#FFD60A"/>
                      <rect x="9" y="9" width="1" height="1" fill="#1A1225"/>
                      <rect x="2" y="10" width="7" height="1" fill="#1A1225"/>
                    </svg>
                    <span
                      class="neon-cap text-[9px] text-[#4A3900]"
                      style="text-shadow: 0 0 4px rgba(0, 0, 0, 0.4)"
                    >
                      INSIGNIAS
                    </span>
                  </span>
                </button>

                <!-- middle-right: MOCHILA -->
                <button
                  type="button"
                  class="abtn abtn-bag w-28 h-28"
                  (click)="inventoryModal.set('equipamiento')"
                  aria-label="Abrir Mochila"
                  title="Mochila y equipamiento"
                >
                  <span
                    class="abtn-cap"
                    style="
                      background: radial-gradient(circle at 40% 30%, #bdf4ff 0%, #00e5ff 55%, #008a99 100%);
                      box-shadow:
                        inset 0 -6px 10px rgba(0, 0, 0, 0.5),
                        inset 0 3px 6px rgba(255, 255, 255, 0.6),
                        0 0 18px rgba(0, 229, 255, 0.6);
                    "
                  >
                    <svg class="pixel-ico" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">
                      <rect x="2" y="0" width="2" height="1" fill="#1A1225"/>
                      <rect x="5" y="0" width="2" height="1" fill="#1A1225"/>
                      <rect x="2" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="3" y="1" width="1" height="1" fill="#00E5FF"/>
                      <rect x="5" y="1" width="1" height="1" fill="#00E5FF"/>
                      <rect x="6" y="1" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="2" width="7" height="1" fill="#1A1225"/>
                      <rect x="0" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="3" width="2" height="1" fill="#00E5FF"/>
                      <rect x="3" y="3" width="1" height="1" fill="#FFFFFF"/>
                      <rect x="4" y="3" width="1" height="1" fill="#00E5FF"/>
                      <rect x="5" y="3" width="1" height="1" fill="#FFFFFF"/>
                      <rect x="6" y="3" width="2" height="1" fill="#00E5FF"/>
                      <rect x="8" y="3" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="4" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="4" width="2" height="1" fill="#00E5FF"/>
                      <rect x="3" y="4" width="3" height="1" fill="#1A1225"/>
                      <rect x="6" y="4" width="2" height="1" fill="#00E5FF"/>
                      <rect x="8" y="4" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="5" width="2" height="1" fill="#00E5FF"/>
                      <rect x="3" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="4" y="5" width="1" height="1" fill="#008A99"/>
                      <rect x="5" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="6" y="5" width="2" height="1" fill="#00E5FF"/>
                      <rect x="8" y="5" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="6" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="6" width="2" height="1" fill="#00E5FF"/>
                      <rect x="3" y="6" width="3" height="1" fill="#1A1225"/>
                      <rect x="6" y="6" width="2" height="1" fill="#00E5FF"/>
                      <rect x="8" y="6" width="1" height="1" fill="#1A1225"/>
                      <rect x="0" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="7" width="7" height="1" fill="#00E5FF"/>
                      <rect x="8" y="7" width="1" height="1" fill="#1A1225"/>
                      <rect x="1" y="8" width="7" height="1" fill="#1A1225"/>
                    </svg>
                    <span
                      class="neon-cap text-[9px] text-[#02505A]"
                      style="text-shadow: 0 0 4px rgba(0, 0, 0, 0.4)"
                    >
                      MOCHILA
                    </span>
                  </span>
                </button>

                <!-- bottom-center: SYSTEM (Centrar mapa) -->
                <button
                  type="button"
                  class="abtn abtn-center w-28 h-28"
                  (click)="encuadrar()"
                  aria-label="Centrar mapa"
                  title="Centrar mapa"
                >
                  <span
                    class="abtn-cap"
                    style="
                      background: radial-gradient(circle at 40% 30%, #4a4c58 0%, #2e303a 55%, #17181f 100%);
                      box-shadow:
                        inset 0 -6px 10px rgba(0, 0, 0, 0.5),
                        inset 0 3px 6px rgba(255, 255, 255, 0.15);
                    "
                  >
                    <span class="text-2xl text-[#C9B6FF]">⤢</span>
                    <span class="neon-cap text-[9px] text-[#C9B6FF]" style="text-shadow: none">
                      CENTRAR
                    </span>
                  </span>
                </button>
              </div>
            </footer>
          </div>

          <!-- B. PANEL DERECHO (Player Stats Sidebar) -->
          <aside
            class="w-[340px] flex-shrink-0 p-4 border-l-[3px] border-[#8B5CF6]/40 bg-[#12131B] overflow-y-auto"
          >
            <div class="relative w-full h-full flex flex-col">
              <!-- Edge-lit acrylic glow -->
              <div
                class="acrylic-glow absolute -inset-1 rounded-2xl pointer-events-none"
                style="
                  background: linear-gradient(120deg, rgba(0, 229, 255, 0.5), rgba(255, 46, 147, 0.35) 45%, rgba(255, 214, 10, 0.4));
                "
              ></div>

              <div class="acrylic relative rounded-2xl p-4 h-full flex flex-col justify-between">
                <div class="flex flex-col gap-4">
                  <!-- Player Tag -->
                  <div
                    class="text-2xl font-bold text-[#FF2E93] my-1 silkscreen tracking-widest text-center"
                    style="text-shadow: 0 0 8px rgba(255, 46, 147, 0.6)"
                  >
                    PLAYER 1
                  </div>

                  <!-- Nivel + XP Líquida -->
                  <div class="flex items-center gap-3">
                    <span
                      class="pixel-num text-3xl w-14 h-14 flex items-center justify-center rounded-md bg-[#8B5CF6]/25 border border-[#8B5CF6]/50 text-[#C9B6FF] flex-shrink-0"
                    >
                      {{ nivel() }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-baseline mb-1">
                        <span class="silkscreen text-[9px] text-[#00E5FF]">XP NIVEL</span>
                        <span class="pixel-num text-lg text-[#7FFAFF] leading-none">
                          {{ xpNivelActual() }}<span class="text-[#5A5B66]">/1000</span>
                        </span>
                      </div>
                      <div class="xp-track h-5 rounded-full border border-white/5 relative">
                        <div
                          class="xp-liquid absolute inset-y-0 left-0 rounded-full"
                          [style.width.%]="nivelPorcentaje()"
                        ></div>
                        <span
                          class="absolute inset-y-0 left-0 w-full flex items-center justify-center pixel-num text-xs text-[#0D0B1E] font-bold pointer-events-none"
                        >
                          {{ nivelPorcentaje() }}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Vidas & Racha (Vertical Stack) -->
                  <div class="flex flex-col gap-3">
                    <!-- Vidas -->
                    <div class="relative rounded-xl border border-[#FF2E93]/40 bg-black/40 px-4 py-3 overflow-hidden">
                      <div
                        class="absolute inset-0"
                        style="background: radial-gradient(circle at 20% 0%, rgba(255, 46, 147, 0.18), transparent 65%);"
                      ></div>
                      <span class="silkscreen text-[9px] text-[#FF9CC8] relative">VIDAS</span>
                      <div class="relative flex gap-3 mt-1.5 justify-center">
                        <app-lives [current]="vidas()" [size]="26" />
                      </div>
                    </div>

                    <!-- Racha -->
                    <div class="relative rounded-xl border border-[#FFD60A]/40 bg-black/40 px-4 py-3 overflow-hidden">
                      <div
                        class="absolute inset-0"
                        style="background: radial-gradient(circle at 20% 0%, rgba(255, 214, 10, 0.16), transparent 65%);"
                      ></div>
                      <span class="silkscreen text-[9px] text-[#FFE566] relative">RACHA</span>
                      <div class="relative flex items-baseline justify-center gap-2 mt-1.5">
                        <app-pixel-icon [grid]="fireGrid" [colors]="fireColors" [size]="30" class="flame" />
                        <span class="pixel-num text-4xl text-warning leading-none">
                          {{ rachaDias() }}
                        </span>
                        <span class="text-[#FFE566] text-sm pixel-num">días</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Resumen de progreso al pie del sidebar -->
                <div class="border-t border-[#8B5CF6]/30 pt-3 mt-4 text-center">
                  <div class="silkscreen text-[9px] text-[#C9B6FF]/70 mb-1">TOTAL XP</div>
                  <div class="pixel-num text-3xl text-primary glow-pink-txt">{{ xp() }}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- 3. REJILLA DE PARLANTES INFERIOR -->
        <footer class="flex items-center justify-center gap-2 h-6 pt-1 bg-[#17181F] border-t-[4px] border-[#23242E]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="mx-2 text-[9px] uppercase tracking-[0.4em] text-[#5A5B66]">EduQuest TV</span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
        </footer>

        <!-- MODALES -->
        @if (inventoryModal()) {
          <app-inventory-modal
            [mode]="inventoryModal()!"
            (close)="inventoryModal.set(null)"
          />
        }

        @if (rankOpen()) {
          <app-ranking-panel (cerrar)="rankOpen.set(false)" />
        }
      </div>
    }
  `,
})
export class Mapa implements OnDestroy {
  readonly preview = input(false);

  protected readonly store = inject(RoadmapStore);
  protected readonly avatarSrv = inject(AvatarService);
  protected readonly auth = inject(AuthMockService);
  private readonly data = inject(RoadmapDataPort);
  private readonly router = inject(Router);
  private readonly lienzo = viewChild<ElementRef<SVGSVGElement>>('lienzo');
  private readonly joystickBase = viewChild<ElementRef<HTMLDivElement>>('joystickBase');
  private readonly fichaUnidad = viewChild<ElementRef<HTMLDivElement>>('fichaUnidad');
  private readonly mapaContenedor = viewChild<ElementRef<HTMLDivElement>>('mapaContenedor');

  /** Posición en píxeles (relativa al contenedor del mapa) donde se dibuja la
   *  ficha de unidad — se recalcula al abrirla, al lado del nodo clickeado. */
  protected readonly fichaPos = signal<{ x: number; y: number } | null>(null);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly SEMI_ANCHO = SEMI_ANCHO;
  protected readonly SEMI_ALTO = SEMI_ALTO;
  protected readonly ESPESOR = ESPESOR;
  protected readonly BASE_LARGO = BASE_LARGO;

  protected readonly fireGrid = FIRE_GRID;
  protected readonly fireColors = FIRE_COLORS;

  protected readonly sel = signal<Isla | null>(null);
  protected readonly xp = computed(() => this.progreso()?.xpTotal ?? 0);
  protected readonly vidas = computed(() => this.progreso()?.vidasVigentes ?? 3);
  protected readonly rachaDias = signal(10);

  // Cálculos de nivel y progreso de XP líquida
  protected readonly nivel = computed(() => Math.floor(this.xp() / 1000) + 1);
  protected readonly xpNivelActual = computed(() => this.xp() % 1000);
  protected readonly nivelPorcentaje = computed(() =>
    Math.min(100, Math.max(0, Math.round((this.xpNivelActual() / 1000) * 100))),
  );

  // Estados de modales
  readonly rankOpen = signal(false);
  readonly inventoryModal = signal<InventoryMode | null>(null);

  // Control e interacción del Joystick
  readonly activeJoy = signal<JoyDir | null>(null);
  readonly joystickTilt = computed(() => {
    const d = this.activeJoy();
    const map: Record<JoyDir, string> = {
      left: 'rotateZ(-20deg) rotateX(0deg)',
      right: 'rotateZ(20deg) rotateX(0deg)',
      up: 'rotateZ(0deg) rotateX(-16deg)',
      down: 'rotateZ(0deg) rotateX(16deg)',
    };
    return d ? map[d] : 'rotateZ(0deg) rotateX(0deg)';
  });

  private readonly joyThreshold = 10;
  private readonly onJoyUpBound = () => this.onJoyUp();
  private keyTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.sel()) return;
    const target = event.target as Element | null;
    if (!target) return;
    if (target.closest('.isla-hit')) return;
    const ficha = this.fichaUnidad()?.nativeElement;
    if (ficha?.contains(target)) return;
    this.sel.set(null);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.preview()) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();

      let dir: JoyDir = 'right';
      let dx = 0;
      let dy = 0;

      if (event.key === 'ArrowLeft') { dir = 'left'; dx = -70; }
      else if (event.key === 'ArrowRight') { dir = 'right'; dx = 70; }
      else if (event.key === 'ArrowUp') { dir = 'up'; dy = -50; }
      else if (event.key === 'ArrowDown') { dir = 'down'; dy = 50; }

      this.activeJoy.set(dir);
      this.panOffset(dx, dy);

      if (this.keyTimer) clearTimeout(this.keyTimer);
      this.keyTimer = setTimeout(() => this.activeJoy.set(null), 180);
    }
  }

  ngOnDestroy(): void {
    if (this.keyTimer) clearTimeout(this.keyTimer);
    window.removeEventListener('pointerup', this.onJoyUpBound);
    this.saltoTimers.forEach((t) => clearTimeout(t));
  }

  protected onJoyDown(event: PointerEvent): void {
    const el = this.joystickBase()?.nativeElement;
    if (el) el.setPointerCapture(event.pointerId);
    window.addEventListener('pointerup', this.onJoyUpBound);
    this.updateJoy(event);
  }

  protected onJoyMove(event: PointerEvent): void {
    if (event.buttons > 0) {
      this.updateJoy(event);
    }
  }

  private updateJoy(event: PointerEvent): void {
    const el = this.joystickBase()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    let dir: JoyDir | null = null;
    if (Math.hypot(dx, dy) >= this.joyThreshold) {
      dir = Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? 'right' : 'left'
        : dy > 0 ? 'down' : 'up';
    }
    this.activeJoy.set(dir);

    if (dir === 'left') this.panOffset(-25, 0);
    else if (dir === 'right') this.panOffset(25, 0);
    else if (dir === 'up') this.panOffset(0, -20);
    else if (dir === 'down') this.panOffset(0, 20);
  }

  private onJoyUp(): void {
    window.removeEventListener('pointerup', this.onJoyUpBound);
    this.activeJoy.set(null);
  }

  private panOffset(dx: number, dy: number): void {
    const v = this.vistaActual();
    this.vista.set({ ...v, x: v.x + dx, y: v.y + dy });
  }

  // ---------- Cálculo de islas y geometría ----------

  protected readonly islas = computed<Isla[]>(() => {
    const us = this.store.unidades();
    const puntos = layoutIslas(us.length);
    const completos = new Set(
      (this.progreso()?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );
    const xp = this.xp();

    // Desbloqueo secuencial: además del umbral de XP, una unidad solo puede
    // estar disponible si la anterior ya se completó al 100% — no se puede
    // "saltear" unidades por tener XP de sobra.
    let anteriorCompletada = true;
    const items = us.map((u, i): Isla => {
      const v = puntos[i];
      const hechas = u.actividades.filter((a) => completos.has(a.id)).length;
      // "Completada" mira solo las actividades obligatorias — las opcionales
      // (ej. "Práctica libre") no deben trabar el desbloqueo de la siguiente unidad.
      const obligatorias = u.actividades.filter((a) => a.esObligatorio);
      const completada =
        obligatorias.length > 0 && obligatorias.every((a) => completos.has(a.id));
      const estado: EstadoIsla = this.preview()
        ? 'disponible'
        : completada
          ? 'completada'
          : xp >= u.umbralXpDesbloqueo && anteriorCompletada
            ? 'disponible'
            : 'bloqueada';
      anteriorCompletada = completada;
      return {
        u,
        c: proyectar(v),
        piso: proyectar({ ...v, z: 0 }),
        estado,
        actual: false,
        hechas,
        total: u.actividades.length,
      };
    });

    if (!this.preview() && items.length > 0) {
      // Si ya no queda ninguna unidad 'disponible' (roadmap 100% completo), el
      // avatar se queda parado en la última unidad en vez de desaparecer.
      const actual =
        items.find((it) => it.estado === 'disponible') ??
        [...items].reverse().find((it) => it.estado === 'completada') ??
        items[items.length - 1];
      actual.actual = true;
    }
    return items;
  });

  protected readonly completadas = computed(
    () => this.islas().filter((i) => i.estado === 'completada').length,
  );

  /** Unidad clickeada por el jugador para el salto visual del avatar (solo
   *  estético: no afecta el progreso ni cuál es la unidad 'actual' real). */
  private readonly posicionAvatarId = signal<string | null>(null);

  protected readonly avatarIsla = computed(() => {
    const is = this.islas();
    const id = this.posicionAvatarId();
    if (id) {
      const clickeada = is.find((i) => i.u.id === id);
      if (clickeada) return clickeada;
    }
    return is.find((i) => i.actual) ?? null;
  });

  private readonly encuadreBase = computed(() => {
    const pts = this.islas().flatMap((i) => [
      { x: i.c.x - SEMI_ANCHO, y: i.c.y },
      { x: i.c.x + SEMI_ANCHO, y: i.c.y },
      { x: i.c.x, y: i.c.y + ESPESOR + BASE_LARGO + 46 },
      { x: i.c.x, y: i.c.y - 136 },
    ]);
    return caja(pts, MARGEN);
  });

  private readonly vista = signal<{ x: number; y: number; w: number; h: number } | null>(null);

  protected readonly viewBox = computed(() => {
    const b = this.encuadreBase();
    if (this.preview()) return `${b.x} ${b.y} ${b.ancho} ${b.alto}`;
    const v = this.vista() ?? { x: b.x, y: b.y, w: b.ancho, h: b.alto };
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });

  protected readonly tramos = computed(() => {
    const is = this.islas();
    return is.slice(0, -1).map((a, i) => {
      const b = is[i + 1];
      const color =
        a.estado === 'completada'
          ? 'var(--color-node-done)'
          : a.actual || a.estado === 'disponible'
            ? 'var(--color-node-open)'
            : 'var(--color-node-locked)';
      return {
        id: `${a.u.id}->${b.u.id}`,
        d: camino(a.c, b.c),
        color,
        tenue: a.estado === 'bloqueada',
      };
    });
  });

  protected readonly grilla = computed(() => {
    const b = this.encuadreBase();
    const x1 = b.x;
    const x2 = b.x + b.ancho;
    const lineas: { a: Punto; b: Punto }[] = [];

    for (const m of [0.5, -0.5]) {
      const cMin = Math.min(b.y - m * x1, b.y - m * x2);
      const cMax = Math.max(b.y + b.alto - m * x1, b.y + b.alto - m * x2);
      for (let c = Math.ceil(cMin / TILE_H) * TILE_H; c <= cMax; c += TILE_H) {
        lineas.push({ a: { x: x1, y: m * x1 + c }, b: { x: x2, y: m * x2 + c } });
      }
    }
    return lineas;
  });

  protected poliTapa(i: Isla): string {
    return rombo(i.c, SEMI_ANCHO, SEMI_ALTO);
  }
  protected poliCara(i: Isla, lado: 'izq' | 'der'): string {
    return caraLateral(i.c, SEMI_ANCHO, SEMI_ALTO, ESPESOR, lado);
  }
  protected poliBase(i: Isla): string {
    return base(i.c, SEMI_ANCHO, SEMI_ALTO, ESPESOR, BASE_LARGO);
  }
  protected poliTapaInterior(i: Isla): string {
    return rombo(i.c, SEMI_ANCHO * 0.72, SEMI_ALTO * 0.72);
  }

  protected cristales(i: Isla): { p: string; color: string; op: number }[] {
    const semilla = i.u.orden * 37;
    const apagada = i.estado === 'bloqueada';
    return Array.from({ length: 3 }, (_, k) => {
      const r1 = frac(Math.sin((semilla + k) * 12.9898) * 43758.5453) - 0.5;
      const r2 = frac(Math.sin((semilla + k) * 78.233) * 43758.5453) - 0.5;
      const u = r1 * 1.24;
      const v = r2 * (1 - Math.abs(u)) * 1.24;
      const px = i.c.x + (u + v) * SEMI_ANCHO * 0.62;
      const py = i.c.y + (v - u) * SEMI_ALTO * 0.62;
      const w = 5 + frac(Math.sin((semilla + k) * 31.416) * 43758.5453) * 5;
      const h = 14 + frac(Math.sin((semilla + k) * 55.7) * 43758.5453) * 16;
      return {
        p: `${px},${py - h} ${px + w},${py} ${px},${py + w * 0.5} ${px - w},${py}`,
        color: apagada ? '#1E3A40' : k === 0 ? '#00E5FF' : '#8FE8F5',
        op: apagada ? 0.75 : 0.9,
      };
    });
  }

  protected relleno(e: EstadoIsla): string {
    return e === 'completada'
      ? 'var(--color-node-done)'
      : e === 'disponible'
        ? 'var(--color-node-open)'
        : 'var(--color-node-locked)';
  }

  protected borde(i: Isla): string {
    if (i.actual) return '#FFFFFF';
    if (i.estado === 'bloqueada') return '#2D164A';
    if (i.estado === 'completada') return '#5FB8C4';
    return '#00E5FF';
  }

  protected glifo(i: Isla): string {
    return i.estado === 'completada' ? '✓' : i.estado === 'bloqueada' ? '🔒' : String(i.u.orden);
  }

  private unidadAnterior(i: Isla): Isla | null {
    const is = this.islas();
    const idx = is.findIndex((x) => x.u.id === i.u.id);
    return idx > 0 ? is[idx - 1] : null;
  }

  protected subtitulo(i: Isla): string {
    if (i.estado === 'bloqueada') {
      const anterior = this.unidadAnterior(i);
      if (anterior && anterior.estado !== 'completada') return `COMPLETÁ LA UNIDAD ${anterior.u.orden}`;
      return `XP COSTO: ${i.u.umbralXpDesbloqueo}`;
    }
    if (i.estado === 'completada') return 'COMPLETADA';
    return `${i.hechas}/${i.total} ACTIVIDADES`;
  }

  /** Mensaje completo (con más contexto que `subtitulo`) para la ficha de
   *  unidad cuando está bloqueada — partido en 3 para resaltar el dato clave. */
  protected motivoBloqueo(i: Isla): { pre: string; resaltado: string; post: string } {
    const anterior = this.unidadAnterior(i);
    if (anterior && anterior.estado !== 'completada') {
      return {
        pre: 'Te falta completar ',
        resaltado: `Unidad ${anterior.u.orden} · "${anterior.u.nombre}"`,
        post: ' para poder entrar acá.',
      };
    }
    const faltante = Math.max(i.u.umbralXpDesbloqueo - this.xp(), 0);
    return {
      pre: 'Te faltan ',
      resaltado: `${faltante} XP`,
      post: ` para desbloquear esta unidad (cuesta ${i.u.umbralXpDesbloqueo} XP).`,
    };
  }

  protected etiqueta(i: Isla): string {
    const est =
      i.estado === 'completada' ? 'completada' : i.estado === 'bloqueada' ? 'bloqueada' : 'disponible';
    return `Unidad ${i.u.orden}: ${i.u.nombre}, ${est}. ${this.subtitulo(i)}`;
  }

  protected seleccionar(i: Isla): void {
    if (this.sel()?.u.id === i.u.id) {
      this.sel.set(null);
      return;
    }
    this.sel.set(null);

    if (i.estado === 'bloqueada') {
      this.saltoTimers.forEach((t) => clearTimeout(t));
      this.saltoTimers = [];
      this.actualizarFichaPos(i);
      this.sel.set(i);
      return;
    }

    this.saltarA(i, () => {
      this.actualizarFichaPos(i);
      this.sel.set(i);
    });
  }

  /** Calcula dónde dibujar la ficha (en píxeles, relativo al contenedor del
   *  mapa) a partir de la posición de `isla` en el SVG, con el pan/zoom
   *  actual — la ubica al lado del nodo, con el ancho fijo de la ficha. */
  private actualizarFichaPos(isla: Isla): void {
    const svg = this.lienzo()?.nativeElement;
    const cont = this.mapaContenedor()?.nativeElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !cont || !ctm) {
      this.fichaPos.set(null);
      return;
    }

    const punto = svg.createSVGPoint();
    punto.x = isla.c.x;
    punto.y = isla.c.y;
    const pantalla = punto.matrixTransform(ctm);
    const contRect = cont.getBoundingClientRect();
    const x = pantalla.x - contRect.left;
    const y = pantalla.y - contRect.top;

    const ANCHO_FICHA = 320;
    // Despeja el ancho real de la isla (+ avatar) en pantalla, no un margen fijo,
    // para que la ficha no tape la isla ni al avatar al hacer zoom.
    const escala = ctm.a;
    const MARGEN = SEMI_ANCHO * escala + 30;
    const entraADerecha = x + MARGEN + ANCHO_FICHA <= contRect.width;
    const left = entraADerecha ? x + MARGEN : Math.max(8, x - MARGEN - ANCHO_FICHA);
    const top = Math.min(Math.max(y - 90, 8), Math.max(8, contRect.height - 260));

    this.fichaPos.set({ x: left, y: top });
  }

  /** Duración de cada salto entre nodos consecutivos, en ms — lento a propósito
   *  para que se note el movimiento. */
  private static readonly SALTO_MS = 400;
  private saltoTimers: ReturnType<typeof setTimeout>[] = [];

  /** Mueve el avatar hasta `destino` pasando por cada unidad intermedia en
   *  orden (nunca "corta camino" en diagonal) — puramente visual. Llama a
   *  `alLlegar` recién cuando el avatar pisa el destino. */
  private saltarA(destino: Isla, alLlegar?: () => void): void {
    const is = this.islas();
    const origenId = this.posicionAvatarId() ?? is.find((x) => x.actual)?.u.id;
    const iOrigen = is.findIndex((x) => x.u.id === origenId);
    const iDestino = is.findIndex((x) => x.u.id === destino.u.id);

    this.saltoTimers.forEach((t) => clearTimeout(t));
    this.saltoTimers = [];

    if (iOrigen === -1 || iDestino === -1 || iOrigen === iDestino) {
      this.posicionAvatarId.set(destino.u.id);
      alLlegar?.();
      return;
    }

    const paso = iDestino > iOrigen ? 1 : -1;
    let salto = 0;
    for (let idx = iOrigen + paso; ; idx += paso) {
      salto += 1;
      const parada = is[idx].u.id;
      const esUltimo = idx === iDestino;
      this.saltoTimers.push(
        setTimeout(() => {
          this.posicionAvatarId.set(parada);
          if (esUltimo) alLlegar?.();
        }, salto * Mapa.SALTO_MS),
      );
      if (esUltimo) break;
    }
  }

  protected entrar(i: Isla): void {
    this.router.navigate(['/alumno/unidad', i.u.id]);
  }

  // ---------- Paneo y Zoom ----------

  private ancla: { px: number; py: number; vx: number; vy: number } | null = null;
  protected readonly arrastrando = signal(false);

  protected tomar(ev: PointerEvent): void {
    if (this.preview()) return;
    const v = this.vistaActual();
    this.ancla = { px: ev.clientX, py: ev.clientY, vx: v.x, vy: v.y };
    this.arrastrando.set(true);
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  protected mover(ev: PointerEvent): void {
    if (!this.ancla) return;
    const lz = this.lienzo()?.nativeElement;
    if (!lz) return;
    const cajaSvg = lz.getBoundingClientRect();
    const v = this.vistaActual();
    const escala = v.w / (cajaSvg.width || 1);
    this.vista.set({
      ...v,
      x: this.ancla.vx - (ev.clientX - this.ancla.px) * escala,
      y: this.ancla.vy - (ev.clientY - this.ancla.py) * escala,
    });
  }

  protected soltar(ev: PointerEvent): void {
    this.ancla = null;
    this.arrastrando.set(false);
    (ev.target as Element).releasePointerCapture?.(ev.pointerId);
  }

  protected rueda(ev: WheelEvent): void {
    if (this.preview()) return;
    ev.preventDefault();
    this.zoom(ev.deltaY < 0 ? 1.12 : 0.89);
  }

  protected zoom(factor: number): void {
    const b = this.encuadreBase();
    const v = this.vistaActual();
    const w = Math.min(b.ancho * 1.6, Math.max(b.ancho * 0.25, v.w / factor));
    const h = w * (v.h / v.w);
    this.vista.set({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h });
  }

  protected encuadrar(): void {
    this.vista.set(null);
  }

  private vistaActual(): { x: number; y: number; w: number; h: number } {
    const b = this.encuadreBase();
    return this.vista() ?? { x: b.x, y: b.y, w: b.ancho, h: b.alto };
  }
}
