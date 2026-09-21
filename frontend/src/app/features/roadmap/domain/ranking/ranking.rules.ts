// Business rules of the ranking (02-modelo-de-datos.md §7 "Reglas del ranking").
// Pure functions, without Angular or rxjs: tested directly with Vitest. Consumed by the
// `InMemoryRankingAdapter` today and reused by the `HttpRankingAdapter` / backend in Phase 3.

import { RankingRow, Zone } from '../../data-access/ranking/ranking.models';

/** RF-RNK-09: the P90/P10 percentiles are only activated with 10 or more enrolled. */
const MIN_ENROLLED_PERCENTILES = 10;

export function activeCutoffs(totalEnrolled: number): boolean {
  return totalEnrolled >= MIN_ENROLLED_PERCENTILES;
}

/**
 * Sorts the cohort and reassigns `position` (1..n).
 * Order: total XP desc and, on a tie, the RF-RNK-11 tiebreak cascade:
 *   1° more badges · 2° fewer historical lost lives · 3° more completed exercises.
 * Returns a new array; does not mutate the input.
 */
export function sortCohort<T extends RankingRow>(rows: readonly T[]): T[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.xpTotal - a.xpTotal ||
        b.badges - a.badges ||
        a.lostLives - b.lostLives ||
        b.completedExercises - a.completedExercises,
    )
    .map((row, i) => ({ ...row, position: i + 1 }));
}

/** Real percentile of a position (P100 = 1st, decreasing towards the last). */
export function percentileOf(position: number, totalEnrolled: number): number {
  if (totalEnrolled <= 0) return 0;
  return Math.round(((totalEnrolled - position + 1) / totalEnrolled) * 100);
}

/**
 * Zone of a position: P90 = top decile, P10 = bottom decile.
 * `none` whenever the cohort does not reach the minimum number of enrolled (RF-RNK-09).
 */
export function zoneOf(position: number, totalEnrolled: number): Zone {
  if (!activeCutoffs(totalEnrolled)) return 'none';
  const decile = Math.max(1, Math.floor(totalEnrolled * 0.1));
  if (position <= decile) return 'p90';
  if (position > totalEnrolled - decile) return 'p10';
  return 'none';
}

// Both rules are also evaluated over the student's ANONYMOUS rows (`RankingAnonRow`),
// which keep `zone`, `lostLives` and `mandatoryPassedPct`. That is why the
// parameter is the subset of fields the rule needs, not the whole `RankingRow`.
type PromotionData = Pick<
  RankingRow,
  'zone' | 'lostLives' | 'mandatoryPassedPct'
>;
type RiskData = Pick<RankingRow, 'zone' | 'mandatoryPassedPct'>;

/**
 * Promotion candidate (RF-RNK-05): P90 **and** never lost a life **and** 100 % of
 * mandatory items passed.
 */
export function isCandidatePromotion(row: PromotionData): boolean {
  return (
    row.zone === 'p90' && row.lostLives === 0 && row.mandatoryPassedPct >= 100
  );
}

/**
 * Regularity risk (RF-RNK-06): P10 **and** did not pass all the exercises
 * (approximated with mandatory passed < 100 %).
 */
export function inRiskRegularity(row: RiskData): boolean {
  return row.zone === 'p10' && row.mandatoryPassedPct < 100;
}
