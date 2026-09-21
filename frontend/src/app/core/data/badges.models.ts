// Badge catalog of the Roadmap module. Not to be confused with the badges EARNED by a
// student (`GET /api/roadmap/alumnos/{aid}/insignias` — returns badgeId + grantedIn,
// not the definition). Real routes (roadmap-requerimientos.md §9):
//   GET  /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR, ALUMNO
//   POST /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR
//   PUT  /api/roadmap/roadmaps/{cc}/insignias/catalogo/{id}    — PROFESOR (not implemented yet)
// These routes confirm path/role; there is no documented body schema, so `NewBadge`
// and `BadgeCatalog` are a proposal built from the form fields.

export type BadgeType = 'CROSS_CUTTING' | 'PER_NODE';

/** `SYSTEM` = the 14 fixed ones from the skill. `TEACHER` = created from the create modal. */
export type BadgeOrigin = 'SYSTEM' | 'TEACHER';

export type BadgeCriterion =
  | 'MIN_XP'
  | 'SECTION_NO_LIVES_LOST'
  | 'NODE_NO_RETRIES'
  | 'LIFE_RECOVERED'
  | 'LEVEL_REACHED'
  | 'ZONE_P90'
  | 'SPECIFIC_MANDATORY_NODE'
  | 'OPTIONAL_NODE_COMPLETED'
  | 'SECTION_IN_ONE_DAY'
  | 'FIRST_ON_NODE';

export const CRITERION_LABEL: Record<BadgeCriterion, string> = {
  MIN_XP: 'XP mínimo acumulado',
  SECTION_NO_LIVES_LOST: 'Sección completada sin perder vidas',
  NODE_NO_RETRIES: 'Nodo completado sin reintentos',
  LIFE_RECOVERED: 'Vida recuperada',
  LEVEL_REACHED: 'Nivel alcanzado',
  ZONE_P90: 'Entrada a zona P90',
  SPECIFIC_MANDATORY_NODE: 'Nodo obligatorio específico completado',
  OPTIONAL_NODE_COMPLETED: 'Nodo opcional completado',
  SECTION_IN_ONE_DAY: 'Sección completa en un día',
  FIRST_ON_NODE: 'Primero en completar un nodo',
};

/** Criteria that additionally require a numeric value (e.g. "Minimum XP: 500"). */
export const CRITERIA_WITH_VALUE = new Set<BadgeCriterion>(['MIN_XP', 'LEVEL_REACHED']);

/** The only cross-cutting criterion that actually points to a specific node, not a number. */
export const CRITERION_SPECIFIC_NODE: BadgeCriterion = 'SPECIFIC_MANDATORY_NODE';

export interface BadgeCatalog {
  badgeId: string;
  /** Internal stable key — icon key in `badge-icons.ts` (SYSTEM) or `generic-icons.ts` (TEACHER). */
  code: string;
  name: string;
  description: string;
  type: BadgeType;
  origin: BadgeOrigin;
  /** true = provisional icon (pixel-grids.md marks it "redo"), shown anyway but labeled. */
  pendingIcon: boolean;
  /** Only TEACHER badges (CROSS_CUTTING type): criterion chosen at creation. */
  criterion?: BadgeCriterion;
  /** Only if `criterion` is in `CRITERIA_WITH_VALUE`. */
  valueCriterion?: number;
  /** Only TEACHER badges with type PER_NODE, or criterion `SPECIFIC_MANDATORY_NODE`. */
  nodeId?: string;
}

/**
 * Badge EARNED by a student — same shape as the `Insignia` schema of
 * `GET /api/roadmap/alumnos/{aid}/insignias`. To display it you need to cross it with the
 * catalog by `badgeId` (name/icon do not travel here).
 */
export interface GrantedBadge {
  badgeId: string;
  grantedIn: string;
}

/** Creation body (`POST /api/roadmap/roadmaps/{cc}/insignias/catalogo`). */
export interface NewBadge {
  name: string;
  /** Code from `generic-icons.ts` — never one of the 15 fixed icons of the catalog. */
  icon: string;
  type: BadgeType;
  criterion?: BadgeCriterion;
  valueCriterion?: number;
  nodeId?: string;
}
