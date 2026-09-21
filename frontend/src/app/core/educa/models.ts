export type AttachmentType = 'document' | 'video' | 'link' | 'image' | 'exercise';

export type Biome = 'meadow' | 'desert' | 'snow' | 'lava';

export interface BiomeOption {
  id: Biome;
  label: string;
  icon: string;
  world3d: string;
}

export const BIOMES_EDUCA: BiomeOption[] = [
  { id: 'meadow', label: 'Pradera', icon: '🌿', world3d: 'Forest' },
  { id: 'desert', label: 'Desierto', icon: '🏜️', world3d: 'Desert' },
  { id: 'snow', label: 'Nieve', icon: '❄️', world3d: 'Snow' },
  { id: 'lava', label: 'Lava', icon: '🌋', world3d: 'Nether' },
];

export function educaBiomeToWorld3d(biome?: Biome | string): string {
  switch (biome) {
    case 'desert':
      return 'Desert';
    case 'snow':
      return 'Snow';
    case 'lava':
      return 'Nether';
    case 'meadow':
    default:
      return 'Forest';
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
