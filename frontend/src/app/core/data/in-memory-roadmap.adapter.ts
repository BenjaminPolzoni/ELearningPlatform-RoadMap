import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { RoadmapDataPort } from './roadmap-data.port';
import { Actividad, Alumno, Conexion, NuevaActividad, NuevaUnidad, Progreso, Roadmap, Unidad } from './roadmap.models';
import { alumnosSeed, progresoSeed, roadmapSeed } from '../../mocks/seed';

const LS_KEY = 'roadmap-mock-v2';

// Grilla de posiciones default para nodos sin posicion_x/y (altas nuevas, o datos viejos
// del localStorage previos a este editor) — no solapada, en columnas de a 4 (mismo ancho
// que usaba la serpentina de `unidad-mapa.ts` antes de que el editor expusiera la posición).
const GRID_COLS = 4;
const GRID_CW = 170;
const GRID_CH = 150;
const GRID_X0 = 100;
const GRID_Y0 = 100;

function posicionDefault(indice: number): { posicionX: number; posicionY: number } {
  return {
    posicionX: GRID_X0 + (indice % GRID_COLS) * GRID_CW,
    posicionY: GRID_Y0 + Math.floor(indice / GRID_COLS) * GRID_CH,
  };
}

/** Error de negocio simulando el ProblemDetail del backend (400/409, ver openapi). */
class RoadmapApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

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

  updateUnidad(_cc: string, unidadId: string, dto: NuevaUnidad): Observable<Unidad> {
    const unidad = this.unidad(unidadId);
    if (!unidad) return throwError(() => new RoadmapApiError(`No existe la unidad ${unidadId}`, 404));
    unidad.nombre = dto.nombre.trim();
    unidad.umbralXpDesbloqueo = Math.max(0, Math.trunc(dto.umbralXpDesbloqueo));
    this.guardar();
    return of(structuredClone(unidad));
  }

  removeUnidad(_cursoCohorteId: string, unidadId: string): Observable<void> {
    // Baja en cascada: también las conexiones que tocan a sus nodos (RF-NFR-01, 400/404 del
    // openapi para secciones — acá se refleja como limpieza del grafo en el mock).
    const idsNodos = new Set(this.unidad(unidadId)?.actividades.map((a) => a.id) ?? []);
    this.roadmap.unidades = this.roadmap.unidades.filter((u) => u.id !== unidadId);
    this.roadmap.conexiones = this.roadmap.conexiones.filter(
      (c) => !idsNodos.has(c.nodoOrigenId) && !idsNodos.has(c.nodoDestinoId),
    );
    this.guardar();
    return of(void 0);
  }

  moverUnidad(_cc: string, unidadId: string, direccion: 'arriba' | 'abajo'): Observable<void> {
    const arr = this.roadmap.unidades;
    const i = arr.findIndex((u) => u.id === unidadId);
    const j = direccion === 'arriba' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= arr.length) return of(void 0);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    arr.forEach((u, idx) => (u.orden = idx + 1));
    this.guardar();
    return of(void 0);
  }

  addActividad(_cc: string, unidadId: string, dto: NuevaActividad): Observable<Actividad> {
    const unidad = this.unidad(unidadId);
    if (!unidad) return throwError(() => new RoadmapApiError(`No existe la unidad ${unidadId}`, 404));
    const actividad: Actividad = {
      id: `${unidadId}-a${Date.now().toString(36)}`,
      ...this.normalizar(dto),
      ...posicionDefault(unidad.actividades.length),
    };
    unidad.actividades.push(actividad);
    this.guardar();
    return of(structuredClone(actividad));
  }

  updateActividad(_cc: string, unidadId: string, actividadId: string, dto: NuevaActividad): Observable<Actividad> {
    const unidad = this.unidad(unidadId);
    const actividad = unidad?.actividades.find((a) => a.id === actividadId);
    if (!unidad || !actividad) return throwError(() => new RoadmapApiError(`No existe la actividad ${actividadId}`, 404));
    Object.assign(actividad, { id: actividad.id, ...this.normalizar(dto, actividad) });
    this.guardar();
    return of(structuredClone(actividad));
  }

  removeActividad(_cc: string, unidadId: string, actividadId: string): Observable<void> {
    const unidad = this.unidad(unidadId);
    if (unidad) {
      unidad.actividades = unidad.actividades.filter((a) => a.id !== actividadId);
      // Baja lógica del nodo → también las conexiones que lo tocan (espejo del DELETE /nodos/{id}).
      this.roadmap.conexiones = this.roadmap.conexiones.filter(
        (c) => c.nodoOrigenId !== actividadId && c.nodoDestinoId !== actividadId,
      );
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

  moverNodo(_cc: string, unidadId: string, actividadId: string, x: number, y: number): Observable<void> {
    const actividad = this.unidad(unidadId)?.actividades.find((a) => a.id === actividadId);
    if (!actividad) return throwError(() => new RoadmapApiError(`No existe el nodo ${actividadId}`, 404));
    actividad.posicionX = x;
    actividad.posicionY = y;
    this.guardar();
    return of(void 0);
  }

  addConexion(_cc: string, nodoOrigenId: string, nodoDestinoId: string): Observable<Conexion> {
    if (nodoOrigenId === nodoDestinoId) {
      return throwError(() => new RoadmapApiError('Un nodo no puede ser prerequisito de sí mismo', 400));
    }
    if (!this.nodo(nodoOrigenId) || !this.nodo(nodoDestinoId)) {
      return throwError(() => new RoadmapApiError('El nodo no existe en este roadmap', 404));
    }
    const yaExiste = this.roadmap.conexiones.some(
      (c) => c.nodoOrigenId === nodoOrigenId && c.nodoDestinoId === nodoDestinoId,
    );
    if (yaExiste) {
      return throwError(() => new RoadmapApiError('Ya existe esa conexión', 409));
    }
    if (this.creariaCiclo(nodoOrigenId, nodoDestinoId)) {
      return throwError(() => new RoadmapApiError('Esa conexión cerraría un ciclo de prerequisitos', 400));
    }
    const conexion: Conexion = { id: `cx-${Date.now().toString(36)}`, nodoOrigenId, nodoDestinoId };
    this.roadmap.conexiones.push(conexion);
    this.guardar();
    return of(structuredClone(conexion));
  }

  removeConexion(_cc: string, conexionId: string): Observable<void> {
    this.roadmap.conexiones = this.roadmap.conexiones.filter((c) => c.id !== conexionId);
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
  private normalizar(dto: NuevaActividad, previa?: Actividad): Omit<Actividad, 'id' | 'posicionX' | 'posicionY'> {
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

  private nodo(actividadId: string): Actividad | undefined {
    for (const u of this.roadmap.unidades) {
      const a = u.actividades.find((x) => x.id === actividadId);
      if (a) return a;
    }
    return undefined;
  }

  /**
   * ¿Conectar origen→destino cerraría un ciclo? Sí, si destino ya puede alcanzar a origen
   * por las conexiones existentes (DFS) — feedback preventivo en el front antes del 400
   * del backend (`DetectorCiclos`), ver prompt del editor gráfico.
   */
  private creariaCiclo(origenId: string, destinoId: string): boolean {
    const visitados = new Set<string>();
    const pila = [destinoId];
    while (pila.length > 0) {
      const actual = pila.pop()!;
      if (actual === origenId) return true;
      if (visitados.has(actual)) continue;
      visitados.add(actual);
      for (const c of this.roadmap.conexiones) {
        if (c.nodoOrigenId === actual) pila.push(c.nodoDestinoId);
      }
    }
    return false;
  }

  private cargar(): Roadmap {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return this.migrar(JSON.parse(raw) as Roadmap);
    } catch {
      /* localStorage no disponible o corrupto — se cae al seed */
    }
    const seed = roadmapSeed();
    this.persistir(seed);
    return seed;
  }

  /**
   * Compatibilidad con roadmaps guardados antes de este editor: sin `conexiones` y con
   * nodos sin `posicionX`/`posicionY`. Les asigna la grilla default y persiste, así la
   * migración corre una sola vez (checklist: "nodos viejos → posición default no solapada").
   */
  private migrar(rm: Roadmap): Roadmap {
    rm.conexiones ??= [];
    let cambio = false;
    for (const u of rm.unidades) {
      u.actividades.forEach((a, i) => {
        if (typeof a.posicionX !== 'number' || typeof a.posicionY !== 'number') {
          Object.assign(a, posicionDefault(i));
          cambio = true;
        }
      });
    }
    if (cambio) this.persistir(rm);
    return rm;
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
