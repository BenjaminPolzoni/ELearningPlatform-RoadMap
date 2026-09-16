// Reglas de negocio del ranking (02-modelo-de-datos.md §7 "Reglas del ranking").
// Funciones puras, sin Angular ni rxjs: se testean con Vitest directo. Las consume el
// `InMemoryRankingAdapter` hoy y las reusará el `HttpRankingAdapter` / backend en Fase 3.

import { FilaRanking, Zona } from '../../core/data/ranking.models';

/** RF-RNK-09: los percentiles P90/P10 solo se activan con 10 o más inscriptos. */
const MIN_INSCRIPTOS_PERCENTILES = 10;

export function cortesActivos(totalInscriptos: number): boolean {
  return totalInscriptos >= MIN_INSCRIPTOS_PERCENTILES;
}

/**
 * Ordena la cohorte y reasigna `posicion` (1..n).
 * Orden: XP total desc y, ante empate, la cascada de desempate RF-RNK-11:
 *   1° más insignias · 2° menos vidas perdidas históricas · 3° más ejercicios completados.
 * Devuelve un array nuevo; no muta la entrada.
 */
export function ordenarCohorte<T extends FilaRanking>(filas: readonly T[]): T[] {
  return [...filas]
    .sort(
      (a, b) =>
        b.xpTotal - a.xpTotal ||
        b.insignias - a.insignias ||
        a.vidasPerdidasHistorico - b.vidasPerdidasHistorico ||
        b.ejerciciosCompletados - a.ejerciciosCompletados,
    )
    .map((fila, i) => ({ ...fila, posicion: i + 1 }));
}

/** Percentil real de una posición (P100 = 1°, decrece hacia el último). */
export function percentilDe(posicion: number, totalInscriptos: number): number {
  if (totalInscriptos <= 0) return 0;
  return Math.round(((totalInscriptos - posicion + 1) / totalInscriptos) * 100);
}

/**
 * Zona de una posición: P90 = decil superior, P10 = decil inferior.
 * `ninguna` siempre que la cohorte no llegue al mínimo de inscriptos (RF-RNK-09).
 */
export function zonaDe(posicion: number, totalInscriptos: number): Zona {
  if (!cortesActivos(totalInscriptos)) return 'ninguna';
  const decil = Math.max(1, Math.floor(totalInscriptos * 0.1));
  if (posicion <= decil) return 'p90';
  if (posicion > totalInscriptos - decil) return 'p10';
  return 'ninguna';
}

// Ambas reglas se evalúan también sobre filas ANÓNIMAS del alumno (`FilaRankingAnon`),
// que conservan `zona`, `vidasPerdidasHistorico` y `obligatoriosAprobadosPct`. Por eso el
// parámetro es el subconjunto de campos que la regla necesita, no `FilaRanking` entero.
type DatosPromocion = Pick<
  FilaRanking,
  'zona' | 'vidasPerdidasHistorico' | 'obligatoriosAprobadosPct'
>;
type DatosRiesgo = Pick<FilaRanking, 'zona' | 'obligatoriosAprobadosPct'>;

/**
 * Candidato a promoción (RF-RNK-05): P90 **y** nunca perdió una vida **y** 100 % de
 * obligatorios aprobados.
 */
export function esCandidatoPromocion(fila: DatosPromocion): boolean {
  return (
    fila.zona === 'p90' && fila.vidasPerdidasHistorico === 0 && fila.obligatoriosAprobadosPct >= 100
  );
}

/**
 * Riesgo de regularidad (RF-RNK-06): P10 **y** no superó todos los ejercicios
 * (se aproxima con obligatorios aprobados < 100 %).
 */
export function enRiesgoRegularidad(fila: DatosRiesgo): boolean {
  return fila.zona === 'p10' && fila.obligatoriosAprobadosPct < 100;
}
