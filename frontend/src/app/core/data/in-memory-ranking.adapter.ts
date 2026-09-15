import { inject, Injectable } from '@angular/core';
import { delay, map, Observable } from 'rxjs';
import { AuthMockService } from '../auth/auth-mock.service';
import { AvatarService } from '../avatar/avatar.service';
import { RankingDataPort } from './ranking-data.port';
import { RoadmapDataPort } from './roadmap-data.port';
import { Progreso } from './roadmap.models';
import { FilaRanking, FilaRankingAnon, VistaRanking } from './ranking.models';
import { cohorteMock, ALUMNO_ACTUAL_ID } from '../../mocks/ranking.seed';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { nivelNodo } from '../../domain/ranking/nivel-nodo';
import { ordenarCohorte, percentilDe, zonaDe } from '../../domain/ranking/ranking.reglas';

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
  private readonly avatarService = inject(AvatarService);
  // El resto de la cohorte (`ranking.seed.ts`) es un fixture fijo a propósito
  // (no debe "bailar" entre cargas), pero mi propia fila sí tiene que reflejar el
  // XP que voy ganando de verdad — se pisa acá con el `Progreso` en vivo del
  // `RoadmapDataPort` (el mismo dato que alimenta el HUD y el mapa).
  private readonly roadmapPort = inject(RoadmapDataPort);

  getRanking(_cursoCohorteId: string): Observable<VistaRanking> {
    return this.roadmapPort.getProgreso(ALUMNO_ACTUAL_ID, CURSO_SEED_ID).pipe(
      delay(300), // simula la latencia de red del BFF
      map((progresoAlumno) => {
        const cohorte = this.cohorteConMiXpReal(progresoAlumno);
        const rol = this.auth.rol();
        return rol === 'ALUMNO'
          ? this.vistaAlumno(cohorte)
          : this.vistaStaff(cohorte, rol === 'ADMIN' ? 'ADMIN' : 'PROFESOR');
      }),
    );
  }

  /**
   * Pisa XP y nivel de mi fila con el Progreso real (avatar incluido: la fila propia
   * muestra el de "Mi personaje", no el mock determinístico) y reordena la cohorte,
   * porque mi XP real puede moverme de posición respecto del fixture.
   */
  private cohorteConMiXpReal(progresoAlumno: Progreso): FilaRanking[] {
    const base = cohorteMock().map((f) =>
      f.alumnoId === ALUMNO_ACTUAL_ID
        ? {
            ...f,
            avatar: this.avatarService.avatar(),
            xpTotal: progresoAlumno.xpTotal,
            nivelNodo: nivelNodo(progresoAlumno),
          }
        : f,
    );
    const total = base.length;
    return ordenarCohorte(base).map((fila) => ({
      ...fila,
      percentil: percentilDe(fila.posicion, total),
      zona: zonaDe(fila.posicion, total),
    }));
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
