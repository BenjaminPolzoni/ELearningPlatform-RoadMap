// Bioma visual de una unidad, elegido por el profesor (editor.ts). Las claves coinciden
// con las carpetas de assets del mundo 3D (frontend/public/mundo-3d/Assets/House/<Bioma>),
// para no tener que traducir/remapear nada del lado del visor 3D.
export type Bioma = 'Desierto' | 'Bosque' | 'Arenisca' | 'Nieve' | 'Nether';

export interface BiomaInfo {
  id: Bioma;
  label: string;
  icon: string;
  // Nether todavía no tiene tema equivalente en el mapa 2D (WorldTheme) — se muestra
  // en el selector pero deshabilitado hasta que lo tenga.
  disponible: boolean;
  // Vista previa de cómo se ve el mapa de ese bioma — mismo tile que usa el mapa 2D real
  // (vertical-world.engine.ts, WORLD_APPEARANCE). Por ahora 1 por bioma; el día que haya
  // variantes, esto pasa a ser una lista y el profesor elige entre ellas.
  previewImage?: string;
}

export const BIOMAS: BiomaInfo[] = [
  { id: 'Desierto', label: 'Desierto', icon: '🏜️', disponible: true, previewImage: '/mapa_desierto_tile_vertical.png' },
  { id: 'Bosque', label: 'Bosque', icon: '🌲', disponible: true, previewImage: '/mapa_selva_tile.png' },
  { id: 'Arenisca', label: 'Arenisca', icon: '🏛️', disponible: true, previewImage: '/mapa_castillo_tile.png' },
  { id: 'Nieve', label: 'Nieve', icon: '❄️', disponible: true, previewImage: '/mapa_nieve_tile.png' },
  { id: 'Nether', label: 'Nether', icon: '🔥', disponible: false },
];

export const BIOMA_DEFAULT: Bioma = 'Desierto';
