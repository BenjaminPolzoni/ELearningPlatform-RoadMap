import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { AuthMockService } from '../auth/auth-mock.service';
import { RankingDataPort } from './ranking-data.port';
import { FilaRanking, FilaRankingAnon, VistaRanking } from './ranking.models';
import { cohorteMock, ALUMNO_ACTUAL_ID } from '../../mocks/ranking.seed';

/**
 * Implementación de {@link RankingDataPort} para Fases 0-2. Hace de servidor: arma la
 * cohorte del fixture y la RECORTA según el rol de la sesión (06-contrato-api.md §3) —
 * nunca devuelve la tabla identificada completa a un ALUMNO.
 *
 * Fase 3: se reemplaza por `HttpRankingAdapter` (una línea en `app.config.ts`) y el
 * filtrado por rol pasa a hacerlo el BFF con la identidad del token.
 */
@Injectable()
export class InMemoryRankingAdapter extends RankingDataPort {
  private readonly auth = inject(AuthMockService);

  getRanking(_cursoCohorteId: string): Observable<VistaRanking> {
    const cohorte = cohorteMock();
    const rol = this.auth.rol();
    const vista: VistaRanking =
      rol === 'ALUMNO'
        ? this.vistaAlumno(cohorte)
        : this.vistaStaff(cohorte, rol === 'ADMIN' ? 'ADMIN' : 'PROFESOR');
    return of(vista).pipe(delay(300)); // simula la latencia de red del BFF
  }

  /** RF-RNK-03: fila propia identificada; todo lo demás anonimizado. */
  private vistaAlumno(cohorte: FilaRanking[]): VistaRanking {
    const total = cohorte.length;
    const esYo = (f: FilaRanking) => f.alumnoId === ALUMNO_ACTUAL_ID;
    const yo = cohorte.find(esYo) ?? null;

    // La lista completa se muestra anonimizada SALVO la fila propia, que va
    // identificada y resaltada dentro de la misma lista (no como bloque aparte).
    const lista: (FilaRanking | FilaRankingAnon)[] = cohorte.map((f) =>
      esYo(f) ? f : anonimizar(f),
    );
    const anon = cohorte.map(anonimizar);

    const cortes = this.cortes(cohorte)
      ? {
          p90: anon.find((f) => f.zona === 'p90') ?? anon[0],
          p10: anon.find((f) => f.zona === 'p10') ?? anon[anon.length - 1],
        }
      : null;

    return {
      rol: 'ALUMNO',
      yo,
      top3: anon.slice(0, 3),
      bottom3: anon.slice(-3),
      cortes,
      lista,
      totalInscriptos: total,
    };
  }

  /** RF-RNK-10: cero anonimato, para auditar antes de archivar el curso. */
  private vistaStaff(cohorte: FilaRanking[], rol: 'PROFESOR' | 'ADMIN'): VistaRanking {
    const p90 = cohorte.find((f) => f.zona === 'p90')?.posicion;
    const p10 = cohorte.find((f) => f.zona === 'p10')?.posicion;
    return {
      rol,
      filas: cohorte,
      cortes: this.cortes(cohorte) && p90 && p10 ? { p90, p10 } : null,
      totalInscriptos: cohorte.length,
    };
  }

  /** RF-RNK-09: percentiles activos solo con >= 10 inscriptos. */
  private cortes(cohorte: FilaRanking[]): boolean {
    return cohorte.some((f) => f.zona !== 'ninguna');
  }
}

/** Quita identidad y agrega seudónimo estable por posición. */
function anonimizar(fila: FilaRanking): FilaRankingAnon {
  const { alumnoId: _id, nombre: _n, apellido: _a, legajo: _l, ...resto } = fila;
  return { ...resto, seudonimo: `Estudiante #${String(fila.posicion).padStart(2, '0')}` };
}
