// Visual biome of a section, chosen by the teacher (editor.ts). The keys match
// the asset folders of the 3D world (frontend/public/world-3d/Assets/House/<Biome>),
// so nothing has to be translated/remapped on the 3D viewer side.
export type Biome = 'Desert' | 'Forest' | 'Sandstone' | 'Snow' | 'Nether' | 'Space';

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
  { id: 'Desert', label: 'Desierto', icon: '🏜️', available: true, previewImage: '/map_desert_tile_vertical.png' },
  { id: 'Forest', label: 'Bosque', icon: '🌲', available: true, previewImage: '/map_jungle_tile.png' },
  { id: 'Sandstone', label: 'Arenisca', icon: '🏛️', available: true, previewImage: '/map_castle_tile.png' },
  { id: 'Snow', label: 'Nieve', icon: '❄️', available: true, previewImage: '/map_snow_tile.png' },
  { id: 'Nether', label: 'Nether', icon: '🔥', available: false },
  // Space: islands without water/clouds, planet-nodes and a ship as the avatar (see buildChallengeIsland in world-3d/index.html).
  { id: 'Space', label: 'Espacio', icon: '🚀', available: true },
];

export const BIOME_DEFAULT: Biome = 'Desert';
