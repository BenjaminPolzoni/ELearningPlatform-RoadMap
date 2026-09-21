export type AttachmentType = 'document' | 'video' | 'link' | 'image' | 'exercise';

export type Biome = 'meadow' | 'desert' | 'snow' | 'lava';

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
