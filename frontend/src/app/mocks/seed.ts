import {
  Activity,
  Student,
  Connection,
  Difficulty,
  NodeStatus,
  Progress,
  NodeProgress,
  Roadmap,
  NodeType,
  ResourceTheoryType,
} from '../core/data/roadmap.models';
import { Biome } from '../core/data/biomes';

// Example course (03-plan-de-implementacion.md, Phase 0): 4 sections, 6 activities
// each, 12 students. It is what decouples the 4 squads — nobody waits for anybody.

export const COURSE_SEED_ID = '11111111-1111-1111-1111-111111111111';

const SECTION_NAMES = [
  'Fundamentos',
  'Estructuras de control',
  'Funciones',
  'Estructuras de datos',
  'Concurrencia y Redes',
];
const THRESHOLDS = [0, 500, 1200, 2000, 3200];
// Same visual result the name/order heuristic in section-map.ts already gave.
// The 5th section uses the Space biome (planet nodes + spaceship as avatar in the 3D world).
const SECTION_BIOMES: Biome[] = ['Desierto', 'Bosque', 'Arenisca', 'Nieve', 'Espacio'];

interface Row {
  name: string;
  type: NodeType;
  isMandatory: boolean;
  retries: number;
  description?: string;
  difficulty?: Difficulty;
  resourceUrl?: string;
  resourceType?: ResourceTheoryType;
}

// 7 nodes per section: theory content (reading, no evaluation) → theory quiz → 3
// practice → challenge → boss. The first node is an example to test the 3rd type of
// content (see PLAN_CONTENIDO_TEORICO.md): an external link (here, a sample video)
// that the student watches before tackling the theory quiz that evaluates those concepts.
const TEMPLATE: Row[] = [
  { name: 'Introducción de la unidad', type: 'teoria', isMandatory: true, retries: 0,
    description: 'Mirá el video antes de encarar el desafío teórico de la unidad.',
    resourceUrl: 'https://www.youtube.com/watch?v=EjemploVid1', resourceType: 'video' },
  { name: 'Teoría', type: 'desafio-teorico', isMandatory: true, retries: 0,
    description: 'Preguntas sobre los conceptos teóricos de la unidad.',
    difficulty: 'BASICO' },
  { name: 'Práctica guiada', type: 'desafio-practico', isMandatory: true, retries: 0,
    description: 'Ejercicios resueltos paso a paso.', difficulty: 'BASICO' },
  { name: 'Práctica libre', type: 'desafio-practico', isMandatory: false, retries: 0,
    description: 'Ejercitación adicional opcional.', difficulty: 'BASICO' },
  { name: 'Ejercicio integrador', type: 'desafio-practico', isMandatory: true, retries: 0,
    description: 'Combina los temas de la unidad.', difficulty: 'MEDIO' },
  { name: 'Desafío', type: 'desafio-practico', isMandatory: true, retries: 1,
    difficulty: 'MEDIO' },
  { name: 'Boss', type: 'boss', isMandatory: true, retries: 1,
    difficulty: 'AVANZADO' },
];

// Default position grid (same 4-column serpentine that `section-map.ts` computed
// before the graphical editor exposed posicion_x/y).
const GRID_COLS = 4;
const GRID_CW = 168;
const GRID_CH = 138;
const GRID_X0 = 104;
const GRID_Y0 = 96;

function positionSerpentine(index: number): { positionX: number; positionY: number } {
  const row = Math.floor(index / GRID_COLS);
  const inRow = index % GRID_COLS;
  const col = row % 2 === 0 ? inRow : GRID_COLS - 1 - inRow;
  return { positionX: GRID_X0 + col * GRID_CW, positionY: GRID_Y0 + row * GRID_CH };
}

export function roadmapSeed(): Roadmap {
  const sections = SECTION_NAMES.map((name, i) => ({
    id: `u${i + 1}`,
    name,
    xpThreshold: THRESHOLDS[i],
    order: i + 1,
    biome: SECTION_BIOMES[i],
    activities: TEMPLATE.map((p, j): Activity => {
      const isChallenge = p.type !== 'hito' && p.type !== 'teoria';
      return {
        id: `u${i + 1}-a${j + 1}`,
        name: p.name,
        type: p.type,
        isMandatory: p.isMandatory,
        allowedRetries: p.retries,
        challengeId: isChallenge ? `desafio-ext-${i + 1}-${j + 1}` : undefined,
        description: p.description,
        difficulty: p.difficulty,
        resourceUrl: p.resourceUrl,
        resourceType: p.resourceType,
        ...positionSerpentine(j),
      };
    }),
  }));

  // Linear prerequisites within each section (the template is already theory → practice →
  // challenge → boss): it demonstrates the connection graph as soon as the graphical editor is opened.
  const connections: Connection[] = sections.flatMap((u) =>
    u.activities.slice(0, -1).map((a, j): Connection => ({
      id: `cx-${u.id}-${j + 1}`,
      nodeOriginId: a.id,
      nodeDestinationId: u.activities[j + 1].id,
    })),
  );

  return { courseCohortId: COURSE_SEED_ID, name: 'Programación I — 2026 C1', sections, connections };
}

const LAST_NAMES = [
  'Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Sánchez',
  'Pérez', 'Romero', 'Sosa', 'Torres', 'Ramírez', 'Flores',
];
const NAMES = [
  'Camila', 'Mateo', 'Valentina', 'Benjamín', 'Martina', 'Thiago',
  'Emma', 'Joaquín', 'Catalina', 'Bautista', 'Isabella', 'Lautaro',
];

export function studentsSeed(): Student[] {
  return LAST_NAMES.map((lastName, i) => ({
    id: `alu-${String(i + 1).padStart(2, '0')}`,
    name: NAMES[i],
    lastName,
    fileNumber: `${90000 + i + 1}`,
  }));
}

// Initial progress of each student: first section enabled (README §6.8), the rest
// locked. Student 01 carries some progress so the home has something to show.
export function seedProgress(studentId: string): Progress {
  const rm = roadmapSeed();
  const statusOf = (ui: number, ai: number): NodeStatus => {
    if (ui > 0) return 'bloqueado';
    if (studentId === 'alu-01') return ai < 3 ? 'completado' : ai === 3 ? 'habilitado' : 'bloqueado';
    return ai === 0 ? 'habilitado' : 'bloqueado';
  };
  const nodes: NodeProgress[] = rm.sections.flatMap((u, ui) =>
    u.activities.map((a, ai) => ({ nodeId: a.id, status: statusOf(ui, ai) })),
  );
  return {
    studentId,
    courseCohortId: COURSE_SEED_ID,
    xpTotal: studentId === 'alu-01' ? 350 : 0,
    currentLives: 3,
    nodes,
    readingsContent: [],
  };
}
