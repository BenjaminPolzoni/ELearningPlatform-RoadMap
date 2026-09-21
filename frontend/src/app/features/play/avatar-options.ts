/**
 * Options of the My character panel: same values and labels as the city editor
 * (`public/world-3d/index.html` selects) for full parity.
 */

export interface AvatarOption {
  value: string;
  label: string;
}

const CHARACTER_CLASSES: AvatarOption[] = [
  { value: 'Knight', label: 'Caballero' },
  { value: 'Barbarian', label: 'Bárbaro' },
  { value: 'Mage', label: 'Mago' },
  { value: 'Ranger', label: 'Arquero' },
  { value: 'Rogue', label: 'Pícaro' },
  { value: 'Skeleton_Warrior', label: 'Esqueleto Guerrero' },
  { value: 'Skeleton_Mage', label: 'Esqueleto Mago' },
  { value: 'Skeleton_Rogue', label: 'Esqueleto Pícaro' },
  { value: 'Skeleton_Minion', label: 'Esqueleto Minion' },
  { value: 'Mannequin', label: 'Maniquí' },
];

export const ARCHETYPE_OPTIONS: AvatarOption[] = CHARACTER_CLASSES.map((c, i) => ({
  ...c,
  label: `Arquetipo ${'ABCDEFGHIJ'[i]} (${c.label})`,
}));

export const HEAD_OPTIONS: AvatarOption[] = CHARACTER_CLASSES.map((c, i) => ({
  ...c,
  label: `Cabeza ${'ABCDEFGHIJ'[i]} (${c.label})`,
}));

const WITH_HOOD: AvatarOption = { value: 'Rogue_Hooded', label: 'Torso Encapuchado' };

export const TORSO_OPTIONS: AvatarOption[] = [
  ...CHARACTER_CLASSES.map((c, i) => ({ ...c, label: `Parte Superior ${'ABCDEFGHIJK'[i]} (${c.label})` })),
  WITH_HOOD,
];

export const PANTS_OPTIONS: AvatarOption[] = [
  ...CHARACTER_CLASSES.map((c, i) => ({ ...c, label: `Pantalón ${'ABCDEFGHIJK'[i]} (${c.label})` })),
  { value: 'Rogue_Hooded', label: 'Pantalón Encapuchado' },
];

export const HAIR_OPTIONS: AvatarOption[] = [
  { value: 'default', label: '👤 Original / Por Defecto' },
  { value: 'mage', label: '🧙 Mago (Largo)' },
  { value: 'ranger', label: '🏹 Arquero (Ondulado)' },
  { value: 'knight', label: '🛡️ Caballero (Corto)' },
  { value: 'rogue', label: '🗡️ Pícaro (Despeinado)' },
  { value: 'none', label: '🚫 Ninguno (Rapado)' },
];

export const BEARD_OPTIONS: AvatarOption[] = [
  { value: 'none', label: '🚫 Ninguno' },
  { value: 'long', label: '🧔 Barba larga' },
  { value: 'short', label: '🧔 Barba corta' },
  { value: 'mask', label: '🥷 Tapaboca' },
];

export const SHOES_OPTIONS: AvatarOption[] = [
  ...CHARACTER_CLASSES.map((c, i) => ({ ...c, label: `Zapatos ${'ABCDEFGHIJK'[i]} (${c.label})` })),
  { value: 'sneakers', label: 'Zapatillas Urbanas' },
];

export const BACK_OPTIONS: AvatarOption[] = [
  { value: 'none', label: '🚫 Ninguno' },
  { value: 'cape', label: '🧣 Capa' },
  { value: 'backpack', label: '🎒 Mochila' },
  { value: 'keyboard_back', label: '⌨️ Teclado Gamer' },
  { value: 'giant_usb', label: '💾 USB Gigante' },
  { value: 'guitar', label: '🎸 Guitarra' },
  { value: 'shield_badge.gltf', label: '🛡️ Escudo Emblema' },
  { value: 'shield_badge_color.gltf', label: '🛡️ Escudo Emblema Color' },
  { value: 'shield_round.gltf', label: '🛡️ Escudo Redondo' },
  { value: 'shield_round_barbarian.gltf', label: '🛡️ Escudo Bárbaro' },
  { value: 'shield_round_color.gltf', label: '🛡️ Escudo Redondo Color' },
  { value: 'shield_spikes.gltf', label: '🛡️ Escudo con Púas' },
  { value: 'shield_spikes_color.gltf', label: '🛡️ Escudo Púas Color' },
  { value: 'shield_square.gltf', label: '🛡️ Escudo Cuadrado' },
  { value: 'shield_square_color.gltf', label: '🛡️ Escudo Cuadrado Color' },
  { value: 'Skeleton_Shield_Large_A.gltf', label: '🛡️ Escudo Grande A' },
  { value: 'Skeleton_Shield_Large_B.gltf', label: '🛡️ Escudo Grande B' },
  { value: 'Skeleton_Shield_Small_A.gltf', label: '🛡️ Escudo Pequeño A' },
  { value: 'Skeleton_Shield_Small_B.gltf', label: '🛡️ Escudo Pequeño B' },
];

export const HEAD_ITEM_OPTIONS: AvatarOption[] = [
  { value: 'none', label: '🚫 Ninguno' },
  { value: 'headphones', label: '🎧 Auriculares Gamer' },
  { value: 'propeller_hat', label: '🚁 Gorro Cóptero' },
  { value: 'saiyan_scouter', label: '👁️ Visor Saiyajin' },
  { value: 'gamer_glasses', label: '👓 Anteojos Gamer' },
  { value: 'bear_hat', label: '🐻 Gorro de Oso' },
  { value: 'helmet', label: '🪖 Casco' },
  { value: 'skel_helmet', label: '🪖 Casco Esqueleto' },
  { value: 'skel_mage_hat', label: '🧙 Sombrero Esqueleto' },
  { value: 'skel_hood', label: '🥷 Capucha Esqueleto' },
  { value: 'star_orbit', label: '⭐ Estrellitas' },
  { value: 'flower_antennae', label: '🌸 Flores Antena' },
];

export const PET_OPTIONS: AvatarOption[] = [
  { value: 'none', label: '🚫 Ninguna' },
  { value: 'drone', label: '🛸 Dron' },
  { value: 'owl', label: '🦉 Búho' },
  { value: 'bat', label: '🦇 Murciélago' },
  { value: 'ghost', label: '👻 Fantasma' },
  { value: 'chicken', label: '🐔 Gallina' },
  { value: 'dog', label: '🐶 Perrito' },
  { value: 'dragonfly', label: '🪰 Libélula' },
  { value: 'frog', label: '🐸 Rana' },
  { value: 'salamander', label: '🦎 Salamandra' },
];

const HAND_BASE: AvatarOption[] = [
  { value: 'none', label: '🚫 Ninguna' },
  { value: 'mouse_gamer', label: '🖱️ Mouse Gamer' },
  { value: 'rubber_duck', label: '🦆 Patito de Hule' },
  { value: 'mate_argentino', label: '🧉 Mate' },
  { value: 'energy_can', label: '⚡ Red Bull' },
  { value: 'pokeball', label: '🔴 Pokéball' },
  { value: 'keyboard_gamer', label: '⌨️ Teclado Gamer' },
];

const HAND_WEAPONS: AvatarOption[] = [
  { value: 'sword_1handed.gltf', label: '🗡️ Espada 1M' },
  { value: 'sword_2handed.gltf', label: '⚔️ Espada 2M' },
  { value: 'axe_1handed.gltf', label: '🪓 Hacha 1M' },
  { value: 'axe_2handed.gltf', label: '🪓 Hacha 2M' },
  { value: 'dagger.gltf', label: '🗡️ Daga' },
  { value: 'staff.gltf', label: '🪄 Báculo' },
  { value: 'wand.gltf', label: '✨ Varita' },
  { value: 'bow_withString.gltf', label: '🏹 Arco' },
  { value: 'crossbow_1handed.gltf', label: '🎯 Ballesta' },
  { value: 'Skeleton_Blade.gltf', label: '🗡️ Espada Esquelética' },
  { value: 'Skeleton_Axe.gltf', label: '🪓 Hacha Esquelética' },
  { value: 'Skeleton_Staff.gltf', label: '🪄 Báculo Esquelético' },
  { value: 'Skeleton_Crossbow.gltf', label: '🎯 Ballesta Esquelética' },
  { value: 'mug_full.gltf', label: '🍺 Jarra Llena' },
  { value: 'mug_empty.gltf', label: '🍺 Jarra Vacía' },
  { value: 'smokebomb.gltf', label: '💨 Bomba Humo' },
  { value: 'puzzlecube_complete.gltf', label: '🧩 Cubo Rubik' },
];

export const HAND_RIGHT_OPTIONS: AvatarOption[] = [...HAND_BASE, ...HAND_WEAPONS];
export const HAND_LEFT_OPTIONS: AvatarOption[] = [...HAND_BASE, ...HAND_WEAPONS];

export interface ColorSwatch {
  hex: string;
  name: string;
}

export const HAIR_COLORS: ColorSwatch[] = [
  { hex: '#ffffff', name: 'Original' },
  { hex: '#1E1726', name: 'Negro' },
  { hex: '#6B4226', name: 'Castaño' },
  { hex: '#E6C27A', name: 'Rubio' },
  { hex: '#C2502A', name: 'Pelirrojo' },
  { hex: '#CFCAD6', name: 'Canoso' },
];

export const SHOES_COLORS: ColorSwatch[] = [
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#18181b', name: 'Negro' },
  { hex: '#dc2626', name: 'Rojo' },
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#16a34a', name: 'Verde' },
  { hex: '#eab308', name: 'Amarillo' },
];

export const BACKPACK_COLORS: ColorSwatch[] = [
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#dc2626', name: 'Rojo' },
  { hex: '#1f2937', name: 'Negro' },
  { hex: '#16a34a', name: 'Verde' },
  { hex: '#7c3aed', name: 'Púrpura' },
  { hex: '#ea580c', name: 'Naranja' },
];

export const STAR_COLORS: AvatarOption[] = [
  { value: 'yellow', label: 'Amarilla' },
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'red', label: 'Roja' },
];
