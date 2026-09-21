import { Observable } from 'rxjs';
import { BadgeCatalog, GrantedBadge, NewBadge } from './badges.models';

/**
 * Single data gateway for the badge catalog — same pattern as {@link RoadmapDataPort}
 * (01-arquitectura-y-stack.md §4). The catalog is per course-cohort (roadmap-requerimientos.md
 * §9: `/roadmaps/{cc}/insignias/catalogo`), not global.
 *
 * Switching implementation is one line in `app.config.ts`:
 *   { provide: BadgesDataPort, useClass: InMemoryBadgesAdapter }  // → HttpBadgesAdapter
 */
export abstract class BadgesDataPort {
  /** GET /api/roadmap/roadmaps/{cc}/insignias/catalogo */
  abstract getCatalog(courseCohortId: string): Observable<BadgeCatalog[]>;
  /** GET /api/roadmap/alumnos/{aid}/insignias?curso_cohorte_id={cc} */
  abstract getEarnedByStudent(studentId: string): Observable<GrantedBadge[]>;
  /** POST /api/roadmap/roadmaps/{cc}/insignias/catalogo — PROFESOR only. */
  abstract create(courseCohortId: string, dto: NewBadge): Observable<BadgeCatalog>;
}
