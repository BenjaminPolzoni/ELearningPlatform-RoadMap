// Cohort fixture for the ranking (Phases 0-2). It is built on top of `studentsSeed()` so
// that the 12 students, their names and file numbers are THE SAME ones the rest of the app sees
// (02-modelo-de-datos.md §"El seed no es descartable: es el fixture con el que se prueba
// el ranking"). Fixed and deterministic numbers — the ranking must not "dance" between loads.
//
// AVATAR: same `AvatarConfig` used by the rest of the platform (HUD, map, "My
// character"), not a separate image. The logged-in student sees their real avatar (AvatarService);
// the rest of the cohort gets a deterministic combination per student — it never changes
// between loads and no two students ever share exactly the same look.

import { assembleAvatar, AvatarConfig } from '../core/avatar/avatar.models';
import { RankingRow } from '../core/data/ranking.models';
import { sortCohort, percentileOf, zoneOf } from '../domain/ranking/ranking.rules';
import { studentsSeed } from './seed';

/** Logged-in student in the mock (matches `features/student/map.ts`). */
export const CURRENT_STUDENT_ID = 'stu-01';

/** Deterministic avatar combination by `seed` — same catalog as the avatar editor. */
export function avatarConfigMock(seed: string): AvatarConfig {
  // One hash per field: with 12 fields, splitting the 32 bits of a single hash at 3 bits per
  // field is no longer enough (the last fields would always come out of the same remainder).
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  return assembleAvatar((field, options) => options[hash(`${seed}:${field}`) % options.length].id);
}

/**
 * Raw data per student (12 rows). Designed to exercise the rules:
 *  - stu-02 leads cleanly → promotion candidate (RF-RNK-05).
 *  - stu-03 is in the high zone but with one lost life → NOT a candidate.
 *  - stu-01 (the logged-in user) is mid-table.
 *  - the last ones carry unfinished mandatory items → regularity risk (RF-RNK-06).
 */
interface Raw {
  id: string;
  xpTotal: number;
  nodeLevel: number;
  badges: number;
  lives: number;
  coins: number;
  lostLives: number;
  completedExercises: number;
  mandatoryPassedPct: number;
}

const RAW: Raw[] = [
  {
    id: 'stu-02',
    xpTotal: 4820,
    nodeLevel: 18,
    badges: 9,
    lives: 3,
    coins: 5400,
    lostLives: 0,
    completedExercises: 46,
    mandatoryPassedPct: 100,
  },
  {
    id: 'stu-05',
    xpTotal: 4310,
    nodeLevel: 16,
    badges: 7,
    lives: 3,
    coins: 4700,
    lostLives: 0,
    completedExercises: 41,
    mandatoryPassedPct: 100,
  },
  {
    id: 'stu-03',
    xpTotal: 4180,
    nodeLevel: 16,
    badges: 8,
    lives: 2,
    coins: 4300,
    lostLives: 1,
    completedExercises: 40,
    mandatoryPassedPct: 95,
  },
  {
    id: 'stu-09',
    xpTotal: 3600,
    nodeLevel: 14,
    badges: 6,
    lives: 3,
    coins: 3800,
    lostLives: 0,
    completedExercises: 35,
    mandatoryPassedPct: 92,
  },
  {
    id: 'stu-07',
    xpTotal: 3255,
    nodeLevel: 13,
    badges: 5,
    lives: 2,
    coins: 3300,
    lostLives: 1,
    completedExercises: 32,
    mandatoryPassedPct: 88,
  },
  {
    id: 'stu-01',
    xpTotal: 2980,
    nodeLevel: 12,
    badges: 5,
    lives: 3,
    coins: 3050,
    lostLives: 0,
    completedExercises: 29,
    mandatoryPassedPct: 84,
  },
  {
    id: 'stu-11',
    xpTotal: 2740,
    nodeLevel: 11,
    badges: 4,
    lives: 2,
    coins: 2600,
    lostLives: 1,
    completedExercises: 27,
    mandatoryPassedPct: 80,
  },
  {
    id: 'stu-04',
    xpTotal: 2390,
    nodeLevel: 10,
    badges: 4,
    lives: 2,
    coins: 2200,
    lostLives: 2,
    completedExercises: 24,
    mandatoryPassedPct: 72,
  },
  {
    id: 'stu-08',
    xpTotal: 2015,
    nodeLevel: 9,
    badges: 3,
    lives: 1,
    coins: 1750,
    lostLives: 2,
    completedExercises: 20,
    mandatoryPassedPct: 65,
  },
  {
    id: 'stu-12',
    xpTotal: 1580,
    nodeLevel: 7,
    badges: 2,
    lives: 1,
    coins: 1200,
    lostLives: 3,
    completedExercises: 16,
    mandatoryPassedPct: 55,
  },
  {
    id: 'stu-06',
    xpTotal: 1240,
    nodeLevel: 6,
    badges: 2,
    lives: 1,
    coins: 900,
    lostLives: 3,
    completedExercises: 12,
    mandatoryPassedPct: 48,
  },
  {
    id: 'stu-10',
    xpTotal: 820,
    nodeLevel: 4,
    badges: 1,
    lives: 0,
    coins: 400,
    lostLives: 3,
    completedExercises: 8,
    mandatoryPassedPct: 33,
  },
];

/**
 * Full cohort, ALREADY sorted and with `position` / `percentile` / `zone` resolved by the
 * domain rules. It is what the BFF would deliver consolidated; the adapter trims it by role.
 */
export function cohortMock(): RankingRow[] {
  const students = new Map(studentsSeed().map((a) => [a.id, a]));
  const total = RAW.length;

  const withoutPosition: RankingRow[] = RAW.map((c) => {
    const a = students.get(c.id)!;
    return {
      studentId: a.id,
      position: 0, // set by sortCohort
      name: a.name,
      lastName: a.lastName,
      fileNumber: a.fileNumber,
      avatar: avatarConfigMock(a.id),
      xpTotal: c.xpTotal,
      nodeLevel: c.nodeLevel,
      percentile: 0,
      zone: 'none',
      badges: c.badges,
      lives: c.lives,
      coins: c.coins,
      lostLives: c.lostLives,
      completedExercises: c.completedExercises,
      mandatoryPassedPct: c.mandatoryPassedPct,
    };
  });

  return sortCohort(withoutPosition).map((row) => ({
    ...row,
    percentile: percentileOf(row.position, total),
    zone: zoneOf(row.position, total),
  }));
}
