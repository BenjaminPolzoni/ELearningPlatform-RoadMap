import { describe, expect, it } from 'vitest';
import { defaultAvatar } from '../../data-access/avatar/avatar.models';
import { RankingRow } from '../../data-access/ranking/ranking.models';
import {
  activeCutoffs,
  inRiskRegularity,
  isCandidatePromotion,
  sortCohort,
  percentileOf,
  zoneOf,
} from './ranking.rules';

function row(over: Partial<RankingRow>): RankingRow {
  return {
    studentId: 'x',
    position: 0,
    name: 'N',
    lastName: 'A',
    fileNumber: '0',
    avatar: defaultAvatar('unspecified'),
    xpTotal: 1000,
    nodeLevel: 5,
    percentile: 0,
    zone: 'none',
    badges: 0,
    lives: 3,
    coins: 0,
    lostLives: 0,
    completedExercises: 0,
    mandatoryPassedPct: 100,
    ...over,
  };
}

describe('sortCohort', () => {
  it('sorts by XP descending and numbers the positions', () => {
    const r = sortCohort([
      row({ studentId: 'b', xpTotal: 500 }),
      row({ studentId: 'a', xpTotal: 900 }),
      row({ studentId: 'c', xpTotal: 100 }),
    ]);
    expect(r.map((f) => f.studentId)).toEqual(['a', 'b', 'c']);
    expect(r.map((f) => f.position)).toEqual([1, 2, 3]);
  });

  it('applies the RF-RNK-11 tiebreak cascade: +badges, −lost lives, +exercises', () => {
    const base = { xpTotal: 1000 };
    const byBadges = sortCohort([
      row({ studentId: 'pocas', ...base, badges: 2 }),
      row({ studentId: 'muchas', ...base, badges: 6 }),
    ]);
    expect(byBadges[0].studentId).toBe('muchas');

    const byLives = sortCohort([
      row({ studentId: 'perdio', ...base, badges: 3, lostLives: 2 }),
      row({ studentId: 'intacto', ...base, badges: 3, lostLives: 0 }),
    ]);
    expect(byLives[0].studentId).toBe('intacto');

    const byExercises = sortCohort([
      row({
        studentId: 'menos',
        ...base,
        badges: 3,
        lostLives: 1,
        completedExercises: 10,
      }),
      row({
        studentId: 'mas',
        ...base,
        badges: 3,
        lostLives: 1,
        completedExercises: 30,
      }),
    ]);
    expect(byExercises[0].studentId).toBe('mas');
  });

  it('does not mutate the input array', () => {
    const entry = [row({ xpTotal: 1 }), row({ xpTotal: 2 })];
    const copy = [...entry];
    sortCohort(entry);
    expect(entry).toEqual(copy);
  });
});

describe('percentiles and zones (RF-RNK-09)', () => {
  it('the cutoffs are activated only with 10 or more enrolled', () => {
    expect(activeCutoffs(9)).toBe(false);
    expect(activeCutoffs(10)).toBe(true);
  });

  it('with fewer than 10 enrolled no position has a zone', () => {
    expect(zoneOf(1, 9)).toBe('none');
    expect(zoneOf(9, 9)).toBe('none');
  });

  it('with 12 enrolled it marks P90 on top and P10 at the bottom', () => {
    expect(zoneOf(1, 12)).toBe('p90');
    expect(zoneOf(6, 12)).toBe('none');
    expect(zoneOf(12, 12)).toBe('p10');
  });

  it('percentile decreasing by position', () => {
    expect(percentileOf(1, 12)).toBe(100);
    expect(percentileOf(12, 12)).toBe(8);
  });
});

describe('promotion candidate / regularity risk', () => {
  it('candidate = P90 + 0 lost lives + 100% mandatory (RF-RNK-05)', () => {
    expect(
      isCandidatePromotion(
        row({ zone: 'p90', lostLives: 0, mandatoryPassedPct: 100 }),
      ),
    ).toBe(true);
    expect(
      isCandidatePromotion(
        row({ zone: 'p90', lostLives: 1, mandatoryPassedPct: 100 }),
      ),
    ).toBe(false);
    expect(
      isCandidatePromotion(
        row({ zone: 'none', lostLives: 0, mandatoryPassedPct: 100 }),
      ),
    ).toBe(false);
  });

  it('risk = P10 + unfinished mandatory items (RF-RNK-06)', () => {
    expect(inRiskRegularity(row({ zone: 'p10', mandatoryPassedPct: 70 }))).toBe(true);
    expect(inRiskRegularity(row({ zone: 'p10', mandatoryPassedPct: 100 }))).toBe(false);
    expect(inRiskRegularity(row({ zone: 'none', mandatoryPassedPct: 40 }))).toBe(
      false,
    );
  });
});
