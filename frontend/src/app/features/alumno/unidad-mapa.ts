import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AvatarService } from '../../core/avatar/avatar.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Unidad } from '../../core/data/roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { InventoryModal, InventoryMode } from '../../shared/ui/inventory-modal';
import { RankingPanel } from '../ranking/ranking-panel';
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

export interface CartridgeTheme {
  hue: string;
  glow: string;
  body: string;
}

export const CARTRIDGE_THEMES: CartridgeTheme[] = [
  { hue: '#22e0d0', glow: 'rgba(34,224,208,0.55)', body: 'linear-gradient(155deg,#2be0d0,#16938c 55%,#0c6b64)' },
  { hue: '#ff2fd0', glow: 'rgba(255,47,208,0.55)', body: 'linear-gradient(155deg,#ff6fd6,#c72fb0 55%,#7d1a72)' },
  { hue: '#9b4dff', glow: 'rgba(155,77,255,0.55)', body: 'linear-gradient(155deg,#a878ff,#7a3fd0 55%,#4a1f8f)' },
  { hue: '#2f8fff', glow: 'rgba(47,143,255,0.55)', body: 'linear-gradient(155deg,#5aa2ff,#2f6fd0 55%,#1f478f)' },
  { hue: '#35e07a', glow: 'rgba(53,224,122,0.55)', body: 'linear-gradient(155deg,#5ee89a,#2fb06a 55%,#1a7d4a)' },
  { hue: '#ffd21e', glow: 'rgba(255,210,30,0.55)', body: 'linear-gradient(155deg,#ffe07a,#e0a81e 55%,#a87310)' },
];

export interface CartridgeCard {
  u: Unidad;
  index: number;
  n: string;
  name: string;
  tag: string;
  hue: string;
  glow: string;
  body: string;
  pct: number;
  pctLabel: string;
  lecc: string;
  bloqueada: boolean;
}

type ViewState = 'selector' | 'inserting' | 'flash' | 'roadmap';
type JoyDir = 'left' | 'right' | 'up' | 'down';

@Component({
  selector: 'app-mapa, app-unidad-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, UpperCasePipe, InventoryModal, RankingPanel],
  host: { class: 'block w-full h-full' },
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      user-select: none;
    }

    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.15; } }
    @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    @keyframes scan { 0% { background-position: 0 0; } 100% { background-position: 0 -120px; } }
    @keyframes gridmove { 0% { background-position: 0 0; } 100% { background-position: 0 60px; } }
    @keyframes pulseglow {
      0%, 100% { box-shadow: 0 0 22px rgba(255, 47, 208, 0.65), 0 0 44px rgba(255, 47, 208, 0.35), inset 0 0 14px rgba(255, 255, 255, 0.35); }
      50% { box-shadow: 0 0 34px rgba(255, 47, 208, 0.95), 0 0 70px rgba(255, 47, 208, 0.6), inset 0 0 18px rgba(255, 255, 255, 0.55); }
    }
    /* ===== EFECTO CRT TV ANTIGUA (Líneas blancas verticales de encendido) ===== */
    .crt-turnon-overlay {
      pointer-events: none;
    }

    .crt-bloom {
      animation: crtBloom 0.7s cubic-bezier(0.1, 0.85, 0.25, 1) forwards;
    }
    @keyframes crtBloom {
      0% {
        opacity: 0;
        background: transparent;
      }
      15% {
        opacity: 1;
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.95) 0%, rgba(220, 255, 250, 0.7) 40%, rgba(34, 224, 208, 0.3) 75%, transparent 100%);
      }
      50% {
        opacity: 0.8;
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, rgba(200, 245, 255, 0.5) 50%, transparent 85%);
      }
      80% {
        opacity: 0.35;
      }
      100% {
        opacity: 0;
      }
    }

    .crt-vertical-beam {
      background: #ffffff;
      box-shadow: 0 0 15px #ffffff, 0 0 35px #ffffff, 0 0 70px #22e0d0, 0 0 120px #ffffff;
      transform-origin: center;
      animation: crtVerticalBeam 0.7s cubic-bezier(0.12, 0.9, 0.2, 1) forwards;
    }
    @keyframes crtVerticalBeam {
      0% {
        transform: scaleX(0.01) scaleY(0.02);
        opacity: 1;
      }
      15% {
        transform: scaleX(0.05) scaleY(1);
        opacity: 1;
      }
      35% {
        transform: scaleX(0.35) scaleY(1);
        opacity: 1;
      }
      65% {
        transform: scaleX(1) scaleY(1);
        opacity: 0.85;
      }
      100% {
        transform: scaleX(1) scaleY(1);
        opacity: 0;
      }
    }

    .crt-vertical-lines {
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.9) 0px,
        rgba(255, 255, 255, 0.9) 2px,
        rgba(210, 245, 255, 0.5) 3px,
        transparent 3px,
        transparent 7px
      );
      transform-origin: center;
      animation: crtVerticalLines 0.7s cubic-bezier(0.1, 0.85, 0.25, 1) forwards;
    }
    @keyframes crtVerticalLines {
      0% {
        transform: scaleX(0.005);
        opacity: 0;
      }
      12% {
        transform: scaleX(0.05);
        opacity: 1;
      }
      35% {
        transform: scaleX(0.45);
        opacity: 0.95;
      }
      65% {
        transform: scaleX(1);
        opacity: 0.75;
      }
      100% {
        transform: scaleX(1);
        opacity: 0;
      }
    }

    .crt-scanlines {
      background: repeating-linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.4) 0px,
        rgba(0, 0, 0, 0.4) 2px,
        transparent 2px,
        transparent 4px
      );
      animation: crtScanlines 0.7s ease-out forwards;
    }
    @keyframes crtScanlines {
      0% { opacity: 0; }
      20% { opacity: 0.7; }
      80% { opacity: 0.4; }
      100% { opacity: 0; }
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
      background: var(--ground, #f6c25d);
      position: relative;
    }

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
    @if (preview()) {
      <!-- Modo preview compacto para el editor del profesor: sin fondo negro -->
      <div class="h-72 w-full flex flex-col justify-center bg-transparent border-2 border-[#22e0d0]/40 rounded-xl p-4 overflow-hidden relative">
        <div class="font-['Press_Start_2P'] text-[9px] text-[#22e0d0] mb-3 tracking-wider">
          UNIDADES DEL ROADMAP ({{ cartridgeCards().length }})
        </div>
        <div class="flex gap-4 items-center overflow-x-auto pb-2">
          @for (c of cartridgeCards(); track c.u.id) {
            <div
              class="w-36 flex-shrink-0 rounded-xl p-3 text-center text-white text-xs border-2 border-white/20 shadow-lg"
              [style.background]="c.body"
            >
              <div class="font-['Press_Start_2P'] text-[8px] text-[#0d0618] bg-white/80 py-0.5 px-1 rounded">
                {{ c.n }} · {{ c.tag }}
              </div>
              <div class="mt-2 font-['Press_Start_2P'] text-[9px] truncate text-white drop-shadow">
                {{ c.name }}
              </div>
              <div class="mt-2 text-[8px] opacity-80">{{ c.lecc }}</div>
            </div>
          }
        </div>
      </div>
    } @else {
      <!-- CONTENEDOR RAÍZ: SIN FONDO NEGRO, CHASIS COMPLETO EDU-VISION -->
      <div class="relative w-full h-full overflow-hidden bg-transparent text-[#eae0ff] font-['Chakra_Petch',sans-serif]">

        <!-- CHASIS PRINCIPAL: TELEVISOR DE TUBO EDU-VISION -->
        <div
          class="relative w-full h-full z-10 flex flex-col rounded-[20px] md:rounded-[32px] bg-gradient-to-br from-[#37303f] via-[#1b1722] to-[#0d0b12] shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_70px_rgba(155,77,255,0.15)] border-4 border-[#231e2c]"
        >
          <!-- Tornillos en esquinas del chasis -->
          <span class="absolute top-3 left-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#6a6272] to-[#221e28] shadow-[0_1px_1px_rgba(255,255,255,0.2)]"></span>
          <span class="absolute top-3 right-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#6a6272] to-[#221e28] shadow-[0_1px_1px_rgba(255,255,255,0.2)]"></span>
          <span class="absolute bottom-3 left-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#6a6272] to-[#221e28] shadow-[0_1px_1px_rgba(255,255,255,0.2)]"></span>
          <span class="absolute bottom-3 right-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#6a6272] to-[#221e28] shadow-[0_1px_1px_rgba(255,255,255,0.2)]"></span>

          <!-- PANTALLA CRT (Glass screen central) -->
          <div
            #crtScreen
            class="relative flex-1 m-3 md:m-5 rounded-[20px] md:rounded-[26px] overflow-hidden shadow-[inset_0_0_70px_rgba(0,0,0,0.9),inset_0_0_0_3px_#000]"
            style="background: radial-gradient(120% 90% at 50% 8%, #3a1150 0%, #1a0a2e 42%, #0d0618 78%);"
          >
            <!-- Efecto de piso en perspectiva neón y scanlines -->
            <div class="pointer-events-none absolute inset-0 z-0">
              <div
                class="absolute -inset-x-1/4 bottom-0 h-1/2 opacity-40"
                style="
                  background-image: linear-gradient(rgba(34,224,208,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,47,208,0.2) 1px, transparent 1px);
                  background-size: 50px 50px;
                  transform: perspective(340px) rotateX(66deg);
                  transform-origin: bottom;
                  animation: gridmove 4s linear infinite;
                  mask-image: linear-gradient(to top, black 20%, transparent 92%);
                  -webkit-mask-image: linear-gradient(to top, black 20%, transparent 92%);
                "
              ></div>
              <div class="absolute inset-0 bg-radial from-transparent via-transparent to-[#020103b0]"></div>
              <div
                class="absolute inset-0 pointer-events-none opacity-20"
                style="background: repeating-linear-gradient(180deg, rgba(120,255,240,0.08) 0 2px, transparent 2px 4px); animation: scan 6s linear infinite;"
              ></div>
            </div>

            <!-- ============================================================= -->
            <!-- CAPA 1: SELECTOR DE CARTUCHOS 3D ("FICHAS")                   -->
            <!-- ============================================================= -->
            <div
              class="absolute inset-0 z-10 transition-all duration-700 ease-out"
              [style.transform]="isRevealed() ? 'scale(1.9)' : 'scale(1)'"
              [style.opacity]="isRevealed() ? 0 : 1"
              [style.pointer-events]="view() === 'selector' ? 'auto' : 'none'"
            >
              <!-- Título Marquee superior izquierdo -->
              <div class="absolute top-5 left-6 z-30 text-left">
                <div class="font-['Press_Start_2P'] text-[9px] tracking-[2px] text-[#22e0d0] drop-shadow-[0_0_8px_rgba(34,224,208,0.8)]">
                  SELECCIÓN DE UNIDAD
                </div>
                <div class="mt-2 font-['Press_Start_2P'] text-sm md:text-base text-[#ffd21e] drop-shadow-[0_0_12px_rgba(255,210,30,0.8)]">
                  {{ store.roadmap()?.nombre ?? 'CURSO DE PROGRAMACIÓN' }}
                </div>
              </div>

              <!-- HUD superior derecho -->
              <div class="absolute top-5 right-6 z-30 flex items-center gap-3">
                <!-- Vidas -->
                <div class="flex flex-col gap-1 px-3 py-2 rounded-xl bg-[#180a26b8] border border-[#ff2d6f8c] shadow-[0_0_14px_rgba(255,45,111,0.25)] backdrop-blur">
                  <span class="font-['Press_Start_2P'] text-[7px] tracking-wider text-[#ff6b9c]">VIDAS</span>
                  <div class="flex gap-1 text-base tracking-widest text-[#ff2d6f] drop-shadow-[0_0_6px_#ff2d6f]">
                    @for (i of [0, 1, 2]; track i) {
                      <span [class.opacity-30]="i >= vidas()">❤️</span>
                    }
                  </div>
                </div>

                <!-- XP -->
                <div class="flex flex-col gap-1 px-3 py-2 rounded-xl bg-[#180a26b8] border border-[#22e0d08c] shadow-[0_0_14px_rgba(34,224,208,0.25)] backdrop-blur min-w-[130px]">
                  <div class="flex justify-between items-center">
                    <span class="font-['Press_Start_2P'] text-[7px] tracking-wider text-[#7ff0e6]">EXP</span>
                    <span class="font-['Press_Start_2P'] text-[7px] text-[#ffd21e]">LV {{ nivel() }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-white/10 overflow-hidden border border-[#22e0d066]">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-[#22e0d0] to-[#2f8fff] shadow-[0_0_8px_#22e0d0]"
                      [style.width.%]="nivelPorcentaje()"
                    ></div>
                  </div>
                  <div class="text-[10px] font-semibold text-[#bfeee9] text-right">{{ xpNivelActual() }} / 1000</div>
                </div>

                <!-- Ranking modal button -->
                <button
                  type="button"
                  (click)="rankOpen.set(true)"
                  class="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-[#180a26b8] border border-[#c79bff99] shadow-[0_0_14px_rgba(199,155,255,0.3)] hover:scale-105 transition-transform cursor-pointer"
                  title="Ver Ranking"
                >
                  <span class="text-xl drop-shadow-[0_0_6px_#c79bff]">🏆</span>
                  <span class="font-['Press_Start_2P'] text-[6px] text-[#c9a9ff]">RANKING</span>
                </button>

                <!-- Insignias (Badges) modal button -->
                <button
                  type="button"
                  (click)="inventoryModal.set('insignias')"
                  class="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-[#180a26b8] border border-[#ffe07a99] shadow-[0_0_14px_rgba(255,176,16,0.3)] hover:scale-105 transition-transform cursor-pointer"
                  title="Ver Insignias"
                >
                  <span class="text-xl drop-shadow-[0_0_6px_#ffe07a]">🏅</span>
                  <span class="font-['Press_Start_2P'] text-[6px] text-[#ffd98a]">INSIGNIAS</span>
                </button>

                <!-- Mochila modal button -->
                <button
                  type="button"
                  (click)="inventoryModal.set('equipamiento')"
                  class="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl bg-[#180a26b8] border border-[#9b4dff99] shadow-[0_0_14px_rgba(155,77,255,0.3)] hover:scale-105 transition-transform cursor-pointer"
                  title="Abrir Mochila"
                >
                  <span class="text-xl drop-shadow-[0_0_6px_#9b4dff]">🎒</span>
                  <span class="font-['Press_Start_2P'] text-[6px] text-[#c9a9ff]">MOCHILA</span>
                </button>
              </div>

              <!-- CARRUSEL 3D DE CARTUCHOS -->
              <div class="absolute inset-0 z-20 pointer-events-none">
                @for (c of cartridgeCards(); track c.u.id; let i = $index) {
                  <div
                    [style]="getCartridgeWrapStyle(i)"
                    (click)="onCartridgeClick(i)"
                    class="select-none"
                  >
                    <div class="w-[280px]" style="animation: floaty 5.5s ease-in-out infinite;">
                      <!-- Cuerpo del Cartucho Retro -->
                      <div
                        class="relative pt-4 px-4 pb-0 rounded-t-2xl rounded-b-lg border-2 border-white/25 shadow-[0_26px_46px_rgba(0,0,0,0.6),inset_0_2px_8px_rgba(255,255,255,0.35),inset_0_-10px_18px_rgba(0,0,0,0.4)] transition-all duration-300"
                        [style.background]="c.body"
                        [style.box-shadow]="'0 0 44px ' + c.glow"
                        style="clip-path: polygon(0 0, 74% 0, 100% 16%, 100% 100%, 0 100%);"
                      >
                        <!-- 3 Ranuras de agarre superiores -->
                        <div class="flex flex-col gap-1 w-20 mb-3">
                          <div class="h-1.5 rounded-full bg-black/30 shadow-[0_1px_0_rgba(255,255,255,0.15)]"></div>
                          <div class="h-1.5 rounded-full bg-black/30 shadow-[0_1px_0_rgba(255,255,255,0.15)]"></div>
                          <div class="h-1.5 rounded-full bg-black/30 shadow-[0_1px_0_rgba(255,255,255,0.15)]"></div>
                        </div>

                        <!-- Etiqueta central del cartucho -->
                        <div
                          class="rounded-lg bg-gradient-to-b from-[#170b28] to-[#0d0618] border-2 overflow-hidden mb-4 shadow-inner"
                          [style.border-color]="c.hue"
                          [style.box-shadow]="'0 0 16px ' + c.glow + ', inset 0 0 22px rgba(0,0,0,0.65)'"
                        >
                          <div
                            class="h-6.5 px-2.5 flex items-center justify-between"
                            [style.background]="c.hue"
                          >
                            <span class="font-['Press_Start_2P'] text-[7px] text-[#0d0618] tracking-wider font-bold">
                              UNIDAD {{ c.n }}
                            </span>
                            <span class="font-['Press_Start_2P'] text-[6px] text-[#0d0618]/80 font-bold">
                              {{ c.tag }}
                            </span>
                          </div>

                          <div class="p-3.5 text-center">
                            <div
                              class="font-['Press_Start_2P'] text-sm leading-relaxed min-h-[44px] flex items-center justify-center"
                              [style.color]="c.hue"
                              [style.text-shadow]="'0 0 12px ' + c.glow"
                            >
                              {{ c.name }}
                            </div>

                            <div class="mt-3 flex justify-between text-[8px] font-semibold text-[#9a86b8] tracking-wider mb-1">
                              <span>{{ c.lecc }}</span>
                              <span>{{ c.pctLabel }}</span>
                            </div>

                            <div class="h-2 rounded-full bg-white/10 border border-white/15 overflow-hidden">
                              <div
                                class="h-full rounded-full transition-all duration-500"
                                [style.width.%]="c.pct"
                                [style.background]="'linear-gradient(90deg, ' + c.hue + ', #ff2fd0)'"
                                [style.box-shadow]="'0 0 10px ' + c.hue"
                              ></div>
                            </div>
                          </div>
                        </div>

                        <!-- Pines dorados de conexión en la base -->
                        <div class="h-5 -mx-4 pt-1 px-4 bg-gradient-to-b from-[#241a0a] to-[#120f0a]">
                          <div
                            class="h-3 rounded-sm shadow-inner"
                            style="background: repeating-linear-gradient(90deg, #f0cf5a 0 5px, #7a5f18 5px 9px);"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Flechas de navegación ‹ › -->
              <div class="absolute inset-0 pointer-events-none z-35">
                <button
                  type="button"
                  (click)="prev()"
                  class="pointer-events-auto absolute left-6 md:left-12 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#180a26b8] border-2 border-[#22e0d099] text-[#22e0d0] text-2xl md:text-3xl flex items-center justify-center shadow-[0_0_18px_rgba(34,224,208,0.4)] backdrop-blur hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Unidad anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  (click)="next()"
                  class="pointer-events-auto absolute right-6 md:right-12 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#180a26b8] border-2 border-[#ff2fd099] text-[#ff2fd0] text-2xl md:text-3xl flex items-center justify-center shadow-[0_0_18px_rgba(255,47,208,0.4)] backdrop-blur hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Siguiente unidad"
                >
                  ›
                </button>

                <!-- Indicadores de paginación / dots -->
                <div class="pointer-events-auto absolute left-8 bottom-6 flex flex-col items-start gap-2">
                  <div class="font-['Press_Start_2P'] text-[7px] text-[#9a86b8] tracking-widest">
                    U{{ activeCartridge().n }} / 0{{ cartridgeCards().length }}
                  </div>
                  <div class="flex gap-2">
                    @for (c of cartridgeCards(); track c.u.id; let i = $index) {
                      <button
                        type="button"
                        (click)="goTo(i)"
                        class="w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer"
                        [style.background]="i === activeUnitIndex() ? '#22e0d0' : 'rgba(255,255,255,0.25)'"
                        [style.box-shadow]="i === activeUnitIndex() ? '0 0 10px #22e0d0' : 'none'"
                        [style.transform]="i === activeUnitIndex() ? 'scale(1.2)' : 'scale(1)'"
                      ></button>
                    }
                  </div>
                </div>
              </div>

              <!-- CONSOLA DOCK EDU-BOY (Ranura inferior con botón INSERTAR) -->
              <div class="absolute left-1/2 bottom-3 -translate-x-1/2 z-30 w-[90%] max-w-[460px]">
                <!-- Ranura superior -->
                <div
                  class="relative h-4.5 mx-20 rounded-t-lg bg-gradient-to-b from-[#0a0410] to-[#1a0f2a] border-2 border-b-0 transition-all duration-500"
                  [style.border-color]="isPowered() ? 'rgba(34,224,208,0.7)' : 'rgba(34,224,208,0.35)'"
                  [style.box-shadow]="isPowered() ? '0 0 22px rgba(34,224,208,0.6), inset 0 0 12px rgba(34,224,208,0.4)' : '0 0 8px rgba(34,224,208,0.15)'"
                >
                  <div class="absolute inset-x-3.5 top-1.5 h-1.5 rounded-full bg-[#05020a] shadow-inner"></div>
                </div>

                <!-- Cuerpo del dock -->
                <div
                  class="relative h-24 rounded-b-2xl bg-gradient-to-b from-[#2c1846] to-[#160a28] border-2 border-t-0 border-[#9b4dff73] shadow-[0_22px_44px_rgba(0,0,0,0.6),0_0_34px_rgba(155,77,255,0.25)] flex items-center justify-between px-5 overflow-hidden"
                >
                  <!-- Mini pantalla de estado del dock -->
                  <div class="flex flex-col items-center gap-1.5 z-10">
                    <div
                      class="w-16 h-10 rounded-md border-2 border-[#0a1a14] transition-all duration-500"
                      [style.background]="isPowered() ? 'radial-gradient(circle at 50% 38%, #c9ffe8, #22e0d0 55%, #0e6b60)' : 'linear-gradient(180deg, #0a2a24, #04120e)'"
                      [style.box-shadow]="isPowered() ? '0 0 18px rgba(34,224,208,0.6), inset 0 0 10px rgba(255,255,255,0.4)' : 'inset 0 0 10px rgba(0,0,0,0.7)'"
                    ></div>
                    <span class="font-['Press_Start_2P'] text-[7px] text-[#7ff0e6] tracking-wider">EDU-BOY</span>
                  </div>

                  <!-- Botón principal de acción: INSERTAR -->
                  <button
                    type="button"
                    (click)="start()"
                    [disabled]="activeCartridge().bloqueada"
                    class="z-10 font-['Press_Start_2P'] text-xs tracking-wider text-white px-5 py-3 rounded-xl border-2 border-white/50 bg-gradient-to-b from-[#ff5fd0] to-[#c817b8] cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style="animation: pulseglow 1.8s ease-in-out infinite; text-shadow: 0 2px 4px rgba(0,0,0,0.5);"
                  >
                    {{ activeCartridge().bloqueada ? '🔒 BLOQUEADO' : '▸ INSERTAR' }}
                  </button>

                  <!-- D-pad + Botones A/B decorativos del dock -->
                  <div class="flex items-center gap-3.5 z-10">
                    <!-- D-pad -->
                    <div class="relative w-8 h-8">
                      <div class="absolute left-2.5 top-0 w-2.5 h-8 rounded-sm bg-[#3a2a52] shadow-inner"></div>
                      <div class="absolute top-2.5 left-0 w-8 h-2.5 rounded-sm bg-[#3a2a52] shadow-inner"></div>
                    </div>
                    <!-- Botones A y B -->
                    <div class="flex gap-1.5">
                      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-[#ff8fb4] to-[#ff2d6f] shadow-[0_0_8px_#ff2d6f]"></div>
                      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-[#7ff0e6] to-[#22e0d0] shadow-[0_0_8px_#22e0d0]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- FLASH CRT DE BOOTEO CON LÍNEAS VERTICALES BLANCAS (Efecto TV Antigua) -->
            @if (view() === 'flash') {
              <div
                class="crt-turnon-overlay pointer-events-none absolute inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/40"
              >
                <!-- Resplandor ambiental de fósforo -->
                <div class="crt-bloom absolute inset-0"></div>

                <!-- Trama de líneas blancas verticales (Aperture Grille de TV antigua) -->
                <div class="crt-vertical-lines absolute inset-0"></div>

                <!-- Haz central vertical blanco brillante de alta intensidad -->
                <div class="crt-vertical-beam absolute inset-y-0 w-2 md:w-3 bg-white"></div>

                <!-- Scanlines horizontales tenues para textura CRT -->
                <div class="crt-scanlines absolute inset-0"></div>
              </div>
            }

            <!-- ============================================================= -->
            <!-- CAPA 2: INTERIOR DE LA UNIDAD (VERTICAL WORLD + ARCADIA)      -->
            <!-- ============================================================= -->
            <div
              class="vertical-world absolute inset-0 z-20 flex flex-col transition-all duration-600 ease-out"
              [attr.data-theme]="theme()"
              [style.transform]="isRevealed() ? 'scale(1)' : 'scale(1.12)'"
              [style.opacity]="isRevealed() ? 1 : 0"
              [style.pointer-events]="view() === 'roadmap' ? 'auto' : 'none'"
            >
              <!-- TOPBAR RETRO: BOTÓN VOLVER + TÍTULO DE LA UNIDAD -->
              <header class="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#160a2b]/90 border-b-2 border-[#22e0d0]/40 backdrop-blur z-30">
                <!-- Volver / Eyectar cartucho -->
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    (click)="back()"
                    class="btn btn-xs md:btn-sm border border-[#22e0d0]/60 bg-[#180a26]/80 text-[#22e0d0] font-['Press_Start_2P'] text-[7px] md:text-[8px] hover:bg-[#22e0d0]/20 shadow-[0_0_12px_rgba(34,224,208,0.3)] transition-all cursor-pointer"
                    title="Eyectar cartucho y volver al selector de unidades (ESC)"
                  >
                    ‹ VOLVER · ESC
                  </button>
                </div>

                <!-- Título central -->
                <div class="text-center">
                  <div class="font-['Press_Start_2P'] text-xs md:text-sm text-[#22e0d0] drop-shadow-[0_0_10px_rgba(34,224,208,0.8)]">
                    ROADMAP 📘
                  </div>
                  <div class="text-[11px] md:text-xs font-semibold tracking-wider text-[#c9a9ff]">
                    UNIDAD {{ activeUnit().orden }} · {{ activeUnit().nombre | uppercase }} · {{ store.roadmap()?.nombre ?? 'CURSO' }}
                  </div>
                </div>

                <!-- Controles de cámara rápidos en el header -->
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-xs border border-white/20 bg-white/10 text-[8px] text-white hover:bg-white/20 font-['Press_Start_2P']"
                    (click)="scrollToGoal()"
                    title="Ver meta final en la cumbre"
                  >
                    ↑ META
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs border border-white/20 bg-white/10 text-[8px] text-white hover:bg-white/20 font-['Press_Start_2P']"
                    (click)="scrollToPlayer()"
                    title="Centrar en el explorador"
                  >
                    EXPLORADOR
                  </button>
                  <button
                    type="button"
                    class="btn btn-xs border border-white/20 bg-white/10 text-[8px] text-white hover:bg-white/20 font-['Press_Start_2P']"
                    (click)="scrollToStart()"
                    title="Ir al inicio del camino"
                  >
                    ↓ INICIO
                  </button>
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
              </header>

              <!-- CUERPO PRINCIPAL DEL ROADMAP (PANTALLA MAPA + SIDEBAR STATS) -->
              <div class="flex-1 min-h-0 flex flex-row relative overflow-hidden">
                
                <!-- ÁREA IZQUIERDA: PANTALLA CON VERTICAL-WORLD SCROLLABLE -->
                <div #mapPanel class="flex-1 min-h-0 relative flex flex-col overflow-hidden" [style.backgroundColor]="groundColor()">
                  
                  <!-- VIEWPORT CON SCROLL VERTICAL (El motor Mario 3) -->
                  <div #mapViewport class="map-viewport" [style.backgroundColor]="groundColor()">
                    <div
                      class="map-world relative w-full overflow-hidden"
                      [style.height.px]="world().worldHeight"
                      [style.backgroundImage]="'url(' + world().tile + ')'"
                      [style.backgroundColor]="groundColor()"
                      [style.backgroundRepeat]="'repeat-y'"
                      [style.backgroundPosition]="'center top'"
                      [style.backgroundSize]="'100% auto'"
                      style="image-rendering: pixelated;"
                    >
                      <!-- Capa de Terreno y Caminos SVG -->
                      <div class="vertical-terrain">
                        <svg
                          class="vertical-road"
                          [attr.viewBox]="'0 0 ' + world().worldWidth + ' ' + world().worldHeight"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          @for (br of branchPaths(); track $index) {
                            <path [attr.d]="br" class="support-road-edge" />
                            <path [attr.d]="br" class="support-road" />
                          }
                          <path [attr.d]="roadPathD()" class="road-shadow" />
                          <path [attr.d]="roadPathD()" class="road-edge" />
                          <path [attr.d]="roadPathD()" class="road-sand" />
                          <path [attr.d]="roadPathD()" class="road-center" />
                        </svg>

                        <!-- Escenario Procedural (Monedas, Casas Hongo, Palmeras, etc.) -->
                        <div [innerHTML]="scenerySvg()" class="pointer-events-none"></div>

                        <!-- Letreros de soporte para bonus y recuperación -->
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

                        <!-- Meta final en la cumbre -->
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

                      <!-- Partículas de polvo de caminata -->
                      @for (p of walkPuffs(); track p.id) {
                        <div class="walk-puff" [style.left.px]="p.x" [style.top.px]="p.y"></div>
                      }

                      <!-- Nodos de Desafíos Interactivos -->
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
                          <div class="object-ground"></div>

                          @if (isAvailable(c) && !isCompleted(c)) {
                            <div class="node-invitation">
                              {{ nodeVerbText(c) }}
                            </div>
                          }

                          <div [innerHTML]="nodeSvg(c)" class="w-full"></div>

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

                      <!-- Avatar del Explorador Caminando -->
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

                      <!-- Tarjeta flotante de encuentro al seleccionar nodo -->
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
                            [disabled]="isLocked(c)"
                            (click)="openActivity(c)"
                          >
                            @if (isCompleted(c)) {
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

                  <!-- Barra de leyenda al pie del mapa -->
                  <div class="flex-shrink-0 flex flex-wrap items-center justify-center gap-4 py-1 px-4 bg-[#120722] border-t border-white/10 text-[10px] text-[#b4b7c9]">
                    <span class="flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-emerald-900/60 text-emerald-400 font-bold flex items-center justify-center text-[9px]">✓</span> Completado</span>
                    <span class="flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-amber-900/60 text-amber-400 font-bold flex items-center justify-center text-[9px]">●</span> Disponible</span>
                    <span class="flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-[9px]">🔒</span> Bloqueado</span>
                    <span class="flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-purple-900/60 text-purple-400 font-bold flex items-center justify-center text-[9px]">★</span> Bonus</span>
                    <span class="flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-red-900/60 text-red-400 font-bold flex items-center justify-center text-[9px]">♥</span> Recuperar vida</span>
                  </div>
                </div>

                <!-- ÁREA DERECHA: SIDEBAR ACRÍLICO PLAYER 1 -->
                <aside class="w-64 md:w-72 flex-shrink-0 p-3 bg-gradient-to-b from-[#1c0e30] to-[#120722] border-l-2 border-[#9b4dff]/50 shadow-[0_0_24px_rgba(155,77,255,0.22)] flex flex-col justify-between overflow-y-auto">
                  <div class="flex flex-col gap-3">
                    <div class="font-['Press_Start_2P'] text-sm md:text-base text-[#ff2fd0] text-center drop-shadow-[0_0_10px_rgba(255,47,208,0.8)]">
                      PLAYER 1
                    </div>

                    <!-- Nivel y barra de XP -->
                    <div class="flex items-center gap-2.5 p-2 rounded-xl bg-black/30 border border-[#9b4dff]/30">
                      <div class="w-11 h-11 rounded-lg bg-gradient-to-br from-[#7a2fd0] to-[#4a1478] border border-[#c79bff]/60 flex items-center justify-center font-['Press_Start_2P'] text-sm text-white shadow-[0_0_10px_rgba(155,77,255,0.5)]">
                        {{ nivel() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between font-['Press_Start_2P'] text-[7px] text-[#c9a9ff] mb-1">
                          <span>XP</span>
                          <span>{{ xpNivelActual() }}/1000</span>
                        </div>
                        <div class="h-2.5 rounded-full bg-white/10 border border-[#9b4dff]/40 overflow-hidden">
                          <div
                            class="h-full rounded-full bg-gradient-to-r from-[#9b4dff] to-[#ff2fd0] shadow-[0_0_8px_#9b4dff]"
                            [style.width.%]="nivelPorcentaje()"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <!-- Vidas -->
                    <div class="p-3 rounded-xl bg-[#ff2d6f14] border border-[#ff2d6f66] shadow-[inset_0_0_12px_rgba(255,45,111,0.15)]">
                      <div class="font-['Press_Start_2P'] text-[8px] text-[#ff6b9c] tracking-wider mb-1.5">VIDAS</div>
                      <div class="flex justify-center gap-2 text-2xl drop-shadow-[0_0_6px_#ff2d6f]">
                        @for (i of [0, 1, 2]; track i) {
                          <span [class.opacity-25]="i >= vidas()">❤️</span>
                        }
                      </div>
                    </div>

                    <!-- Racha -->
                    <div class="p-3 rounded-xl bg-[#ffd21e12] border border-[#ffd21e66] shadow-[inset_0_0_12px_rgba(255,210,30,0.12)]">
                      <div class="font-['Press_Start_2P'] text-[8px] text-[#ffd21e] tracking-wider mb-1.5">RACHA</div>
                      <div class="flex items-baseline justify-center gap-2">
                        <span class="text-2xl drop-shadow-[0_0_8px_#ff8a1e]">🔥</span>
                        <span class="font-['Press_Start_2P'] text-xl text-[#ffd21e] drop-shadow-[0_0_8px_rgba(255,210,30,0.7)]">{{ rachaDias() }}</span>
                        <span class="text-xs font-semibold text-[#e0c46a]">días</span>
                      </div>
                    </div>
                  </div>

                  <!-- Total XP al pie -->
                  <div class="p-2.5 mt-2 rounded-xl bg-black/40 border border-white/10 text-center">
                    <div class="font-['Press_Start_2P'] text-[7px] text-[#9a86b8] mb-1">TOTAL XP</div>
                    <div class="font-['Press_Start_2P'] text-lg text-[#22e0d0] drop-shadow-[0_0_8px_rgba(34,224,208,0.7)]">
                      {{ xp() }}
                    </div>
                  </div>
                </aside>
              </div>

              <!-- CONSOLA INFERIOR CON JOYSTICK Y BOTONERA SANWA -->
              <footer class="h-24 md:h-28 flex-shrink-0 bg-gradient-to-b from-[#20242e] to-[#0e1016] border-t-2 border-[#22e0d0]/40 shadow-[0_0_22px_rgba(34,224,208,0.18)] flex items-center justify-between px-6 z-30">
                
                <!-- Joystick interactivo EDU-JOY -->
                <div class="flex items-center gap-4">
                  <div
                    #joystickBase
                    class="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 cursor-crosshair select-none touch-none"
                    (pointerdown)="onJoyDown($event)"
                    (pointermove)="onJoyMove($event)"
                  >
                    <!-- Base circular (arandela antipolvo) -->
                    <div class="absolute left-1/2 bottom-1 -translate-x-1/2 w-16 h-7 rounded-[50%] bg-gradient-to-b from-[#3a3f4a] to-[#14161c] shadow-[0_4px_10px_rgba(0,0,0,0.6)]"></div>
                    <!-- Collar central de la base -->
                    <div class="absolute left-1/2 bottom-2.5 -translate-x-1/2 w-5 h-2.5 rounded-[50%] bg-[#0d0e12] shadow-inner"></div>

                    <!-- Palanca completa (eje metálico + bola unidos rígidamente) -->
                    <div
                      class="absolute left-1/2 bottom-3 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-transform duration-100 ease-out"
                      style="transform-origin: bottom center;"
                      [style.transform]="joystickTilt()"
                    >
                      <!-- Bola Joystick con resplandor arcade (fijada al tope del eje) -->
                      <div
                        class="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff9dc0] to-[#ff2d6f] shadow-[0_0_14px_#ff2d6f,inset_0_-4px_8px_rgba(0,0,0,0.3)] z-10"
                      ></div>
                      <!-- Eje metálico (palanca) -->
                      <div
                        class="w-2.5 h-11 -mt-2.5 rounded-b-sm bg-gradient-to-b from-[#e2e4ea] via-[#c9ccd4] to-[#5a5e68] shadow-[0_1px_4px_rgba(0,0,0,0.5)] z-0"
                      ></div>
                    </div>
                  </div>

                  <div class="flex flex-col">
                    <span class="font-['Press_Start_2P'] text-[8px] text-[#9aa2b0] tracking-wider">EDU-JOY</span>
                    <span class="font-['Press_Start_2P'] text-[8px] text-[#ffd21e] tracking-wider mt-1 drop-shadow-[0_0_6px_rgba(255,210,30,0.6)]">INSERT COIN</span>
                    <div class="w-12 h-1.5 rounded-full bg-[#0a0c10] border border-[#ffd21e] mt-1.5 shadow-[0_0_6px_rgba(255,210,30,0.5)]"></div>
                  </div>
                </div>

                <!-- Botonera Sanwa de acciones -->
                <div class="flex items-center gap-4 md:gap-6">
                  <!-- Ranking -->
                  <button
                    type="button"
                    (click)="rankOpen.set(true)"
                    class="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  >
                    <div class="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#c79bff] to-[#7a2fd0] border border-white/30 shadow-[0_0_14px_rgba(155,77,255,0.6)] flex items-center justify-center text-xl md:text-2xl">
                      🏆
                    </div>
                    <span class="font-['Press_Start_2P'] text-[6px] md:text-[7px] text-[#c9a9ff]">RANKING</span>
                  </button>

                  <!-- Insignias -->
                  <button
                    type="button"
                    (click)="inventoryModal.set('insignias')"
                    class="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  >
                    <div class="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#ffe07a] to-[#f5b010] border border-white/30 shadow-[0_0_14px_rgba(255,176,16,0.6)] flex items-center justify-center text-xl md:text-2xl">
                      🏅
                    </div>
                    <span class="font-['Press_Start_2P'] text-[6px] md:text-[7px] text-[#ffd98a]">INSIGNIAS</span>
                  </button>

                  <!-- Mochila -->
                  <button
                    type="button"
                    (click)="inventoryModal.set('equipamiento')"
                    class="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  >
                    <div class="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#8ff3e9] to-[#17b8ab] border border-white/30 shadow-[0_0_14px_rgba(34,224,208,0.6)] flex items-center justify-center text-xl md:text-2xl">
                      🎒
                    </div>
                    <span class="font-['Press_Start_2P'] text-[6px] md:text-[7px] text-[#7ff0e6]">MOCHILA</span>
                  </button>

                  <!-- Centrar / System -->
                  <button
                    type="button"
                    (click)="scrollToPlayer()"
                    class="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                  >
                    <div class="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#4a4f5a] to-[#1a1c22] border border-white/20 shadow-inner flex items-center justify-center text-lg md:text-xl text-[#c9b6ff]">
                      ⤢
                    </div>
                    <span class="font-['Press_Start_2P'] text-[6px] md:text-[7px] text-[#8a90a0]">CENTRAR</span>
                  </button>
                </div>
              </footer>
            </div>
          </div>

          <!-- PLACA EDU-VISION + PERILLAS + PARLANTES INFERIORES DEL TELEVISOR -->
          <div class="h-9 px-6 flex items-center justify-between bg-[#15121b] rounded-b-[28px] md:rounded-b-[36px] border-t-2 border-[#2b2436]">
            <!-- Marca y LED de encendido -->
            <div class="flex items-center gap-2.5">
              <div
                class="w-2.5 h-2.5 rounded-full transition-all duration-500"
                [style.background]="isPowered() ? 'radial-gradient(circle at 35% 30%, #baffcf, #22e0d0)' : 'radial-gradient(circle at 35% 30%, #5a3a42, #2a1a1e)'"
                [style.box-shadow]="isPowered() ? '0 0 10px #22e0d0' : 'none'"
              ></div>
              <span class="font-['Press_Start_2P'] text-[8px] text-[#a89ab8] tracking-widest">EDU-VISION</span>
            </div>

            <!-- Rejilla de parlante central -->
            <div class="flex items-center gap-1.5">
              <span class="w-1 h-1 rounded-full bg-[#3a3b4a]"></span>
              <span class="w-1 h-1 rounded-full bg-[#3a3b4a]"></span>
              <span class="w-1 h-1 rounded-full bg-[#3a3b4a]"></span>
              <span class="w-1 h-1 rounded-full bg-[#3a3b4a]"></span>
              <span class="w-1 h-1 rounded-full bg-[#3a3b4a]"></span>
            </div>

            <!-- Perillas analógicas decorativas -->
            <div class="flex gap-3">
              <div class="relative w-5 h-5 rounded-full bg-gradient-to-br from-[#5a5266] to-[#242028] shadow-sm border border-black/40">
                <div class="absolute left-1/2 top-1 -translate-x-1/2 w-0.5 h-2 bg-[#0a0810]"></div>
              </div>
              <div class="relative w-5 h-5 rounded-full bg-gradient-to-br from-[#5a5266] to-[#242028] shadow-sm border border-black/40">
                <div class="absolute left-1/2 top-1 -translate-x-1/2 w-0.5 h-2 bg-[#0a0810]"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- MODALES Y DIÁLOGOS (Quiz, Celebración, Insignias, Ranking)    -->
        <!-- ============================================================= -->

        <!-- MODAL DE ACTIVIDAD Y PREGUNTAS (Quiz interactivo) -->
        @if (activeChallenge(); as c) {
          <div class="modal modal-open backdrop-blur-md z-50">
            <div class="modal-box max-w-xl border-4 border-primary bg-[#1C1E2B] p-6 text-white shadow-2xl chaflan">
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

              <div class="my-4">
                @if (!isQuizResolved()) {
                  <p class="text-base text-[#F3EAFF] leading-relaxed mb-4">
                    {{ currentQuestion(c).pregunta }}
                  </p>

                  <div class="flex flex-col gap-2.5" role="group" aria-label="Opciones de respuesta">
                    @for (opt of currentQuestion(c).opciones; track $index) {
                      <button
                        type="button"
                        class="flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all text-sm cursor-pointer"
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

        <!-- CARTEL DE UNIDAD COMPLETADA (Confetti) -->
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
            <div class="modal-box relative max-w-md border-4 border-primary bg-[#1C1E2B] p-8 text-center text-white shadow-2xl chaflan">
              <button
                class="btn btn-ghost btn-sm absolute right-3 top-3 text-lg text-white/70 hover:text-white"
                (click)="showUnitComplete.set(false)"
                aria-label="Cerrar"
              >
                ✕
              </button>
              <div class="text-6xl mb-3 animate-bounce">🏆</div>
              <span class="ui-font text-[9px] text-accent tracking-widest">¡UNIDAD COMPLETADA!</span>
              <h2 class="title-font mt-2 text-2xl text-primary">{{ activeUnit().nombre }}</h2>
              <p class="mt-3 text-sm text-[#E0E2EC] leading-relaxed opacity-90">
                Superaste todos los desafíos de esta unidad. ¡Excelente trabajo, explorador!
              </p>
              <div class="mt-5 flex items-center justify-center gap-4 rounded-xl border border-primary/40 bg-black/40 px-5 py-2.5">
                <span class="ui-font text-[9px] text-white/70">XP total de la unidad:</span>
                <strong class="ui-font text-sm text-accent">+{{ unitTotalXp() }} XP</strong>
              </div>
              <button
                type="button"
                class="btn btn-primary w-full ui-font text-[9px] mt-6"
                (click)="back()"
              >
                VOLVER AL SELECTOR DE CARTUCHOS →
              </button>
            </div>
          </div>
        }

        <!-- MODALES DE INVENTARIO Y RANKING -->
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
export class UnidadMapa {
  readonly id = input<string>();
  readonly preview = input<boolean>(false);

  protected readonly avatarSrv = inject(AvatarService);
  protected readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly mapViewport = viewChild<ElementRef<HTMLDivElement>>('mapViewport');
  protected readonly mapPanel = viewChild<ElementRef<HTMLDivElement>>('mapPanel');
  protected readonly crtScreen = viewChild<ElementRef<HTMLDivElement>>('crtScreen');
  protected readonly joystickBase = viewChild<ElementRef<HTMLDivElement>>('joystickBase');

  // ---------- Estado de la vista / Chasis Arcade ----------
  readonly view = signal<ViewState>('selector');
  readonly activeUnitIndex = signal<number>(0);
  private insertTimeout1 = 0;
  private insertTimeout2 = 0;

  readonly isPowered = computed(() => this.view() !== 'selector');
  readonly isRevealed = computed(() => this.view() === 'flash' || this.view() === 'roadmap');

  // ---------- Unidades y Modelado de Cartuchos ----------
  protected readonly cartridgeCards = computed<CartridgeCard[]>(() => {
    const unidades = this.store.unidades();
    const completos = new Set(
      (this.progreso()?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );
    const xpActual = this.xp();

    return unidades.map((u, i) => {
      const theme = CARTRIDGE_THEMES[i % CARTRIDGE_THEMES.length];
      const total = u.actividades.length;
      const hechas = u.actividades.filter((a) => completos.has(a.id)).length;
      const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
      const bloqueada = xpActual < u.umbralXpDesbloqueo;
      const esUltima = i === unidades.length - 1;

      let tag = 'BLOQ.';
      if (!bloqueada) {
        if (pct === 100) tag = 'COMPLETO';
        else if (esUltima) tag = 'FINAL';
        else if (i === 0) tag = 'BASE';
        else tag = 'ACTUAL';
      }

      return {
        u,
        index: i,
        n: String(u.orden).padStart(2, '0'),
        name: u.nombre.toUpperCase(),
        tag,
        hue: theme.hue,
        glow: theme.glow,
        body: theme.body,
        pct,
        pctLabel: pct + '%',
        lecc: `${hechas} / ${total} LECC.`,
        bloqueada,
      };
    });
  });

  protected readonly activeCartridge = computed<CartridgeCard>(() => {
    const cards = this.cartridgeCards();
    return cards[this.activeUnitIndex()] ?? cards[0] ?? {
      u: { id: this.id() || 'u1', orden: 1, nombre: 'Unidad', actividades: [], umbralXpDesbloqueo: 0 },
      index: 0,
      n: '01',
      name: 'UNIDAD',
      tag: 'ACTUAL',
      hue: '#22e0d0',
      glow: 'rgba(34,224,208,0.55)',
      body: 'linear-gradient(155deg,#2be0d0,#16938c 55%,#0c6b64)',
      pct: 0,
      pctLabel: '0%',
      lecc: '0 / 0 LECC.',
      bloqueada: false,
    };
  });

  protected readonly activeUnit = computed<Unidad>(() => this.activeCartridge().u);

  // ---------- Cálculo de Estilos del Carrusel 3D ----------
  protected getCartridgeWrapStyle(index: number): string {
    const active = this.activeUnitIndex();
    const off = index - active;
    const a = Math.abs(off);
    const isBusy = this.view() !== 'selector';
    const cy = -60;

    if (isBusy) {
      if (off === 0) {
        return `
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%) translateY(${cy + 150}px) scale(0.72);
          transform-origin: center bottom;
          opacity: 1; filter: none;
          transition: transform 0.65s cubic-bezier(0.45, 0, 0.25, 1), opacity 0.5s ease;
          z-index: 6; pointer-events: none; cursor: default;
        `;
      } else {
        return `
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%) translateX(${off * 300}px) translateY(${cy - 120}px) scale(0.4);
          transform-origin: center bottom;
          opacity: 0; filter: blur(6px);
          transition: transform 0.5s ease, opacity 0.4s ease;
          z-index: 1; pointer-events: none; cursor: default;
        `;
      }
    }

    const s = (off === 0 ? 1 : a === 1 ? 0.72 : a === 2 ? 0.5 : 0.4) * 0.72;
    const x = off * 290;
    const op = a === 0 ? 1 : a === 1 ? 0.82 : a === 2 ? 0.4 : 0;
    const blur = a === 0 ? 0 : a === 1 ? 1.5 : 4;
    const ty = off === 0 ? cy : cy - 100;

    return `
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%) translateX(${x}px) translateY(${ty}px) scale(${s});
      transform-origin: center bottom;
      opacity: ${op};
      filter: blur(${blur}px) brightness(${off === 0 ? 1 : 0.6}) saturate(${off === 0 ? 1 : 0.7});
      transition: transform 0.5s cubic-bezier(0.22, 0.9, 0.3, 1), opacity 0.5s ease, filter 0.5s ease;
      z-index: ${20 - a};
      pointer-events: ${op < 0.45 ? 'none' : 'auto'};
      cursor: ${off === 0 ? 'default' : 'pointer'};
    `;
  }

  // ---------- Control de Navegación del Carrusel ----------
  next(): void {
    const total = this.cartridgeCards().length;
    if (total > 0) this.activeUnitIndex.set(Math.min(this.activeUnitIndex() + 1, total - 1));
  }

  prev(): void {
    this.activeUnitIndex.set(Math.max(this.activeUnitIndex() - 1, 0));
  }

  goTo(i: number): void {
    this.activeUnitIndex.set(i);
  }

  onCartridgeClick(i: number): void {
    if (this.view() !== 'selector') return;
    if (i === this.activeUnitIndex()) {
      this.start();
    } else {
      this.goTo(i);
    }
  }

  start(): void {
    if (this.view() !== 'selector') return;
    if (this.activeCartridge().bloqueada) return;

    this.view.set('inserting');
    if (this.insertTimeout1) clearTimeout(this.insertTimeout1);
    if (this.insertTimeout2) clearTimeout(this.insertTimeout2);

    this.playCrtPowerOnSound();

    this.insertTimeout1 = window.setTimeout(() => this.view.set('flash'), 650);
    this.insertTimeout2 = window.setTimeout(() => {
      this.view.set('roadmap');
      this.router.navigate(['/alumno/unidad', this.activeUnit().id], { replaceUrl: true });
      setTimeout(() => this.scrollToPlayer(), 250);
    }, 1350);
  }

  back(): void {
    if (this.insertTimeout1) clearTimeout(this.insertTimeout1);
    if (this.insertTimeout2) clearTimeout(this.insertTimeout2);
    this.view.set('selector');
    this.router.navigate(['/alumno'], { replaceUrl: true });
  }

  // ---------- Escucha de Teclas Global ----------
  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (this.view() === 'selector') {
      if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.start();
      }
    } else if (this.view() === 'roadmap') {
      if (e.key === 'Escape') {
        this.back();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowUp' ? 'up' : 'down';
        this.activeJoy.set(dir);
        const vp = this.mapViewport()?.nativeElement;
        if (vp) vp.scrollTop += dir === 'up' ? -40 : 40;
        if (this.keyTimer) clearTimeout(this.keyTimer);
        this.keyTimer = setTimeout(() => this.activeJoy.set(null), 180);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? 'left' : 'right';
        this.activeJoy.set(dir);
        if (this.keyTimer) clearTimeout(this.keyTimer);
        this.keyTimer = setTimeout(() => this.activeJoy.set(null), 180);
      }
    }
  }

  // ---------- MOTOR DE MUNDO VERTICAL (Super Mario Bros 3) ----------
  protected readonly theme = computed<WorldTheme>(() => {
    const u = this.activeUnit();
    if (!u) return 'desert';
    const nombre = u.nombre.toLowerCase();
    if (nombre.includes('desierto') || nombre.includes('fundamento') || u.orden === 1) return 'desert';
    if (nombre.includes('selva') || nombre.includes('control') || u.orden === 2) return 'jungle';
    if (nombre.includes('castillo') || nombre.includes('fortaleza') || nombre.includes('funcion') || u.orden === 3)
      return 'castle';
    return (['desert', 'jungle', 'castle'] as const)[(u.orden - 1) % 3];
  });

  protected readonly groundColor = computed<string>(() => {
    const t = this.theme();
    if (t === 'jungle') return '#638c3e';
    if (t === 'castle') return '#343f5c';
    return '#f6c25d'; // desert
  });

  protected readonly world = computed<GeneratedWorld>(() => {
    const u = this.activeUnit();
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

  // ---------- Progreso, Nivel, Vidas y Racha ----------
  protected readonly completedIds = signal<number[]>([1]);
  protected readonly localVidas = signal<number>(5);

  protected readonly vidas = computed(() => this.store.progreso()?.vidasVigentes ?? this.localVidas());
  protected readonly xp = computed(() => this.store.progreso()?.xpTotal ?? 0);
  protected readonly nivel = computed(() => Math.floor(this.xp() / 1000) + 1);
  protected readonly xpNivelActual = computed(() => this.xp() % 1000);
  protected readonly nivelPorcentaje = computed(() =>
    Math.min(100, Math.max(0, Math.round((this.xpNivelActual() / 1000) * 100))),
  );
  protected readonly rachaDias = signal(10);

  // ---------- Modales Auxiliares ----------
  readonly rankOpen = signal(false);
  readonly inventoryModal = signal<InventoryMode | null>(null);

  // ---------- Joystick Interactivo ----------
  readonly activeJoy = signal<JoyDir | null>(null);
  readonly joystickTilt = computed(() => {
    const d = this.activeJoy();
    const map: Record<JoyDir, string> = {
      left: 'rotateZ(-22deg)',
      right: 'rotateZ(22deg)',
      up: 'rotateX(25deg) scaleY(0.9)',
      down: 'rotateX(-20deg) scaleY(0.92)',
    };
    return d ? map[d] : 'rotateZ(0deg)';
  });

  private readonly joyThreshold = 10;
  private readonly onJoyUpBound = () => this.onJoyUp();
  private keyTimer: ReturnType<typeof setTimeout> | null = null;

  protected onJoyDown(event: PointerEvent): void {
    const el = this.joystickBase()?.nativeElement;
    if (el) el.setPointerCapture(event.pointerId);
    window.addEventListener('pointerup', this.onJoyUpBound);
    this.updateJoy(event);
  }

  protected onJoyMove(event: PointerEvent): void {
    if (event.buttons > 0) this.updateJoy(event);
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

    const vp = this.mapViewport()?.nativeElement;
    if (vp) {
      if (dir === 'up') vp.scrollTop -= 20;
      else if (dir === 'down') vp.scrollTop += 20;
    }
  }

  private onJoyUp(): void {
    window.removeEventListener('pointerup', this.onJoyUpBound);
    this.activeJoy.set(null);
  }

  // ---------- Posicionamiento, Caminata y Desafíos ----------
  protected readonly sel = signal<VerticalChallenge | null>(null);
  protected readonly activeChallenge = signal<VerticalChallenge | null>(null);
  protected readonly selectedAnswer = signal<number | null>(null);
  protected readonly isQuizResolved = signal<boolean>(false);
  protected readonly quizFeedback = signal<string | null>(null);
  protected readonly soundEnabled = signal<boolean>(true);
  protected readonly isExpanded = signal<boolean>(false);

  protected readonly playerPos = signal<{ x: number; y: number }>({ x: 50, y: 90.5 });
  protected readonly isWalking = signal<boolean>(false);
  protected readonly facing = signal<'derecha' | 'izquierda'>('derecha');
  protected readonly walkPuffs = signal<WalkPuff[]>([]);
  private readonly currentStopId = signal<number>(0);
  private animId = 0;

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
    let initialRouteHandled = false;
    effect(() => {
      const units = this.store.unidades();
      const currentId = this.id();
      if (!currentId) return;
      const matchIdx = units.findIndex((u) => u.id === currentId || String(u.orden) === currentId);
      if (matchIdx !== -1) {
        this.activeUnitIndex.set(matchIdx);
        if (!initialRouteHandled && !this.preview()) {
          initialRouteHandled = true;
          this.view.set('roadmap');
          setTimeout(() => this.scrollToPlayer(), 300);
        }
      }
    });

    effect(() => {
      const w = this.world();
      const comp = untracked(() => this.completedIds());
      const nextId = w.challenges.find((c) => !c.optional && !comp.includes(c.id))?.id ?? w.mainCount;
      const stop = w.stops[nextId] ?? [50, 90];
      this.playerPos.set({ x: stop[0], y: stop[1] });
      this.currentStopId.set(nextId);
    });

    this.destroyRef.onDestroy(() => {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
      if (this.insertTimeout1) clearTimeout(this.insertTimeout1);
      if (this.insertTimeout2) clearTimeout(this.insertTimeout2);
      if (this.keyTimer) clearTimeout(this.keyTimer);
      window.removeEventListener('pointerup', this.onJoyUpBound);
    });
  }

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

  protected isCompleted(c: VerticalChallenge): boolean {
    return this.completedIds().includes(c.id);
  }

  protected isAvailable(c: VerticalChallenge): boolean {
    if (this.isCompleted(c)) return true;
    if (c.recovery) return true;
    if (c.optional) return this.completedIds().length >= 2;
    return c.id === 1 || this.completedIds().includes(c.id - 1);
  }

  protected isLocked(c: VerticalChallenge): boolean {
    return !this.isAvailable(c);
  }

  protected nodeVerbText(c: VerticalChallenge): string {
    const status = this.isCompleted(c) ? 'completed' : this.isAvailable(c) ? 'available' : 'locked';
    return nodeVerb(this.theme(), status);
  }

  protected scenerySvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderWorldScenery(this.world()));
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

  protected onNodeClick(c: VerticalChallenge): void {
    this.sel.set(c);
    this.walkRoute(this.buildRoute(c));
    this.currentStopId.set(c.optional ? (c.branchStopId ?? this.currentStopId()) : c.id);
  }

  private buildRoute(target: VerticalChallenge): [number, number][] {
    const w = this.world();
    const fromStopId = this.currentStopId();
    const branchStopId = target.optional ? (target.branchStopId ?? fromStopId) : target.id;

    const route: [number, number][] = [];
    const step = branchStopId > fromStopId ? 1 : branchStopId < fromStopId ? -1 : 0;
    for (let id = fromStopId; id !== branchStopId; id += step) {
      route.push(w.stops[id + step] ?? w.stops[branchStopId]);
    }

    if (target.optional) {
      if (target.branchFrom) route.push(target.branchFrom);
      route.push([target.x, target.y]);
    }

    return route.length ? route : [[target.x, target.y]];
  }

  private walkRoute(points: [number, number][]): void {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.walkLeg(points, 0);
  }

  private walkLeg(points: [number, number][], index: number): void {
    if (index >= points.length) {
      this.isWalking.set(false);
      return;
    }

    const [targetX, targetY] = points[index];
    const from = this.playerPos();
    const dx = targetX - from.x;
    const dy = targetY - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      this.walkLeg(points, index + 1);
      return;
    }

    this.isWalking.set(true);
    this.facing.set(dx >= 0 ? 'derecha' : 'izquierda');
    const startT = performance.now();
    const duration = Math.max(300, Math.min(1000, dist * 25));

    const step = (now: number) => {
      const progress = Math.min(1, (now - startT) / duration);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      const curX = from.x + dx * ease;
      const curY = from.y + dy * ease;
      this.playerPos.set({ x: curX, y: curY });

      if (Math.random() < 0.25) {
        const w = this.world();
        const puff: WalkPuff = {
          id: Date.now() + Math.random(),
          x: (curX / 100) * w.worldWidth,
          y: (curY / 100) * w.worldHeight,
        };
        this.walkPuffs.update((list) => [...list.slice(-12), puff]);
      }

      if (progress < 1) {
        this.animId = requestAnimationFrame(step);
      } else {
        this.walkLeg(points, index + 1);
      }
    };
    this.animId = requestAnimationFrame(step);
  }

  protected openActivity(c: VerticalChallenge): void {
    this.sel.set(null);
    this.selectedAnswer.set(null);
    this.isQuizResolved.set(false);
    this.quizFeedback.set(null);
    this.activeChallenge.set(c);
  }

  protected closeActivity(): void {
    this.activeChallenge.set(null);
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
      this.localVidas.set(5);
      this.store.sumarProgreso(0, undefined, 5);
    }
    this.closeActivity();

    if (!wasAlreadyCompleted && !c.optional) {
      if (c.id === this.world().mainCount) {
        this.celebrateUnitComplete();
      } else {
        this.advanceToNext();
      }
    }
  }

  private advanceToNext(): void {
    const w = this.world();
    const nextId = w.challenges.find((c) => !c.optional && !this.completedIds().includes(c.id))?.id ?? w.mainCount;
    const target = w.challenges.find((c) => c.id === nextId);
    if (!target || nextId === this.currentStopId()) return;

    this.sel.set(null);
    this.walkRoute(this.buildRoute(target));
    this.currentStopId.set(nextId);
  }

  private celebrateUnitComplete(): void {
    this.sel.set(null);
    this.confettiPieces.set(this.buildConfetti());
    this.celebrating.set(true);
    this.playVictoryFanfare();

    if (this.celebrateTimeoutId) clearTimeout(this.celebrateTimeoutId);
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

  private playVictoryFanfare(): void {
    if (!this.soundEnabled()) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
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

  private playCrtPowerOnSound(): void {
    if (!this.soundEnabled()) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime + 0.65;

      // 1. Degauss coil 'thump' (130Hz -> 35Hz)
      const degaussOsc = ctx.createOscillator();
      const degaussGain = ctx.createGain();
      degaussOsc.type = 'sine';
      degaussOsc.frequency.setValueAtTime(130, now);
      degaussOsc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
      degaussGain.gain.setValueAtTime(0.18, now);
      degaussGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      degaussOsc.connect(degaussGain);
      degaussGain.connect(ctx.destination);
      degaussOsc.start(now);
      degaussOsc.stop(now + 0.45);

      // 2. High-pitch CRT phosphor whine (~6500Hz -> 8200Hz)
      const flybackOsc = ctx.createOscillator();
      const flybackGain = ctx.createGain();
      flybackOsc.type = 'sawtooth';
      flybackOsc.frequency.setValueAtTime(6500, now);
      flybackOsc.frequency.linearRampToValueAtTime(8200, now + 0.25);
      flybackGain.gain.setValueAtTime(0.025, now);
      flybackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      flybackOsc.connect(flybackGain);
      flybackGain.connect(ctx.destination);
      flybackOsc.start(now);
      flybackOsc.stop(now + 0.55);
    } catch {}
  }
}
