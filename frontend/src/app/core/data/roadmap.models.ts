// Graph and progress types — mirror of the contract (docs/openapi/ms-roadmap.yaml)
// but only with what the mock needs in Phases 0-2. The Phase 3 `HttpRoadmapAdapter`
// will generate its own from the OpenAPI.

import { Biome } from './biomes';

export type NodeStatus = 'bloqueado' | 'habilitado' | 'completado' | 'fallado';
// 'teoria' is reading material (PDF/video/PPT via external link, see `resourceUrl` in
// `Activity`), without evaluation or XP — meant to be the first node of the section,
// before the challenge that evaluates that content. The rest are evaluated challenges, either
// theoretical or practical (the modality is in the type itself, as in the real contract — see
// docs/openapi/ms-roadmap.yaml, Nodo.tipo). `boss` and `hito` remain separate types
// (not selectable from the editor for now).
export type NodeType = 'teoria' | 'desafio-teorico' | 'desafio-practico' | 'boss' | 'hito';

// Type of external resource the teacher uploads for a 'teoria' node — the project has no
// file-upload backend, so the "content" is always a link (YouTube,
// Google Drive, OneDrive, etc.), never a file of its own.
export type ResourceTheoryType = 'pdf' | 'video' | 'ppt';

// PAR-01: base XP by difficulty (100 / 250 / 500). Mirror of the backend's Difficulty.
export type Difficulty = 'BASICO' | 'MEDIO' | 'AVANZADO';
// Single source of truth for XP by difficulty — used both by the editor (to show the
// teacher how much the challenge will be worth) and by the student's map (to actually award it).
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { BASICO: 100, MEDIO: 250, AVANZADO: 500 };

// Description the student sees on the map when the teacher leaves the field empty — the
// editor shows it as a placeholder so they know what will come out if they do not write their own.
export function defaultDescription(type: NodeType): string {
  switch (type) {
    case 'teoria':
      return 'Revisá el material antes de encarar el desafío de la unidad.';
    case 'desafio-teorico':
      return 'Respondé las preguntas para demostrar que entendiste los conceptos de la unidad.';
    case 'desafio-practico':
      return 'Resolvé el ejercicio aplicando lo aprendido en la unidad.';
    case 'boss':
      return 'Superá el desafío final de la unidad.';
    default:
      return 'Contenido de la unidad.';
  }
}

export interface Activity {
  id: string;
  name: string;
  type: NodeType;
  isMandatory: boolean;
  allowedRetries: number; // 0-3 (RF-DES-07)
  challengeId?: string;
  description?: string;
  // Evaluated and awards XP (every type except 'hito' and 'teoria').
  difficulty?: Difficulty;
  // Only for type 'teoria': external link to the material (PDF/video/PPT) and its type, to
  // know how to embed it in the student's map (see resource-embed.util.ts).
  resourceUrl?: string;
  resourceType?: ResourceTheoryType;
  // Position of the node in the teacher's graphic editor (05-design-system.md §5/§6). The
  // adapter assigns it a non-overlapping default on creation; the teacher relocates it by dragging.
  positionX: number;
  positionY: number;
}

/** Creation/edition of an activity from the teacher's editor (Phase 2). */
export interface NewActivity {
  name: string;
  type: NodeType;
  isMandatory: boolean;
  allowedRetries: number;
  description?: string;
  difficulty?: Difficulty;
  resourceUrl?: string;
  resourceType?: ResourceTheoryType;
}

export interface Section {
  id: string;
  name: string;
  xpThreshold: number;
  order: number;
  activities: Activity[];
  // Visual setting (2D map and 3D world). Optional: sections created before this
  // field fall back to the theme by a name/order heuristic (see section-map.ts).
  biome?: Biome;
}

export interface Roadmap {
  courseCohortId: string;
  name: string;
  sections: Section[];
  // Prerequisites between nodes (connection graph, RF-CUR graphic editor). Kept
  // as a DAG: the adapter rejects self-loops, cycles and duplicates — mirrors POST /conexiones.
  connections: Connection[];
}

export interface NewSection {
  name: string;
  xpThreshold: number;
  biome?: Biome;
}

/** Prerequisite: `nodeDestinationId` cannot be entered without completing `nodeOriginId`. */
export interface Connection {
  id: string;
  nodeOriginId: string;
  nodeDestinationId: string;
}

export interface NodeProgress {
  nodeId: string;
  status: NodeStatus;
}

export interface Progress {
  studentId: string;
  courseCohortId: string;
  xpTotal: number;
  currentLives: number; // PAR-12: max 3
  nodes: NodeProgress[];
  /** Append-only movements of the mock to mark theory content as read. */
  readingsContent?: ReadingContent[];
}

export interface ReadingContent {
  nodeId: string;
  registeredIn: string;
}

// In production the BFF consolidates this from Identity — here it comes from the seed (stub).
export interface Student {
  id: string;
  name: string;
  lastName: string;
  fileNumber: string;
}
