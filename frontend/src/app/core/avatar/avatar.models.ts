/**
 * Student avatar (05-design-system.md §4, `ui-avatar`). It is the character that walks
 * the 2.5D map and the section's inner board, so its configuration lives in
 * `core/` and not inside a feature: the HUD, the map, the board and the ranking consume it.
 *
 * Each option is identified by a stable `id` — what is persisted (and what will travel to the
 * Identity backend in Phase 3) are the ids, never the hex values. That way a palette tweak
 * does not invalidate already saved avatars.
 *
 * Gender changes the sprite silhouette and RESET's suggested hairstyle, but it does not filter
 * the catalog: every option is available for all three.
 */

export type GenderId = 'female' | 'male' | 'unspecified';
export type SkinId = 'light' | 'medium' | 'olive' | 'dark' | 'violet' | 'pink';
export type HairId =
  | 'short'
  | 'long'
  | 'mohawk'
  | 'shaved'
  | 'afro'
  | 'bun'
  | 'ponytail'
  | 'messy';
export type BeardId = 'none' | 'beard' | 'mustache' | 'goatee';
export type GarmentId = 'suit' | 'hoodie' | 'tshirt' | 'shirt' | 'jacket';
export type EmblemId =
  | 'none'
  | 'square'
  | 'tag'
  | 'braces'
  | 'prompt'
  | 'lambda'
  | 'semicolon'
  | 'hash';
export type AccessoryId =
  | 'none'
  | 'visor'
  | 'cap'
  | 'crown'
  | 'headphones'
  | 'beanie'
  | 'backwards-cap'
  | 'headset';
export type GlassesId = 'none' | 'thick-frame' | 'round' | 'sunglasses' | 'code';
export type ObjectId = 'none' | 'laptop' | 'coffee' | 'mate' | 'keyboard';
export type IdColor =
  | 'pink'
  | 'violet'
  | 'deep-violet'
  | 'bone'
  | 'night'
  | 'pastel-pink'
  | 'black'
  | 'brown'
  | 'blond'
  | 'redhead'
  | 'gray'
  | 'terminal-green'
  | 'graphite';

export interface AvatarConfig {
  gender: GenderId;
  skin: SkinId;
  hair: HairId;
  hairColor: IdColor;
  /** Painted with `hairColor`. */
  beard: BeardId;
  garment: GarmentId;
  clothesColor: IdColor;
  emblem: EmblemId;
  accessory: AccessoryId;
  accessoryColor: IdColor;
  /** Fixed colors: they have no color field of their own. */
  glasses: GlassesId;
  /** Fixed colors: they have no color field of their own. */
  object: ObjectId;
}

/**
 * What can come from localStorage: a config from any version of the catalog, with
 * ids that may no longer exist. `suitColor` is the old name of `clothesColor`.
 */
export type SavedAvatar = Partial<Record<keyof AvatarConfig | 'suitColor', unknown>>;

/** A color option: base + its precomputed shadow (the SVG cannot blend). */
export interface ColorOption {
  id: IdColor;
  name: string;
  base: string;
  shadow: string;
}

export interface SkinOption {
  id: SkinId;
  name: string;
  base: string;
  shadow: string;
}

export interface OptionItem<T extends string> {
  id: T;
  name: string;
}

/** The editor shows the emblem with its glyph, not with a name. */
export interface EmblemOption extends OptionItem<EmblemId> {
  glyph: string;
}

export const GENDERS: readonly OptionItem<GenderId>[] = [
  { id: 'female', name: 'Mujer' },
  { id: 'male', name: 'Varón' },
  { id: 'unspecified', name: 'Indefinido' },
];

/**
 * The 4 swatches of `Fotos_y_conceptos/paleta.jpg` plus bone white and a derived pastel
 * pink.
 */
export const MARK_COLORS: readonly ColorOption[] = [
  { id: 'pink', name: 'Rosa fuego', base: '#FF2758', shadow: '#B3123A' },
  { id: 'violet', name: 'Violeta eléctrico', base: '#8B3DF5', shadow: '#5D1BAF' },
  { id: 'deep-violet', name: 'Violeta profundo', base: '#6B21C9', shadow: '#43127F' },
  { id: 'bone', name: 'Hueso', base: '#F3EAFF', shadow: '#B9A6D6' },
  { id: 'night', name: 'Noche', base: '#2D164A', shadow: '#190236' },
  { id: 'pastel-pink', name: 'Rosa pastel', base: '#FF7BA0', shadow: '#C94A70' },
];

const BLACK: ColorOption = { id: 'black', name: 'Negro', base: '#1E1726', shadow: '#0B0710' };

/**
 * Natural hair colors: left out of the brand palette for the same reason as
 * natural skin tones — a person's hair cannot be limited to 6 brand hex values.
 */
export const NATURAL_HAIR_COLORS: readonly ColorOption[] = [
  BLACK,
  { id: 'brown', name: 'Castaño', base: '#6B4226', shadow: '#452815' },
  { id: 'blond', name: 'Rubio', base: '#E6C27A', shadow: '#B38F45' },
  { id: 'redhead', name: 'Pelirrojo', base: '#C2502A', shadow: '#853316' },
  { id: 'gray', name: 'Canoso', base: '#CFCAD6', shadow: '#948DA0' },
];

/** "Programmer" colors for clothes and accessories: black hoodie, graphite gray, terminal green. */
const DEV_COLORS: readonly ColorOption[] = [
  { id: 'terminal-green', name: 'Verde terminal', base: '#2BD46A', shadow: '#16883F' },
  { id: 'graphite', name: 'Grafito', base: '#4B4A57', shadow: '#2B2A35' },
  BLACK,
];

export const HAIR_COLORS: readonly ColorOption[] = [...NATURAL_HAIR_COLORS, ...MARK_COLORS];
export const CLOTHES_COLORS: readonly ColorOption[] = [...MARK_COLORS, ...DEV_COLORS];

/** Single color registry (unique ids): `colorById` resolves from here. */
export const COLORS: readonly ColorOption[] = [
  ...MARK_COLORS,
  ...NATURAL_HAIR_COLORS,
  ...DEV_COLORS.filter((c) => c !== BLACK),
];

/**
 * Skin tones: four natural ones (deliberately left out of the palette — a person's
 * avatar cannot be limited to 4 brand hex values) plus two stylized ones from the
 * palette, for anyone who prefers a fully branded character.
 */
export const SKINS: readonly SkinOption[] = [
  { id: 'light', name: 'Clara', base: '#F6D8C4', shadow: '#D9AE93' },
  { id: 'medium', name: 'Media', base: '#D9A98B', shadow: '#B07F63' },
  { id: 'olive', name: 'Trigueña', base: '#A9714F', shadow: '#7E4E33' },
  { id: 'dark', name: 'Oscura', base: '#6E4630', shadow: '#4A2C1C' },
  { id: 'violet', name: 'Violeta', base: '#B77BF7', shadow: '#8B3DF5' },
  { id: 'pink', name: 'Rosa', base: '#FF9DB8', shadow: '#FF2758' },
];

export const HAIRSTYLES: readonly OptionItem<HairId>[] = [
  { id: 'short', name: 'Corto' },
  { id: 'long', name: 'Largo' },
  { id: 'mohawk', name: 'Cresta' },
  { id: 'shaved', name: 'Rapado' },
  { id: 'afro', name: 'Afro' },
  { id: 'bun', name: 'Rodete' },
  { id: 'ponytail', name: 'Coleta' },
  { id: 'messy', name: 'Despeinado' },
];

export const BEARDS: readonly OptionItem<BeardId>[] = [
  { id: 'none', name: 'Sin barba' },
  { id: 'beard', name: 'Barba' },
  { id: 'mustache', name: 'Bigote' },
  { id: 'goatee', name: 'Candado' },
];

export const GARMENTS: readonly OptionItem<GarmentId>[] = [
  { id: 'suit', name: 'Traje' },
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'tshirt', name: 'Remera' },
  { id: 'shirt', name: 'Camisa y corbata' },
  { id: 'jacket', name: 'Campera' },
];

export const EMBLEMS: readonly EmblemOption[] = [
  { id: 'none', name: 'Sin emblema', glyph: '∅' },
  { id: 'square', name: 'Cuadro', glyph: '■' },
  { id: 'tag', name: 'Etiqueta', glyph: '</>' },
  { id: 'braces', name: 'Llaves', glyph: '{}' },
  { id: 'prompt', name: 'Prompt', glyph: '>_' },
  { id: 'lambda', name: 'Lambda', glyph: 'λ' },
  { id: 'semicolon', name: 'Punto y coma', glyph: ';' },
  { id: 'hash', name: 'Numeral', glyph: '#' },
];

export const ACCESSORIES: readonly OptionItem<AccessoryId>[] = [
  { id: 'none', name: 'Sin accesorio' },
  { id: 'visor', name: 'Visor' },
  { id: 'cap', name: 'Gorra' },
  { id: 'backwards-cap', name: 'Gorra hacia atrás' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'crown', name: 'Corona' },
  { id: 'headphones', name: 'Auriculares' },
  { id: 'headset', name: 'Headset' },
];

export const GLASSES: readonly OptionItem<GlassesId>[] = [
  { id: 'none', name: 'Sin anteojos' },
  { id: 'thick-frame', name: 'Marco grueso' },
  { id: 'round', name: 'Redondos' },
  { id: 'sunglasses', name: 'De sol' },
  { id: 'code', name: 'Con código' },
];

export const OBJECTS: readonly OptionItem<ObjectId>[] = [
  { id: 'none', name: 'Manos libres' },
  { id: 'laptop', name: 'Laptop' },
  { id: 'coffee', name: 'Café' },
  { id: 'mate', name: 'Mate' },
  { id: 'keyboard', name: 'Teclado' },
];

type Catalog<K extends keyof AvatarConfig> = readonly { id: AvatarConfig[K] }[];

/**
 * Which ids are valid for each field. It is the single source of truth: the migration
 * (`sanitizeAvatar`), the editor's shuffle and the ranking's mock avatars use it. The mapped
 * type forces a new `AvatarConfig` field to come with its catalog.
 */
export const OPTIONS_BY_FIELD: { readonly [K in keyof AvatarConfig]: Catalog<K> } = {
  gender: GENDERS,
  skin: SKINS,
  hair: HAIRSTYLES,
  hairColor: HAIR_COLORS,
  beard: BEARDS,
  garment: GARMENTS,
  clothesColor: CLOTHES_COLORS,
  emblem: EMBLEMS,
  accessory: ACCESSORIES,
  accessoryColor: CLOTHES_COLORS,
  glasses: GLASSES,
  object: OBJECTS,
};

const SUGGESTED_HAIR: Record<GenderId, HairId> = {
  female: 'long',
  male: 'short',
  unspecified: 'messy',
};

/** Suggested values for a gender: used by RESET and the first login (undefined). */
export function defaultAvatar(gender: GenderId): AvatarConfig {
  return {
    gender,
    skin: 'medium',
    hair: SUGGESTED_HAIR[gender],
    hairColor: 'brown',
    beard: 'none',
    garment: 'hoodie',
    clothesColor: 'violet',
    emblem: 'tag',
    accessory: 'none',
    accessoryColor: 'pink',
    glasses: 'none',
    object: 'none',
  };
}

/** Builds a config by choosing one id per field, from its own catalog. */
export function assembleAvatar(
  choose: <K extends keyof AvatarConfig>(field: K, options: Catalog<K>) => AvatarConfig[K],
): AvatarConfig {
  const config = {} as Record<keyof AvatarConfig, string>;
  for (const field of Object.keys(OPTIONS_BY_FIELD) as (keyof AvatarConfig)[]) {
    config[field] = choose(field, OPTIONS_BY_FIELD[field]);
  }
  return config as AvatarConfig;
}

export function colorById(id: IdColor): ColorOption {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}

export function skinById(id: SkinId): SkinOption {
  return SKINS.find((p) => p.id === id) ?? SKINS[1];
}

/**
 * Converts what was saved into a valid config. Two deliberately different cases:
 * - **missing** field = the avatar was saved before that field existed → classic
 *   look (suit + frame), so anyone who already had an avatar keeps seeing it the same;
 * - **present but unknown** id (or from a list that does not apply, such as a terminal
 *   green in the hair) → default of its gender.
 */
export function sanitizeAvatar(v: SavedAvatar | null | undefined): AvatarConfig {
  if (!v || typeof v !== 'object') return defaultAvatar('unspecified');

  const valid = <K extends keyof AvatarConfig>(field: K, x: unknown, fb: AvatarConfig[K]) =>
    OPTIONS_BY_FIELD[field].some((o) => o.id === x) ? (x as AvatarConfig[K]) : fb;

  const gender = valid('gender', v.gender, 'unspecified');
  const d = defaultAvatar(gender);
  const withLegacy = <K extends 'garment' | 'emblem'>(field: K, classic: AvatarConfig[K]) =>
    v[field] === undefined ? classic : valid(field, v[field], d[field]);

  return {
    gender,
    skin: valid('skin', v.skin, d.skin),
    hair: valid('hair', v.hair, d.hair),
    hairColor: valid('hairColor', v.hairColor, d.hairColor),
    beard: valid('beard', v.beard, d.beard),
    garment: withLegacy('garment', 'suit'),
    clothesColor: valid('clothesColor', v.clothesColor ?? v.suitColor, d.clothesColor),
    emblem: withLegacy('emblem', 'square'),
    accessory: valid('accessory', v.accessory, d.accessory),
    accessoryColor: valid('accessoryColor', v.accessoryColor, d.accessoryColor),
    glasses: valid('glasses', v.glasses, d.glasses),
    object: valid('object', v.object, d.object),
  };
}

/**
 * The shirt tie takes the center of the chest and the laptop is held in front: in
 * both cases the emblem is not drawn (the editor warns about it).
 */
export function emblemVisible(a: AvatarConfig): boolean {
  return a.emblem !== 'none' && a.garment !== 'shirt' && a.object !== 'laptop';
}

/** The visor covers the eyes: with a visor, glasses are not drawn (the editor warns about it). */
export function visibleGlasses(a: AvatarConfig): boolean {
  return a.glasses !== 'none' && a.accessory !== 'visor';
}
