// Badge catalog of the Roadmap module. Not to be confused with the badges EARNED by a
// student (`GET /api/roadmap/alumnos/{aid}/insignias` — returns badgeId + grantedIn,
// not the definition). Real routes (roadmap-requerimientos.md §9):
//   GET  /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR, ALUMNO
//   POST /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR
//   PUT  /api/roadmap/roadmaps/{cc}/insignias/catalogo/{id}    — PROFESOR (not implemented yet)
// These routes confirm path/role; there is no documented body schema, so `NewBadge`
// and `BadgeCatalog` are a proposal built from the form fields.

export type BadgeType = 'TRANSVERSAL' | 'POR_NODO';

/** `SISTEMA` = the 14 fixed ones from the skill. `PROFESOR` = created from the create modal. */
export type BadgeOrigin = 'SISTEMA' | 'PROFESOR';

export type BadgeCriterion =
  | 'XP_MINIMO'
  | 'SECCION_SIN_PERDER_VIDAS'
  | 'NODO_SIN_REINTENTOS'
  | 'VIDA_RECUPERADA'
  | 'NIVEL_ALCANZADO'
  | 'ZONA_P90'
  | 'NODO_OBLIGATORIO_ESPECIFICO'
  | 'NODO_OPCIONAL_COMPLETADO'
  | 'SECCION_EN_UN_DIA'
  | 'PRIMERO_EN_NODO';

export const CRITERION_LABEL: Record<BadgeCriterion, string> = {
  XP_MINIMO: 'XP mínimo acumulado',
  SECCION_SIN_PERDER_VIDAS: 'Sección completada sin perder vidas',
  NODO_SIN_REINTENTOS: 'Nodo completado sin reintentos',
  VIDA_RECUPERADA: 'Vida recuperada',
  NIVEL_ALCANZADO: 'Nivel alcanzado',
  ZONA_P90: 'Entrada a zona P90',
  NODO_OBLIGATORIO_ESPECIFICO: 'Nodo obligatorio específico completado',
  NODO_OPCIONAL_COMPLETADO: 'Nodo opcional completado',
  SECCION_EN_UN_DIA: 'Sección completa en un día',
  PRIMERO_EN_NODO: 'Primero en completar un nodo',
};

/** Criteria that additionally require a numeric value (e.g. "Minimum XP: 500"). */
export const CRITERIA_WITH_VALUE = new Set<BadgeCriterion>(['XP_MINIMO', 'NIVEL_ALCANZADO']);

/** The only cross-cutting criterion that actually points to a specific node, not a number. */
export const CRITERION_SPECIFIC_NODE: BadgeCriterion = 'NODO_OBLIGATORIO_ESPECIFICO';

export interface BadgeCatalog {
  badgeId: string;
  /** Internal stable key — icon key in `badge-icons.ts` (SISTEMA) or `generic-icons.ts` (PROFESOR). */
  code: string;
  name: string;
  description: string;
  type: BadgeType;
  origin: BadgeOrigin;
  /** true = provisional icon (pixel-grids.md marks it "redo"), shown anyway but labeled. */
  pendingIcon: boolean;
  /** Only PROFESOR badges (TRANSVERSAL type): criterion chosen at creation. */
  criterion?: BadgeCriterion;
  /** Only if `criterion` is in `CRITERIA_WITH_VALUE`. */
  valueCriterion?: number;
  /** Only PROFESOR badges with type POR_NODO, or criterion `NODO_OBLIGATORIO_ESPECIFICO`. */
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
