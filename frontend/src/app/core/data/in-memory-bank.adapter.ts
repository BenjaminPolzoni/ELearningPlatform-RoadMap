import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { BancoDataPort } from './banco-data.port';

const LS_PREFIX = 'banco-mock-v2';
const CACHE_TTL_MS = 30_000; // 30 segundos — datos frescos del "servicio"

interface BancoCacheEntry {
  monedas: number;
  xp: number;
  vidas: number;
  lastFetch: number;
}

interface BancoSeed {
  monedas: number;
  xp: number;
  vidas: number;
}

/** Seed por alumno (simula lo que Banco tendría en su base). */
const SEED: Record<string, BancoSeed> = {
  'alu-01': { monedas: 3050, xp: 350, vidas: 3 },
  'alu-02': { monedas: 5400, xp: 0, vidas: 3 },
  'alu-03': { monedas: 1200, xp: 0, vidas: 3 },
  'alu-04': { monedas: 800, xp: 0, vidas: 3 },
  'alu-05': { monedas: 4200, xp: 0, vidas: 3 },
};

/**
 * Mock del Banco (Tema 08) con caché por alumno y degradación a indisponible.
 *
 * Estrategia:
 * 1. Primero intenta leer de caché (localStorage + BehaviorSubject).
 * 2. Si la caché está fresca (< CACHE_TTL_MS), devuelve el valor cacheado.
 * 3. Si está vencida o no existe, simula una llamada al "servicio" (setTimeout 200ms).
 * 4. Si la "llamada" falla (simulada con probabilidad 10%), degrada: devuelve el
 *    último valor conocido o 0 si nunca hubo caché.
 * 5. `comprarVida` valida saldo y vidas antes de ejecutar.
 */
@Injectable()
export class InMemoryBancoAdapter extends BancoDataPort {
  private readonly cache = new Map<string, BehaviorSubject<BancoCacheEntry>>();
  private readonly failedAlumnos = new Set<string>();

  constructor() {
    super();
  }

  getMonedas(alumnoId: string, cursoCohorteId: string): Observable<number> {
    return this.getEntry(alumnoId, cursoCohorteId).pipe(map((e) => e.monedas));
  }

  getXP(alumnoId: string, cursoCohorteId: string): Observable<number> {
    return this.getEntry(alumnoId, cursoCohorteId).pipe(map((e) => e.xp));
  }

  getVidas(alumnoId: string, cursoCohorteId: string): Observable<number> {
    return this.getEntry(alumnoId, cursoCohorteId).pipe(map((e) => e.vidas));
  }

  comprarVida(
    alumnoId: string,
    cursoCohorteId: string,
    costoMonedas: number,
  ): Observable<{ exito: boolean; nuevoSaldo: number; nuevasVidas: number; razon?: string }> {
    return this.getEntry(alumnoId, cursoCohorteId).pipe(
      switchMap((entry) => {
        if (entry.vidas >= 3) {
          return of({ exito: false, nuevoSaldo: entry.monedas, nuevasVidas: entry.vidas, razon: 'Ya tienes el máximo de vidas' });
        }
        if (entry.monedas < costoMonedas) {
          return of({ exito: false, nuevoSaldo: entry.monedas, nuevasVidas: entry.vidas, razon: `Monedas insuficientes (necesitás ${costoMonedas})` });
        }
        const updated: BancoCacheEntry = {
          ...entry,
          monedas: entry.monedas - costoMonedas,
          vidas: entry.vidas + 1,
          lastFetch: Date.now(),
        };
        this.setEntry(alumnoId, cursoCohorteId, updated);
        return of({ exito: true, nuevoSaldo: updated.monedas, nuevasVidas: updated.vidas });
      }),
    );
  }

  // ── Internos ──────────────────────────────────────────────────────────

  private getEntry(alumnoId: string, cursoCohorteId: string): Observable<BancoCacheEntry> {
    const key = this.key(alumnoId, cursoCohorteId);
    const existing = this.cache.get(key);

    // Caché fresca → devolver directo
    if (existing && Date.now() - existing.value.lastFetch < CACHE_TTL_MS) {
      return existing.asObservable();
    }

    // Simular llamada al "servicio Banco" (200ms latencia, 10% fallo)
    return new Observable<BancoCacheEntry>((observer) => {
      setTimeout(() => {
        // 10% de probabilidad de fallo si no hay datos previos
        if (!existing && Math.random() < 0.1) {
          this.failedAlumnos.add(alumnoId);
          observer.next(this.fallbackEntry(alumnoId));
          observer.complete();
          return;
        }

        const seed = SEED[alumnoId] ?? { monedas: 0, xp: 0, vidas: 3 };
        const entry: BancoCacheEntry = { ...seed, lastFetch: Date.now() };

        // Si hubo fallo previo, recuperar (simula que el servicio volvió)
        this.failedAlumnos.delete(alumnoId);
        this.setEntry(alumnoId, cursoCohorteId, entry);
        observer.next(entry);
        observer.complete();
      }, 200);
    }).pipe(
      catchError(() => {
        // Degradación total: devolver último conocido o seed
        const cached = this.cache.get(key);
        return of(cached?.value ?? this.fallbackEntry(alumnoId));
      }),
    );
  }

  private fallbackEntry(alumnoId: string): BancoCacheEntry {
    const seed = SEED[alumnoId] ?? { monedas: 0, xp: 0, vidas: 3 };
    return { ...seed, lastFetch: 0 }; // lastFetch=0 → siempre vencida
  }

  private setEntry(alumnoId: string, cursoCohorteId: string, entry: BancoCacheEntry): void {
    const key = this.key(alumnoId, cursoCohorteId);
    const subject = this.cache.get(key);
    if (subject) {
      subject.next(entry);
    } else {
      this.cache.set(key, new BehaviorSubject<BancoCacheEntry>(entry));
    }
    // Persistir a localStorage para sobrevivir refresh
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      /* modo incógnito / storage lleno */
    }
  }

  private key(alumnoId: string, cursoCohorteId: string): string {
    return `${LS_PREFIX}-${cursoCohorteId}-${alumnoId}`;
  }
}
