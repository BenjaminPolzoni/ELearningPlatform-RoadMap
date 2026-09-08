import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RoadmapDataPort } from './roadmap-data.port';
import { Actividad, Alumno, NuevaActividad, NuevaUnidad, Progreso, Roadmap, Unidad } from './roadmap.models';
import { alumnosSeed, progresoSeed, roadmapSeed } from '../../mocks/seed';

const LS_KEY = 'roadmap-mock-v2';

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

  addActividad(_cc: string, unidadId: string, dto: NuevaActividad): Observable<Actividad> {
    const unidad = this.unidad(unidadId);
    if (!unidad) return throwError(() => new Error(`No existe la unidad ${unidadId}`));
    const actividad: Actividad = {
      id: `${unidadId}-a${Date.now().toString(36)}`,
      ...this.normalizar(dto),
    };
    unidad.actividades.push(actividad);
    this.guardar();
    return of(structuredClone(actividad));
  }

  updateActividad(_cc: string, unidadId: string, actividadId: string, dto: NuevaActividad): Observable<Actividad> {
    const unidad = this.unidad(unidadId);
    const actividad = unidad?.actividades.find((a) => a.id === actividadId);
    if (!unidad || !actividad) return throwError(() => new Error(`No existe la actividad ${actividadId}`));
    Object.assign(actividad, { id: actividad.id, ...this.normalizar(dto, actividad) });
    this.guardar();
    return of(structuredClone(actividad));
  }

  removeActividad(_cc: string, unidadId: string, actividadId: string): Observable<void> {
    const unidad = this.unidad(unidadId);
    if (unidad) {
      unidad.actividades = unidad.actividades.filter((a) => a.id !== actividadId);
      this.guardar();
    }
    return of(void 0);
  }

  moverActividad(_cc: string, unidadId: string, actividadId: string, direccion: 'arriba' | 'abajo'): Observable<void> {
    const unidad = this.unidad(unidadId);
    if (!unidad) return of(void 0);
    const i = unidad.actividades.findIndex((a) => a.id === actividadId);
    const j = direccion === 'arriba' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= unidad.actividades.length) return of(void 0);
    const arr = unidad.actividades;
    [arr[i], arr[j]] = [arr[j], arr[i]];
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

  private unidad(unidadId: string): Unidad | undefined {
    return this.roadmap.unidades.find((u) => u.id === unidadId);
  }

  /**
   * Deja solo los campos que corresponden al tipo: un desafío lleva dificultad/modalidad
   * y un `desafioId` (stub — en producción lo referencia el Motor de Desafíos, T03);
   * el material lleva descripcion/recurso. Evita que un cambio de tipo deje datos colgando.
   */
  private normalizar(dto: NuevaActividad, previa?: Actividad): Omit<Actividad, 'id'> {
    const esDesafio = dto.tipo === 'desafio' || dto.tipo === 'boss';
    return {
      nombre: dto.nombre.trim(),
      tipo: dto.tipo,
      esObligatorio: dto.esObligatorio,
      reintentosPermitidos: esDesafio ? Math.max(0, Math.min(3, dto.reintentosPermitidos)) : 0,
      desafioId: esDesafio ? (previa?.desafioId ?? `desafio-ext-${Date.now().toString(36)}`) : undefined,
      descripcion: esDesafio ? undefined : dto.descripcion?.trim() || undefined,
      recurso: esDesafio ? undefined : dto.recurso?.trim() || undefined,
      dificultad: esDesafio ? (dto.dificultad ?? 'BASICO') : undefined,
      modalidad: esDesafio ? (dto.modalidad ?? 'practico') : undefined,
    };
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
