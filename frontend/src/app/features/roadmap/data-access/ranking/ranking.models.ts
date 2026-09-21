// Types for the per-cohort ranking (epic E8 — "Cohort comparisons").
// Reduced mirror of the materialized view `RankingEntrada` (02-modelo-de-datos.md
// §"Niveles, insignias, ranking y cierre") and of the response of `GET /roadmaps/{cc}/ranking`.
//
// Key rule (06-contrato-api.md §3): that response CHANGES depending on the token's role.
// The server filters and the front never receives what that role cannot see — that is why there are
// two distinct views (`StudentRankingView` / `StaffRankingView`), not a single one that the
// component would trim.

import { AvatarConfig } from '../avatar/avatar.models';

export type Zone = 'none' | 'p90' | 'p10';

/**
 * Identified row. Only received by: PROFESOR (all of them, RF-RNK-10) or the ALUMNO
 * themselves regarding THEIR row (RF-RNK-03/07). `coins` and the profile (name/file number/avatar)
 * are fields that in production the BFF consolidates from other services — here they are stubs.
 */
export interface RankingRow {
  studentId: string;
  position: number;
  name: string;
  lastName: string;
  fileNumber: string;
  /** Same pixel-art sprite as the rest of the platform (HUD, map, "My character"). */
  avatar: AvatarConfig;
  xpTotal: number;
  /**
   * CURRENT NODE of the student within the course's progress map (not `floor(xp/n)`):
   * XP accumulates through each node's challenges; the level is the node where they stand.
   * RF-NIV-05: the level is cosmetic, the ranking sorts by real `xpTotal`.
   */
  nodeLevel: number;
  percentile: number;
  zone: Zone;
  /** First tiebreaker criterion (RF-RNK-11). */
  badges: number;
  lives: number; // current (PAR-12: max 3) — BFF stub
  coins: number; // BFF stub (Bank, T-Bank)
  lostLives: number;
  completedExercises: number;
  /** 0..100 — input for the promotion candidate (RF-RNK-05). */
  mandatoryPassedPct: number;
}

/** What a STUDENT sees of any row that is NOT theirs: stats without identity (RF-RNK-03/07). */
export type RankingAnonRow = Omit<RankingRow, 'studentId' | 'name' | 'lastName' | 'fileNumber'> & {
  /** Stable pseudonym by position, e.g. "Estudiante #07". */
  pseudonym: string;
};

/** STUDENT view (RF-RNK-03): strict anonymity except the own row. */
export interface StudentRankingView {
  role: 'STUDENT';
  /** Own row with full identity; null if the student is not in the cohort. */
  me: RankingRow | null;
  top3: RankingAnonRow[];
  bottom3: RankingAnonRow[];
  /** Cutoff rows, anonymous. null if the cohort has < 10 enrolled (RF-RNK-09). */
  cutoffs: { p90: RankingAnonRow; p10: RankingAnonRow } | null;
  /**
   * Full cohort, scrollable: each entry anonymized except the own row, which
   * comes identified and is highlighted inside the same list (RF-RNK-03).
   */
  list: (RankingRow | RankingAnonRow)[];
  totalEnrolled: number;
}

/** PROFESOR view (RF-RNK-10): zero anonymity, to audit before archiving. */
export interface StaffRankingView {
  role: 'TEACHER';
  rows: RankingRow[];
  /** Cutoff positions (e.g. 2 and 11); null if < 10 enrolled (RF-RNK-09). */
  cutoffs: { p90: number; p10: number } | null;
  totalEnrolled: number;
}

export type RankingView = StudentRankingView | StaffRankingView;
