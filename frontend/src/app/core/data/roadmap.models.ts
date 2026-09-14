// Tipos del grafo y del progreso — espejo del contrato (docs/openapi/ms-roadmap.yaml)
// pero solo con lo que el mock necesita en Fases 0-2. El `HttpRoadmapAdapter` de Fase 3
// generará los suyos desde el OpenAPI.

import { Bioma } from './biomas';

export type EstadoNodo = 'bloqueado' | 'habilitado' | 'completado' | 'fallado';
// Este curso no usa material suelto (teoría/práctica de solo lectura): todo contenido es
// un desafío, ya sea teórico o práctico (la modalidad va en el propio tipo, como en el
// contrato real — ver docs/openapi/ms-roadmap.yaml, Nodo.tipo). `boss` e `hito` siguen
// siendo tipos aparte (no seleccionables desde el editor por ahora).
export type TipoNodo = 'desafio-teorico' | 'desafio-practico' | 'boss' | 'hito';

// PAR-01: XP base por dificultad (100 / 250 / 500). Espejo de Dificultad del backend.
export type Dificultad = 'BASICO' | 'MEDIO' | 'AVANZADO';
// Única fuente de verdad del XP por dificultad — la usan tanto el editor (para mostrarle
// al profesor cuánto va a valer el desafío) como el mapa del alumno (para otorgarlo real).
export const XP_POR_DIFICULTAD: Record<Dificultad, number> = { BASICO: 100, MEDIO: 250, AVANZADO: 500 };

// Descripción que ve el alumno en el mapa cuando el profesor deja el campo vacío — el
// editor la muestra como placeholder para que sepa qué va a salir si no escribe la suya.
export function descripcionPorDefecto(tipo: TipoNodo): string {
  switch (tipo) {
    case 'desafio-teorico':
      return 'Respondé las preguntas para demostrar que entendiste los conceptos de la unidad.';
    case 'desafio-practico':
      return 'Resolvé el ejercicio aplicando lo aprendido en la unidad.';
    case 'boss':
      return 'Superá el desafío final de la unidad.';
    default:
      return 'Contenido de la unidad.';
  }
}

export interface Actividad {
  id: string;
  nombre: string;
  tipo: TipoNodo;
  esObligatorio: boolean;
  reintentosPermitidos: number; // 0-3 (RF-DES-07)
  desafioId?: string;
  descripcion?: string;
  // Se evalúa y otorga XP (todo tipo salvo 'hito').
  dificultad?: Dificultad;
  // Posición del nodo en el editor gráfico del profesor (05-design-system.md §5/§6). El
  // adapter le asigna un default no solapado al crearla; el profesor la reubica arrastrando.
  posicionX: number;
  posicionY: number;
}

/** Alta/edición de actividad desde el editor del profesor (Fase 2). */
export interface NuevaActividad {
  nombre: string;
  tipo: TipoNodo;
  esObligatorio: boolean;
  reintentosPermitidos: number;
  descripcion?: string;
  dificultad?: Dificultad;
}

export interface Unidad {
  id: string;
  nombre: string;
  umbralXpDesbloqueo: number;
  orden: number;
  actividades: Actividad[];
  // Ambientación visual (mapa 2D y mundo 3D). Opcional: unidades creadas antes de este
  // campo caen al tema por heurística de nombre/orden (ver unidad-mapa.ts).
  bioma?: Bioma;
}

export interface Roadmap {
  cursoCohorteId: string;
  nombre: string;
  unidades: Unidad[];
  // Prerequisitos entre nodos (grafo de conexiones, RF-CUR editor gráfico). Se mantiene
  // como DAG: el adapter rechaza auto-lazo, ciclo y duplicado — espejo de POST /conexiones.
  conexiones: Conexion[];
}

export interface NuevaUnidad {
  nombre: string;
  umbralXpDesbloqueo: number;
  bioma?: Bioma;
}

/** Prerequisito: no se puede entrar a `nodoDestinoId` sin completar `nodoOrigenId`. */
export interface Conexion {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
}

export interface ProgresoNodo {
  nodoId: string;
  estado: EstadoNodo;
}

export interface Progreso {
  alumnoId: string;
  cursoCohorteId: string;
  xpTotal: number;
  vidasVigentes: number; // PAR-12: máx 3
  nodos: ProgresoNodo[];
}

// En producción esto lo consolida el BFF desde Identidad — acá viene del seed (stub).
export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}
