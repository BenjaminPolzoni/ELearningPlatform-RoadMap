import { Observable } from 'rxjs';

/**
 * Data gateway for the Bank (Topic 08) — coins, lives and XP the student owns.
 * In production the BFF resolves this; in Phases 0-2 an in-memory mock with
 * cache and degradation to unavailable if the "service" fails.
 *
 * Flow: the frontend calls these methods; the adapter decides whether the source
 * is available (valid cache / service up) or degrades gracefully.
 */
export abstract class BankDataPort {
  /** Current coin balance of the student in a course-cohort. */
  abstract getCoins(studentId: string, courseCohortId: string): Observable<number>;

  /** Consolidated total XP of the student (the source of truth is the Bank, not the front). */
  abstract getXP(studentId: string, courseCohortId: string): Observable<number>;

  /** Current lives of the student (max PAR-12 = 3). */
  abstract getLives(studentId: string, courseCohortId: string): Observable<number>;

  /** Life purchase: deducts coins (PAR-06: 300) and returns 1 life. */
  abstract buyLife(
    studentId: string,
    courseCohortId: string,
    costCoins: number,
  ): Observable<{ success: boolean; newBalance: number; newLives: number; reason?: string }>;
}
