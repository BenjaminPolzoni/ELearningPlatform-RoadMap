import { Observable } from 'rxjs';
import { InsigniaCatalogo, InsigniaOtorgada } from './insignias.models';

/**
 * Puerta única de datos del catálogo de insignias — mismo patrón que {@link RoadmapDataPort}
 * (01-arquitectura-y-stack.md §4). El catálogo es fijo por sistema (no depende del curso ni
 * la cohorte); lo que sí depende de eso es qué insignias ganó cada alumno (fuera de alcance
 * acá — ver `GET /alumnos/{aid}/insignias`).
 *
 * Cambiar de implementación es una línea en `app.config.ts`:
 *   { provide: InsigniasDataPort, useClass: InMemoryInsigniasAdapter }  // → HttpInsigniasAdapter
 */
export abstract class InsigniasDataPort {
  abstract getCatalogo(): Observable<InsigniaCatalogo[]>;
  /** Insignias ganadas por un alumno — espejo de `GET /alumnos/{aid}/insignias` ([PLANEADO]). */
  abstract getGanadasPorAlumno(alumnoId: string): Observable<InsigniaOtorgada[]>;
}
