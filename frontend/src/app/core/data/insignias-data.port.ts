import { Observable } from 'rxjs';
import { InsigniaCatalogo, InsigniaOtorgada, NuevaInsignia } from './insignias.models';

/**
 * Puerta única de datos del catálogo de insignias — mismo patrón que {@link RoadmapDataPort}
 * (01-arquitectura-y-stack.md §4). El catálogo es por curso-cohorte (roadmap-requerimientos.md
 * §9: `/roadmaps/{cc}/insignias/catalogo`), no global.
 *
 * Cambiar de implementación es una línea en `app.config.ts`:
 *   { provide: InsigniasDataPort, useClass: InMemoryInsigniasAdapter }  // → HttpInsigniasAdapter
 */
export abstract class InsigniasDataPort {
  /** GET /api/roadmap/roadmaps/{cc}/insignias/catalogo */
  abstract getCatalogo(cursoCohorteId: string): Observable<InsigniaCatalogo[]>;
  /** GET /api/roadmap/alumnos/{aid}/insignias?curso_cohorte_id={cc} */
  abstract getGanadasPorAlumno(alumnoId: string): Observable<InsigniaOtorgada[]>;
  /** POST /api/roadmap/roadmaps/{cc}/insignias/catalogo — solo PROFESOR. */
  abstract crear(cursoCohorteId: string, dto: NuevaInsignia): Observable<InsigniaCatalogo>;
}
