export type TipoAnexo = 'documento' | 'video' | 'enlace' | 'imagen' | 'ejercicio';

export type Biome = 'pradera' | 'desierto' | 'nieve' | 'lava';

export interface BiomeOption {
  id: Biome;
  label: string;
  icon: string;
  mundo3d: string;
}

export const BIOMAS_EDUCA: BiomeOption[] = [
  { id: 'pradera', label: 'Pradera', icon: '🌿', mundo3d: 'Bosque' },
  { id: 'desierto', label: 'Desierto', icon: '🏜️', mundo3d: 'Desierto' },
  { id: 'nieve', label: 'Nieve', icon: '❄️', mundo3d: 'Nieve' },
  { id: 'lava', label: 'Lava', icon: '🌋', mundo3d: 'Nether' },
];

export function educaBiomeToMundo3d(biome?: Biome | string): string {
  switch (biome) {
    case 'desierto':
      return 'Desierto';
    case 'nieve':
      return 'Nieve';
    case 'lava':
      return 'Nether';
    case 'pradera':
    default:
      return 'Bosque';
  }
}

export interface Anexo {
  id: string;
  titulo: string;
  tipo: TipoAnexo;
  descripcion?: string;
  url?: string;
}

export interface Modulo {
  id: string;
  titulo: string;
  descripcion: string;
  orden: number;
  anexos: Anexo[];
  duracionEstimada?: number;
  objetivos?: string[];
}

export interface Unidad {
  id: string;
  titulo: string;
  descripcion: string;
  orden: number;
  modulos: Modulo[];
  color?: string;
  bioma?: Biome; // ausente = pradera
}

export interface Asignatura {
  id: string;
  nombre: string;
  descripcion: string;
  unidades: Unidad[];
  fechaCreacion: string; // ISO string para JSON directo
  fechaModificacion: string;
}
