import { Alumno, EstadoNodo, Progreso, ProgresoNodo, Roadmap, TipoNodo } from '../core/data/roadmap.models';

// Curso de ejemplo (03-plan-de-implementacion.md, Fase 0): 4 unidades, 6 actividades
// c/u, 12 alumnos. Es lo que desacopla a los 4 squads — nadie espera a nadie.

export const CURSO_SEED_ID = '11111111-1111-1111-1111-111111111111';

const NOMBRES_UNIDAD = ['Fundamentos', 'Estructuras de control', 'Funciones', 'Estructuras de datos'];
const UMBRALES = [0, 500, 1200, 2000];

// 6 actividades por unidad: teoría → 3 prácticas → desafío → boss.
const PLANTILLA: { nombre: string; tipo: TipoNodo; esObligatorio: boolean; reintentos: number }[] = [
  { nombre: 'Teoría', tipo: 'teoria', esObligatorio: true, reintentos: 0 },
  { nombre: 'Práctica guiada', tipo: 'practica', esObligatorio: true, reintentos: 3 },
  { nombre: 'Práctica libre', tipo: 'practica', esObligatorio: false, reintentos: 3 },
  { nombre: 'Ejercicio integrador', tipo: 'practica', esObligatorio: true, reintentos: 2 },
  { nombre: 'Desafío', tipo: 'desafio', esObligatorio: true, reintentos: 1 },
  { nombre: 'Boss', tipo: 'boss', esObligatorio: true, reintentos: 1 },
];

export function roadmapSeed(): Roadmap {
  return {
    cursoCohorteId: CURSO_SEED_ID,
    nombre: 'Programación I — 2026 C1',
    unidades: NOMBRES_UNIDAD.map((nombre, i) => ({
      id: `u${i + 1}`,
      nombre,
      umbralXpDesbloqueo: UMBRALES[i],
      orden: i + 1,
      actividades: PLANTILLA.map((p, j) => ({
        id: `u${i + 1}-a${j + 1}`,
        nombre: p.nombre,
        tipo: p.tipo,
        esObligatorio: p.esObligatorio,
        reintentosPermitidos: p.reintentos,
        desafioId: p.tipo === 'desafio' || p.tipo === 'boss' ? `desafio-ext-${i + 1}-${j + 1}` : undefined,
      })),
    })),
  };
}

const APELLIDOS = [
  'Gómez', 'Fernández', 'Rodríguez', 'López', 'Martínez', 'Sánchez',
  'Pérez', 'Romero', 'Sosa', 'Torres', 'Ramírez', 'Flores',
];
const NOMBRES = [
  'Camila', 'Mateo', 'Valentina', 'Benjamín', 'Martina', 'Thiago',
  'Emma', 'Joaquín', 'Catalina', 'Bautista', 'Isabella', 'Lautaro',
];

export function alumnosSeed(): Alumno[] {
  return APELLIDOS.map((apellido, i) => ({
    id: `alu-${String(i + 1).padStart(2, '0')}`,
    nombre: NOMBRES[i],
    apellido,
    legajo: `${90000 + i + 1}`,
  }));
}

// Progreso de arranque de cada alumno: primera unidad habilitada (README §6.8), el resto
// bloqueado. El alumno 01 lleva algo de avance para que la home tenga qué mostrar.
export function progresoSeed(alumnoId: string): Progreso {
  const rm = roadmapSeed();
  const estadoDe = (ui: number, ai: number): EstadoNodo => {
    if (ui > 0) return 'bloqueado';
    if (alumnoId === 'alu-01') return ai < 3 ? 'completado' : ai === 3 ? 'habilitado' : 'bloqueado';
    return ai === 0 ? 'habilitado' : 'bloqueado';
  };
  const nodos: ProgresoNodo[] = rm.unidades.flatMap((u, ui) =>
    u.actividades.map((a, ai) => ({ nodoId: a.id, estado: estadoDe(ui, ai) })),
  );
  return {
    alumnoId,
    cursoCohorteId: CURSO_SEED_ID,
    xpTotal: alumnoId === 'alu-01' ? 350 : 0,
    vidasVigentes: 3,
    nodos,
  };
}
