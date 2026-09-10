// Catálogo de insignias del módulo Roadmap. No confundir con las insignias GANADAS por un
// alumno (`GET /alumnos/{aid}/insignias`, [PLANEADO] en 06-contrato-api.md — devuelve
// insigniaId + otorgadaEn, no la definición). El catálogo hoy no tiene endpoint ni entidad
// de backend: esta forma es la propuesta para cuando exista (probablemente el mismo CRUD
// del profesor que todavía no se implementa).

export type TipoInsignia = 'TRANSVERSAL' | 'POR_NODO';

/** `SISTEMA` = las 14 fijas de la skill. `PROFESOR` = creadas por el CRUD (no implementado todavía). */
export type OrigenInsignia = 'SISTEMA' | 'PROFESOR';

export interface InsigniaCatalogo {
  insigniaId: string;
  /** Clave estable interna — también la clave de ícono en `badge-icons.ts`. No viaja al alumno. */
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoInsignia;
  origen: OrigenInsignia;
  /** true = ícono provisorio (pixel-grids.md lo marca "rehacer"), se muestra igual pero etiquetado. */
  iconoPendiente: boolean;
}

/**
 * Insignia GANADA por un alumno — misma forma que el schema `Insignia` de
 * `GET /alumnos/{aid}/insignias` ([PLANEADO] en 06-contrato-api.md). Para mostrarla hace
 * falta cruzarla con el catálogo por `insigniaId` (acá no viaja nombre/ícono).
 */
export interface InsigniaOtorgada {
  insigniaId: string;
  otorgadaEn: string;
}
