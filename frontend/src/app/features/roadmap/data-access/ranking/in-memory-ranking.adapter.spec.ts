import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthMockService } from '../session/auth-mock.service';
import { InMemoryRankingAdapter } from './in-memory-ranking.adapter';
import { RoadmapDataPort } from '../roadmap/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../roadmap/in-memory-roadmap.adapter';
import { StudentRankingView, StaffRankingView } from './ranking.models';

describe('InMemoryRankingAdapter — trimming by role (RF-RNK-03 / 10)', () => {
  let adapter: InMemoryRankingAdapter;
  let auth: AuthMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InMemoryRankingAdapter, { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter }],
    });
    adapter = TestBed.inject(InMemoryRankingAdapter);
    auth = TestBed.inject(AuthMockService);
  });

  afterEach(() => localStorage.removeItem('mock-role'));

  it('ALUMNO: the list comes anonymized except the own row, which is identified', async () => {
    auth.enterAs('STUDENT');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as StudentRankingView;

    expect(v.role).toBe('STUDENT');
    const identified = v.list.filter((f) => 'name' in f);
    expect(identified).toHaveLength(1);
    expect((identified[0] as { name: string }).name).toBe('Camila');
    expect(v.list.filter((f) => 'pseudonym' in f)).toHaveLength(11);
    expect(v.top3.every((f) => 'pseudonym' in f && !('name' in f))).toBe(true);
    expect(v.top3).toHaveLength(3);
    expect(v.bottom3).toHaveLength(3);
    expect(v.me?.name).toBe('Camila'); // stu-01 in studentsSeed()
    expect(v.me?.fileNumber).toBe('90001');
  });

  it('ALUMNO: with 12 enrolled there are P90/P10 cutoffs (RF-RNK-09)', async () => {
    auth.enterAs('STUDENT');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as StudentRankingView;
    expect(v.totalEnrolled).toBe(12);
    expect(v.cutoffs).not.toBeNull();
    expect(v.cutoffs!.p90.zone).toBe('p90');
    expect(v.cutoffs!.p10.zone).toBe('p10');
  });

  it('PROFESOR: receives all the identified rows', async () => {
    auth.enterAs('TEACHER');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as StaffRankingView;
    expect(v.role).toBe('TEACHER');
    expect(v.rows).toHaveLength(12);
    expect(v.rows.every((f) => typeof f.fileNumber === 'string' && f.fileNumber.length > 0)).toBe(true);
    expect(v.rows[0].position).toBe(1);
  });

  it('the order respects descending XP', async () => {
    auth.enterAs('TEACHER');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as StaffRankingView;
    const xps = v.rows.map((f) => f.xpTotal);
    expect(xps).toEqual([...xps].sort((a, b) => b - a));
  });
});
