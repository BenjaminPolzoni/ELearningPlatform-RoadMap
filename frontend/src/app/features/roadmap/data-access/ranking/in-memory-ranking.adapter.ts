import { inject, Injectable } from '@angular/core';
import { delay, map, Observable } from 'rxjs';
import { AuthMockService } from '../session/auth-mock.service';
import { AvatarService } from '../avatar/avatar.service';
import { RankingDataPort } from './ranking-data.port';
import { RoadmapDataPort } from '../roadmap/roadmap-data.port';
import { Progress } from '../roadmap/roadmap.models';
import { RankingRow, RankingAnonRow, RankingView } from './ranking.models';
import { cohortMock, CURRENT_STUDENT_ID } from '../mocks/ranking.seed';
import { COURSE_SEED_ID } from '../mocks/seed';
import { nodeLevel } from '../../domain/ranking/node-level';
import { sortCohort, percentileOf, zoneOf } from '../../domain/ranking/ranking.rules';

/**
 * Implementation of {@link RankingDataPort} for Phases 0-2. Acts as the server: builds the
 * fixture cohort and TRIMS it according to the session role (06-contrato-api.md §3) —
 * it never returns the fully identified table to an ALUMNO.
 *
 * Phase 3: replaced by `HttpRankingAdapter` (one line in `app.config.ts`) and the
 * role filtering is done by the BFF with the token's identity.
 */
@Injectable()
export class InMemoryRankingAdapter extends RankingDataPort {
  private readonly auth = inject(AuthMockService);
  private readonly avatarService = inject(AvatarService);
  // The rest of the cohort (`ranking.seed.ts`) is a deliberately fixed fixture
  // (it must not "dance" between loads), but my own row does have to reflect the
  // XP I actually earn — it is overridden here with the live `Progress` from the
  // `RoadmapDataPort` (the same data that feeds the HUD and the map).
  private readonly roadmapPort = inject(RoadmapDataPort);

  getRanking(_courseCohortId: string): Observable<RankingView> {
    return this.roadmapPort.getProgress(CURRENT_STUDENT_ID, COURSE_SEED_ID).pipe(
      delay(300), // simulates the BFF's network latency
      map((studentProgress) => {
        const cohort = this.cohortWithMyXpReal(studentProgress);
        const role = this.auth.role();
        return role === 'STUDENT'
          ? this.studentView(cohort)
          : this.staffView(cohort, role === 'ADMIN' ? 'ADMIN' : 'TEACHER');
      }),
    );
  }

  /**
   * Overrides XP and level of my row with the real Progress (avatar included: the own row
   * shows the "My character" one, not the deterministic mock) and re-sorts the cohort,
   * because my real XP may move me relative to the fixture.
   */
  private cohortWithMyXpReal(studentProgress: Progress): RankingRow[] {
    const base = cohortMock().map((f) =>
      f.studentId === CURRENT_STUDENT_ID
        ? {
            ...f,
            avatar: this.avatarService.avatar(),
            xpTotal: studentProgress.xpTotal,
            nodeLevel: nodeLevel(studentProgress),
          }
        : f,
    );
    const total = base.length;
    return sortCohort(base).map((row) => ({
      ...row,
      percentile: percentileOf(row.position, total),
      zone: zoneOf(row.position, total),
    }));
  }

  /** RF-RNK-03: own row identified; everything else anonymized. */
  private studentView(cohort: RankingRow[]): RankingView {
    const total = cohort.length;
    const isMe = (f: RankingRow) => f.studentId === CURRENT_STUDENT_ID;
    const me = cohort.find(isMe) ?? null;

    // The full list is shown anonymized EXCEPT the own row, which is
    // identified and highlighted inside the same list (not as a separate block).
    const list: (RankingRow | RankingAnonRow)[] = cohort.map((f) =>
      isMe(f) ? f : anonymize(f),
    );
    const anon = cohort.map(anonymize);

    const cutoffs = this.cutoffs(cohort)
      ? {
          p90: anon.find((f) => f.zone === 'p90') ?? anon[0],
          p10: anon.find((f) => f.zone === 'p10') ?? anon[anon.length - 1],
        }
      : null;

    return {
      role: 'STUDENT',
      me,
      top3: anon.slice(0, 3),
      bottom3: anon.slice(-3),
      cutoffs,
      list,
      totalEnrolled: total,
    };
  }

  /** RF-RNK-10: zero anonymity, to audit before archiving the course. */
  private staffView(cohort: RankingRow[], role: 'TEACHER' | 'ADMIN'): RankingView {
    const p90 = cohort.find((f) => f.zone === 'p90')?.position;
    const p10 = cohort.find((f) => f.zone === 'p10')?.position;
    return {
      role,
      rows: cohort,
      cutoffs: this.cutoffs(cohort) && p90 && p10 ? { p90, p10 } : null,
      totalEnrolled: cohort.length,
    };
  }

  /** RF-RNK-09: percentiles active only with >= 10 enrolled. */
  private cutoffs(cohort: RankingRow[]): boolean {
    return cohort.some((f) => f.zone !== 'none');
  }
}

/** Removes identity and adds a stable pseudonym by position. */
function anonymize(row: RankingRow): RankingAnonRow {
  const { studentId: _id, name: _n, lastName: _a, fileNumber: _l, ...rest } = row;
  return { ...rest, pseudonym: `Estudiante #${String(row.position).padStart(2, '0')}` };
}
