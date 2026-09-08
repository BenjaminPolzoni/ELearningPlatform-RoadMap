import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RoadmapDataPort } from './roadmap-data.port';
import { Alumno, NuevaUnidad, Progreso, Roadmap, Unidad } from './roadmap.models';
import { alumnosSeed, progresoSeed, roadmapSeed } from '../../mocks/seed';

const LS_KEY = 'roadmap-mock-v1';

/**
 * Implementación de {@link RoadmapDataPort} para Fases 0-2. Arranca del seed, muta en
 * memoria y persiste el grafo en localStorage — sobrevive al refresh sin backend.
 * Devuelve copias (`structuredClone`) para que ningún componente mute el estado interno.
 */
@Injectable()
export class InMemoryRoadmapAdapter extends RoadmapDataPort {
  private roadmap: Roadmap = this.cargar();
  private readonly alumnos: Alumno[] = alumnosSeed();

  getRoadmap(cursoCohorteId: string): Observable<Roadmap> {
    if (cursoCohorteId !== this.roadmap.cursoCohorteId) {
      return throwError(() => new Error(`No hay roadmap mock para ${cursoCohorteId}`));
    }
    return of(structuredClone(this.roadmap));
  }

  addUnidad(cursoCohorteId: string, dto: NuevaUnidad): Observable<Unidad> {
    const orden = this.roadmap.unidades.length + 1;
    const unidad: Unidad = {
      id: `u${orden}-${Date.now().toString(36)}`,
      nombre: dto.nombre,
      umbralXpDesbloqueo: dto.umbralXpDesbloqueo,
      orden,
      actividades: [],
    };
    this.roadmap.unidades.push(unidad);
    this.guardar();
    return of(structuredClone(unidad));
  }

  removeUnidad(_cursoCohorteId: string, unidadId: string): Observable<void> {
    this.roadmap.unidades = this.roadmap.unidades.filter((u) => u.id !== unidadId);
    this.guardar();
    return of(void 0);
  }

  getProgreso(alumnoId: string, _cursoCohorteId: string): Observable<Progreso> {
    // ponytail: el progreso no se persiste todavía — se deriva del seed en cada lectura.
    // Fase 2 le agrega mutación real cuando exista el motor de XP/estados en el mock.
    return of(progresoSeed(alumnoId));
  }

  getAlumnos(_cursoCohorteId: string): Observable<Alumno[]> {
    return of(structuredClone(this.alumnos));
  }

  private cargar(): Roadmap {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as Roadmap;
    } catch {
      /* localStorage no disponible o corrupto — se cae al seed */
    }
    const seed = roadmapSeed();
    this.persistir(seed);
    return seed;
  }

  private guardar(): void {
    this.persistir(this.roadmap);
  }

  private persistir(rm: Roadmap): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rm));
    } catch {
      /* modo incógnito / storage lleno — el mock sigue en memoria */
    }
  }
}
