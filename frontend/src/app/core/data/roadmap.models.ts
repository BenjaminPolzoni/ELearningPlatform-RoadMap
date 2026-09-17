// Tipos del grafo y del progreso — espejo del contrato (docs/openapi/ms-roadmap.yaml)
// pero solo con lo que el mock necesita en Fases 0-2. El `HttpRoadmapAdapter` de Fase 3
// generará los suyos desde el OpenAPI.

import { Bioma } from './biomas';

export type EstadoNodo = 'bloqueado' | 'habilitado' | 'completado' | 'fallado';
// 'teoria' es material de lectura (PDF/video/PPT vía link externo, ver `recursoUrl` en
// `Actividad`), sin evaluación ni XP — pensado para ir como primer nodo de la unidad,
// antes del desafío que evalúa ese contenido. El resto son desafíos evaluados, ya sea
// teórico o práctico (la modalidad va en el propio tipo, como en el contrato real — ver
// docs/openapi/ms-roadmap.yaml, Nodo.tipo). `boss` e `hito` siguen siendo tipos aparte
// (no seleccionables desde el editor por ahora).
export type TipoNodo = 'teoria' | 'desafio-teorico' | 'desafio-practico' | 'boss' | 'hito';

// Tipo de recurso externo que carga el profesor para un nodo 'teoria' — el proyecto no
// tiene backend de subida de archivos, así que el "contenido" es siempre un link (YouTube,
// Google Drive, OneDrive, etc.), nunca un archivo propio.
export type TipoRecursoTeoria = 'pdf' | 'video' | 'ppt';

// PAR-01: XP base por dificultad (100 / 250 / 500). Espejo de Dificultad del backend.
export type Dificultad = 'BASICO' | 'MEDIO' | 'AVANZADO';
// Única fuente de verdad del XP por dificultad — la usan tanto el editor (para mostrarle
// al profesor cuánto va a valer el desafío) como el mapa del alumno (para otorgarlo real).
export const XP_POR_DIFICULTAD: Record<Dificultad, number> = { BASICO: 100, MEDIO: 250, AVANZADO: 500 };

// Descripción que ve el alumno en el mapa cuando el profesor deja el campo vacío — el
// editor la muestra como placeholder para que sepa qué va a salir si no escribe la suya.
export function descripcionPorDefecto(tipo: TipoNodo): string {
  switch (tipo) {
    case 'teoria':
      return 'Revisá el material antes de encarar el desafío de la unidad.';
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
  // Se evalúa y otorga XP (todo tipo salvo 'hito' y 'teoria').
  dificultad?: Dificultad;
  // Solo para tipo 'teoria': link externo al material (PDF/video/PPT) y su tipo, para
  // saber cómo embeberlo en el mapa del alumno (ver recurso-embed.util.ts).
  recursoUrl?: string;
  recursoTipo?: TipoRecursoTeoria;
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
  recursoUrl?: string;
  recursoTipo?: TipoRecursoTeoria;
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
  /** Movimientos append-only del mock para marcar contenido teórico como leído. */
  lecturasContenido?: LecturaContenido[];
}

export interface LecturaContenido {
  nodoId: string;
  registradoEn: string;
}

// En producción esto lo consolida el BFF desde Identidad — acá viene del seed (stub).
export interface Alumno {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
}
