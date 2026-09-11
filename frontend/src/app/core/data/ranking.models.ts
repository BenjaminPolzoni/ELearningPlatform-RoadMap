// Tipos del ranking por cohorte (épica E8 — "Comparativas de cohorte").
// Espejo reducido de la vista materializada `RankingEntrada` (02-modelo-de-datos.md
// §"Niveles, insignias, ranking y cierre") y de la respuesta de `GET /roadmaps/{cc}/ranking`.
//
// Regla clave (06-contrato-api.md §3): esa respuesta CAMBIA según el rol del token.
// El servidor filtra y el front nunca recibe lo que ese rol no puede ver — por eso hay
// dos vistas distintas (`VistaRankingAlumno` / `VistaRankingStaff`), no una sola que el
// componente recorte.

import { AvatarConfig } from '../avatar/avatar.models';

export type Zona = 'ninguna' | 'p90' | 'p10';

/**
 * Fila identificada. Solo la reciben: PROFESOR/ADMIN (todas, RF-RNK-10) o el propio
 * ALUMNO respecto de SU fila (RF-RNK-03/07). `monedas` y el perfil (nombre/legajo/avatar)
 * son campos que en producción consolida el BFF desde otros servicios — acá son stub.
 */
export interface FilaRanking {
  alumnoId: string;
  posicion: number;
  nombre: string;
  apellido: string;
  legajo: string;
  /** Mismo sprite pixel-art que el resto de la plataforma (HUD, mapa, "Mi personaje"). */
  avatar: AvatarConfig;
  xpTotal: number;
  /**
   * NODO actual del alumno dentro del mapa de progreso del curso (no `floor(xp/n)`):
   * la XP se acumula por los desafíos de cada nodo; el nivel es el nodo donde está parado.
   * RF-NIV-05: el nivel es cosmético, el ranking ordena por `xpTotal` real.
   */
  nivelNodo: number;
  percentil: number;
  zona: Zona;
  /** Primer criterio de desempate (RF-RNK-11). */
  insignias: number;
  vidas: number; // vigentes (PAR-12: máx 3) — stub del BFF
  monedas: number; // stub del BFF (Banco, T-Banco)
  vidasPerdidasHistorico: number;
  ejerciciosCompletados: number;
  /** 0..100 — insumo del candidato a promoción (RF-RNK-05). */
  obligatoriosAprobadosPct: number;
}

/** Lo que un ALUMNO ve de cualquier fila que NO es la suya: stats sin identidad (RF-RNK-03/07). */
export type FilaRankingAnon = Omit<FilaRanking, 'alumnoId' | 'nombre' | 'apellido' | 'legajo'> & {
  /** Seudónimo estable por posición, p. ej. "Estudiante #07". */
  seudonimo: string;
};

/** Vista del ALUMNO (RF-RNK-03): anonimato estricto salvo la fila propia. */
export interface VistaRankingAlumno {
  rol: 'ALUMNO';
  /** Fila propia con identidad completa; null si el alumno no está en la cohorte. */
  yo: FilaRanking | null;
  top3: FilaRankingAnon[];
  bottom3: FilaRankingAnon[];
  /** Filas de corte, anónimas. null si la cohorte tiene < 10 inscriptos (RF-RNK-09). */
  cortes: { p90: FilaRankingAnon; p10: FilaRankingAnon } | null;
  /**
   * Cohorte completa, con scroll: cada entrada anonimizada salvo la fila propia, que
   * viene identificada y se resalta dentro de la misma lista (RF-RNK-03).
   */
  lista: (FilaRanking | FilaRankingAnon)[];
  totalInscriptos: number;
}

/** Vista de PROFESOR/ADMIN (RF-RNK-10): cero anonimato, para auditar antes de archivar. */
export interface VistaRankingStaff {
  rol: 'PROFESOR' | 'ADMIN';
  filas: FilaRanking[];
  /** Posiciones de corte (p. ej. 2 y 11); null si < 10 inscriptos (RF-RNK-09). */
  cortes: { p90: number; p10: number } | null;
  totalInscriptos: number;
}

export type VistaRanking = VistaRankingAlumno | VistaRankingStaff;
