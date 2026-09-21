export type AttachmentType = 'documento' | 'video' | 'enlace' | 'imagen' | 'ejercicio';

export type Biome = 'pradera' | 'desierto' | 'nieve' | 'lava';

export interface BiomeOption {
  id: Biome;
  label: string;
  icon: string;
  world3d: string;
}

export const BIOMES_EDUCA: BiomeOption[] = [
  { id: 'pradera', label: 'Pradera', icon: '🌿', world3d: 'Bosque' },
  { id: 'desierto', label: 'Desierto', icon: '🏜️', world3d: 'Desierto' },
  { id: 'nieve', label: 'Nieve', icon: '❄️', world3d: 'Nieve' },
  { id: 'lava', label: 'Lava', icon: '🌋', world3d: 'Nether' },
];

export function educaBiomeToWorld3d(biome?: Biome | string): string {
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

export interface Attachment {
  id: string;
  title: string;
  type: AttachmentType;
  description?: string;
  url?: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  attachments: Attachment[];
  estimatedDuration?: number;
  objectives?: string[];
}

export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  modules: Module[];
  color?: string;
  biome?: Biome; // absent = meadow
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  sections: Section[];
  creationDate: string; // ISO string for direct JSON
  modificationDate: string;
}
