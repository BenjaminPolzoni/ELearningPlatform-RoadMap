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
import { Section } from '../../core/data/roadmap.models';
import {
  base,
  box,
  path,
  faceLateral,
  layoutIslands,
  project,
  Point,
  frac,
  diamond,
  TILE_H,
} from '../../core/iso/iso';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { InventoryModal, InventoryMode } from '../../shared/ui/inventory-modal';
import { Lives } from './lives';
import { FIRE_COLORS, FIRE_GRID } from './streak';
import { RankingPanel } from '../ranking/ranking-panel';
import { PixelIcon } from '../../shared/pixel-icon';

type IslandStatus = 'bloqueada' | 'disponible' | 'completada';

interface Island {
  u: Section;
  c: Point;
  floor: Point;
  status: IslandStatus;
  current: boolean;
  done: number;
  total: number;
}

// --- island geometry, in screen px ---
const SEMI_WIDTH = 86;
const SEMI_HEIGHT = 43;
const THICKNESS = 24;
const LONG_BASE = 70;
const MARGIN = 90;

/**
 * 2.5D map of the course (E2) with the full chassis of the EduQuest TV Arcade Console:
 * - Top navbar with neon brand, role and circular avatar button.
 * - Right edge-lit acrylic panel with the player's stats (Level, liquid XP, Lives, Streak).
 * - Bottom metal panel with an interactive 45° Joystick and Sanwa button set (Ranking, Badges, Backpack, System).
 * - Central screen with CRT vignette and isometric SVG map.
 */
@Component({
  selector: 'app-map',
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
      <!-- Preview mode embedded in the teacher's editor: no arcade chassis or HUD -->
      <div class="escena-neon relative overflow-hidden border-2 border-secondary" style="height: 300px">
        <svg #canvas [attr.viewBox]="viewBox()" class="block h-full w-full select-none" role="img">
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
            @for (l of grid(); track $index) {
              <line [attr.x1]="l.a.x" [attr.y1]="l.a.y" [attr.x2]="l.b.x" [attr.y2]="l.b.y" />
            }
          </g>
          <g fill="none" stroke-linecap="square" style="shape-rendering: crispEdges">
            @for (t of pathSegments(); track t.id) {
              <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="11" opacity="0.28" filter="url(#neon)" />
              <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="4" [attr.opacity]="t.faint ? 0.4 : 0.95" />
            }
          </g>
          @for (island of islands(); track island.u.id) {
            <g class="isla-hit">
              <ellipse [attr.cx]="island.floor.x" [attr.cy]="island.floor.y + 30" [attr.rx]="SEMI_WIDTH * 0.82" [attr.ry]="SEMI_HEIGHT * 0.5" fill="#0E0120" opacity="0.5" />
              <polygon [attr.points]="polyBase(island)" fill="url(#isla-base)" stroke="#7B3AD6" stroke-width="1.5" stroke-opacity="0.45" />
              <polygon [attr.points]="polyFace(island, 'izq')" fill="#4A2280" />
              <polygon [attr.points]="polyFace(island, 'der')" fill="#2A1049" />
              <polygon [attr.points]="polyCover(island)" fill="url(#isla-top-on)" [attr.stroke]="border(island)" stroke-width="2" />
              <text [attr.x]="island.c.x" [attr.y]="island.c.y + THICKNESS + LONG_BASE + 26" text-anchor="middle" font-size="15" fill="#F3EAFF" style="font-family: var(--font-title)">
                {{ island.u.order }}. {{ island.u.name }}
              </text>
            </g>
          }
        </svg>
      </div>
    } @else {
      <!-- ==================== FULL EDUQUEST TV CHASSIS ==================== -->
      <div class="w-full h-full flex flex-col rounded-[20px] bg-[#17181F] border-[6px] border-[#23242E] shadow-[0_0_80px_rgba(139,92,246,0.18)] overflow-hidden">
        
        <!-- 1. TOP ARCADE NAVBAR -->
        <header class="flex-shrink-0 relative z-10">
          <nav class="navbar flex h-12 flex-shrink-0 items-center justify-between gap-4 px-4 border-b-4 border-primary bg-gradient-to-r from-[#1A1438] via-[#130E24] to-[#1A1438]">
            <div class="flex items-center gap-3">
              <span class="text-2xl drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">🎯</span>
              <div class="leading-tight">
                <div class="text-lg font-black tracking-wide text-primary">
                  EDUQUEST
                </div>
                <div class="text-[9px] uppercase tracking-[0.3em] text-base-content/50">
                  Roadmap Gamificado
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <a
                routerLink="/login"
                class="badge badge-outline ui-font text-[9px] cursor-pointer transition-colors flex items-center gap-1 border-primary/50 text-base-content hover:bg-primary/15"
                title="Cambiar de rol / volver al selector"
              >
                <span>{{ auth.role() ?? 'ALUMNO' }}</span>
                <span class="text-[8px] opacity-70">▾</span>
              </a>

              <a
                routerLink="/alumno/avatar"
                class="btn btn-circle btn-sm bg-[#1B1740] border-2 border-primary shadow-[0_0_12px_rgba(139,92,246,0.5)] flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
                title="Personalizar mi avatar"
              >
                <ui-avatar-sprite [config]="avatarSrv.avatar()" [height]="48" />
              </a>
            </div>
          </nav>
        </header>

        <!-- 2. MAIN BODY (Split Layout) -->
        <div class="flex flex-row flex-1 min-h-0 bg-[#0D0B1E]">
          
          <!-- A. LEFT AREA (SVG Screen + Bottom Control Deck) -->
          <div class="flex-1 flex flex-col h-full min-w-0">
            
            <!-- SVG Map Canvas (Top) -->
            <div
              #mapContainer
              class="flex-1 min-h-0 flex flex-col relative rounded-[10px] border-2 border-[#8B5CF6]/40 bg-[#0D0B1E] overflow-hidden m-2"
            >
              
              <!-- CRT vignette over the map -->
              <div
                class="pointer-events-none absolute inset-0 z-[55]"
                style="background: radial-gradient(ellipse at center, transparent 62%, rgba(0, 0, 0, 0.55) 100%);"
              ></div>

              <!-- Ambient Glow -->
              <div
                class="absolute inset-0 pointer-events-none"
                style="background: radial-gradient(circle at 50% 30%, rgba(139,92,246,0.12) 0%, transparent 60%)"
              ></div>

              <!-- Floating top title of the map -->
              <div class="absolute top-2 left-1/2 -translate-x-1/2 text-center z-40 pointer-events-none">
                <h2 class="text-base font-black tracking-wide text-[#7FFAFF] glow-cyan">
                  {{ store.roadmap()?.name ?? 'ROADMAP' }} 🗺️
                </h2>
                <p class="text-[10px] text-base-content/40">
                  {{ completed() }}/{{ islands().length }} UNIDADES COMPLETAS · Clic nodo o Joystick para navegar
                </p>
              </div>

              <!-- Interactive SVG Container -->
              <svg
                #canvas
                [attr.viewBox]="viewBox()"
                class="block h-full w-full select-none"
                [class.cursor-grab]="!dragging()"
                [class.cursor-grabbing]="dragging()"
                (pointerdown)="grab($event)"
                (pointermove)="move($event)"
                (pointerup)="release($event)"
                (pointercancel)="release($event)"
                (wheel)="onWheel($event)"
                role="application"
                [attr.aria-label]="'Mapa del curso: ' + islands().length + ' unidades'"
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

                <!-- Floor: isometric grid -->
                <g opacity="0.16" stroke="#8B3DF5" stroke-width="1">
                  @for (l of grid(); track $index) {
                    <line [attr.x1]="l.a.x" [attr.y1]="l.a.y" [attr.x2]="l.b.x" [attr.y2]="l.b.y" />
                  }
                </g>

                <!-- Neon paths -->
                <g fill="none" stroke-linecap="square" style="shape-rendering: crispEdges">
                  @for (t of pathSegments(); track t.id) {
                    <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="11" opacity="0.28" filter="url(#neon)" />
                    <path [attr.d]="t.d" [attr.stroke]="t.color" stroke-width="4" [attr.opacity]="t.faint ? 0.4 : 0.95" />
                    @if (!t.faint) {
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

                <!-- Floating islands -->
                @for (island of islands(); track island.u.id) {
                  <g
                    class="isla-hit cursor-pointer"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="label(island)"
                    (click)="select(island)"
                    (keydown.enter)="select(island)"
                    (keydown.space)="select(island)"
                  >
                    <!-- Cast shadow -->
                    <ellipse
                      [attr.cx]="island.floor.x"
                      [attr.cy]="island.floor.y + 30"
                      [attr.rx]="SEMI_WIDTH * 0.82"
                      [attr.ry]="SEMI_HEIGHT * 0.5"
                      fill="#0E0120"
                      opacity="0.5"
                    />

                    <!-- Active island halo -->
                    @if (island.current) {
                      <ellipse
                        [attr.cx]="island.c.x"
                        [attr.cy]="island.c.y + 6"
                        [attr.rx]="SEMI_WIDTH * 1.25"
                        [attr.ry]="SEMI_HEIGHT * 0.95"
                        fill="#FFFFFF"
                        opacity="0.3"
                        filter="url(#neon)"
                        class="anim-latir"
                      />
                    }

                    <!-- Volumetric geometry -->
                    <polygon
                      [attr.points]="polyBase(island)"
                      fill="url(#isla-base)"
                      stroke="#3FA8B8"
                      stroke-width="1.5"
                      stroke-opacity="0.45"
                    />
                    <polygon [attr.points]="polyFace(island, 'izq')" fill="#234048" />
                    <polygon [attr.points]="polyFace(island, 'der')" fill="#14282C" />
                    <polygon
                      [attr.points]="polyCover(island)"
                      [attr.fill]="
                        island.status === 'bloqueada'
                          ? 'url(#isla-top)'
                          : island.status === 'completada'
                            ? 'url(#isla-top-done)'
                            : 'url(#isla-top-on)'
                      "
                      [attr.stroke]="border(island)"
                      stroke-width="2"
                    />
                    <polygon
                      [attr.points]="polyCoverInterior(island)"
                      fill="none"
                      [attr.stroke]="island.status === 'bloqueada' ? '#241046' : '#C79BFF'"
                      stroke-width="1.5"
                      opacity="0.5"
                    />

                    <!-- Crystals -->
                    @for (cr of crystals(island); track $index) {
                      <polygon [attr.points]="cr.p" [attr.fill]="cr.color" [attr.opacity]="cr.op" />
                    }
                    <polygon [attr.points]="polyCover(island)" class="isla-foco" fill="none" stroke="none" />

                    <!-- Floating hexagonal emblem -->
                    <g [attr.transform]="'translate(' + island.c.x + ',' + (island.c.y - 108) + ')'">
                      <polygon
                        points="0,-26 23,-13 23,13 0,26 -23,13 -23,-13"
                        [attr.fill]="fill(island.status)"
                        [attr.stroke]="island.current ? '#F3EAFF' : '#190236'"
                        stroke-width="2"
                        [attr.filter]="island.status === 'bloqueada' ? null : 'url(#neon)'"
                        [class.anim-flotar]="island.current"
                      />
                      <text
                        y="6"
                        text-anchor="middle"
                        font-size="15"
                        [attr.fill]="island.status === 'bloqueada' ? '#8B7BA8' : '#FFFFFF'"
                        style="font-family: var(--font-pixel)"
                      >
                        {{ glyph(island) }}
                      </text>
                    </g>

                    <!-- Labels -->
                    <text
                      [attr.x]="island.c.x"
                      [attr.y]="island.c.y + THICKNESS + LONG_BASE + 26"
                      text-anchor="middle"
                      font-size="15"
                      [attr.fill]="island.status === 'bloqueada' ? '#9A85BD' : '#F3EAFF'"
                      style="font-family: var(--font-title)"
                    >
                      {{ island.u.order }}. {{ island.u.name }}
                    </text>
                    <text
                      [attr.x]="island.c.x"
                      [attr.y]="island.c.y + THICKNESS + LONG_BASE + 44"
                      text-anchor="middle"
                      font-size="9"
                      [attr.fill]="island.status === 'bloqueada' ? '#FF2758' : '#B98CF0'"
                      style="font-family: var(--font-pixel)"
                    >
                      {{ subtitle(island) }}
                    </text>

                  </g>
                }

                <!-- Player avatar: follows the clicked section (visual jump),
                     by default the real 'current' section of progress -->
                @if (avatarIsland(); as island) {
                  <g class="anim-flotar pointer-events-none">
                    <foreignObject
                      class="avatar-jump"
                      [attr.x]="island.c.x - 24"
                      [attr.y]="island.c.y - 62"
                      width="48"
                      height="70"
                    >
                      <ui-avatar-sprite [config]="avatarSrv.avatar()" [height]="64" [shadow]="true" />
                    </foreignObject>
                  </g>
                }
              </svg>

              <!-- Floating Action Dock above the map (Ranking, Badges, Backpack, Center) -->
              <div class="absolute top-3 right-3 z-50 flex items-center gap-2 bg-[#1B1534]/90 p-2 rounded-xl border-2 border-[#8B5CF6]/50 shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  class="btn btn-xs btn-primary ui-font text-[8px] flex items-center gap-1.5 shadow-md"
                  (click)="rankOpen.set(true)"
                  title="Ranking de la cohorte"
                >
                  <span class="text-xs">🏆</span>
                  <span>RANKING</span>
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-secondary ui-font text-[8px] flex items-center gap-1.5 shadow-md"
                  (click)="inventoryModal.set('insignias')"
                  title="Insignias y logros"
                >
                  <span class="text-xs">🏅</span>
                  <span>INSIGNIAS</span>
                </button>
                <button
                  type="button"
                  class="btn btn-xs btn-accent ui-font text-[8px] flex items-center gap-1.5 shadow-md"
                  (click)="inventoryModal.set('equipamiento')"
                  title="Mochila y equipamiento"
                >
                  <span class="text-xs">🎒</span>
                  <span>MOCHILA</span>
                </button>
                <div class="w-px h-4 bg-white/20"></div>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost ui-font text-[8px] flex items-center justify-center border border-white/20 text-white hover:bg-white/20"
                  (click)="fitView()"
                  title="Centrar mapa"
                >
                  ⤢
                </button>
              </div>

              <!-- Selected section card: appears next to the clicked node -->
              @if (sel(); as island) {
                <div
                  #cardSection
                  class="chaflan absolute w-80 border-2 border-primary bg-base-200/95 p-4 backdrop-blur z-50 shadow-2xl"
                  [style.left.px]="cardPos()?.x ?? 16"
                  [style.top.px]="cardPos()?.y ?? 56"
                >
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="title-font text-lg text-primary">{{ island.u.name }}</h3>
                    <button class="btn btn-ghost btn-xs" (click)="sel.set(null)" aria-label="Cerrar ficha">✕</button>
                  </div>
                  <p class="ui-font mt-1 text-[8px] text-accent">{{ subtitle(island) }}</p>

                  <ul class="mt-3 flex flex-col gap-1 text-xs">
                    @for (a of island.u.activities; track a.id) {
                      <li class="flex items-center gap-2">
                        <span class="badge badge-outline badge-xs ui-font text-[7px]">{{ a.type }}</span>
                        <span class="truncate">{{ a.name }}</span>
                      </li>
                    } @empty {
                      <li class="opacity-60">Sin actividades todavía.</li>
                    }
                  </ul>

                  @if (island.status === 'bloqueada') {
                    @if (lockReason(island); as m) {
                      <p class="mt-3 text-xs leading-relaxed text-white/70">
                        🔒 {{ m.pre }}<b class="text-warning">{{ m.highlighted }}</b>{{ m.post }}
                      </p>
                    }
                  } @else {
                    <button
                      class="btn btn-sm btn-primary ui-font mt-3 w-full text-[8px]"
                      (click)="enter(island)"
                    >
                      ▶ ENTRAR A LA UNIDAD
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- B. RIGHT PANEL (Player Stats Sidebar) -->
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

                  <!-- Level + Liquid XP -->
                  <div class="flex items-center gap-3">
                    <span
                      class="pixel-num text-3xl w-14 h-14 flex items-center justify-center rounded-md bg-[#8B5CF6]/25 border border-[#8B5CF6]/50 text-[#C9B6FF] flex-shrink-0"
                    >
                      {{ level() }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-baseline mb-1">
                        <span class="silkscreen text-[9px] text-[#00E5FF]">XP NIVEL</span>
                        <span class="pixel-num text-lg text-[#7FFAFF] leading-none">
                          {{ xpCurrentLevel() }}<span class="text-[#5A5B66]">/1000</span>
                        </span>
                      </div>
                      <div class="xp-track h-5 rounded-full border border-white/5 relative">
                        <div
                          class="xp-liquid absolute inset-y-0 left-0 rounded-full"
                          [style.width.%]="levelPercentage()"
                        ></div>
                        <span
                          class="absolute inset-y-0 left-0 w-full flex items-center justify-center pixel-num text-xs text-[#0D0B1E] font-bold pointer-events-none"
                        >
                          {{ levelPercentage() }}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Lives & Streak (Vertical Stack) -->
                  <div class="flex flex-col gap-3">
                    <!-- Lives -->
                    <div class="relative rounded-xl border border-[#FF2E93]/40 bg-black/40 px-4 py-3 overflow-hidden">
                      <div
                        class="absolute inset-0"
                        style="background: radial-gradient(circle at 20% 0%, rgba(255, 46, 147, 0.18), transparent 65%);"
                      ></div>
                      <span class="silkscreen text-[9px] text-[#FF9CC8] relative">VIDAS</span>
                      <div class="relative flex gap-3 mt-1.5 justify-center">
                        <app-lives [current]="lives()" [size]="26" />
                      </div>
                    </div>

                    <!-- Streak -->
                    <div class="relative rounded-xl border border-[#FFD60A]/40 bg-black/40 px-4 py-3 overflow-hidden">
                      <div
                        class="absolute inset-0"
                        style="background: radial-gradient(circle at 20% 0%, rgba(255, 214, 10, 0.16), transparent 65%);"
                      ></div>
                      <span class="silkscreen text-[9px] text-[#FFE566] relative">RACHA</span>
                      <div class="relative flex items-baseline justify-center gap-2 mt-1.5">
                        <app-pixel-icon [grid]="fireGrid" [colors]="fireColors" [size]="30" class="flame" />
                        <span class="pixel-num text-4xl text-warning leading-none">
                          {{ streakDays() }}
                        </span>
                        <span class="text-[#FFE566] text-sm pixel-num">días</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Progress summary at the bottom of the sidebar -->
                <div class="border-t border-[#8B5CF6]/30 pt-3 mt-4 text-center">
                  <div class="silkscreen text-[9px] text-[#C9B6FF]/70 mb-1">TOTAL XP</div>
                  <div class="pixel-num text-3xl text-primary glow-pink-txt">{{ xp() }}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <!-- 3. LOWER SPEAKER GRID -->
        <footer class="flex items-center justify-center gap-2 h-6 pt-1 bg-[#17181F] border-t-[4px] border-[#23242E]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="mx-2 text-[9px] uppercase tracking-[0.4em] text-[#5A5B66]">EduQuest TV</span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-[#3A3B4A]"></span>
        </footer>

        <!-- MODALS -->
        @if (inventoryModal()) {
          <app-inventory-modal
            [mode]="inventoryModal()!"
            (close)="inventoryModal.set(null)"
          />
        }

        @if (rankOpen()) {
          <app-ranking-panel (close)="rankOpen.set(false)" />
        }
      </div>
    }
  `,
})
export class MapView implements OnDestroy {
  readonly preview = input(false);

  protected readonly store = inject(RoadmapStore);
  protected readonly avatarSrv = inject(AvatarService);
  protected readonly auth = inject(AuthMockService);
  private readonly data = inject(RoadmapDataPort);
  private readonly router = inject(Router);
  private readonly canvas = viewChild<ElementRef<SVGSVGElement>>('lienzo');
  private readonly cardSection = viewChild<ElementRef<HTMLDivElement>>('fichaUnidad');
  private readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapaContenedor');

  /** Position in pixels (relative to the map container) where the
   *  section card is drawn — recalculated when opened, next to the clicked node. */
  protected readonly cardPos = signal<{ x: number; y: number } | null>(null);

  private readonly progress = toSignal(this.data.getProgress('alu-01', COURSE_SEED_ID));

  protected readonly SEMI_WIDTH = SEMI_WIDTH;
  protected readonly SEMI_HEIGHT = SEMI_HEIGHT;
  protected readonly THICKNESS = THICKNESS;
  protected readonly LONG_BASE = LONG_BASE;

  protected readonly fireGrid = FIRE_GRID;
  protected readonly fireColors = FIRE_COLORS;

  protected readonly sel = signal<Island | null>(null);
  protected readonly xp = computed(() => this.progress()?.xpTotal ?? 0);
  protected readonly lives = computed(() => this.progress()?.currentLives ?? 3);
  protected readonly streakDays = signal(10);

  // Level and liquid XP progress calculations
  protected readonly level = computed(() => Math.floor(this.xp() / 1000) + 1);
  protected readonly xpCurrentLevel = computed(() => this.xp() % 1000);
  protected readonly levelPercentage = computed(() =>
    Math.min(100, Math.max(0, Math.round((this.xpCurrentLevel() / 1000) * 100))),
  );

  // Modal states
  readonly rankOpen = signal(false);
  readonly inventoryModal = signal<InventoryMode | null>(null);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.sel()) return;
    const target = event.target as Element | null;
    if (!target) return;
    if (target.closest('.isla-hit')) return;
    const card = this.cardSection()?.nativeElement;
    if (card?.contains(target)) return;
    this.sel.set(null);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.preview()) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      event.preventDefault();

      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowLeft') dx = -70;
      else if (event.key === 'ArrowRight') dx = 70;
      else if (event.key === 'ArrowUp') dy = -50;
      else if (event.key === 'ArrowDown') dy = 50;

      this.panOffset(dx, dy);
    }
  }

  ngOnDestroy(): void {
    this.jumpTimers.forEach((t) => clearTimeout(t));
  }

  private panOffset(dx: number, dy: number): void {
    const v = this.currentView();
    this.view.set({ ...v, x: v.x + dx, y: v.y + dy });
  }

  // ---------- Island and geometry calculation ----------

  protected readonly islands = computed<Island[]>(() => {
    const us = this.store.sections();
    const points = layoutIslands(us.length);
    const complete = new Set(
      (this.progress()?.nodes ?? []).filter((n) => n.status === 'completado').map((n) => n.nodeId),
    );
    const xp = this.xp();

    // Sequential unlocking: besides the XP threshold, a section can only
    // be available if the previous one was already completed at 100% — sections
    // cannot be "skipped" just by having spare XP.
    let previousCompleted = true;
    const items = us.map((u, i): Island => {
      const v = points[i];
      const done = u.activities.filter((a) => complete.has(a.id)).length;
      // "Completed" only looks at the mandatory activities — the optional ones
      // (e.g. "Free practice") must not block unlocking the next section.
      const mandatory = u.activities.filter((a) => a.isMandatory);
      const completed =
        mandatory.length > 0 && mandatory.every((a) => complete.has(a.id));
      const status: IslandStatus = this.preview()
        ? 'disponible'
        : completed
          ? 'completada'
          : xp >= u.xpThreshold && previousCompleted
            ? 'disponible'
            : 'bloqueada';
      previousCompleted = completed;
      return {
        u,
        c: project(v),
        floor: project({ ...v, z: 0 }),
        status,
        current: false,
        done,
        total: u.activities.length,
      };
    });

    if (!this.preview() && items.length > 0) {
      // If no 'disponible' section is left (roadmap 100% complete), the
      // avatar stays on the last section instead of disappearing.
      const current =
        items.find((it) => it.status === 'disponible') ??
        [...items].reverse().find((it) => it.status === 'completada') ??
        items[items.length - 1];
      current.current = true;
    }
    return items;
  });

  protected readonly completed = computed(
    () => this.islands().filter((i) => i.status === 'completada').length,
  );

  /** Section clicked by the player for the avatar's visual jump (purely
   *  aesthetic: it affects neither progress nor which section is the real 'current' one). */
  private readonly positionAvatarId = signal<string | null>(null);

  protected readonly avatarIsland = computed(() => {
    const is = this.islands();
    const id = this.positionAvatarId();
    if (id) {
      const clicked = is.find((i) => i.u.id === id);
      if (clicked) return clicked;
    }
    return is.find((i) => i.current) ?? null;
  });

  private readonly framingBase = computed(() => {
    const pts = this.islands().flatMap((i) => [
      { x: i.c.x - SEMI_WIDTH, y: i.c.y },
      { x: i.c.x + SEMI_WIDTH, y: i.c.y },
      { x: i.c.x, y: i.c.y + THICKNESS + LONG_BASE + 46 },
      { x: i.c.x, y: i.c.y - 136 },
    ]);
    return box(pts, MARGIN);
  });

  private readonly view = signal<{ x: number; y: number; w: number; h: number } | null>(null);

  protected readonly viewBox = computed(() => {
    const b = this.framingBase();
    if (this.preview()) return `${b.x} ${b.y} ${b.width} ${b.height}`;
    const v = this.view() ?? { x: b.x, y: b.y, w: b.width, h: b.height };
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });

  protected readonly pathSegments = computed(() => {
    const is = this.islands();
    return is.slice(0, -1).map((a, i) => {
      const b = is[i + 1];
      const color =
        a.status === 'completada'
          ? 'var(--color-node-done)'
          : a.current || a.status === 'disponible'
            ? 'var(--color-node-open)'
            : 'var(--color-node-locked)';
      return {
        id: `${a.u.id}->${b.u.id}`,
        d: path(a.c, b.c),
        color,
        faint: a.status === 'bloqueada',
      };
    });
  });

  protected readonly grid = computed(() => {
    const b = this.framingBase();
    const x1 = b.x;
    const x2 = b.x + b.width;
    const lines: { a: Point; b: Point }[] = [];

    for (const m of [0.5, -0.5]) {
      const cMin = Math.min(b.y - m * x1, b.y - m * x2);
      const cMax = Math.max(b.y + b.height - m * x1, b.y + b.height - m * x2);
      for (let c = Math.ceil(cMin / TILE_H) * TILE_H; c <= cMax; c += TILE_H) {
        lines.push({ a: { x: x1, y: m * x1 + c }, b: { x: x2, y: m * x2 + c } });
      }
    }
    return lines;
  });

  protected polyCover(i: Island): string {
    return diamond(i.c, SEMI_WIDTH, SEMI_HEIGHT);
  }
  protected polyFace(i: Island, side: 'izq' | 'der'): string {
    return faceLateral(i.c, SEMI_WIDTH, SEMI_HEIGHT, THICKNESS, side);
  }
  protected polyBase(i: Island): string {
    return base(i.c, SEMI_WIDTH, SEMI_HEIGHT, THICKNESS, LONG_BASE);
  }
  protected polyCoverInterior(i: Island): string {
    return diamond(i.c, SEMI_WIDTH * 0.72, SEMI_HEIGHT * 0.72);
  }

  protected crystals(i: Island): { p: string; color: string; op: number }[] {
    const seed = i.u.order * 37;
    const dimmed = i.status === 'bloqueada';
    return Array.from({ length: 3 }, (_, k) => {
      const r1 = frac(Math.sin((seed + k) * 12.9898) * 43758.5453) - 0.5;
      const r2 = frac(Math.sin((seed + k) * 78.233) * 43758.5453) - 0.5;
      const u = r1 * 1.24;
      const v = r2 * (1 - Math.abs(u)) * 1.24;
      const px = i.c.x + (u + v) * SEMI_WIDTH * 0.62;
      const py = i.c.y + (v - u) * SEMI_HEIGHT * 0.62;
      const w = 5 + frac(Math.sin((seed + k) * 31.416) * 43758.5453) * 5;
      const h = 14 + frac(Math.sin((seed + k) * 55.7) * 43758.5453) * 16;
      return {
        p: `${px},${py - h} ${px + w},${py} ${px},${py + w * 0.5} ${px - w},${py}`,
        color: dimmed ? '#1E3A40' : k === 0 ? '#00E5FF' : '#8FE8F5',
        op: dimmed ? 0.75 : 0.9,
      };
    });
  }

  protected fill(e: IslandStatus): string {
    return e === 'completada'
      ? 'var(--color-node-done)'
      : e === 'disponible'
        ? 'var(--color-node-open)'
        : 'var(--color-node-locked)';
  }

  protected border(i: Island): string {
    if (i.current) return '#FFFFFF';
    if (i.status === 'bloqueada') return '#2D164A';
    if (i.status === 'completada') return '#5FB8C4';
    return '#00E5FF';
  }

  protected glyph(i: Island): string {
    return i.status === 'completada' ? '✓' : i.status === 'bloqueada' ? '🔒' : String(i.u.order);
  }

  private previousSection(i: Island): Island | null {
    const is = this.islands();
    const idx = is.findIndex((x) => x.u.id === i.u.id);
    return idx > 0 ? is[idx - 1] : null;
  }

  protected subtitle(i: Island): string {
    if (i.status === 'bloqueada') {
      const previous = this.previousSection(i);
      if (previous && previous.status !== 'completada') return `COMPLETÁ LA UNIDAD ${previous.u.order}`;
      return `XP COSTO: ${i.u.xpThreshold}`;
    }
    if (i.status === 'completada') return 'COMPLETADA';
    return `${i.done}/${i.total} ACTIVIDADES`;
  }

  /** Full message (with more context than `subtitle`) for the section
   *  card when it is locked — split in 3 to highlight the key data. */
  protected lockReason(i: Island): { pre: string; highlighted: string; post: string } {
    const previous = this.previousSection(i);
    if (previous && previous.status !== 'completada') {
      return {
        pre: 'Te falta completar ',
        highlighted: `Unidad ${previous.u.order} · "${previous.u.name}"`,
        post: ' para poder entrar acá.',
      };
    }
    const faltante = Math.max(i.u.xpThreshold - this.xp(), 0);
    return {
      pre: 'Te faltan ',
      highlighted: `${faltante} XP`,
      post: ` para desbloquear esta unidad (cuesta ${i.u.xpThreshold} XP).`,
    };
  }

  protected label(i: Island): string {
    const statusLabel =
      i.status === 'completada' ? 'completada' : i.status === 'bloqueada' ? 'bloqueada' : 'disponible';
    return `Unidad ${i.u.order}: ${i.u.name}, ${statusLabel}. ${this.subtitle(i)}`;
  }

  protected select(i: Island): void {
    if (this.sel()?.u.id === i.u.id) {
      this.sel.set(null);
      return;
    }
    this.sel.set(null);

    if (i.status === 'bloqueada') {
      this.jumpTimers.forEach((t) => clearTimeout(t));
      this.jumpTimers = [];
      this.updateCardPos(i);
      this.sel.set(i);
      return;
    }

    this.jumpTo(i, () => {
      this.updateCardPos(i);
      this.sel.set(i);
    });
  }

  /** Calculates where to draw the card (in pixels, relative to the map
   *  container) from the position of `island` in the SVG, with the current
   *  pan/zoom — it places it next to the node, with the card's fixed width. */
  private updateCardPos(island: Island): void {
    const svg = this.canvas()?.nativeElement;
    const cont = this.mapContainer()?.nativeElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !cont || !ctm) {
      this.cardPos.set(null);
      return;
    }

    const point = svg.createSVGPoint();
    point.x = island.c.x;
    point.y = island.c.y;
    const screen = point.matrixTransform(ctm);
    const contRect = cont.getBoundingClientRect();
    const x = screen.x - contRect.left;
    const y = screen.y - contRect.top;

    const CARD_WIDTH = 320;
    // Clears the island's real width (+ avatar) on screen, not a fixed margin,
    // so the card covers neither the island nor the avatar when zooming.
    const scale = ctm.a;
    const MARGIN = SEMI_WIDTH * scale + 30;
    const entersToRight = x + MARGIN + CARD_WIDTH <= contRect.width;
    const left = entersToRight ? x + MARGIN : Math.max(8, x - MARGIN - CARD_WIDTH);
    const top = Math.min(Math.max(y - 90, 8), Math.max(8, contRect.height - 260));

    this.cardPos.set({ x: left, y: top });
  }

  /** Duration of each hop between consecutive nodes, in ms — slow on purpose
   *  so the movement is noticeable. */
  private static readonly JUMP_MS = 400;
  private jumpTimers: ReturnType<typeof setTimeout>[] = [];

  /** Moves the avatar to `destination` passing through every intermediate section in
   *  order (it never "cuts corners" diagonally) — purely visual. Calls
   *  `onReach` only when the avatar steps on the destination. */
  private jumpTo(destination: Island, onReach?: () => void): void {
    const is = this.islands();
    const originId = this.positionAvatarId() ?? is.find((x) => x.current)?.u.id;
    const iOrigin = is.findIndex((x) => x.u.id === originId);
    const iDestination = is.findIndex((x) => x.u.id === destination.u.id);

    this.jumpTimers.forEach((t) => clearTimeout(t));
    this.jumpTimers = [];

    if (iOrigin === -1 || iDestination === -1 || iOrigin === iDestination) {
      this.positionAvatarId.set(destination.u.id);
      onReach?.();
      return;
    }

    const step = iDestination > iOrigin ? 1 : -1;
    let jump = 0;
    for (let idx = iOrigin + step; ; idx += step) {
      jump += 1;
      const stopId = is[idx].u.id;
      const isLast = idx === iDestination;
      this.jumpTimers.push(
        setTimeout(() => {
          this.positionAvatarId.set(stopId);
          if (isLast) onReach?.();
        }, jump * MapView.JUMP_MS),
      );
      if (isLast) break;
    }
  }

  protected enter(i: Island): void {
    this.router.navigate(['/alumno/unidad', i.u.id]);
  }

  // ---------- Pan and Zoom ----------

  private anchor: { px: number; py: number; vx: number; vy: number } | null = null;
  protected readonly dragging = signal(false);

  protected grab(ev: PointerEvent): void {
    if (this.preview()) return;
    const v = this.currentView();
    this.anchor = { px: ev.clientX, py: ev.clientY, vx: v.x, vy: v.y };
    this.dragging.set(true);
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
  }

  protected move(ev: PointerEvent): void {
    if (!this.anchor) return;
    const lz = this.canvas()?.nativeElement;
    if (!lz) return;
    const boxSvg = lz.getBoundingClientRect();
    const v = this.currentView();
    const scale = v.w / (boxSvg.width || 1);
    this.view.set({
      ...v,
      x: this.anchor.vx - (ev.clientX - this.anchor.px) * scale,
      y: this.anchor.vy - (ev.clientY - this.anchor.py) * scale,
    });
  }

  protected release(ev: PointerEvent): void {
    this.anchor = null;
    this.dragging.set(false);
    (ev.target as Element).releasePointerCapture?.(ev.pointerId);
  }

  protected onWheel(ev: WheelEvent): void {
    if (this.preview()) return;
    ev.preventDefault();
    this.zoom(ev.deltaY < 0 ? 1.12 : 0.89);
  }

  protected zoom(factor: number): void {
    const b = this.framingBase();
    const v = this.currentView();
    const w = Math.min(b.width * 1.6, Math.max(b.width * 0.25, v.w / factor));
    const h = w * (v.h / v.w);
    this.view.set({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h });
  }

  protected fitView(): void {
    this.view.set(null);
  }

  private currentView(): { x: number; y: number; w: number; h: number } {
    const b = this.framingBase();
    return this.view() ?? { x: b.x, y: b.y, w: b.width, h: b.height };
  }
}
