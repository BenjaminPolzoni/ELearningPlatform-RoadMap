import { Observable } from 'rxjs';
import { RankingView } from './ranking.models';

/**
 * Single data gateway for the ranking — same pattern as {@link RoadmapDataPort}
 * (01-arquitectura-y-stack.md §4). No component builds the per-role view: it asks for it here
 * and the adapter (Phases 0-2) or the BFF (Phase 3) returns it already filtered by the token.
 *
 * Switching implementation is one line in `app.config.ts`:
 *   { provide: RankingDataPort, useClass: InMemoryRankingAdapter }  // → HttpRankingAdapter
 */
export abstract class RankingDataPort {
  /**
   * Cohort standings table. The SHAPE of the result depends on the session role
   * (06-contrato-api.md §3): `StudentRankingView` for ALUMNO (top 3, bottom 3,
   * their row and anonymous cutoffs) or `StaffRankingView` for PROFESOR (all identified).
   */
  abstract getRanking(courseCohortId: string): Observable<RankingView>;
}
