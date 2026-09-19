import { Injectable, computed, inject, signal } from '@angular/core';
import type { Anexo, Asignatura, Modulo, TipoAnexo, Unidad as EducaUnidad } from './models';
import { educaBiomeToMundo3d } from './models';
import { StorageService } from './storage.service';
import { RoadmapStore } from '../data/roadmap.store';
import { CURSO_SEED_ID } from '../../mocks/seed';
import type { Actividad, Conexion, Roadmap, Unidad as PlatformUnidad } from '../data/roadmap.models';
import type { Bioma } from '../data/biomas';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const c = [...arr];
  const [x] = c.splice(from, 1);
  c.splice(to, 0, x);
  return c.map((item, i) => ({ ...(item as object), orden: i }) as T);
}

const ROADMAP_LS_KEY = 'roadmap-mock-v2';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private storage = inject(StorageService);
  private roadmapStore = inject(RoadmapStore);

  readonly current = signal<Asignatura | null>(null);
  readonly counts = computed(() => {
    const a = this.current();
    if (!a) return { unidades: 0, modulos: 0, anexos: 0 };
    const modulos = a.unidades.reduce((n, u) => n + u.modulos.length, 0);
    const anexos = a.unidades.reduce(
      (n, u) => n + u.modulos.reduce((m, x) => m + x.anexos.length, 0),
      0,
    );
    return { unidades: a.unidades.length, modulos, anexos };
  });

  listAll(): Asignatura[] {
    return this.storage.list();
  }

  create(nombre: string, descripcion: string): Asignatura {
    const now = new Date().toISOString();
    const a: Asignatura = {
      id: uid(),
      nombre: nombre.trim() || 'Sin título',
      descripcion,
      unidades: [],
      fechaCreacion: now,
      fechaModificacion: now,
    };
    this.storage.save(a);
    this.current.set(a);
    this.syncToRoadmap(a);
    return a;
  }

  open(id: string): void {
    const found = this.storage.load(id);
    this.current.set(found);
    if (found) {
      this.syncToRoadmap(found);
    }
  }

  delete(id: string): void {
    this.storage.remove(id);
    if (this.current()?.id === id) this.current.set(null);
  }

  rename(nombre: string, descripcion: string): void {
    this.update((a) => ({ ...a, nombre, descripcion }));
  }

  // — Unidades —
  addUnidad(titulo: string): void {
    this.update((a) => ({
      ...a,
      unidades: [
        ...a.unidades,
        {
          id: uid(),
          titulo,
          descripcion: '',
          orden: a.unidades.length,
          modulos: [],
          bioma: 'pradera',
          color: '#6366f1',
        },
      ],
    }));
  }

  editUnidad(id: string, patch: Partial<EducaUnidad>): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }

  removeUnidad(id: string): void {
    this.update((a) => ({ ...a, unidades: a.unidades.filter((u) => u.id !== id) }));
  }

  moveUnidad(id: string, dir: -1 | 1): void {
    this.update((a) => {
      const i = a.unidades.findIndex((u) => u.id === id);
      return { ...a, unidades: move(a.unidades, i, i + dir) };
    });
  }

  // — Módulos —
  addModulo(unidadId: string, titulo: string): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId
          ? {
              ...u,
              modulos: [
                ...u.modulos,
                {
                  id: uid(),
                  titulo,
                  descripcion: '',
                  orden: u.modulos.length,
                  anexos: [],
                },
              ],
            }
          : u,
      ),
    }));
  }

  editModulo(unidadId: string, moduloId: string, patch: Partial<Modulo>): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId
          ? { ...u, modulos: u.modulos.map((m) => (m.id === moduloId ? { ...m, ...patch } : m)) }
          : u,
      ),
    }));
  }

  removeModulo(unidadId: string, moduloId: string): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId ? { ...u, modulos: u.modulos.filter((m) => m.id !== moduloId) } : u,
      ),
    }));
  }

  moveModulo(unidadId: string, moduloId: string, dir: -1 | 1): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) => {
        if (u.id !== unidadId) return u;
        const i = u.modulos.findIndex((m) => m.id === moduloId);
        return { ...u, modulos: move(u.modulos, i, i + dir) };
      }),
    }));
  }

  // — Anexos —
  addAnexo(unidadId: string, moduloId: string, titulo: string, tipo: TipoAnexo = 'documento'): void {
    const anx: Anexo = { id: uid(), titulo, tipo };
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId
          ? {
              ...u,
              modulos: u.modulos.map((m) =>
                m.id === moduloId ? { ...m, anexos: [...m.anexos, anx] } : m,
              ),
            }
          : u,
      ),
    }));
  }

  editAnexo(unidadId: string, moduloId: string, anexoId: string, patch: Partial<Anexo>): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId
          ? {
              ...u,
              modulos: u.modulos.map((m) =>
                m.id === moduloId
                  ? { ...m, anexos: m.anexos.map((x) => (x.id === anexoId ? { ...x, ...patch } : x)) }
                  : m,
              ),
            }
          : u,
      ),
    }));
  }

  removeAnexo(unidadId: string, moduloId: string, anexoId: string): void {
    this.update((a) => ({
      ...a,
      unidades: a.unidades.map((u) =>
        u.id === unidadId
          ? {
              ...u,
              modulos: u.modulos.map((m) =>
                m.id === moduloId ? { ...m, anexos: m.anexos.filter((x) => x.id !== anexoId) } : m,
              ),
            }
          : u,
      ),
    }));
  }

  private update(fn: (a: Asignatura) => Asignatura): void {
    const a = this.current();
    if (!a) return;
    const next = fn(a);
    this.current.set(next);
    this.storage.save(next);
    this.syncToRoadmap(next);
  }

  /**
   * Sincroniza la asignatura activa con el Roadmap del alumno.
   * Transforma las Unidades, Módulos y Anexos de Educa al formato de islas y actividades 3D.
   */
  private syncToRoadmap(asignatura: Asignatura): void {
    const platformUnidades: PlatformUnidad[] = [];
    const conexiones: Conexion[] = [];

    asignatura.unidades.forEach((u, uIdx) => {
      const bioma3d = educaBiomeToMundo3d(u.bioma) as Bioma;
      const actividades: Actividad[] = [];

      let actIndex = 0;
      for (const m of u.modulos) {
        for (const anx of m.anexos) {
          const esEjercicio = anx.tipo === 'ejercicio';
          const actId = `${u.id}-${anx.id}`;
          actividades.push({
            id: actId,
            nombre: anx.titulo,
            tipo: esEjercicio ? 'desafio-practico' : 'teoria',
            esObligatorio: esEjercicio,
            reintentosPermitidos: esEjercicio ? 2 : 0,
            posicionX: 100 + (actIndex % 4) * 170,
            posicionY: 100 + Math.floor(actIndex / 4) * 150,
            desafioId: esEjercicio ? `desafio-${anx.id}` : undefined,
            descripcion:
              anx.descripcion ||
              (esEjercicio
                ? 'Completa este desafío para ganar experiencia.'
                : 'Material de consulta teórico.'),
            dificultad: esEjercicio ? 'BASICO' : undefined,
            recursoUrl: anx.url,
            recursoTipo: anx.tipo === 'video' ? 'video' : 'pdf',
          });

          if (actIndex > 0) {
            conexiones.push({
              id: `cx-${u.id}-${actIndex}`,
              nodoOrigenId: actividades[actIndex - 1].id,
              nodoDestinoId: actId,
            });
          }
          actIndex++;
        }
      }

      platformUnidades.push({
        id: u.id,
        nombre: u.titulo,
        orden: uIdx + 1,
        umbralXpDesbloqueo: uIdx * 200,
        bioma: bioma3d,
        actividades,
      });
    });

    const rm: Roadmap = {
      cursoCohorteId: CURSO_SEED_ID,
      nombre: asignatura.nombre,
      unidades: platformUnidades,
      conexiones,
    };

    try {
      localStorage.setItem(ROADMAP_LS_KEY, JSON.stringify(rm));
      this.roadmapStore.recargar();
    } catch {
      /* ignore */
    }
  }
}
