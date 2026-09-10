// Catálogo de insignias del módulo Roadmap. No confundir con las insignias GANADAS por un
// alumno (`GET /api/roadmap/alumnos/{aid}/insignias` — devuelve insigniaId + otorgadaEn,
// no la definición). Rutas reales (roadmap-requerimientos.md §9):
//   GET  /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR, ALUMNO
//   POST /api/roadmap/roadmaps/{cc}/insignias/catalogo         — PROFESOR
//   PUT  /api/roadmap/roadmaps/{cc}/insignias/catalogo/{id}    — PROFESOR (no implementado todavía)
// Esas rutas confirman path/rol; no hay schema de body documentado, así que `NuevaInsignia`
// e `InsigniaCatalogo` son una propuesta armada a partir de los campos del form.

export type TipoInsignia = 'TRANSVERSAL' | 'POR_NODO';

/** `SISTEMA` = las 14 fijas de la skill. `PROFESOR` = creadas desde el modal de alta. */
export type OrigenInsignia = 'SISTEMA' | 'PROFESOR';

export type CriterioInsignia =
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

export const CRITERIO_LABEL: Record<CriterioInsignia, string> = {
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

/** Criterios que además piden un valor numérico (p. ej. "XP mínimo: 500"). */
export const CRITERIOS_CON_VALOR = new Set<CriterioInsignia>(['XP_MINIMO', 'NIVEL_ALCANZADO']);

/** El único criterio transversal que en realidad apunta a un nodo puntual, no a un número. */
export const CRITERIO_NODO_ESPECIFICO: CriterioInsignia = 'NODO_OBLIGATORIO_ESPECIFICO';

export interface InsigniaCatalogo {
  insigniaId: string;
  /** Clave estable interna — clave de ícono en `badge-icons.ts` (SISTEMA) o `generic-icons.ts` (PROFESOR). */
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoInsignia;
  origen: OrigenInsignia;
  /** true = ícono provisorio (pixel-grids.md lo marca "rehacer"), se muestra igual pero etiquetado. */
  iconoPendiente: boolean;
  /** Solo insignias PROFESOR (tipo TRANSVERSAL): criterio elegido en el alta. */
  criterio?: CriterioInsignia;
  /** Solo si `criterio` está en `CRITERIOS_CON_VALOR`. */
  valorCriterio?: number;
  /** Solo insignias PROFESOR con tipo POR_NODO, o criterio `NODO_OBLIGATORIO_ESPECIFICO`. */
  nodoId?: string;
}

/**
 * Insignia GANADA por un alumno — misma forma que el schema `Insignia` de
 * `GET /api/roadmap/alumnos/{aid}/insignias`. Para mostrarla hace falta cruzarla con el
 * catálogo por `insigniaId` (acá no viaja nombre/ícono).
 */
export interface InsigniaOtorgada {
  insigniaId: string;
  otorgadaEn: string;
}

/** Body del alta (`POST /api/roadmap/roadmaps/{cc}/insignias/catalogo`). */
export interface NuevaInsignia {
  nombre: string;
  /** Código de `generic-icons.ts` — nunca uno de los 15 íconos fijos del catálogo. */
  icono: string;
  tipo: TipoInsignia;
  criterio?: CriterioInsignia;
  valorCriterio?: number;
  nodoId?: string;
}
