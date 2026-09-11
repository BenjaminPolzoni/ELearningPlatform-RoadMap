import { EstadoNodo } from '../../core/data/roadmap.models';

export type WorldTheme = 'desert' | 'jungle' | 'castle';

export interface QuestionData {
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
}

export interface VerticalChallenge {
  id: number;
  actividadId?: string;
  title: string;
  type: string;
  difficulty: string;
  minutes: number;
  xp: number;
  description: string;
  optional?: boolean;
  recovery?: boolean;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  branchFrom?: [number, number];
  /** Id del stop principal (`stops[branchStopId]`) desde el que arranca la bifurcación hacia este nodo opcional. */
  branchStopId?: number;
  estado?: EstadoNodo;
  completado?: boolean;
}

export interface WorldAppearanceConfig {
  tile: string;
  goal: 'castillo' | 'templo' | 'fortaleza';
  goalName: string;
  setting: string;
  support: string;
  lanes: number[];
}

export const WORLD_APPEARANCE: Record<WorldTheme, WorldAppearanceConfig> = {
  desert: {
    tile: '/mapa_desierto_tile_vertical.png',
    goal: 'castillo',
    goalName: 'Castillo del Conocimiento',
    setting: 'Desierto, oasis y ruinas',
    support: 'Tubería de recuperación',
    lanes: [34, 62, 66, 58, 42, 36, 38, 62, 64, 56, 40, 36],
  },
  jungle: {
    tile: '/mapa_selva_tile.png',
    goal: 'templo',
    goalName: 'Templo de la Sabiduría',
    setting: 'Selva, cascadas y templos',
    support: 'Barril de provisiones',
    lanes: [62, 66, 58, 38, 34, 42, 60, 64, 52, 40, 36, 46],
  },
  castle: {
    tile: '/mapa_castillo_tile.png',
    goal: 'fortaleza',
    goalName: 'Fortaleza de la Noche',
    setting: 'Murallas, criptas y alquimia',
    support: 'Fuente de alquimia',
    lanes: [36, 34, 44, 62, 66, 56, 42, 36, 38, 58, 64, 52],
  },
};

export const WORLD_WIDTH = 1448;
export const CHALLENGE_STEP = 180;

function variation(id: number, salt = 0): number {
  let n = Math.imul(id + salt, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

export const challengeSpacing = (id: number) =>
  CHALLENGE_STEP + [0, 45, 15, 70, 30, 90][variation(id, 7) % 6];

const clampX = (x: number) => Math.max(30, Math.min(70, x));

export interface GeneratedWorld {
  theme: WorldTheme;
  worldWidth: number;
  worldHeight: number;
  mainCount: number;
  stops: [number, number][];
  roads: [number, number][][];
  challenges: VerticalChallenge[];
  questions: Record<number, QuestionData>;
  tile: string;
  goal: string;
  setting: string;
  support: string;
}

export function generateVerticalWorld(
  theme: WorldTheme,
  baseChallenges: VerticalChallenge[],
  customQuestions?: Record<number, QuestionData>,
): GeneratedWorld {
  const appearance = WORLD_APPEARANCE[theme];
  const mainChallenges = baseChallenges.filter((c) => !c.optional);
  const mainCount = mainChallenges.length || 6;

  const ascent = [0];
  for (let id = 1; id <= mainCount; id++) {
    ascent.push(ascent[id - 1] + challengeSpacing(id));
  }
  const worldHeight = ascent[mainCount] + 600;
  const groundY = (id: number) => worldHeight - 150 - ascent[id];

  // Stops: start at index 0 (bottom center) + main nodes
  const stops: [number, number][] = [[50, (groundY(0) / worldHeight) * 100]];
  const lanes = appearance.lanes;

  for (let id = 1; id <= mainCount; id++) {
    const zone = Math.floor((id - 1) / lanes.length);
    const lane = lanes[(id - 1) % lanes.length];
    const x = clampX((zone % 2 ? 100 - lane : lane) + (variation(id, 13) % 7) - 3);
    stops.push([id === mainCount ? 50 : x, (groundY(id) / worldHeight) * 100]);
  }

  // Calculate smooth Bezier roads
  const roads: [number, number][][] = [
    [],
    ...stops.slice(1).map((to, i) => {
      const from = stops[i];
      const dy = to[1] - from[1];
      const bend = variation(i + 1, 29) % 4;
      const slope = (id: number) =>
        id === 0 || id === mainCount
          ? 0
          : (stops[id + 1][0] - stops[id - 1][0]) / (stops[id + 1][1] - stops[id - 1][1]);
      const y1 = [0.48, 0.28, 0.4, 0.3][bend];
      const y2 = [0.7, 0.75, 0.6, 0.8][bend];
      const cx1 = clampX(from[0] + slope(i) * dy * y1);
      const cx2 = clampX(to[0] - slope(i + 1) * dy * (1 - y2));

      return Array.from({ length: 33 }, (_, step) => {
        const t = step / 32;
        const u = 1 - t;
        return [
          u * u * u * from[0] + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * to[0],
          u * u * u * from[1] +
            3 * u * u * t * (from[1] + dy * y1) +
            3 * u * t * t * (from[1] + dy * y2) +
            t * t * t * to[1],
        ] as [number, number];
      });
    }),
  ];

  // Clone challenges and set positions
  const challenges: VerticalChallenge[] = baseChallenges.map((c, i) => {
    if (!c.optional) {
      const stop = stops[c.id] || stops[i + 1] || [50, 50];
      return {
        ...c,
        x: stop[0],
        y: stop[1],
      };
    }
    return { ...c };
  });

  // Position bonus and recovery support branches
  const bonus = challenges.find((c) => c.optional && !c.recovery);
  const recovery = challenges.find((c) => c.recovery);

  const support = (c: VerticalChallenge | undefined, roadId: number) => {
    if (!c) return;
    const origin = roads[roadId] ? roads[roadId][17] : stops[1];
    c.x = origin[0] > 50 ? 76 : 24;
    c.y = origin[1];
    c.branchFrom = origin;
    c.branchStopId = roadId;
  };

  if (bonus) support(bonus, Math.max(1, Math.ceil(mainCount * 0.6)));
  if (recovery) support(recovery, Math.min(2, mainCount));

  if (mainCount <= 3 && bonus && recovery) {
    bonus.x = recovery.x === 24 ? 76 : 24;
    bonus.y = (groundY(mainCount) / worldHeight) * 100;
    bonus.branchFrom = stops[mainCount];
    bonus.branchStopId = mainCount;
  }

  // Load questions
  const questions = customQuestions || defaultQuestions(theme);

  return {
    theme,
    worldWidth: WORLD_WIDTH,
    worldHeight,
    mainCount,
    stops,
    roads,
    challenges,
    questions,
    tile: appearance.tile,
    goal: appearance.goal,
    setting: appearance.setting,
    support: appearance.support,
  };
}

// SVG Artwork for End-Goals
export const castleArt = `<svg viewBox="0 0 240 200" aria-hidden="true" shape-rendering="crispEdges">
  <ellipse cx="120" cy="180" rx="110" ry="13" fill="#775028" opacity=".24"/>
  <path d="M12 170h216v12H12zM24 158h192v14H24z" fill="#b8884d" stroke="#6d462a" stroke-width="3"/>
  <path d="M28 68h44v94H28zM168 68h44v94h-44zM70 93h100v69H70zM94 42h52v62H94z" fill="#dcb679" stroke="#63452d" stroke-width="4"/>
  <path d="M30 72h10v86H30zM96 47h10v54H96zM170 72h10v86h-10zM74 100h8v58h-8z" fill="#ffe2a5"/>
  <path d="M60 72h10v86H60zM136 47h8v51h-8zM200 72h10v86h-10zM158 100h10v58h-10z" fill="#ae7a49"/>
  <path d="m24 68 26-35 26 35zm65-25 31-42 31 42zm75 25 26-35 26 35z" fill="#d95c45" stroke="#773b2d" stroke-width="4"/>
  <path d="m33 58 17-22 5 9-12 13zm68-25 19-27 5 9-13 18zm72 25 17-22 5 9-12 13z" fill="#ff9260"/>
  <path d="M74 86h13v10h13V86h13v10h14V86h13v10h13V86h13v22H74z" fill="#f3d096" stroke="#755434" stroke-width="3"/>
  <path d="M102 165v-31l8-12h20l8 12v31z" fill="#563524" stroke="#9e7040" stroke-width="5"/>
  <path d="M110 164v-28l6-8h9l6 8v28z" fill="#2e2529"/>
  <path d="M43 88h12v22H43zM183 88h12v22h-12zM114 57h12v22h-12z" fill="#5f4430" stroke="#b78b55" stroke-width="3"/>
  <path d="M32 119h34m-34 16h34m-34 16h34m106-32h36m-36 16h36m-36 16h36M80 117h20m40 0h21" stroke="#b28550" stroke-width="3"/>
  <path d="M96 166h48v7H96zM89 174h62v8H89zM80 183h80v8H80z" fill="#ffe1a1" stroke="#a57948" stroke-width="3"/>
  <path d="M50 34V8m140 26V8" stroke="#68432e" stroke-width="3"/>
  <path d="M52 8h24l-6 7 6 7H52zM192 8h24l-6 7 6 7h-24z" fill="#e25c45" stroke="#8f442b" stroke-width="2"/>
</svg>`;

export const templeArt = `<svg viewBox="0 0 240 200" aria-hidden="true" shape-rendering="crispEdges">
  <ellipse cx="120" cy="184" rx="111" ry="12" fill="#153629" opacity=".4"/>
  <path d="M12 162h216v23H12zM30 139h180v23H30zM49 115h142v24H49zM65 89h110v26H65zM77 43h86v47H77z" fill="#938958" stroke="#384d32" stroke-width="4"/>
  <path d="M15 164h210M33 142h174M53 118h134M69 93h102M81 47h77" stroke="#d2c38b" stroke-width="6"/>
  <path d="M100 183V91h40v92z" fill="#b2a577"/>
  <path d="M99 112h42m-42 16h42m-42 16h42m-42 16h42m-42 16h42" stroke="#635e3b" stroke-width="4"/>
  <path d="M104 88V62h32v26z" fill="#263729"/>
  <path d="M73 44V29h93v15zM89 28V15h60v13z" fill="#78824b" stroke="#34472e" stroke-width="4"/>
  <path d="M30 164v-21h14m18-28h15v-21m85-9v21h19m18 38h14v27" fill="none" stroke="#4f8e43" stroke-width="8"/>
  <path d="M82 54h9v15h-9zm67 0h8v15h-8z" fill="#ddb65e"/>
</svg>`;

export const fortressArt = `<svg viewBox="0 0 240 200" aria-hidden="true" shape-rendering="crispEdges">
  <ellipse cx="120" cy="184" rx="111" ry="12" fill="#100f20" opacity=".6"/>
  <path d="M14 164h212v23H14zM25 70h42v94H25zM173 70h42v94h-42zM65 104h110v60H65zM94 42h52v76H94z" fill="#4b506f" stroke="#1b213a" stroke-width="4"/>
  <path d="m20 70 26-48 26 48zm69-28 31-42 31 42zm79 28 26-48 26 48z" fill="#773453" stroke="#211c38" stroke-width="4"/>
  <path d="M32 77h7v83h-7zm70-31h7v63h-7zm79 31h7v83h-7z" fill="#8484a1"/>
  <path d="M103 164v-31l17-19 17 19v31z" fill="#ae4265" stroke="#27233e" stroke-width="5"/>
  <path d="M112 164v-27l8-11 8 11v27z" fill="#251a32"/>
  <path d="M41 91h9v20h-9zm149 0h9v20h-9zm-74-34h8v23h-8z" fill="#ec7181"/>
  <path d="M68 95h12v12h15V95h13v12h24V95h13v12h15V95h12v25H68z" fill="#6e6b88" stroke="#262b44" stroke-width="3"/>
  <path d="M98 166h44v8H98zM89 175h62v9H89zM79 185h82v8H79z" fill="#a07e91" stroke="#3a334f" stroke-width="3"/>
  <path d="M46 20V4m148 16V4" stroke="#9991a8" stroke-width="2"/>
</svg>`;

// Interactive Node SVGs
const questionSvg =
  '<path d="M27 24h16v4h4v12h-4v4h-8v6h-7V39h8v-4h4v-5H27zm1 30h8v7h-8z" fill="#fff0b4" stroke="#915125" stroke-width="2"/>';

const markSvg = (name: 'check' | 'star' | 'heart' | 'bolt' | 'lock', x = 25, y = 33, size = 22) => {
  if (name === 'check')
    return `<path d="M${x + 4} ${y + size / 2} L${x + size / 3} ${y + size - 4} L${x + size - 3} ${y + 4}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
  if (name === 'heart')
    return `<path d="M${x + size / 2} ${y + size - 2} C${x} ${y + size / 2} ${x} ${y + 2} ${x + size / 2} ${y + size / 3} C${x + size} ${y + 2} ${x + size} ${y + size / 2} ${x + size / 2} ${y + size - 2} Z" fill="currentColor"/>`;
  if (name === 'star')
    return `<polygon points="${x + size / 2},${y} ${x + size * 0.65},${y + size * 0.35} ${x + size},${y + size * 0.35} ${x + size * 0.72},${y + size * 0.58} ${x + size * 0.82},${y + size} ${x + size / 2},${y + size * 0.75} ${x + size * 0.18},${y + size} ${x + size * 0.28},${y + size * 0.58} ${x},${y + size * 0.35} ${x + size * 0.35},${y + size * 0.35}" fill="currentColor"/>`;
  if (name === 'bolt')
    return `<polygon points="${x + size * 0.6},${y} ${x + size * 0.2},${y + size * 0.55} ${x + size * 0.5},${y + size * 0.55} ${x + size * 0.4},${y + size} ${x + size * 0.8},${y + size * 0.45} ${x + size * 0.5},${y + size * 0.45}" fill="currentColor"/>`;
  return `<path d="M${x + 4} ${y + 8} h${size - 8} v${size - 10} h-${size - 8} Z M${x + 6} ${y + 8} v-4 a4 4 0 0 1 8 0 v4" fill="currentColor"/>`;
};

const shadowSvg =
  '<ellipse class="object-shadow" cx="36" cy="76" rx="25" ry="6" fill="#221828" opacity=".28"/>';
const sealSvg =
  '<g class="seal-chain" fill="none" stroke="#aca2a5" stroke-width="4"><path d="m14 27 43 35M58 27 13 62" stroke="#392e32" stroke-width="7"/><path d="m14 27 43 35M58 27 13 62" stroke-dasharray="5 3"/><rect x="28" y="36" width="16" height="17" rx="2" fill="#a88246" stroke="#513924" stroke-width="2"/><path d="M33 34v-4h7v4"/><path d="M36 42v6" stroke="#513924"/></g>';

function blockSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  if (final) {
    return `<g class="object-shell"><path d="M14 69h45v8H10v-4h4z" fill="#b2723d" stroke="#694528" stroke-width="2"/><path d="M28 13h5v56h-5z" fill="#fff1c4" stroke="#674528" stroke-width="2"/><path class="object-banner" d="M34 15h28v8H51v10H34z" fill="${status === 'completed' ? '#6bbc77' : '#ea6350'}" stroke="#743c36" stroke-width="2"/><path d="M21 65h19v7H21z" fill="#e1aa57"/><path d="m27 8 4-4 4 4-4 5z" fill="#ffd85d"/></g>`;
  }
  const used = status === 'completed';
  return `<g class="object-shell"><path d="m10 24 10-9h43l-9 9z" fill="${used ? '#c5aa75' : '#fff1a1'}" stroke="#6a3d22" stroke-width="2"/><path d="m54 24 9-9v43l-9 11z" fill="${used ? '#957447' : '#cc7b25'}" stroke="#6a3d22" stroke-width="2"/><path d="M10 24h44v45H10z" fill="${used ? '#ba915a' : status === 'locked' ? '#dc9c39' : '#ffc94b'}" stroke="#6a3d22" stroke-width="3"/><path d="M14 28h35v4H18v31h-4z" fill="${used ? '#debd81' : '#ffe890'}"/><path d="M49 32v32H18v-4h27V32z" fill="#b46d28"/><path d="M16 29h3v3h-3zm29 0h3v3h-3zm-29 31h3v3h-3zm29 0h3v3h-3z" fill="#6a3d22"/>${used ? `<g class="resolved-symbol" color="#fff6cf">${markSvg('check', 24, 36, 21)}</g>` : questionSvg}</g>${status === 'locked' ? sealSvg : ''}`;
}

function barrelSvg(
  status: 'completed' | 'available' | 'locked',
  final = false,
  recovery = false,
): string {
  const used = status === 'completed';
  return `<g class="object-shell"><path d="M18 24h36l5 9 3 22-7 17H17l-7-17 3-22z" fill="${recovery ? '#727e39' : '#ad7038'}" stroke="#4d3421" stroke-width="3"/><path d="M22 27 18 54l4 16m9-43-2 43m12-43 2 43m7-43 6 27-5 16" fill="none" stroke="#754421" stroke-width="2"/><path d="m16 33 4-6h5l-5 25 3 15h-5l-5-15z" fill="#dea954"/><path d="M13 34h46v8H13zM12 58h48v8H12z" fill="${final ? '#e4bf53' : '#a1a19a'}" stroke="#4c4c3d" stroke-width="2"/><path d="M15 35h41v2H15zm0 24h41v2H15z" fill="#e5d8b1"/><g class="object-lid" ${used ? 'transform="translate(2,-10) rotate(-15 36 26)"' : ''}><ellipse cx="36" cy="25" rx="20" ry="8" fill="#d59e55" stroke="#52371f" stroke-width="3"/><ellipse cx="36" cy="25" rx="14" ry="4" fill="${used ? '#664729' : '#b67d3e'}"/><path d="M24 23h25m-23 4h21" stroke="#80532a" stroke-width="2"/></g><g color="${recovery ? '#fa8b8e' : used ? '#e5f6b1' : '#ffdf70'}">${markSvg(recovery ? 'heart' : used ? 'check' : 'bolt', 27, 43, 18)}</g>${final ? '<path d="m22 15-2-11 10 6 6-9 7 9 10-6-3 11z" fill="#ffd35c" stroke="#815526" stroke-width="2"/>' : ''}</g>${status === 'locked' ? sealSvg : ''}`;
}

function portalSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  const used = status === 'completed';
  return `<g class="object-shell"><path d="M9 72h54v7H9zM14 64h44v9H14z" fill="#8b7799" stroke="#33283f" stroke-width="2"/><path d="M14 65V24l7-7V9h10V4h10v5h10v8l7 7v41H47V27l-7-6h-8l-7 6v38z" fill="#64516f" stroke="#2b2438" stroke-width="3"/><path d="M18 25h5v35h-5zM48 25h6v35h-6zM25 13h7v5h-7zm15 0h7v5h-7z" fill="#b7a0bb"/><path d="M25 64V30l7-8h8l7 8v34z" fill="#20182e"/><g class="portal-core"><path d="M28 60V32l6-6h4l6 6v28z" fill="${used ? '#419aaf' : status === 'locked' ? '#633351' : '#d94d88'}"/><path d="M32 57V35l4-5 4 5v22z" fill="${used ? '#b0f4ef' : status === 'locked' ? '#9d5978' : '#ffabc8'}"/><path d="M35 37h3v16h-3z" fill="#fff1e4"/></g><path class="portal-runes" d="m17 32 4 4-4 4m35-8-4 4 4 4M18 51h4m-2-2v4m30-2h4m-2-2v4" fill="none" stroke="${used ? '#92e7e0' : '#e6b073'}" stroke-width="2"/>${final ? '<path d="M10 31 3 19v-8l14 9m45 11 7-12v-8L55 20" fill="#8a7295" stroke="#322739" stroke-width="2"/>' : ''}${used ? `<g color="#defdff">${markSvg('check', 30, 43, 13)}</g>` : ''}</g>${status === 'locked' ? sealSvg : ''}`;
}

function bonusSvg(theme: WorldTheme): string {
  if (theme === 'desert')
    return `<g class="object-shell bonus-object"><path d="M10 69h52v7H10z" fill="#a76d34"/><g color="#ffdc45">${markSvg('star', 13, 13, 46)}</g><path d="M28 30v7m14-7v7" stroke="#6c471f" stroke-width="3"/></g>`;
  if (theme === 'jungle')
    return `<g class="object-shell bonus-object"><path d="M37 9v13m0-8 10-8" stroke="#577b32" stroke-width="5"/><path d="M31 22q-17 30 18 38-19-13-12-35M39 22q-3 34 24 29-20-3-17-30M28 23Q5 40 17 57 14 39 32 29" fill="#ffd64a" stroke="#95712a" stroke-width="3"/><path d="M15 69h44v7H15z" fill="#705234"/></g>`;
  return `<g class="object-shell bonus-object"><path d="M12 69h48v8H12zM20 61h32v9H20z" fill="#83708e" stroke="#362b42" stroke-width="2"/><g class="portal-core"><path d="m36 12 17 15v22L36 61 19 49V27z" fill="#b779c9" stroke="#f4c680" stroke-width="3"/><path d="m36 17 7 13-7 25-7-25z" fill="#f3c8ff"/><path d="m21 29 15 26-7-25z" fill="#9562b4"/></g></g>`;
}

function recoverySvg(theme: WorldTheme, status: 'completed' | 'available' | 'locked'): string {
  if (theme === 'jungle') return barrelSvg(status, false, true);
  if (theme === 'castle')
    return `<g class="object-shell"><path d="M10 72h52v6H10z" fill="#71647f"/><path d="M28 20h16v17l12 16v15H16V53l12-16z" fill="#b8d7d4" stroke="#343346" stroke-width="3"/><path d="M21 51h30v13H21z" fill="#db577f"/><path d="M23 52h24v4H23z" fill="#ffadbf"/><path d="M27 16h18v8H27z" fill="#c39d6d" stroke="#55422f" stroke-width="2"/><path d="M22 49v10" stroke="#f2ffff" stroke-width="3"/><g class="heart-float" color="#fa719c">${markSvg('heart', 27, 1, 18)}</g></g>`;
  return `<g class="object-shell"><path d="M18 40h36v33H18z" fill="#27974e" stroke="#17482a" stroke-width="3"/><path d="M24 42h8v28h-8z" fill="#70df72"/><path d="M46 42h7v30h-7z" fill="#16613d"/><path d="M12 32h48v14H12z" fill="#40bf55" stroke="#17482a" stroke-width="3"/><path d="M15 35h40v4H15z" fill="#94ef83"/><g class="heart-float" color="#f35b76">${markSvg('heart', 24, 3, 25)}</g></g>`;
}

export function nodeArt(
  theme: WorldTheme,
  c: VerticalChallenge,
  status: 'completed' | 'available' | 'locked',
  mainCount: number,
): string {
  const art = c.recovery
    ? recoverySvg(theme, status)
    : c.optional
      ? bonusSvg(theme)
      : theme === 'desert'
        ? blockSvg(status, c.id === mainCount)
        : theme === 'jungle'
          ? barrelSvg(status, c.id === mainCount)
          : portalSvg(status, c.id === mainCount);
  const resolvedBonus =
    c.optional && status === 'completed'
      ? `<g color="#f2ffe2"><circle cx="56" cy="66" r="11" fill="#3c845e" stroke="#d9eeb0" stroke-width="2"/>${markSvg('check', 48, 58, 16)}</g>`
      : '';
  return `<svg class="node-art" viewBox="0 0 72 84" aria-hidden="true">${shadowSvg}${art}${resolvedBonus}<path class="sprite-glint" d="M58 6v12m-6-6h12M8 35v8m-4-4h8" stroke="#fff1b1" stroke-width="2"/></svg>`;
}

export function nodeVerb(
  theme: WorldTheme,
  status: 'completed' | 'available' | 'locked',
): string {
  if (status === 'completed') return 'RESUELTO';
  if (status === 'locked') return theme === 'castle' ? 'SELLADO' : 'CERRADO';
  return theme === 'desert' ? '¡GOLPEA!' : theme === 'jungle' ? '¡ABRE!' : '¡DESPIERTA!';
}

// Scenery SVG generator
const houseSvg = `<ellipse cx="0" cy="38" rx="57" ry="10" fill="#754a30" opacity=".25"/>
<path d="M-36-4h72v39h-72z" fill="#ffe5a0" stroke="#6b422c" stroke-width="4"/>
<path d="M-32 0h8v31h-8zM24 0h9v31h-9z" fill="#d4a467"/>
<path d="M-54-5v-16h9v-16h14v-12h17v-7h28v7h17v12h14v16h9v16z" fill="#ec6849" stroke="#703e2b" stroke-width="4"/>
<path d="M-39-24h14v-15h-14zM-9-44h18v18H-9zM24-17h18v-16H24z" fill="#fff1c6"/>
<path d="M-10 35V14h5V8H7v6h5v21z" fill="#62412e" stroke="#bd844e" stroke-width="3"/>
<path d="M-29 9h10v11h-10zm47 0h10v11H18z" fill="#70bdac" stroke="#8c633c" stroke-width="2"/>
<path d="M-17 36h34v5h-34z" fill="#b9804e"/>`;

const flowerSvg = `<ellipse cx="0" cy="37" rx="32" ry="7" fill="#654531" opacity=".22"/>
<path d="M-21 7h42v29h-42z" fill="#29a353" stroke="#245d32" stroke-width="3"/><path d="M-15 8h9v25h-9z" fill="#8ae477"/>
<path d="M-27 0h54v12h-54z" fill="#4ec467" stroke="#245d32" stroke-width="3"/>
<g class="desert-flower"><path d="M0 0v-30m0 16-15-9m15 2 15-9" fill="none" stroke="#30884a" stroke-width="6"/>
<path d="M-20-51h30v6h10v23H10v6h-25v-7h-8v-19h3z" fill="#e75c4b" stroke="#793e2d" stroke-width="3"/>
<path d="M5-41h17v12H5z" fill="#fff0c1"/><path d="M10-36h12" stroke="#70402d" stroke-width="3"/>
<path d="M-15-45h6v6h-6zm-2 16h6v6h-6zm16-18h5v5h-5z" fill="#ffe7bf"/></g>`;

const bricksSvg = `<ellipse cx="0" cy="31" rx="48" ry="8" fill="#76502f" opacity=".2"/>
<path d="M-45-10h90v36h-90zM-15-45h30v35h-30z" fill="#c9783b" stroke="#794729" stroke-width="3"/>
<path d="M-42-7h84M-42 9h84M-42 24h84M-12-42h24M-12-26h24M-15-8V9M15-8V9M-30 10v14M0 10v14M30 10v14M0-42v16" stroke="#f0b766" stroke-width="3"/>
<path d="M-17-63v-10h7v-7h20v7h7v10H7v9H-7v-9z" fill="#ef7354" stroke="#75432a" stroke-width="2"/><path d="M-6-77h10v9H-6z" fill="#ffedc0"/>`;

const cloudSvg = `<path d="M-42 4v-13h13v-12h20v-8h23v9h16v11h13V8h-85z" fill="#fff5d9" stroke="#deb978" stroke-width="3"/><path d="M-32 7h66v5h-66z" fill="#dcab69" opacity=".35"/>`;
const coinSvg = `<path d="M-6-14H6v4h4v20H6v4H-6v-4h-4v-20h4z" fill="#ffd950" stroke="#a86627" stroke-width="2"/><path d="M-4-10h5v20h-5z" fill="#fff4a5"/><path d="M5-8v16" stroke="#d9992f" stroke-width="2"/>`;
const bananaSvg =
  '<path d="M-12-20Q-26 15 9 24L23 14Q-1 18 0-17z" fill="#ffdc54" stroke="#95702c" stroke-width="3"/><path d="M-11-18Q-16 9 8 17" fill="none" stroke="#fff194" stroke-width="4"/><path d="M-13-20h13" stroke="#546a31" stroke-width="5"/>';
const crystalSvg =
  '<path d="m0-22 13 13v24L0 26-13 15V-9z" fill="#a776d4" stroke="#e1b594" stroke-width="2"/><path d="m0-19 6 11L0 22-6-8z" fill="#ecc1ff"/>';
const totemSvg =
  '<path d="M-34 39h68v9h-68zM-24-37h48v76h-48z" fill="#8c9560" stroke="#30442e" stroke-width="4"/><path d="M-19-30h38v12h-38z" fill="#c3c084"/><path d="M-15-9h10v10h-10zM5-9h10v10H5zM-11 16h22v7h-22z" fill="#36472d"/><path d="M-20 28h8v10h-8zm26-64h10v14H6z" fill="#53a04e"/>';
const torchSvg =
  '<path d="M-22 42h44v8h-44zM-10-7h20v48h-20z" fill="#74718a" stroke="#292c43" stroke-width="3"/><path d="M-18-11h36v9h-36z" fill="#ab9070"/><g class="torch-flame"><path d="M-15-14v-17l9-14 5 9 6-22 11 27v17z" fill="#ed8653" stroke="#a74744" stroke-width="2"/><path d="M-7-15v-15l7-12 7 22v5z" fill="#ffe396"/></g>';

export function renderWorldScenery(world: GeneratedWorld, completedIds: number[] = []): string {
  const { theme, worldWidth, worldHeight, roads, mainCount, challenges } = world;
  const px = ([x, y]: [number, number]) => [
    (x * worldWidth) / 100,
    (y * worldHeight) / 100,
  ];
  // El tramo que lleva al nodo `id` ya fue recorrido (y sus monedas quedan "prendidas") en
  // cuanto se completa el nodo anterior — el primer tramo arranca prendido, es el punto de
  // partida. Camino interno = binario por nodo completado, no hay XP por nodo para un gradiente.
  const lit = (id: number) => id === 1 || completedIds.includes(id - 1);
  const items: string[] = [];

  if (theme === 'desert') {
    for (let id = 1; id <= mainCount; id += 2) {
      if (!roads[id]) continue;
      const litClass = lit(id) ? '' : ' unlit';
      [7, 13, 20].forEach((index, j) => {
        if (roads[id][index]) {
          const [x, y] = px(roads[id][index]);
          items.push(
            `<g class="trail-coin${litClass}" style="--delay:-${j * 0.4}s" transform="translate(${x} ${y})"><g>${coinSvg}</g></g>`,
          );
        }
      });
    }
    const recovery = challenges.find((c) => c.recovery);
    if (recovery) {
      const [hx, hy] = px([recovery.x, recovery.y]);
      items.push(`<g class="mushroom-house" transform="translate(${hx} ${hy - 133})">${houseSvg}</g>`);
    }
    for (let id = 3; id <= mainCount; id += 3) {
      if (!roads[id] || !roads[id][16]) continue;
      const [x, y] = px(roads[id][16]);
      const decorX = worldWidth * (x > worldWidth / 2 ? 0.3 : 0.7);
      items.push(`<g transform="translate(${decorX} ${y})">${id % 2 ? bricksSvg : flowerSvg}</g>`);
      if (id % 6 === 3) {
        items.push(
          `<g class="desert-cloud" transform="translate(${worldWidth * (x > worldWidth / 2 ? 0.8 : 0.2)} ${y - 110})"><g>${cloudSvg}</g></g>`,
        );
      }
    }
  } else {
    for (let id = 1; id <= mainCount; id += 2) {
      if (!roads[id]) continue;
      const litClass = lit(id) ? '' : ' unlit';
      [8, 16, 23].forEach((step, j) => {
        if (roads[id][step]) {
          const [x, y] = px(roads[id][step]);
          items.push(
            `<g class="trail-coin${litClass}" style="--delay:-${j * 0.4}s" transform="translate(${x} ${y})"><g>${theme === 'jungle' ? bananaSvg : crystalSvg}</g></g>`,
          );
        }
      });
    }
    for (let id = 2; id <= mainCount; id += 3) {
      if (!roads[id] || !roads[id][16]) continue;
      const [x, y] = px(roads[id][16]);
      const side = x > 50 ? 30 : 70;
      items.push(
        `<g transform="translate(${(side / 100) * worldWidth} ${y})">${theme === 'jungle' ? totemSvg : torchSvg}</g>`,
      );
    }
  }

  return `<svg class="desert-scenery" viewBox="0 0 ${worldWidth} ${worldHeight}" preserveAspectRatio="none" aria-hidden="true">${items.join('')}</svg>`;
}

export function defaultQuestions(theme: WorldTheme): Record<number, QuestionData> {
  if (theme === 'jungle') {
    return {
      1: {
        pregunta: '¿Qué estructura permite repetir instrucciones varias veces?',
        opciones: ['Un bucle (loop)', 'Un comentario', 'Un tipo de dato booleano'],
        correcta: 0,
        explicacion: 'Un bucle ejecuta un bloque de instrucciones de manera repetida bajo una condición.',
      },
      2: {
        pregunta: 'Saltas 3 veces y ganas 2 bananas en cada salto. ¿Cuántas consigues?',
        opciones: ['3 bananas', '5 bananas', '6 bananas'],
        correcta: 2,
        explicacion: '3 repeticiones × 2 bananas = 6 bananas acumuladas.',
      },
      3: {
        pregunta: 'Un contador empieza en 0 y aumenta 1 en cada una de 4 vueltas. ¿Cuánto vale al final?',
        opciones: ['0', '4', '5'],
        correcta: 1,
        explicacion: 'Tras cuatro incrementos unitarios consecutivos, el contador finaliza en 4.',
      },
      4: {
        pregunta: 'El puente tiene 5 tablas. ¿Qué límite de pasos evita sobrepasarlo?',
        opciones: ['5', '6', '10'],
        correcta: 0,
        explicacion: 'Limitar la repetición exactamente a 5 pasos evita salir de los límites.',
      },
      5: {
        pregunta: '¿Cuándo continúa ejecutándose un bucle while?',
        opciones: [
          'Mientras su condición lógica sea verdadera',
          'Siempre, aunque la condición sea falsa',
          'Solo cuando la lista está vacía',
        ],
        correcta: 0,
        explicacion: 'while evalúa su condición al inicio de cada iteración y sigue mientras sea verdadera.',
      },
      6: {
        pregunta: '¿Qué estructura guarda una colección de elementos ordenados?',
        opciones: ['Una lista o arreglo', 'Una constante numérica', 'Un operador relacional'],
        correcta: 0,
        explicacion: 'Un arreglo o lista almacena múltiples elementos de forma secuencial.',
      },
      7: {
        pregunta: 'La lista tiene 3 provisiones y añades 1 más con append. ¿Cuántas tiene ahora?',
        opciones: ['2', '3', '4'],
        correcta: 2,
        explicacion: 'Al agregar un nuevo elemento, la longitud de la lista se incrementa en 1.',
      },
      8: {
        pregunta: 'En un arreglo con índice base 0, ¿cuál es la posición del segundo elemento?',
        opciones: ['0', '1', '2'],
        correcta: 1,
        explicacion: 'Los índices en base cero asignan 0 al primer elemento y 1 al segundo.',
      },
    };
  }

  if (theme === 'castle') {
    return {
      1: {
        pregunta: '¿Qué principio ayuda a mantener un programa modular y comprensible?',
        opciones: [
          'Agrupar datos y comportamientos relacionados en clases u objetos',
          'Escribir todo en una única función gigante',
          'Evitar poner nombres descriptivos a las variables',
        ],
        correcta: 0,
        explicacion: 'La encapsulación y modularidad facilitan el mantenimiento y la lectura del código.',
      },
      2: {
        pregunta: 'Un objeto Jugador tiene nombre y vidas. ¿Qué representan estos datos?',
        opciones: ['Propiedades o atributos', 'Bucles infinitos', 'Comentarios'],
        correcta: 0,
        explicacion: 'Los atributos o propiedades almacenan el estado interno de un objeto.',
      },
      3: {
        pregunta: '¿Qué es un método dentro de un objeto?',
        opciones: [
          'Una función asociada al comportamiento del objeto',
          'Un tipo de imagen en pixel art',
          'Una variable global inmutable',
        ],
        correcta: 0,
        explicacion: 'Un método define una acción o comportamiento que el objeto puede realizar.',
      },
      4: {
        pregunta: 'Si una función calcula mal un total sin lanzar excepciones, ¿qué error ocurre?',
        opciones: ['Error lógico', 'Error de compilación de sintaxis', 'Ninguno'],
        correcta: 0,
        explicacion: 'Un error de lógica produce un resultado incorrecto aun cuando la sintaxis sea válida.',
      },
      5: {
        pregunta: 'Una prueba unitaria espera 5 pero la función devuelve 4. ¿Qué indica?',
        opciones: ['Fallo en la aserción', 'Éxito rotundo', 'Que el test debe ser eliminado'],
        correcta: 0,
        explicacion: 'El test falla porque el valor devuelto no coincide con el resultado esperado.',
      },
      6: {
        pregunta: '¿Qué caso límite es fundamental probar en una función de promedio?',
        opciones: ['Una lista vacía', 'Un número par', 'El nombre del archivo fuente'],
        correcta: 0,
        explicacion: 'Una lista vacía puede causar una división por cero si no se valida.',
      },
    };
  }

  // Default: Desert
  return {
    1: {
      pregunta: '¿Qué es un programa informático?',
      opciones: [
        'Un conjunto ordenado de instrucciones que una computadora puede ejecutar',
        'Solo un dibujo estático en la pantalla',
        'Un componente de hardware externo',
      ],
      correcta: 0,
      explicacion: 'Un programa es una secuencia lógica de pasos que la computadora interpreta y procesa.',
    },
    2: {
      pregunta: 'Para resolver un problema complejo de programación, conviene…',
      opciones: [
        'Dividirlo en subproblemas más pequeños y manejables',
        'Escribir código sin planificar',
        'Ignorar las pruebas y validaciones',
      ],
      correcta: 0,
      explicacion: 'La descomposición es una de las habilidades fundamentales del pensamiento computacional.',
    },
    3: {
      pregunta: '¿Qué caracteriza a un algoritmo?',
      opciones: [
        'Pasos precisos y finitos para resolver un problema',
        'Instrucciones elegidas al azar',
        'Una única operación matemática simple',
      ],
      correcta: 0,
      explicacion: 'Un algoritmo es una secuencia finita de pasos bien definidos orientados a un fin.',
    },
    4: {
      pregunta: '¿Para qué sirve una variable en un lenguaje de programación?',
      opciones: [
        'Para almacenar y referenciar un dato en memoria mediante un identificador',
        'Para colorear los botones de la interfaz',
        'Para reiniciar la máquina automáticamente',
      ],
      correcta: 0,
      explicacion: 'Las variables permiten guardar información que puede ser leída o modificada luego.',
    },
    5: {
      pregunta: '¿Cuál de los siguientes es un valor de tipo booleano?',
      opciones: ['true (verdadero)', '"desierto"', '42'],
      correcta: 0,
      explicacion: 'El tipo booleano solo puede tener dos estados lógicos: true o false.',
    },
    6: {
      pregunta: 'Si monedas = 3 y obtienes 4 más, ¿qué expresión calcula el total?',
      opciones: ['3 + 4', '3 > 4', '3 == 4'],
      correcta: 0,
      explicacion: 'El operador de suma aritmética + calcula el acumulado total: 7.',
    },
    7: {
      pregunta: '¿Cuál es el resultado de la expresión condicional 10 >= 5?',
      opciones: ['true (verdadero)', 'false (falso)', 'null'],
      correcta: 0,
      explicacion: '10 es mayor o igual que 5, por lo que la comparación relacional es verdadera.',
    },
    8: {
      pregunta: 'El cofre se abre si monedas >= 10. Tienes 12 monedas. ¿Qué ocurre?',
      opciones: [
        'La condición se cumple y el cofre se desbloquea',
        'El cofre permanece cerrado',
        'Se pierden todas las monedas',
      ],
      correcta: 0,
      explicacion: '12 es mayor que 10, de modo que la rama condicional se evalúa como verdadera.',
    },
  };
}
