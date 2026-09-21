// Visual biome of a section, chosen by the teacher (editor.ts). The keys match
// the asset folders of the 3D world (frontend/public/mundo-3d/Assets/House/<Biome>),
// so nothing has to be translated/remapped on the 3D viewer side.
export type Biome = 'Desierto' | 'Bosque' | 'Arenisca' | 'Nieve' | 'Nether' | 'Espacio';

export interface BiomeInfo {
  id: Biome;
  label: string;
  icon: string;
  // Nether does not have an equivalent theme in the 2D map (WorldTheme) yet — it is shown
  // in the selector but disabled until it does.
  available: boolean;
  // Preview of what the map of that biome looks like — same tile the real 2D map uses
  // (vertical-world.engine.ts, WORLD_APPEARANCE). For now 1 per biome; the day there are
  // variants, this becomes a list and the teacher chooses among them.
  previewImage?: string;
}

export const BIOMES: BiomeInfo[] = [
  { id: 'Desierto', label: 'Desierto', icon: '🏜️', available: true, previewImage: '/mapa_desierto_tile_vertical.png' },
  { id: 'Bosque', label: 'Bosque', icon: '🌲', available: true, previewImage: '/mapa_selva_tile.png' },
  { id: 'Arenisca', label: 'Arenisca', icon: '🏛️', available: true, previewImage: '/mapa_castillo_tile.png' },
  { id: 'Nieve', label: 'Nieve', icon: '❄️', available: true, previewImage: '/mapa_nieve_tile.png' },
  { id: 'Nether', label: 'Nether', icon: '🔥', available: false },
  // Space: islands without water/clouds, planet-nodes and a ship as the avatar (see buildChallengeIsland in mundo-3d/index.html).
  { id: 'Espacio', label: 'Espacio', icon: '🚀', available: true },
];

export const BIOME_DEFAULT: Biome = 'Desierto';
