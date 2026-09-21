/**
 * Config of the modular 3D character (the one created in the city `world-3d/index.html`).
 *
 * Same shape as `modular_character_config` in localStorage: the city is the one that
 * writes, the hexagonal world only reads and reflects. The sanitizing replicates the
 * migrations of `index.html#loadSavedCharacterConfig` + `avatar-preview.html#leerConfig`.
 */

export const MODULAR_CONFIG_KEY = 'modular_character_config';

export const VALID_CHARACTER_CLASSES = [
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

export type CharacterClass = (typeof VALID_CHARACTER_CLASSES)[number];

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

export type AvatarSavedModular = Partial<Record<keyof AvatarModularConfig, unknown>>;

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

const text = (v: unknown, fb: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fb;

/** Sanitizes a raw config (any editor version) into usable values. */
export function sanitizeConfigModular(raw: AvatarSavedModular | null | undefined): AvatarModularConfig {
  const c: AvatarModularConfig = { ...DEFAULTS };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(DEFAULTS) as (keyof AvatarModularConfig)[]) {
      const v = raw[k];
      if (v !== undefined && v !== null) (c[k] as unknown) = v;
    }
    if (raw['showHelmet'] !== undefined) c.showHelmet = raw['showHelmet'] === true;
    if (raw['showHat'] !== undefined) c.showHat = raw['showHat'] === true;
  }

  // Migration of the removed Hooded head → Rogue (the torso is kept if it was full-hooded).
  if (c.characterClass === 'Rogue_Hooded') {
    if (!raw?.['topStyle']) c.topStyle = 'Rogue_Hooded';
    c.characterClass = 'Rogue';
  }
  if (c.headStyle === 'Rogue_Hooded') c.headStyle = 'Rogue';
  if (!VALID_CHARACTER_CLASSES.includes(c.characterClass as CharacterClass)) c.characterClass = 'Knight';
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
  // Quivers are now a back badge.
  if (c.backItem === 'quiver' || c.backItem === 'Skeleton_Quiver.gltf') c.backItem = 'shield_badge.gltf';
  if (!c.backpackColor) c.backpackColor = '#2563eb';
  if (c.guitarColor !== 'A' && c.guitarColor !== 'B') c.guitarColor = 'A';
  if (c.chickenVariant !== 'A' && c.chickenVariant !== 'B') c.chickenVariant = 'A';
  if (!c.headItem) {
    c.headItem = c.showHelmet === true ? 'helmet' : c.showHat === true ? 'bear_hat' : 'headphones';
  }
  // Migration: 4 orbit ids (one per color) → one id + starOrbitColor.
  const legacy = String(c.headItem).match(/^star_orbit_(yellow|blue|green|red)$/);
  if (legacy) {
    c.headItem = 'star_orbit';
    c.starOrbitColor = legacy[1];
  }
  if (!['yellow', 'blue', 'green', 'red'].includes(c.starOrbitColor)) c.starOrbitColor = 'yellow';
  if (c.headItem === 'mining_helmet') c.headItem = 'none';
  if (c.backItem === 'laptop_bag') c.backItem = 'backpack';
  if (!c.pet) c.pet = 'drone';
  if (c.rightHandItem === undefined) c.rightHandItem = 'mouse_gamer';
  if (c.leftHandItem === undefined) c.leftHandItem = 'mate_argentino';
  // Shields are now back-only: if they were in hand, they are dropped.
  for (const field of ['rightHandItem', 'leftHandItem'] as const) {
    if (/shield/i.test(c[field])) c[field] = 'none';
  }
  if (c.rightHandItem.includes('spellbook')) c.rightHandItem = 'keyboard_gamer';
  if (c.leftHandItem.includes('spellbook')) c.leftHandItem = 'keyboard_gamer';

  c.characterClass = text(c.characterClass, 'Knight');
  return c;
}

/** Reads the config saved by the city; `null` if the student has not created their character yet. */
export function readConfigModular(): AvatarModularConfig | null {
  try {
    const raw = localStorage.getItem(MODULAR_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AvatarSavedModular;
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizeConfigModular(parsed);
  } catch {
    return sanitizeConfigModular(null);
  }
}
