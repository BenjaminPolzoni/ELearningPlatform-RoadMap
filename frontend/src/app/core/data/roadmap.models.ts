// Tipos del grafo y del progreso — espejo del contrato (docs/openapi/ms-roadmap.yaml)
// pero solo con lo que el mock necesita en Fases 0-2. El `HttpRoadmapAdapter` de Fase 3
// generará los suyos desde el OpenAPI.

export type EstadoNodo = 'bloqueado' | 'habilitado' | 'completado' | 'fallado';
export type TipoNodo = 'teoria' | 'practica' | 'desafio' | 'boss' | 'hito';

export interface Actividad {
  id: string;
  nombre: string;
  tipo: TipoNodo;
  esObligatorio: boolean;
  reintentosPermitidos: number; // 0-3 (RF-DES-07)
  desafioId?: string;
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
}

export interface NuevaUnidad {
  nombre: string;
  umbralXpDesbloqueo: number;
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
