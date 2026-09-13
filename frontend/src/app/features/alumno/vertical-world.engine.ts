import { EstadoNodo } from '../../core/data/roadmap.models';

export type WorldTheme = 'desert' | 'jungle' | 'castle' | 'snow' | 'nether';

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
  goal: string;
  goalName: string;
  setting: string;
  support: string;
  lanes: number[];
}

export const WORLD_APPEARANCE: Record<WorldTheme, WorldAppearanceConfig> = {
  desert: {
    tile: '/desierto_animado.gif',
    goal: 'piramide',
    goalName: 'Gran Pirámide del Saber',
    setting: 'Desierto, oasis y ruinas',
    support: 'Tubería de recuperación',
    lanes: [34, 62, 66, 58, 42, 36, 38, 62, 64, 56, 40, 36],
  },
  jungle: {
    tile: '/selva_animada.gif',
    goal: 'templo',
    goalName: 'Templo de la Sabiduría',
    setting: 'Selva, cascadas y templos',
    support: 'Barril de provisiones',
    lanes: [62, 66, 58, 38, 34, 42, 60, 64, 52, 40, 36, 46],
  },
  castle: {
    tile: '/cementerio_animado.gif',
    goal: 'castillo',
    goalName: 'Castillo de la Noche',
    setting: 'Murallas, criptas y alquimia',
    support: 'Fuente de alquimia',
    lanes: [36, 34, 44, 62, 66, 56, 42, 36, 38, 58, 64, 52],
  },
  snow: {
    tile: '/bioma_taiga.jpg',
    goal: 'refugio',
    goalName: 'Refugio de la Taiga Nevada',
    setting: 'Taiga, pinos y cumbres heladas',
    support: 'Hoguera del refugio',
    lanes: [22, 34, 76, 86, 64, 30, 16, 44, 78, 66, 38, 20],
  },
  nether: {
    tile: '/nether_animado.gif',
    goal: 'fortaleza',
    goalName: 'Fortaleza Infernal de Magma',
    setting: 'Nether, basaltos y ríos de lava',
    support: 'Caldero de magma',
    lanes: [36, 64, 58, 40, 32, 48, 68, 62, 44, 34, 54, 60],
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

const clampX = (x: number) => Math.max(16, Math.min(84, x));

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

function makePixelRoadSegment(
  from: [number, number],
  to: [number, number],
  worldWidth: number,
  worldHeight: number,
): [number, number][] {
  const fx = (from[0] / 100) * worldWidth;
  const fy = (from[1] / 100) * worldHeight;
  const tx = (to[0] / 100) * worldWidth;
  const ty = (to[1] / 100) * worldHeight;

  const turnX = tx;
  const goRight = turnX > fx;
  const cornerR = Math.min(32, Math.abs(turnX - fx) * 0.4, Math.abs(ty - fy) * 0.4);

  const pts: [number, number][] = [];

  // Tramo 1: Desplazamiento lateral inicial hacia el eje del codo (puntos 0..10)
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const targetX = goRight ? turnX - cornerR : turnX + cornerR;
    pts.push([
      ((fx + (targetX - fx) * t) / worldWidth) * 100,
      (fy / worldHeight) * 100,
    ]);
  }

  // Tramo 2: Curva cerrada en el codo (puntos 11..21)
  const p0x = goRight ? turnX - cornerR : turnX + cornerR;
  const p0y = fy;
  const p1y = fy - cornerR;
  for (let i = 1; i <= 11; i++) {
    const t = i / 11;
    const u = 1 - t;
    pts.push([
      ((u * u * p0x + 2 * u * t * turnX + t * t * turnX) / worldWidth) * 100,
      ((u * u * p0y + 2 * u * t * p0y + t * t * p1y) / worldHeight) * 100,
    ]);
  }

  // Tramo 3: Ascenso vertical hacia el nodo destino (puntos 22..32)
  const startY = fy - cornerR;
  for (let i = 1; i <= 11; i++) {
    const t = i / 11;
    pts.push([
      (turnX / worldWidth) * 100,
      ((startY + (ty - startY) * t) / worldHeight) * 100,
    ]);
  }

  return pts;
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

  // Caminos pixel art con curvas cerradas que aprovechan el ancho del mapa
  const roads: [number, number][][] = [
    [],
    ...stops.slice(1).map((to, i) =>
      makePixelRoadSegment(stops[i], to, WORLD_WIDTH, worldHeight),
    ),
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

// 32x32 / 16x16 Pixel Art SVG Artwork for Biome End-Goals
export const pyramidGoalArt = `<img src="/piramide.svg" class="w-full h-full object-contain pixelated" />`;
export const templeGoalArt = `<img src="/templo.svg" class="w-full h-full object-contain pixelated" />`;
export const castleGoalArt = `<img src="/castillo.svg" class="w-full h-full object-contain pixelated" />`;
export const fortressGoalArt = `<img src="/fortress.svg" class="w-full h-full object-contain pixelated" />`;
export const lodgeGoalArt = `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
  <!-- Sombra en nieve -->
  <rect x="0" y="15" width="16" height="1" fill="#334155" opacity="0.3"/>
  <!-- Cúpula de hielo escalonada -->
  <rect x="2" y="11" width="12" height="4" fill="#CBD5E1"/>
  <rect x="3" y="8" width="10" height="3" fill="#E2E8F0"/>
  <rect x="5" y="5" width="6" height="3" fill="#F1F5F9"/>
  <rect x="6" y="4" width="4" height="1" fill="#FFFFFF"/>
  <!-- Líneas de corte de bloques de hielo -->
  <rect x="2" y="11" width="12" height="1" fill="#94A3B8"/>
  <rect x="3" y="8" width="10" height="1" fill="#94A3B8"/>
  <rect x="5" y="5" width="6" height="1" fill="#94A3B8"/>
  <rect x="5" y="12" width="1" height="3" fill="#94A3B8"/>
  <rect x="10" y="12" width="1" height="3" fill="#94A3B8"/>
  <rect x="7" y="9" width="1" height="2" fill="#94A3B8"/>
  <!-- Entrada túnel -->
  <rect x="6" y="11" width="4" height="4" fill="#94A3B8"/>
  <rect x="7" y="12" width="2" height="3" fill="#1E293B"/>
  <!-- Chimenea humeante -->
  <rect x="10" y="2" width="2" height="3" fill="#475569"/>
  <rect x="11" y="0" width="2" height="1" fill="#F8FAFC"/>
  <rect x="10" y="1" width="1" height="1" fill="#E2E8F0"/>
</svg>`;

// Sprite retro de conector/aro de camino 16x16 (estilo SMB3)
export const roadJointSvg = (theme: WorldTheme = 'desert') => {
  const border =
    theme === 'jungle'
      ? '#201103'
      : theme === 'castle'
        ? '#1B1329'
        : theme === 'snow'
          ? '#1E293B'
          : theme === 'nether'
            ? '#1D1E26'
            : '#382008';
  const fill =
    theme === 'jungle'
      ? '#D5A86A'
      : theme === 'castle'
        ? '#6A587D'
        : theme === 'snow'
          ? '#CBD5E1'
          : theme === 'nether'
            ? '#353745'
            : '#F6D58C';
  const highlight =
    theme === 'jungle'
      ? '#FAE5B6'
      : theme === 'castle'
        ? '#C4B4D8'
        : theme === 'snow'
          ? '#FFFFFF'
          : theme === 'nether'
            ? '#F25500'
            : '#FFEAA7';
  const core =
    theme === 'jungle'
      ? '#8B5A2B'
      : theme === 'castle'
        ? '#3D325C'
        : theme === 'snow'
          ? '#64748B'
          : theme === 'nether'
            ? '#5A0E16'
            : '#D97706';

  return `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
    <!-- Anillo exterior -->
    <rect x="2" y="1" width="12" height="14" fill="${border}"/>
    <rect x="1" y="2" width="14" height="12" fill="${border}"/>
    <!-- Relleno del camino -->
    <rect x="3" y="2" width="10" height="12" fill="${fill}"/>
    <rect x="2" y="3" width="12" height="10" fill="${fill}"/>
    <!-- Brillo superior izquierdo -->
    <rect x="4" y="3" width="8" height="2" fill="${highlight}"/>
    <rect x="3" y="4" width="2" height="8" fill="${highlight}"/>
    <!-- Núcleo central -->
    <rect x="6" y="6" width="4" height="4" fill="${core}"/>
    <rect x="7" y="7" width="2" height="2" fill="#FFFFFF"/>
  </svg>`;
};

// Sprite pixel art 16x16 para poste de START
export const startSignSvg = `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
  <!-- Postes de madera -->
  <rect x="3" y="10" width="2" height="6" fill="#78350F"/>
  <rect x="11" y="10" width="2" height="6" fill="#78350F"/>
  <!-- Placa base -->
  <rect x="1" y="3" width="14" height="8" fill="#18181B"/>
  <rect x="2" y="4" width="12" height="6" fill="#DC2626"/>
  <rect x="3" y="5" width="10" height="4" fill="#FFFFFF"/>
  <!-- Letras S T A R T en pixel art -->
  <rect x="4" y="6" width="1" height="2" fill="#18181B"/>
  <rect x="6" y="6" width="1" height="2" fill="#18181B"/>
  <rect x="8" y="6" width="1" height="2" fill="#18181B"/>
  <rect x="10" y="6" width="1" height="2" fill="#18181B"/>
</svg>`;

// Aliases para compatibilidad hacia atrás
export const castleArt = castleGoalArt;
export const templeArt = templeGoalArt;
export const fortressArt = fortressGoalArt;
export const lodgeArt = lodgeGoalArt;

// Pixel art helpers
const pixelCheckSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 6}" y="${y + 10}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 10}" y="${y + 14}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 14}" y="${y + 10}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 18}" y="${y + 6}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 22}" y="${y + 2}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 4}" y="${y + 8}" width="2" height="4" fill="#22C55E"/><rect x="${x + 8}" y="${y + 12}" width="2" height="4" fill="#22C55E"/><rect x="${x + 12}" y="${y + 8}" width="2" height="4" fill="#22C55E"/><rect x="${x + 16}" y="${y + 4}" width="2" height="4" fill="#22C55E"/><rect x="${x + 20}" y="${y}" width="2" height="4" fill="#22C55E"/></g>`;

const pixelQuestionSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 4}" y="${y}" width="12" height="4" fill="#FFFFFF"/><rect x="${x + 12}" y="${y + 4}" width="4" height="6" fill="#FFFFFF"/><rect x="${x + 8}" y="${y + 10}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 8}" y="${y + 16}" width="4" height="4" fill="#FFFFFF"/><rect x="${x + 2}" y="${y + 2}" width="2" height="4" fill="#FFFFFF"/><rect x="${x + 4}" y="${y + 2}" width="10" height="2" fill="#D97706"/><rect x="${x + 10}" y="${y + 4}" width="4" height="4" fill="#D97706"/><rect x="${x + 8}" y="${y + 10}" width="2" height="2" fill="#D97706"/><rect x="${x + 8}" y="${y + 16}" width="2" height="2" fill="#D97706"/></g>`;

const pixelLockSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 4}" y="${y + 6}" width="14" height="12" fill="#475569"/><rect x="${x + 6}" y="${y + 8}" width="10" height="8" fill="#94A3B8"/><rect x="${x + 10}" y="${y + 10}" width="2" height="4" fill="#0F172A"/><rect x="${x + 7}" y="${y}" width="8" height="6" fill="#334155"/><rect x="${x + 9}" y="${y + 2}" width="4" height="4" fill="#0F172A"/></g>`;

const pixelHeartSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 2}" y="${y}" width="6" height="4" fill="#F43F5E"/><rect x="${x + 10}" y="${y}" width="6" height="4" fill="#F43F5E"/><rect x="${x}" y="${y + 2}" width="18" height="8" fill="#F43F5E"/><rect x="${x + 2}" y="${y + 10}" width="14" height="4" fill="#F43F5E"/><rect x="${x + 4}" y="${y + 14}" width="10" height="3" fill="#E11D48"/><rect x="${x + 6}" y="${y + 17}" width="6" height="2" fill="#BE123C"/><rect x="${x + 8}" y="${y + 19}" width="2" height="2" fill="#881337"/><rect x="${x + 4}" y="${y + 2}" width="2" height="3" fill="#FFF1F2"/></g>`;

const pixelStarSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 8}" y="${y}" width="4" height="4" fill="#FDE047"/><rect x="${x + 6}" y="${y + 4}" width="8" height="4" fill="#FACC15"/><rect x="${x}" y="${y + 6}" width="20" height="4" fill="#FACC15"/><rect x="${x + 2}" y="${y + 10}" width="16" height="4" fill="#EAB308"/><rect x="${x + 4}" y="${y + 14}" width="12" height="4" fill="#CA8A04"/><rect x="${x + 2}" y="${y + 18}" width="4" height="4" fill="#A16207"/><rect x="${x + 14}" y="${y + 18}" width="4" height="4" fill="#A16207"/><rect x="${x + 8}" y="${y + 2}" width="2" height="2" fill="#FFFFFF"/></g>`;

const pixelSnowflakeSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 8}" y="${y}" width="4" height="20" fill="#E0F2FE"/><rect x="${x}" y="${y + 8}" width="20" height="4" fill="#E0F2FE"/><rect x="${x + 4}" y="${y + 4}" width="4" height="4" fill="#BAE6FD"/><rect x="${x + 12}" y="${y + 4}" width="4" height="4" fill="#BAE6FD"/><rect x="${x + 4}" y="${y + 12}" width="4" height="4" fill="#BAE6FD"/><rect x="${x + 12}" y="${y + 12}" width="4" height="4" fill="#BAE6FD"/><rect x="${x + 8}" y="${y + 8}" width="4" height="4" fill="#FFFFFF"/></g>`;

const pixelFlameSvg = (x: number, y: number) =>
  `<g shape-rendering="crispEdges"><rect x="${x + 8}" y="${y}" width="4" height="6" fill="#FBBF24"/><rect x="${x + 6}" y="${y + 6}" width="8" height="8" fill="#F97316"/><rect x="${x + 4}" y="${y + 14}" width="12" height="6" fill="#EF4444"/><rect x="${x + 8}" y="${y + 6}" width="4" height="6" fill="#FFFBEB"/></g>`;

const shadowSvg =
  '<ellipse class="object-shadow" cx="36" cy="76" rx="25" ry="6" fill="#221828" opacity=".35"/>';

function blockSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  const used = status === 'completed';
  return `<g class="object-shell" shape-rendering="crispEdges">
    <!-- Sombra base solida -->
    <rect x="14" y="68" width="44" height="6" fill="#42250F"/>
    <!-- Bloque pixelado 40x40 -->
    <rect x="16" y="24" width="40" height="44" fill="#2D1704"/>
    <!-- Bisel exterior -->
    <rect x="18" y="26" width="36" height="40" fill="${used ? '#8D6E40' : status === 'locked' ? '#B37D28' : '#F59E0B'}"/>
    <!-- Highlight superior e izquierdo -->
    <rect x="18" y="26" width="36" height="4" fill="${used ? '#B59868' : status === 'locked' ? '#D99B38' : '#FDE68A'}"/>
    <rect x="18" y="26" width="4" height="40" fill="${used ? '#B59868' : status === 'locked' ? '#D99B38' : '#FDE68A'}"/>
    <!-- Sombra inferior y derecha -->
    <rect x="18" y="62" width="36" height="4" fill="${used ? '#624B25' : status === 'locked' ? '#8C5615' : '#D97706'}"/>
    <rect x="50" y="26" width="4" height="40" fill="${used ? '#624B25' : status === 'locked' ? '#8C5615' : '#D97706'}"/>
    <!-- Centro del bloque -->
    <rect x="22" y="30" width="28" height="32" fill="${used ? '#7D5F33' : status === 'locked' ? '#9E6A1E' : '#FBBF24'}"/>
    <!-- Tornillos/remaches en 4 esquinas -->
    <rect x="20" y="28" width="3" height="3" fill="#382008"/>
    <rect x="49" y="28" width="3" height="3" fill="#382008"/>
    <rect x="20" y="61" width="3" height="3" fill="#382008"/>
    <rect x="49" y="61" width="3" height="3" fill="#382008"/>
    <rect x="20" y="28" width="1" height="1" fill="#FFFBEB"/>
    <rect x="49" y="28" width="1" height="1" fill="#FFFBEB"/>
    <!-- Simbolo central -->
    ${used ? pixelCheckSvg(22, 34) : status === 'locked' ? pixelLockSvg(24, 34) : pixelQuestionSvg(24, 34)}
  </g>`;
}

function barrelSvg(
  status: 'completed' | 'available' | 'locked',
  final = false,
  recovery = false,
): string {
  const used = status === 'completed';
  return `<g class="object-shell" shape-rendering="crispEdges">
    <!-- Sombra base -->
    <rect x="14" y="68" width="44" height="6" fill="#1C2E14"/>
    <!-- Contorno barril pixelado -->
    <rect x="20" y="22" width="32" height="46" fill="#201103"/>
    <rect x="16" y="26" width="40" height="38" fill="#201103"/>
    <rect x="14" y="32" width="44" height="26" fill="#201103"/>
    <!-- Duelas de madera (cuerpo) -->
    <rect x="16" y="28" width="40" height="34" fill="${recovery ? '#4D7C0F' : '#92400E'}"/>
    <rect x="22" y="24" width="28" height="42" fill="${recovery ? '#4D7C0F' : '#92400E'}"/>
    <!-- Vetas de luz y volumen -->
    <rect x="18" y="30" width="6" height="30" fill="${recovery ? '#65A30D' : '#B45309'}"/>
    <rect x="28" y="26" width="16" height="38" fill="${recovery ? '#84CC16' : '#D97706'}"/>
    <rect x="48" y="30" width="6" height="30" fill="${recovery ? '#365314' : '#78350F'}"/>
    <!-- Separadores oscuros de duelas -->
    <rect x="26" y="24" width="2" height="42" fill="#201103"/>
    <rect x="44" y="24" width="2" height="42" fill="#201103"/>
    <!-- Flejes/aros metalicos de hierro -->
    <rect x="18" y="32" width="36" height="6" fill="#475569"/>
    <rect x="18" y="32" width="36" height="2" fill="#94A3B8"/>
    <rect x="18" y="52" width="36" height="6" fill="#475569"/>
    <rect x="18" y="52" width="36" height="2" fill="#94A3B8"/>
    <!-- Remaches de los aros -->
    <rect x="22" y="34" width="2" height="2" fill="#F8FAFC"/>
    <rect x="35" y="34" width="2" height="2" fill="#F8FAFC"/>
    <rect x="48" y="34" width="2" height="2" fill="#F8FAFC"/>
    <rect x="22" y="54" width="2" height="2" fill="#F8FAFC"/>
    <rect x="35" y="54" width="2" height="2" fill="#F8FAFC"/>
    <rect x="48" y="54" width="2" height="2" fill="#F8FAFC"/>
    <!-- Simbolo -->
    ${recovery ? pixelHeartSvg(26, 38) : used ? pixelCheckSvg(22, 38) : status === 'locked' ? pixelLockSvg(26, 38) : pixelStarSvg(26, 38)}
  </g>`;
}

function portalSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  const used = status === 'completed';
  return `<g class="object-shell" shape-rendering="crispEdges">
    <!-- Sombra base -->
    <rect x="12" y="68" width="48" height="6" fill="#0C0A14"/>
    <!-- Estructura de piedra oscura -->
    <rect x="14" y="20" width="44" height="48" fill="#181324"/>
    <rect x="16" y="16" width="40" height="52" fill="#2E2442"/>
    <!-- Columnas laterales de sillares -->
    <rect x="16" y="18" width="10" height="50" fill="#42345E"/>
    <rect x="46" y="18" width="10" height="50" fill="#42345E"/>
    <rect x="16" y="28" width="10" height="2" fill="#181324"/>
    <rect x="16" y="42" width="10" height="2" fill="#181324"/>
    <rect x="16" y="56" width="10" height="2" fill="#181324"/>
    <rect x="46" y="28" width="10" height="2" fill="#181324"/>
    <rect x="46" y="42" width="10" height="2" fill="#181324"/>
    <rect x="46" y="56" width="10" height="2" fill="#181324"/>
    <!-- Arco ojival superior -->
    <rect x="22" y="12" width="28" height="6" fill="#58457D"/>
    <rect x="26" y="8" width="20" height="5" fill="#58457D"/>
    <rect x="32" y="4" width="8" height="5" fill="#7C5DAE"/>
    <!-- Interior del portal arcano -->
    <rect x="26" y="22" width="20" height="46" fill="#120A1F"/>
    <rect x="28" y="24" width="16" height="42" fill="${used ? '#065F46' : status === 'locked' ? '#3B0764' : '#831843'}"/>
    <!-- Resplandor central -->
    <rect x="30" y="28" width="12" height="34" fill="${used ? '#10B981' : status === 'locked' ? '#7E22CE' : '#F43F5E'}"/>
    <rect x="33" y="32" width="6" height="26" fill="${used ? '#A7F3D0' : status === 'locked' ? '#C084FC' : '#FDA4AF'}"/>
    <rect x="35" y="36" width="2" height="18" fill="#FFFFFF"/>
    <!-- Simbolo -->
    ${used ? pixelCheckSvg(24, 38) : status === 'locked' ? pixelLockSvg(26, 38) : ''}
  </g>`;
}

function iceSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  const used = status === 'completed';
  return `<g class="object-shell" shape-rendering="crispEdges">
    <!-- Sombra base -->
    <rect x="14" y="68" width="44" height="6" fill="#1E293B"/>
    <!-- Bloque de hielo facetado -->
    <rect x="16" y="24" width="40" height="44" fill="#0C4A6E"/>
    <rect x="18" y="26" width="36" height="40" fill="${used ? '#64748B' : '#0284C7'}"/>
    <!-- Caras y reflejos cristalinos -->
    <rect x="18" y="26" width="36" height="6" fill="${used ? '#94A3B8' : '#7DD3FC'}"/>
    <rect x="18" y="26" width="6" height="40" fill="${used ? '#94A3B8' : '#7DD3FC'}"/>
    <rect x="24" y="32" width="24" height="28" fill="${used ? '#CBD5E1' : '#E0F2FE'}"/>
    <!-- Brillos blancos -->
    <rect x="20" y="28" width="4" height="4" fill="#FFFFFF"/>
    <rect x="26" y="34" width="8" height="3" fill="#FFFFFF"/>
    <rect x="42" y="44" width="4" height="8" fill="${used ? '#475569' : '#0369A1'}"/>
    <!-- Simbolo -->
    ${used ? pixelCheckSvg(22, 36) : status === 'locked' ? pixelLockSvg(24, 36) : pixelSnowflakeSvg(26, 36)}
  </g>`;
}

function netherSvg(status: 'completed' | 'available' | 'locked', final = false): string {
  const used = status === 'completed';
  return `<g class="object-shell" shape-rendering="crispEdges">
    <!-- Sombra base -->
    <rect x="14" y="68" width="44" height="6" fill="#140406"/>
    <!-- Bloque de basalto/obsidiana del Nether -->
    <rect x="16" y="24" width="40" height="44" fill="#1D1E26"/>
    <rect x="18" y="26" width="36" height="40" fill="${used ? '#353745' : status === 'locked' ? '#210F14' : '#5A0E16'}"/>
    <!-- Grietas de lava incandescente -->
    <rect x="18" y="26" width="36" height="4" fill="#F25500"/>
    <rect x="18" y="26" width="4" height="40" fill="#F25500"/>
    <rect x="24" y="32" width="24" height="28" fill="${used ? '#210F14' : '#3A1B24'}"/>
    <!-- Núcleo de magma -->
    <rect x="28" y="36" width="16" height="20" fill="${used ? '#475569' : '#F25500'}"/>
    <rect x="32" y="40" width="8" height="12" fill="${used ? '#64748B' : '#FEF08A'}"/>
    <!-- Simbolo -->
    ${used ? pixelCheckSvg(22, 36) : status === 'locked' ? pixelLockSvg(24, 36) : pixelFlameSvg(26, 36)}
  </g>`;
}

function bonusSvg(theme: WorldTheme): string {
  return `<g class="object-shell bonus-object" shape-rendering="crispEdges">
    <!-- Cofre del tesoro pixel art -->
    <rect x="14" y="66" width="44" height="6" fill="#2E1B0E"/>
    <!-- Base del cofre -->
    <rect x="16" y="40" width="40" height="26" fill="#6B3914"/>
    <rect x="18" y="42" width="36" height="22" fill="#9A5523"/>
    <!-- Tapa curvada pixelada -->
    <rect x="18" y="24" width="36" height="16" fill="#6B3914"/>
    <rect x="20" y="22" width="32" height="18" fill="#9A5523"/>
    <!-- Refuerzos y ribetes dorados -->
    <rect x="16" y="40" width="6" height="26" fill="#F59E0B"/>
    <rect x="50" y="40" width="6" height="26" fill="#F59E0B"/>
    <rect x="16" y="24" width="6" height="16" fill="#F59E0B"/>
    <rect x="50" y="24" width="6" height="16" fill="#F59E0B"/>
    <rect x="16" y="38" width="40" height="4" fill="#F59E0B"/>
    <rect x="18" y="24" width="36" height="3" fill="#FDE68A"/>
    <!-- Cerradura dorada -->
    <rect x="32" y="36" width="8" height="8" fill="#D97706"/>
    <rect x="34" y="38" width="4" height="4" fill="#FEF08A"/>
    <rect x="35" y="40" width="2" height="2" fill="#78350F"/>
    <!-- Estrella flotante brillante -->
    ${pixelStarSvg(26, 2)}
  </g>`;
}

function recoverySvg(theme: WorldTheme, status: 'completed' | 'available' | 'locked'): string {
  if (theme === 'desert') {
    // Tuberia verde pixel art (Warp Pipe)
    return `<g class="object-shell" shape-rendering="crispEdges">
      <rect x="14" y="68" width="44" height="6" fill="#14361B"/>
      <!-- Cuerpo del tubo -->
      <rect x="20" y="38" width="32" height="30" fill="#15803D"/>
      <rect x="24" y="38" width="6" height="30" fill="#4ADE80"/>
      <rect x="44" y="38" width="6" height="30" fill="#166534"/>
      <!-- Borde superior del tubo -->
      <rect x="16" y="26" width="40" height="14" fill="#15803D"/>
      <rect x="18" y="28" width="36" height="10" fill="#22C55E"/>
      <rect x="20" y="28" width="6" height="10" fill="#86EFAC"/>
      <rect x="46" y="28" width="6" height="10" fill="#166534"/>
      <rect x="16" y="26" width="40" height="2" fill="#86EFAC"/>
      <rect x="16" y="38" width="40" height="2" fill="#14361B"/>
      <!-- Corazon flotante -->
      ${pixelHeartSvg(27, 2)}
    </g>`;
  }

  if (theme === 'jungle') return barrelSvg(status, false, true);

  if (theme === 'castle') {
    // Caldero / fuente de alquimia pixel art
    return `<g class="object-shell" shape-rendering="crispEdges">
      <rect x="14" y="68" width="44" height="6" fill="#130E24"/>
      <!-- Base de piedra del caldero -->
      <rect x="20" y="44" width="32" height="24" fill="#2E2442"/>
      <rect x="16" y="32" width="40" height="16" fill="#3D325C"/>
      <rect x="14" y="30" width="44" height="6" fill="#4E4075"/>
      <rect x="18" y="32" width="36" height="4" fill="#705A9E"/>
      <!-- Pocion magica burbujeante violeta/fucsia -->
      <rect x="22" y="34" width="28" height="6" fill="#8B5CF6"/>
      <rect x="26" y="32" width="8" height="4" fill="#C084FC"/>
      <rect x="38" y="33" width="6" height="3" fill="#F43F5E"/>
      <!-- Corazon flotante -->
      ${pixelHeartSvg(27, 2)}
    </g>`;
  }

  if (theme === 'nether') {
    // Caldero de magma hirviente
    return `<g class="object-shell" shape-rendering="crispEdges">
      <rect x="14" y="68" width="44" height="6" fill="#140406"/>
      <!-- Base de piedra volcánica -->
      <rect x="20" y="44" width="32" height="24" fill="#210F14"/>
      <rect x="16" y="32" width="40" height="16" fill="#3A1B24"/>
      <rect x="14" y="30" width="44" height="6" fill="#522431"/>
      <rect x="18" y="32" width="36" height="4" fill="#5A0E16"/>
      <!-- Lava hirviente -->
      <rect x="22" y="34" width="28" height="6" fill="#F25500"/>
      <rect x="26" y="32" width="8" height="4" fill="#FBBF24"/>
      <rect x="38" y="33" width="6" height="3" fill="#FEF08A"/>
      <!-- Corazón flotante -->
      ${pixelHeartSvg(27, 2)}
    </g>`;
  }

  // Snow: Fogata de campamento con leños pixel art
  return `<g class="object-shell" shape-rendering="crispEdges">
    <rect x="14" y="68" width="44" height="6" fill="#1E293B"/>
    <!-- Piedras en circulo -->
    <rect x="16" y="58" width="40" height="10" fill="#475569"/>
    <rect x="18" y="56" width="36" height="4" fill="#64748B"/>
    <!-- Troncos cruzados -->
    <rect x="20" y="50" width="32" height="6" fill="#78350F"/>
    <rect x="24" y="44" width="24" height="6" fill="#92400E"/>
    <!-- Fuego pixelado -->
    <rect x="28" y="24" width="16" height="24" fill="#EF4444"/>
    <rect x="30" y="20" width="12" height="20" fill="#F97316"/>
    <rect x="32" y="16" width="8" height="16" fill="#FBBF24"/>
    <rect x="34" y="12" width="4" height="10" fill="#FEF08A"/>
    <!-- Corazon flotante -->
    ${pixelHeartSvg(27, 2)}
  </g>`;
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
          : theme === 'snow'
            ? iceSvg(status, c.id === mainCount)
            : theme === 'nether'
              ? netherSvg(status, c.id === mainCount)
              : portalSvg(status, c.id === mainCount);
  const resolvedBonus =
    c.optional && status === 'completed'
      ? `<g shape-rendering="crispEdges"><rect x="46" y="58" width="18" height="18" fill="#15803D"/><rect x="48" y="60" width="14" height="14" fill="#22C55E"/>${pixelCheckSvg(43, 56)}</g>`
      : '';
  return `<svg class="node-art" viewBox="0 0 72 84" aria-hidden="true">${shadowSvg}${art}${resolvedBonus}</svg>`;
}

export function nodeVerb(
  theme: WorldTheme,
  status: 'completed' | 'available' | 'locked',
): string {
  if (status === 'completed') return 'RESUELTO';
  if (status === 'locked')
    return theme === 'castle'
      ? 'SELLADO'
      : theme === 'snow'
        ? 'CONGELADO'
        : theme === 'nether'
          ? 'ARDOR'
          : 'CERRADO';
  return theme === 'desert'
    ? '¡GOLPEA!'
    : theme === 'jungle'
      ? '¡ABRE!'
      : theme === 'snow'
        ? '¡ROMPE!'
        : theme === 'nether'
          ? '¡FORJA!'
          : '¡DESPIERTA!';
}

// Pixel art SVG for scenery
const houseSvg = `<g shape-rendering="crispEdges">
  <rect x="-24" y="10" width="48" height="26" fill="#5A3A22"/>
  <rect x="-20" y="14" width="40" height="22" fill="#E8D5B5"/>
  <!-- Techo de hongo pixelado -->
  <rect x="-28" y="-12" width="56" height="6" fill="#E11D48"/>
  <rect x="-24" y="-18" width="48" height="6" fill="#E11D48"/>
  <rect x="-18" y="-24" width="36" height="6" fill="#E11D48"/>
  <rect x="-10" y="-28" width="20" height="4" fill="#E11D48"/>
  <!-- Manchas blancas pixeladas en el hongo -->
  <rect x="-16" y="-18" width="8" height="5" fill="#FFFFFF"/>
  <rect x="8" y="-16" width="8" height="5" fill="#FFFFFF"/>
  <rect x="-4" y="-24" width="8" height="4" fill="#FFFFFF"/>
  <!-- Puerta y ventana pixelada -->
  <rect x="-6" y="22" width="12" height="14" fill="#6D4327"/>
  <rect x="-4" y="24" width="8" height="12" fill="#3D2413"/>
  <rect x="-16" y="18" width="6" height="6" fill="#60A5FA"/>
  <rect x="10" y="18" width="6" height="6" fill="#60A5FA"/>
</g>`;

// Piramide de arenisca escalonada en pixel art (estilo SMB3 Mundo 2)
const pyramidSvg = `<g shape-rendering="crispEdges">
  <!-- Sombra base en desierto -->
  <rect x="-38" y="28" width="76" height="5" fill="#8C5C28" opacity="0.4"/>
  <!-- Nivel 1 (base 72px) -->
  <rect x="-36" y="22" width="42" height="6" fill="#F5D061"/>
  <rect x="6" y="22" width="30" height="6" fill="#B8860B"/>
  <rect x="-36" y="27" width="72" height="1" fill="#784E18"/>
  <!-- Nivel 2 (58px) -->
  <rect x="-29" y="16" width="35" height="6" fill="#F9DE7B"/>
  <rect x="6" y="16" width="23" height="6" fill="#C69214"/>
  <rect x="-29" y="21" width="58" height="1" fill="#784E18"/>
  <!-- Nivel 3 (44px) -->
  <rect x="-22" y="10" width="28" height="6" fill="#FDE68A"/>
  <rect x="6" y="10" width="16" height="6" fill="#D49E1D"/>
  <rect x="-22" y="15" width="44" height="1" fill="#784E18"/>
  <!-- Nivel 4 (30px) -->
  <rect x="-15" y="4" width="21" height="6" fill="#FEF08A"/>
  <rect x="6" y="4" width="9" height="6" fill="#E2AB26"/>
  <rect x="-15" y="9" width="30" height="1" fill="#784E18"/>
  <!-- Cuspid dorada -->
  <rect x="-8" y="-2" width="14" height="6" fill="#FFFBEB"/>
  <rect x="6" y="-2" width="2" height="6" fill="#F59E0B"/>
  <rect x="-2" y="-6" width="4" height="4" fill="#FDE047"/>
  <!-- Puerta oscura -->
  <rect x="-4" y="18" width="8" height="10" fill="#3D2406"/>
  <rect x="-2" y="16" width="4" height="2" fill="#3D2406"/>
</g>`;

// Palmera pixel art
const palmSvg = `<g shape-rendering="crispEdges">
  <rect x="-14" y="26" width="28" height="4" fill="#784E18" opacity="0.35"/>
  <!-- Tronco segmentado -->
  <rect x="-4" y="20" width="8" height="8" fill="#6D4327"/>
  <rect x="-3" y="12" width="6" height="8" fill="#8B5A2B"/>
  <rect x="-1" y="4" width="6" height="8" fill="#A06830"/>
  <rect x="1" y="-4" width="6" height="8" fill="#8B5A2B"/>
  <rect x="-4" y="20" width="8" height="1" fill="#452711"/>
  <rect x="-3" y="12" width="6" height="1" fill="#452711"/>
  <rect x="-1" y="4" width="6" height="1" fill="#452711"/>
  <rect x="1" y="-4" width="6" height="1" fill="#452711"/>
  <!-- Frondas verdes -->
  <rect x="-20" y="-8" width="14" height="4" fill="#15803D"/>
  <rect x="-24" y="-5" width="8" height="4" fill="#166534"/>
  <rect x="8" y="-8" width="16" height="4" fill="#15803D"/>
  <rect x="18" y="-5" width="8" height="4" fill="#166534"/>
  <rect x="-16" y="-16" width="12" height="6" fill="#22C55E"/>
  <rect x="6" y="-16" width="12" height="6" fill="#22C55E"/>
  <rect x="-6" y="-20" width="14" height="8" fill="#4ADE80"/>
  <rect x="-10" y="-14" width="22" height="6" fill="#16A34A"/>
</g>`;

// Cactus saguaro pixel art
const cactusSvg = `<g shape-rendering="crispEdges">
  <rect x="-10" y="26" width="20" height="3" fill="#784E18" opacity="0.3"/>
  <!-- Tallo central -->
  <rect x="-4" y="-16" width="8" height="44" fill="#15803D"/>
  <rect x="-3" y="-15" width="3" height="42" fill="#4ADE80"/>
  <rect x="1" y="-15" width="2" height="42" fill="#166534"/>
  <!-- Brazo izquierdo -->
  <rect x="-14" y="-4" width="10" height="6" fill="#15803D"/>
  <rect x="-14" y="-12" width="6" height="12" fill="#15803D"/>
  <rect x="-13" y="-11" width="2" height="10" fill="#4ADE80"/>
  <!-- Brazo derecho -->
  <rect x="4" y="4" width="10" height="6" fill="#15803D"/>
  <rect x="8" y="-4" width="6" height="12" fill="#15803D"/>
  <rect x="9" y="-3" width="2" height="10" fill="#4ADE80"/>
  <!-- Flor rosada -->
  <rect x="-2" y="-20" width="4" height="4" fill="#F43F5E"/>
  <rect x="-1" y="-19" width="2" height="2" fill="#FFE4E6"/>
</g>`;

// Rocas facetadas pixel art
const rocksSvg = `<g shape-rendering="crispEdges">
  <rect x="-20" y="16" width="40" height="4" fill="#603B1A" opacity="0.4"/>
  <rect x="-18" y="2" width="22" height="16" fill="#784E18"/>
  <rect x="-16" y="0" width="18" height="16" fill="#A06830"/>
  <rect x="-14" y="2" width="8" height="6" fill="#D97706"/>
  <rect x="2" y="6" width="16" height="12" fill="#784E18"/>
  <rect x="4" y="4" width="12" height="12" fill="#A06830"/>
  <rect x="6" y="6" width="6" height="4" fill="#D97706"/>
</g>`;

// Nube pixelada
const cloudSvg = `<g shape-rendering="crispEdges">
  <rect x="-36" y="-6" width="72" height="16" fill="#FFFFFF"/>
  <rect x="-28" y="-14" width="56" height="8" fill="#FFFFFF"/>
  <rect x="-16" y="-20" width="32" height="6" fill="#FFFFFF"/>
  <!-- Sombra nube -->
  <rect x="-36" y="8" width="72" height="4" fill="#E2E8F0"/>
  <rect x="-28" y="2" width="56" height="6" fill="#F1F5F9"/>
  <!-- Ojos kawaii retro -->
  <rect x="-8" y="-2" width="3" height="4" fill="#1E293B"/>
  <rect x="6" y="-2" width="3" height="4" fill="#1E293B"/>
</g>`;

// Totem pixel art selva
const totemSvg = `<g shape-rendering="crispEdges">
  <rect x="-16" y="28" width="32" height="4" fill="#142612" opacity="0.4"/>
  <rect x="-14" y="-24" width="28" height="54" fill="#365314"/>
  <rect x="-12" y="-22" width="24" height="50" fill="#4D7C0F"/>
  <rect x="-10" y="-18" width="8" height="6" fill="#FEF08A"/>
  <rect x="2" y="-18" width="8" height="6" fill="#FEF08A"/>
  <rect x="-6" y="-16" width="4" height="4" fill="#1E293B"/>
  <rect x="4" y="-16" width="4" height="4" fill="#1E293B"/>
  <rect x="-8" y="-6" width="16" height="4" fill="#84CC16"/>
  <rect x="-10" y="6" width="20" height="8" fill="#14532D"/>
  <rect x="-6" y="8" width="12" height="4" fill="#DC2626"/>
</g>`;

// Antorcha de pared / pedestal castillo pixel art
const torchSvg = `<g shape-rendering="crispEdges">
  <rect x="-10" y="26" width="20" height="4" fill="#0F0B18" opacity="0.4"/>
  <rect x="-6" y="2" width="12" height="26" fill="#334155"/>
  <rect x="-4" y="4" width="8" height="22" fill="#64748B"/>
  <rect x="-8" y="-4" width="16" height="8" fill="#475569"/>
  <rect x="-6" y="-2" width="12" height="4" fill="#94A3B8"/>
  <!-- Fuego pixelado -->
  <rect x="-6" y="-20" width="12" height="16" fill="#EF4444"/>
  <rect x="-4" y="-24" width="8" height="16" fill="#F97316"/>
  <rect x="-2" y="-28" width="4" height="14" fill="#FDE047"/>
  <rect x="-1" y="-30" width="2" height="6" fill="#FFFFFF"/>
</g>`;

// Muneco de nieve pixel art
const snowmanSvg = `<g shape-rendering="crispEdges">
  <rect x="-16" y="26" width="32" height="4" fill="#334155" opacity="0.3"/>
  <!-- Bola inferior -->
  <rect x="-14" y="6" width="28" height="22" fill="#E2E8F0"/>
  <rect x="-12" y="4" width="24" height="26" fill="#FFFFFF"/>
  <!-- Bola superior -->
  <rect x="-10" y="-12" width="20" height="18" fill="#E2E8F0"/>
  <rect x="-8" y="-14" width="16" height="20" fill="#FFFFFF"/>
  <!-- Ojos y botones de carbon -->
  <rect x="-5" y="-8" width="2" height="2" fill="#0F172A"/>
  <rect x="3" y="-8" width="2" height="2" fill="#0F172A"/>
  <rect x="-1" y="10" width="2" height="2" fill="#0F172A"/>
  <rect x="-1" y="16" width="2" height="2" fill="#0F172A"/>
  <!-- Nariz de zanahoria -->
  <rect x="-1" y="-4" width="6" height="2" fill="#EA580C"/>
  <!-- Sombrero de copa -->
  <rect x="-12" y="-16" width="24" height="3" fill="#1E293B"/>
  <rect x="-6" y="-26" width="12" height="10" fill="#1E293B"/>
  <rect x="-6" y="-18" width="12" height="2" fill="#DC2626"/>
</g>`;

export function renderWorldScenery(world: GeneratedWorld, completedIds: number[] = []): string {
  const { theme, worldWidth, worldHeight, roads, mainCount, challenges } = world;
  const px = ([x, y]: [number, number]) => [
    (x * worldWidth) / 100,
    (y * worldHeight) / 100,
  ];
  const items: string[] = [];

  if (theme === 'desert') {
    const recovery = challenges.find((c) => c.recovery);
    if (recovery) {
      const [hx, hy] = px([recovery.x, recovery.y]);
      items.push(`<g class="mushroom-house" transform="translate(${hx} ${hy - 133})">${houseSvg}</g>`);
    }

    // Decoraciones desierto: Pirámides, Palmeras, Cactus, Rocas y Nubes
    for (let id = 1; id <= mainCount; id++) {
      if (!roads[id] || !roads[id][16]) continue;
      const [x, y] = px(roads[id][16]);
      const leftSide = x > worldWidth / 2;
      const decorX = worldWidth * (leftSide ? 0.22 : 0.78);
      const farX = worldWidth * (leftSide ? 0.12 : 0.88);

      if (id === 1 || id === 4 || id === 7) {
        // Piramide
        items.push(`<g transform="translate(${decorX} ${y - 10})">${pyramidSvg}</g>`);
      } else if (id === 2 || id === 5) {
        // Palmera + Cactus
        items.push(`<g transform="translate(${decorX} ${y})">${palmSvg}</g>`);
        items.push(`<g transform="translate(${farX} ${y + 20})">${cactusSvg}</g>`);
      } else {
        // Rocas + Cactus
        items.push(`<g transform="translate(${decorX} ${y})">${rocksSvg}</g>`);
        items.push(`<g transform="translate(${farX} ${y - 15})">${cactusSvg}</g>`);
      }

      if (id % 3 === 0) {
        items.push(
          `<g class="desert-cloud" transform="translate(${worldWidth * (leftSide ? 0.8 : 0.2)} ${y - 100})">${cloudSvg}</g>`,
        );
      }
    }
  } else {
    for (let id = 1; id <= mainCount; id += 2) {
      if (!roads[id] || !roads[id][16]) continue;
      const [x, y] = px(roads[id][16]);
      const side = x > worldWidth / 2 ? 0.22 : 0.78;
      const decorSvg = theme === 'jungle' ? totemSvg : theme === 'snow' ? snowmanSvg : torchSvg;
      items.push(`<g transform="translate(${side * worldWidth} ${y})">${decorSvg}</g>`);
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

  if (theme === 'snow') {
    return {
      1: {
        pregunta: '¿Qué define a una estructura de datos?',
        opciones: [
          'La forma en que se organizan y se acceden los datos',
          'El color de la pantalla',
          'La velocidad del teclado',
        ],
        correcta: 0,
        explicacion: 'Cada estructura propone un orden de guardado y de acceso distinto.',
      },
      2: {
        pregunta: 'En una pila, ¿qué elemento sale primero?',
        opciones: ['El último que entró', 'El primero que entró', 'El más grande'],
        correcta: 0,
        explicacion: 'Una pila es LIFO: el último en entrar es el primero en salir.',
      },
      3: {
        pregunta: 'Apilas 3, 7 y 9. ¿Qué valor obtienes al retirar uno?',
        opciones: ['3', '7', '9'],
        correcta: 2,
        explicacion: 'El tope de la pila es 9, el último apilado.',
      },
      4: {
        pregunta: 'En una cola, ¿quién es atendido primero?',
        opciones: ['El primero que llegó', 'El último que llegó', 'Cualquiera'],
        correcta: 0,
        explicacion: 'Una cola es FIFO: el primero en entrar es el primero en salir.',
      },
      5: {
        pregunta: 'La cola tiene [Ana, Beto, Cris] y atiendes un turno. ¿Quién queda al frente?',
        opciones: ['Ana', 'Beto', 'Cris'],
        correcta: 1,
        explicacion: 'Sale Ana, la primera que llegó, y Beto pasa al frente.',
      },
      6: {
        pregunta: 'En un árbol, ¿cómo se llama el nodo sin hijos?',
        opciones: ['Hoja', 'Raíz', 'Cola'],
        correcta: 0,
        explicacion: 'Las hojas son los nodos finales, sin descendientes.',
      },
      7: {
        pregunta: 'La pila de témpanos guarda 2, 4, 8, 16. ¿Qué témpano sigue?',
        opciones: ['18', '24', '32'],
        correcta: 2,
        explicacion: 'Cada valor duplica al anterior: después de 16 viene 32.',
      },
      8: {
        pregunta: '¿Qué estructura conviene para deshacer el último paso dado?',
        opciones: ['Una pila', 'Una cola', 'Un árbol'],
        correcta: 0,
        explicacion: 'La pila devuelve siempre la acción más reciente.',
      },
    };
  }

  if (theme === 'nether') {
    return {
      1: {
        pregunta: '¿Qué es un proceso o hilo de ejecución en computación?',
        opciones: [
          'Una secuencia de instrucciones que el procesador puede ejecutar concurrentemente',
          'Un cable físico de la placa madre',
          'Un archivo de texto estático sin compilar',
        ],
        correcta: 0,
        explicacion: 'Un hilo representa la unidad más pequeña de procesamiento planificable por un sistema operativo.',
      },
      2: {
        pregunta: '¿Qué condición ocurre cuando dos hilos intentan modificar el mismo dato simultáneamente?',
        opciones: ['Condición de carrera (Race Condition)', 'Optimización cuántica', 'Bucle infinito'],
        correcta: 0,
        explicacion: 'La condición de carrera produce resultados impredecibles al acceder concurrentemente a recursos compartidos sin sincronización.',
      },
      3: {
        pregunta: '¿Para qué sirve un candado (Mutex o Lock) en programación concurrente?',
        opciones: [
          'Garantizar exclusión mutua para que solo un hilo acceda a la sección crítica',
          'Aumentar la velocidad del ventilador del CPU',
          'Cerrar la ventana del navegador',
        ],
        correcta: 0,
        explicacion: 'Un Mutex asegura que dos o más hilos no ejecuten al mismo tiempo un bloque de código crítico.',
      },
      4: {
        pregunta: '¿Qué protocolo de transporte garantiza entrega ordenada y confiable de paquetes en una red?',
        opciones: ['TCP', 'UDP', 'DNS'],
        correcta: 0,
        explicacion: 'TCP incluye control de flujo, retransmisión de paquetes perdidos y verificación de entrega.',
      },
      5: {
        pregunta: '¿Cuándo es preferible utilizar UDP en lugar de TCP?',
        opciones: [
          'En streaming y videojuegos en tiempo real donde la baja latencia prima sobre reintentos',
          'Para transferencias bancarias de dinero',
          'Para enviar correos electrónicos críticos',
        ],
        correcta: 0,
        explicacion: 'UDP no retransmite paquetes ni agrega sobrecarga de confirmaciones, reduciendo la latencia.',
      },
      6: {
        pregunta: '¿Qué es una dirección IP en una red de computadoras?',
        opciones: [
          'Un identificador numérico único asignado a cada dispositivo en la red',
          'La contraseña del usuario administrador',
          'El número de serie de la tarjeta gráfica',
        ],
        correcta: 0,
        explicacion: 'La dirección IP permite localizar e intercomunicar nodos conectados bajo el protocolo de Internet.',
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
