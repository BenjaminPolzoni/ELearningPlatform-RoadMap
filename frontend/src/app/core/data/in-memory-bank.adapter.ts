import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { BankDataPort } from './bank-data.port';

const LS_PREFIX = 'bank-mock-v2';
const CACHE_TTL_MS = 30_000; // 30 seconds — fresh data from the "service"

interface BankCacheEntry {
  coins: number;
  xp: number;
  lives: number;
  lastFetch: number;
}

interface BankSeed {
  coins: number;
  xp: number;
  lives: number;
}

/** Seed per student (simulates what the Bank would have in its database). */
const SEED: Record<string, BankSeed> = {
  'stu-01': { coins: 3050, xp: 350, lives: 3 },
  'stu-02': { coins: 5400, xp: 0, lives: 3 },
  'stu-03': { coins: 1200, xp: 0, lives: 3 },
  'stu-04': { coins: 800, xp: 0, lives: 3 },
  'stu-05': { coins: 4200, xp: 0, lives: 3 },
};

/**
 * Bank mock (Topic 08) with per-student cache and degradation to unavailable.
 *
 * Strategy:
 * 1. First try to read from the cache (localStorage + BehaviorSubject).
 * 2. If the cache is fresh (< CACHE_TTL_MS), return the cached value.
 * 3. If it is stale or missing, simulate a call to the "service" (setTimeout 200ms).
 * 4. If the "call" fails (simulated with 10% probability), degrade: return the
 *    last known value or 0 if there was never a cache.
 * 5. `buyLife` validates balance and lives before executing.
 */
@Injectable()
export class InMemoryBankAdapter extends BankDataPort {
  private readonly cache = new Map<string, BehaviorSubject<BankCacheEntry>>();
  private readonly failedStudents = new Set<string>();

  constructor() {
    super();
  }

  getCoins(studentId: string, courseCohortId: string): Observable<number> {
    return this.getEntry(studentId, courseCohortId).pipe(map((e) => e.coins));
  }

  getXP(studentId: string, courseCohortId: string): Observable<number> {
    return this.getEntry(studentId, courseCohortId).pipe(map((e) => e.xp));
  }

  getLives(studentId: string, courseCohortId: string): Observable<number> {
    return this.getEntry(studentId, courseCohortId).pipe(map((e) => e.lives));
  }

  buyLife(
    studentId: string,
    courseCohortId: string,
    costCoins: number,
  ): Observable<{ success: boolean; newBalance: number; newLives: number; reason?: string }> {
    return this.getEntry(studentId, courseCohortId).pipe(
      switchMap((entry) => {
        if (entry.lives >= 3) {
          return of({ success: false, newBalance: entry.coins, newLives: entry.lives, reason: 'Ya tienes el máximo de vidas' });
        }
        if (entry.coins < costCoins) {
          return of({ success: false, newBalance: entry.coins, newLives: entry.lives, reason: `Monedas insuficientes (necesitás ${costCoins})` });
        }
        const updated: BankCacheEntry = {
          ...entry,
          coins: entry.coins - costCoins,
          lives: entry.lives + 1,
          lastFetch: Date.now(),
        };
        this.setEntry(studentId, courseCohortId, updated);
        return of({ success: true, newBalance: updated.coins, newLives: updated.lives });
      }),
    );
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private getEntry(studentId: string, courseCohortId: string): Observable<BankCacheEntry> {
    const key = this.key(studentId, courseCohortId);
    const existing = this.cache.get(key);

    // Fresh cache → return directly
    if (existing && Date.now() - existing.value.lastFetch < CACHE_TTL_MS) {
      return existing.asObservable();
    }

    // Simulate a call to the "Bank service" (200ms latency, 10% failure)
    return new Observable<BankCacheEntry>((observer) => {
      setTimeout(() => {
        // 10% probability of failure if there is no previous data
        if (!existing && Math.random() < 0.1) {
          this.failedStudents.add(studentId);
          observer.next(this.fallbackEntry(studentId));
          observer.complete();
          return;
        }

        const seed = SEED[studentId] ?? { coins: 0, xp: 0, lives: 3 };
        const entry: BankCacheEntry = { ...seed, lastFetch: Date.now() };

        // If there was a previous failure, recover (simulates the service coming back)
        this.failedStudents.delete(studentId);
        this.setEntry(studentId, courseCohortId, entry);
        observer.next(entry);
        observer.complete();
      }, 200);
    }).pipe(
      catchError(() => {
        // Total degradation: return last known or seed
        const cached = this.cache.get(key);
        return of(cached?.value ?? this.fallbackEntry(studentId));
      }),
    );
  }

  private fallbackEntry(studentId: string): BankCacheEntry {
    const seed = SEED[studentId] ?? { coins: 0, xp: 0, lives: 3 };
    return { ...seed, lastFetch: 0 }; // lastFetch=0 → always stale
  }

  private setEntry(studentId: string, courseCohortId: string, entry: BankCacheEntry): void {
    const key = this.key(studentId, courseCohortId);
    const subject = this.cache.get(key);
    if (subject) {
      subject.next(entry);
    } else {
      this.cache.set(key, new BehaviorSubject<BankCacheEntry>(entry));
    }
    // Persist to localStorage to survive a refresh
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      /* incognito mode / storage full */
    }
  }

  private key(studentId: string, courseCohortId: string): string {
    return `${LS_PREFIX}-${courseCohortId}-${studentId}`;
  }
}
