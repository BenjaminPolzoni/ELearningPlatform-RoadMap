import { Observable } from 'rxjs';
import { Actividad, Alumno, Conexion, NuevaActividad, NuevaUnidad, Progreso, Roadmap, Unidad } from './roadmap.models';

/**
 * Puerta única de datos del front (01-arquitectura-y-stack.md §4). Ningún componente
 * llama a `HttpClient` directo: todo pasa por acá. Dos implementaciones intercambiables
 * con una línea en `app.config.ts`:
 *   - `InMemoryRoadmapAdapter` (Fases 0-2): lee el seed, muta en memoria, persiste en
 *     localStorage. Simula el JSON ya consolidado que devolvería el BFF.
 *   - `HttpRoadmapAdapter` (Fase 3): pega contra el BFF real.
 */
export abstract class RoadmapDataPort {
  abstract getRoadmap(cursoCohorteId: string): Observable<Roadmap>;
  abstract addUnidad(cursoCohorteId: string, dto: NuevaUnidad): Observable<Unidad>;
  abstract updateUnidad(cursoCohorteId: string, unidadId: string, dto: NuevaUnidad): Observable<Unidad>;
  abstract removeUnidad(cursoCohorteId: string, unidadId: string): Observable<void>;
  /** Reordena una unidad una posición arriba/abajo (mismo patrón que moverActividad). */
  abstract moverUnidad(cursoCohorteId: string, unidadId: string, direccion: 'arriba' | 'abajo'): Observable<void>;

  // Actividades dentro de una unidad (Fase 2 — editor tipo Moodle).
  abstract addActividad(cursoCohorteId: string, unidadId: string, dto: NuevaActividad): Observable<Actividad>;
  abstract updateActividad(
    cursoCohorteId: string,
    unidadId: string,
    actividadId: string,
    dto: NuevaActividad,
  ): Observable<Actividad>;
  abstract removeActividad(cursoCohorteId: string, unidadId: string, actividadId: string): Observable<void>;
  /** Reordena una actividad una posición arriba/abajo (movimiento lineal, 05 §5). */
  abstract moverActividad(
    cursoCohorteId: string,
    unidadId: string,
    actividadId: string,
    direccion: 'arriba' | 'abajo',
  ): Observable<void>;

  /** Reubica un nodo en el editor gráfico (posicion_x/posicion_y, 05 §5/§6). */
  abstract moverNodo(cursoCohorteId: string, unidadId: string, actividadId: string, x: number, y: number): Observable<void>;

  // Conexiones (prerequisitos) entre nodos — espejo de POST/DELETE /conexiones.
  abstract addConexion(cursoCohorteId: string, nodoOrigenId: string, nodoDestinoId: string): Observable<Conexion>;
  abstract removeConexion(cursoCohorteId: string, conexionId: string): Observable<void>;

  abstract getProgreso(alumnoId: string, cursoCohorteId: string): Observable<Progreso>;
  abstract getAlumnos(cursoCohorteId: string): Observable<Alumno[]>;
}
