// Tipos del grafo y del progreso — espejo del contrato (docs/openapi/ms-roadmap.yaml)
// pero solo con lo que el mock necesita en Fases 0-2. El `HttpRoadmapAdapter` de Fase 3
// generará los suyos desde el OpenAPI.

export type EstadoNodo = 'bloqueado' | 'habilitado' | 'completado' | 'fallado';
export type TipoNodo = 'teoria' | 'practica' | 'desafio' | 'boss' | 'hito';

// PAR-01: XP base por dificultad (100 / 250 / 500). Espejo de Dificultad del backend.
export type Dificultad = 'BASICO' | 'MEDIO' | 'AVANZADO';
// Un desafío puede ser teórico o práctico (RF-CUR-04).
export type Modalidad = 'teorico' | 'practico';

export interface Actividad {
  id: string;
  nombre: string;
  tipo: TipoNodo;
  esObligatorio: boolean;
  reintentosPermitidos: number; // 0-3 (RF-DES-07)
  desafioId?: string;
  // Material (tipo teoria/practica): contenido que el alumno lee/practica.
  descripcion?: string;
  recurso?: string; // URL o texto — ver nota de "subir material" en unidad-editor.ts
  // Desafío (tipo desafio/boss): se evalúa y otorga XP.
  dificultad?: Dificultad;
  modalidad?: Modalidad;
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
  recurso?: string;
  dificultad?: Dificultad;
  modalidad?: Modalidad;
}

export interface Unidad {
  id: string;
  nombre: string;
  umbralXpDesbloqueo: number;
  orden: number;
  actividades: Actividad[];
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
