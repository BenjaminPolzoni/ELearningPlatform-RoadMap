/**
 * Config del personaje 3D modular (el creado en la ciudad `mundo-3d/index.html`).
 *
 * Misma forma que `modular_character_config` en localStorage: la ciudad es quien
 * escribe, el mundo hexagonal solo lee y refleja. El saneado replica las
 * migraciones de `index.html#loadSavedCharacterConfig` + `avatar-preview.html#leerConfig`.
 */

export const MODULAR_CONFIG_KEY = 'modular_character_config';

export const CLASES_VALIDAS = [
  'Knight',
  'Barbarian',
  'Mage',
  'Ranger',
  'Rogue',
  'Skeleton_Warrior',
  'Skeleton_Mage',
  'Skeleton_Rogue',
  'Skeleton_Minion',
  'Mannequin',
] as const;

export type ClasePersonaje = (typeof CLASES_VALIDAS)[number];

export interface AvatarModularConfig {
  characterClass: string;
  headStyle: string;
  hairStyle: string;
  hairColor: string;
  beardStyle: string;
  beardColor: string;
  topStyle: string;
  pantsStyle: string;
  shoesStyle: string;
  shoesColor: string;
  showCape: boolean;
  backItem: string;
  backpackColor: string;
  guitarColor: string;
  headItem: string;
  starOrbitColor: string;
  chickenVariant: string;
  pet: string;
  rightHandItem: string;
  leftHandItem: string;
  showHelmet?: boolean;
  showHat?: boolean;
}

export type AvatarModularGuardado = Partial<Record<keyof AvatarModularConfig, unknown>>;

const DEFAULTS: AvatarModularConfig = {
  characterClass: 'Knight',
  headStyle: 'Knight',
  hairStyle: 'default',
  hairColor: '#ffffff',
  beardStyle: 'none',
  beardColor: '#ffffff',
  topStyle: 'Knight',
  pantsStyle: 'Knight',
  shoesStyle: 'Knight',
  shoesColor: '#ffffff',
  showCape: true,
  backItem: 'backpack',
  backpackColor: '#2563eb',
  guitarColor: 'A',
  headItem: 'headphones',
  starOrbitColor: 'yellow',
  chickenVariant: 'A',
  pet: 'drone',
  rightHandItem: 'mouse_gamer',
  leftHandItem: 'mate_argentino',
};

const texto = (v: unknown, fb: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fb;

/** Sanea una config cruda (cualquier versión del editor) a valores usables. */
export function sanearConfigModular(crudo: AvatarModularGuardado | null | undefined): AvatarModularConfig {
  const c: AvatarModularConfig = { ...DEFAULTS };
  if (crudo && typeof crudo === 'object') {
    for (const k of Object.keys(DEFAULTS) as (keyof AvatarModularConfig)[]) {
      const v = crudo[k];
      if (v !== undefined && v !== null) (c[k] as unknown) = v;
    }
    if (crudo['showHelmet'] !== undefined) c.showHelmet = crudo['showHelmet'] === true;
    if (crudo['showHat'] !== undefined) c.showHat = crudo['showHat'] === true;
  }

  // Migración cabeza Encapuchado retirada → Rogue (se conserva el torso si era full-hooded).
  if (c.characterClass === 'Rogue_Hooded') {
    if (!crudo?.['topStyle']) c.topStyle = 'Rogue_Hooded';
    c.characterClass = 'Rogue';
  }
  if (c.headStyle === 'Rogue_Hooded') c.headStyle = 'Rogue';
  if (!CLASES_VALIDAS.includes(c.characterClass as ClasePersonaje)) c.characterClass = 'Knight';
  if (!c.headStyle) c.headStyle = c.characterClass;
  if (!c.hairStyle) c.hairStyle = 'default';
  if (!c.beardStyle) {
    c.beardStyle = c.characterClass === 'Barbarian' ? 'long' : c.characterClass === 'Ranger' ? 'short' : 'none';
  }
  if (!c.topStyle) c.topStyle = c.characterClass;
  if (!c.pantsStyle) c.pantsStyle = c.characterClass;
  if (!c.shoesStyle) c.shoesStyle = c.characterClass;
  if (!c.shoesColor) c.shoesColor = '#ffffff';
  if (!c.hairColor) c.hairColor = '#ffffff';
  if (!c.beardColor) c.beardColor = '#ffffff';

  if (c.showCape === undefined) c.showCape = c.backItem === 'cape';
  if (!c.backItem) c.backItem = c.showCape ? 'cape' : 'backpack';
  // Los carcajs ahora son insignia de espalda.
  if (c.backItem === 'quiver' || c.backItem === 'Skeleton_Quiver.gltf') c.backItem = 'shield_badge.gltf';
  if (!c.backpackColor) c.backpackColor = '#2563eb';
  if (c.guitarColor !== 'A' && c.guitarColor !== 'B') c.guitarColor = 'A';
  if (c.chickenVariant !== 'A' && c.chickenVariant !== 'B') c.chickenVariant = 'A';
  if (!c.headItem) {
    c.headItem = c.showHelmet === true ? 'helmet' : c.showHat === true ? 'bear_hat' : 'headphones';
  }
  // Migración: 4 ids de órbita (uno por color) → un id + starOrbitColor.
  const legado = String(c.headItem).match(/^star_orbit_(yellow|blue|green|red)$/);
  if (legado) {
    c.headItem = 'star_orbit';
    c.starOrbitColor = legado[1];
  }
  if (!['yellow', 'blue', 'green', 'red'].includes(c.starOrbitColor)) c.starOrbitColor = 'yellow';
  if (c.headItem === 'mining_helmet') c.headItem = 'none';
  if (c.backItem === 'laptop_bag') c.backItem = 'backpack';
  if (!c.pet) c.pet = 'drone';
  if (c.rightHandItem === undefined) c.rightHandItem = 'mouse_gamer';
  if (c.leftHandItem === undefined) c.leftHandItem = 'mate_argentino';
  // Los escudos ahora son solo de espalda: si estaban en mano, se sueltan.
  for (const campo of ['rightHandItem', 'leftHandItem'] as const) {
    if (/shield/i.test(c[campo])) c[campo] = 'none';
  }
  if (c.rightHandItem.includes('spellbook')) c.rightHandItem = 'keyboard_gamer';
  if (c.leftHandItem.includes('spellbook')) c.leftHandItem = 'keyboard_gamer';

  c.characterClass = texto(c.characterClass, 'Knight');
  return c;
}

/** Lee la config guardada por la ciudad; `null` si el alumno aún no creó su personaje. */
export function leerConfigModular(): AvatarModularConfig | null {
  try {
    const crudo = localStorage.getItem(MODULAR_CONFIG_KEY);
    if (!crudo) return null;
    const parsed = JSON.parse(crudo) as AvatarModularGuardado;
    if (!parsed || typeof parsed !== 'object') return null;
    return sanearConfigModular(parsed);
  } catch {
    return sanearConfigModular(null);
  }
}
