import { Observable } from 'rxjs';
import { Activity, Student, Connection, NewActivity, NewSection, Progress, Roadmap, Section } from './roadmap.models';

/**
 * Single data gateway of the front (01-arquitectura-y-stack.md §4). No component
 * calls `HttpClient` directly: everything goes through here. Two interchangeable implementations
 * with one line in `app.config.ts`:
 *   - `InMemoryRoadmapAdapter` (Phases 0-2): reads the seed, mutates in memory, persists in
 *     localStorage. Simulates the already consolidated JSON the BFF would return.
 *   - `HttpRoadmapAdapter` (Phase 3): hits the real BFF.
 */
export abstract class RoadmapDataPort {
  abstract getRoadmap(courseCohortId: string): Observable<Roadmap>;
  abstract addSection(courseCohortId: string, dto: NewSection): Observable<Section>;
  abstract updateSection(courseCohortId: string, sectionId: string, dto: NewSection): Observable<Section>;
  abstract removeSection(courseCohortId: string, sectionId: string): Observable<void>;
  /** Moves a section one position up/down (same pattern as moveActivity). */
  abstract moveSection(courseCohortId: string, sectionId: string, direction: 'arriba' | 'abajo'): Observable<void>;

  // Activities within a section (Phase 2 — Moodle-style editor).
  abstract addActivity(courseCohortId: string, sectionId: string, dto: NewActivity): Observable<Activity>;
  abstract updateActivity(
    courseCohortId: string,
    sectionId: string,
    activityId: string,
    dto: NewActivity,
  ): Observable<Activity>;
  abstract removeActivity(courseCohortId: string, sectionId: string, activityId: string): Observable<void>;
  /** Moves an activity one position up/down (linear movement, 05 §5). */
  abstract moveActivity(
    courseCohortId: string,
    sectionId: string,
    activityId: string,
    direction: 'arriba' | 'abajo',
  ): Observable<void>;

  /** Relocates a node in the graphic editor (posicion_x/posicion_y, 05 §5/§6). */
  abstract moveNode(courseCohortId: string, sectionId: string, activityId: string, x: number, y: number): Observable<void>;

  // Connections (prerequisites) between nodes — mirrors POST/DELETE /conexiones.
  abstract addConnection(courseCohortId: string, nodeOriginId: string, nodeDestinationId: string): Observable<Connection>;
  abstract removeConnection(courseCohortId: string, connectionId: string): Observable<void>;

  abstract getProgress(studentId: string, courseCohortId: string): Observable<Progress>;
  abstract registerProgress(
    studentId: string,
    courseCohortId: string,
    earnedXp: number,
    nodeId?: string,
    lives?: number,
  ): Observable<Progress>;
  abstract markContentRead(studentId: string, courseCohortId: string, nodeId: string): Observable<Progress>;
  abstract getStudents(courseCohortId: string): Observable<Student[]>;
}
