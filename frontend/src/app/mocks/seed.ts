import {
  Actividad,
  Alumno,
  Conexion,
  Dificultad,
  EstadoNodo,
  Modalidad,
  Progreso,
  ProgresoNodo,
  Roadmap,
  TipoNodo,
} from '../core/data/roadmap.models';

// Curso de ejemplo (03-plan-de-implementacion.md, Fase 0): 4 unidades, 6 actividades
// c/u, 12 alumnos. Es lo que desacopla a los 4 squads — nadie espera a nadie.

export const CURSO_SEED_ID = '11111111-1111-1111-1111-111111111111';

const NOMBRES_UNIDAD = ['Fundamentos', 'Estructuras de control', 'Funciones', 'Estructuras de datos'];
const UMBRALES = [0, 500, 1200, 2000];

interface Fila {
  nombre: string;
  tipo: TipoNodo;
  esObligatorio: boolean;
  reintentos: number;
  descripcion?: string;
  recurso?: string;
  dificultad?: Dificultad;
  modalidad?: Modalidad;
}

// 6 actividades por unidad: teoría → 3 prácticas → desafío → boss.
const PLANTILLA: Fila[] = [
  { nombre: 'Teoría', tipo: 'teoria', esObligatorio: true, reintentos: 0,
    descripcion: 'Material teórico de la unidad.', recurso: 'https://ejemplo.edu/teoria' },
  { nombre: 'Práctica guiada', tipo: 'practica', esObligatorio: true, reintentos: 0,
    descripcion: 'Ejercicios resueltos paso a paso.' },
  { nombre: 'Práctica libre', tipo: 'practica', esObligatorio: false, reintentos: 0,
    descripcion: 'Ejercitación adicional opcional.' },
  { nombre: 'Ejercicio integrador', tipo: 'practica', esObligatorio: true, reintentos: 0,
    descripcion: 'Combina los temas de la unidad.' },
  { nombre: 'Desafío', tipo: 'desafio', esObligatorio: true, reintentos: 1,
    dificultad: 'MEDIO', modalidad: 'practico' },
  { nombre: 'Boss', tipo: 'boss', esObligatorio: true, reintentos: 1,
    dificultad: 'AVANZADO', modalidad: 'practico' },
];

// Grilla default de posición (misma serpentina de 4 columnas que calculaba
// `unidad-mapa.ts` antes de que el editor gráfico expusiera posicion_x/y).
const GRID_COLS = 4;
const GRID_CW = 168;
const GRID_CH = 138;
const GRID_X0 = 104;
const GRID_Y0 = 96;

function posicionSerpentina(indice: number): { posicionX: number; posicionY: number } {
  const fila = Math.floor(indice / GRID_COLS);
  const enFila = indice % GRID_COLS;
  const col = fila % 2 === 0 ? enFila : GRID_COLS - 1 - enFila;
  return { posicionX: GRID_X0 + col * GRID_CW, posicionY: GRID_Y0 + fila * GRID_CH };
}

export function roadmapSeed(): Roadmap {
  const unidades = NOMBRES_UNIDAD.map((nombre, i) => ({
    id: `u${i + 1}`,
    nombre,
    umbralXpDesbloqueo: UMBRALES[i],
    orden: i + 1,
    actividades: PLANTILLA.map((p, j): Actividad => {
      const esDesafio = p.tipo === 'desafio' || p.tipo === 'boss';
      return {
        id: `u${i + 1}-a${j + 1}`,
        nombre: p.nombre,
        tipo: p.tipo,
        esObligatorio: p.esObligatorio,
        reintentosPermitidos: p.reintentos,
        desafioId: esDesafio ? `desafio-ext-${i + 1}-${j + 1}` : undefined,
        descripcion: p.descripcion,
        recurso: p.recurso,
        dificultad: p.dificultad,
        modalidad: p.modalidad,
        ...posicionSerpentina(j),
      };
    }),
  }));

  // Prerequisitos lineales dentro de cada unidad (la plantilla ya es teoría → prácticas →
  // desafío → boss): demuestra el grafo de conexiones apenas se abre el editor gráfico.
  const conexiones: Conexion[] = unidades.flatMap((u) =>
    u.actividades.slice(0, -1).map((a, j): Conexion => ({
      id: `cx-${u.id}-${j + 1}`,
      nodoOrigenId: a.id,
      nodoDestinoId: u.actividades[j + 1].id,
    })),
  );

  return { cursoCohorteId: CURSO_SEED_ID, nombre: 'Programación I — 2026 C1', unidades, conexiones };
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
