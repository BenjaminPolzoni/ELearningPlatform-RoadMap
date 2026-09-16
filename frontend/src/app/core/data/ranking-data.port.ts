import { Observable } from 'rxjs';
import { VistaRanking } from './ranking.models';

/**
 * Puerta única de datos del ranking — mismo patrón que {@link RoadmapDataPort}
 * (01-arquitectura-y-stack.md §4). Ningún componente arma la vista por rol: la pide acá
 * y el adapter (Fases 0-2) o el BFF (Fase 3) la devuelve ya filtrada según el token.
 *
 * Cambiar de implementación es una línea en `app.config.ts`:
 *   { provide: RankingDataPort, useClass: InMemoryRankingAdapter }  // → HttpRankingAdapter
 */
export abstract class RankingDataPort {
  /**
   * Tabla de posiciones de la cohorte. La FORMA del resultado depende del rol de la
   * sesión (06-contrato-api.md §3): `VistaRankingAlumno` para ALUMNO (top 3, bottom 3,
   * su fila y cortes anónimos) o `VistaRankingStaff` para PROFESOR/ADMIN (todo identificado).
   */
  abstract getRanking(cursoCohorteId: string): Observable<VistaRanking>;
}
