/**
 * Avatar del alumno (05-design-system.md §4, `ui-avatar`). Es el personaje que recorre
 * el mapa 2.5D y el tablero interno de la unidad, así que su configuración vive en
 * `core/` y no dentro de una feature: la consumen el HUD, el mapa, el tablero y el ranking.
 *
 * Cada opción se identifica por `id` estable — lo que se persiste (y lo que en Fase 3
 * viajará al backend de Identidad) son los ids, nunca los hex. Así un retoque de paleta
 * no invalida los avatares ya guardados.
 *
 * El género cambia la silueta del sprite y el peinado sugerido de RESET, pero no filtra el
 * catálogo: toda opción está disponible para los tres.
 */

export type IdGenero = 'mujer' | 'varon' | 'indefinido';
export type IdPiel = 'clara' | 'media' | 'trigueña' | 'oscura' | 'violeta' | 'rosa';
export type IdPelo =
  | 'corto'
  | 'largo'
  | 'cresta'
  | 'rapado'
  | 'afro'
  | 'rodete'
  | 'coleta'
  | 'despeinado';
export type IdBarba = 'ninguna' | 'barba' | 'bigote' | 'candado';
export type IdPrenda = 'traje' | 'hoodie' | 'remera' | 'camisa' | 'campera';
export type IdEmblema =
  | 'ninguno'
  | 'cuadro'
  | 'tag'
  | 'llaves'
  | 'prompt'
  | 'lambda'
  | 'punto-y-coma'
  | 'hash';
export type IdAccesorio =
  | 'ninguno'
  | 'visor'
  | 'gorra'
  | 'corona'
  | 'auriculares'
  | 'beanie'
  | 'gorra-atras'
  | 'headset';
export type IdAnteojos = 'ninguno' | 'marco-grueso' | 'redondos' | 'sol' | 'codigo';
export type IdObjeto = 'ninguno' | 'laptop' | 'cafe' | 'mate' | 'teclado';
export type IdColor =
  | 'rosa'
  | 'violeta'
  | 'violeta-profundo'
  | 'hueso'
  | 'noche'
  | 'rosa-pastel'
  | 'negro'
  | 'castaño'
  | 'rubio'
  | 'pelirrojo'
  | 'canoso'
  | 'verde-terminal'
  | 'grafito';

export interface AvatarConfig {
  genero: IdGenero;
  piel: IdPiel;
  pelo: IdPelo;
  colorPelo: IdColor;
  /** Se pinta con `colorPelo`. */
  barba: IdBarba;
  prenda: IdPrenda;
  colorRopa: IdColor;
  emblema: IdEmblema;
  accesorio: IdAccesorio;
  colorAccesorio: IdColor;
  /** Colores fijos: no tienen campo de color propio. */
  anteojos: IdAnteojos;
  /** Colores fijos: no tienen campo de color propio. */
  objeto: IdObjeto;
}

/**
 * Lo que puede venir de localStorage: una config de cualquier versión del catálogo, con
 * ids que quizás ya no existen. `colorTraje` es el nombre viejo de `colorRopa`.
 */
export type AvatarGuardado = Partial<Record<keyof AvatarConfig | 'colorTraje', unknown>>;

/** Una opción de color: base + su sombra ya calculada (el SVG no puede mezclar). */
export interface OpcionColor {
  id: IdColor;
  nombre: string;
  base: string;
  sombra: string;
}

export interface OpcionPiel {
  id: IdPiel;
  nombre: string;
  base: string;
  sombra: string;
}

export interface Opcion<T extends string> {
  id: T;
  nombre: string;
}

/** El editor muestra el emblema con su glifo, no con un nombre. */
export interface OpcionEmblema extends Opcion<IdEmblema> {
  glifo: string;
}

export const GENEROS: readonly Opcion<IdGenero>[] = [
  { id: 'mujer', nombre: 'Mujer' },
  { id: 'varon', nombre: 'Varón' },
  { id: 'indefinido', nombre: 'Indefinido' },
];

/**
 * Los 4 swatches de `Fotos_y_conceptos/paleta.jpg` más blanco hueso y un rosa pastel
 * derivado.
 */
export const COLORES_MARCA: readonly OpcionColor[] = [
  { id: 'rosa', nombre: 'Rosa fuego', base: '#FF2758', sombra: '#B3123A' },
  { id: 'violeta', nombre: 'Violeta eléctrico', base: '#8B3DF5', sombra: '#5D1BAF' },
  { id: 'violeta-profundo', nombre: 'Violeta profundo', base: '#6B21C9', sombra: '#43127F' },
  { id: 'hueso', nombre: 'Hueso', base: '#F3EAFF', sombra: '#B9A6D6' },
  { id: 'noche', nombre: 'Noche', base: '#2D164A', sombra: '#190236' },
  { id: 'rosa-pastel', nombre: 'Rosa pastel', base: '#FF7BA0', sombra: '#C94A70' },
];

const NEGRO: OpcionColor = { id: 'negro', nombre: 'Negro', base: '#1E1726', sombra: '#0B0710' };

/**
 * Colores naturales de pelo: quedan por fuera de la paleta de marca por la misma razón que
 * los tonos naturales de piel — un pelo de persona no puede limitarse a 6 hex de marca.
 */
export const COLORES_PELO_NATURALES: readonly OpcionColor[] = [
  NEGRO,
  { id: 'castaño', nombre: 'Castaño', base: '#6B4226', sombra: '#452815' },
  { id: 'rubio', nombre: 'Rubio', base: '#E6C27A', sombra: '#B38F45' },
  { id: 'pelirrojo', nombre: 'Pelirrojo', base: '#C2502A', sombra: '#853316' },
  { id: 'canoso', nombre: 'Canoso', base: '#CFCAD6', sombra: '#948DA0' },
];

/** Colores "de programador" para ropa y accesorios: hoodie negro, gris grafito, verde terminal. */
const COLORES_DEV: readonly OpcionColor[] = [
  { id: 'verde-terminal', nombre: 'Verde terminal', base: '#2BD46A', sombra: '#16883F' },
  { id: 'grafito', nombre: 'Grafito', base: '#4B4A57', sombra: '#2B2A35' },
  NEGRO,
];

export const COLORES_PELO: readonly OpcionColor[] = [...COLORES_PELO_NATURALES, ...COLORES_MARCA];
export const COLORES_ROPA: readonly OpcionColor[] = [...COLORES_MARCA, ...COLORES_DEV];

/** Registro único de colores (ids únicos): de acá resuelve `colorPorId`. */
export const COLORES: readonly OpcionColor[] = [
  ...COLORES_MARCA,
  ...COLORES_PELO_NATURALES,
  ...COLORES_DEV.filter((c) => c !== NEGRO),
];

/**
 * Tonos de piel: cuatro naturales (que quedan por fuera de la paleta a propósito — un
 * avatar de persona no puede limitarse a 4 hex de marca) más dos estilizados de la
 * paleta, para quien prefiera un personaje totalmente brandeado.
 */
export const PIELES: readonly OpcionPiel[] = [
  { id: 'clara', nombre: 'Clara', base: '#F6D8C4', sombra: '#D9AE93' },
  { id: 'media', nombre: 'Media', base: '#D9A98B', sombra: '#B07F63' },
  { id: 'trigueña', nombre: 'Trigueña', base: '#A9714F', sombra: '#7E4E33' },
  { id: 'oscura', nombre: 'Oscura', base: '#6E4630', sombra: '#4A2C1C' },
  { id: 'violeta', nombre: 'Violeta', base: '#B77BF7', sombra: '#8B3DF5' },
  { id: 'rosa', nombre: 'Rosa', base: '#FF9DB8', sombra: '#FF2758' },
];

export const PELOS: readonly Opcion<IdPelo>[] = [
  { id: 'corto', nombre: 'Corto' },
  { id: 'largo', nombre: 'Largo' },
  { id: 'cresta', nombre: 'Cresta' },
  { id: 'rapado', nombre: 'Rapado' },
  { id: 'afro', nombre: 'Afro' },
  { id: 'rodete', nombre: 'Rodete' },
  { id: 'coleta', nombre: 'Coleta' },
  { id: 'despeinado', nombre: 'Despeinado' },
];

export const BARBAS: readonly Opcion<IdBarba>[] = [
  { id: 'ninguna', nombre: 'Sin barba' },
  { id: 'barba', nombre: 'Barba' },
  { id: 'bigote', nombre: 'Bigote' },
  { id: 'candado', nombre: 'Candado' },
];

export const PRENDAS: readonly Opcion<IdPrenda>[] = [
  { id: 'traje', nombre: 'Traje' },
  { id: 'hoodie', nombre: 'Hoodie' },
  { id: 'remera', nombre: 'Remera' },
  { id: 'camisa', nombre: 'Camisa y corbata' },
  { id: 'campera', nombre: 'Campera' },
];

export const EMBLEMAS: readonly OpcionEmblema[] = [
  { id: 'ninguno', nombre: 'Sin emblema', glifo: '∅' },
  { id: 'cuadro', nombre: 'Cuadro', glifo: '■' },
  { id: 'tag', nombre: 'Etiqueta', glifo: '</>' },
  { id: 'llaves', nombre: 'Llaves', glifo: '{}' },
  { id: 'prompt', nombre: 'Prompt', glifo: '>_' },
  { id: 'lambda', nombre: 'Lambda', glifo: 'λ' },
  { id: 'punto-y-coma', nombre: 'Punto y coma', glifo: ';' },
  { id: 'hash', nombre: 'Numeral', glifo: '#' },
];

export const ACCESORIOS: readonly Opcion<IdAccesorio>[] = [
  { id: 'ninguno', nombre: 'Sin accesorio' },
  { id: 'visor', nombre: 'Visor' },
  { id: 'gorra', nombre: 'Gorra' },
  { id: 'gorra-atras', nombre: 'Gorra hacia atrás' },
  { id: 'beanie', nombre: 'Beanie' },
  { id: 'corona', nombre: 'Corona' },
  { id: 'auriculares', nombre: 'Auriculares' },
  { id: 'headset', nombre: 'Headset' },
];

export const ANTEOJOS: readonly Opcion<IdAnteojos>[] = [
  { id: 'ninguno', nombre: 'Sin anteojos' },
  { id: 'marco-grueso', nombre: 'Marco grueso' },
  { id: 'redondos', nombre: 'Redondos' },
  { id: 'sol', nombre: 'De sol' },
  { id: 'codigo', nombre: 'Con código' },
];

export const OBJETOS: readonly Opcion<IdObjeto>[] = [
  { id: 'ninguno', nombre: 'Manos libres' },
  { id: 'laptop', nombre: 'Laptop' },
  { id: 'cafe', nombre: 'Café' },
  { id: 'mate', nombre: 'Mate' },
  { id: 'teclado', nombre: 'Teclado' },
];

type Catalogo<K extends keyof AvatarConfig> = readonly { id: AvatarConfig[K] }[];

/**
 * Qué ids son válidos para cada campo. Es la única fuente de verdad: la usan la migración
 * (`sanearAvatar`), el sorteo del editor y los avatares mock del ranking. El tipo mapeado
 * obliga a que un campo nuevo de `AvatarConfig` traiga su catálogo.
 */
export const OPCIONES_POR_CAMPO: { readonly [K in keyof AvatarConfig]: Catalogo<K> } = {
  genero: GENEROS,
  piel: PIELES,
  pelo: PELOS,
  colorPelo: COLORES_PELO,
  barba: BARBAS,
  prenda: PRENDAS,
  colorRopa: COLORES_ROPA,
  emblema: EMBLEMAS,
  accesorio: ACCESORIOS,
  colorAccesorio: COLORES_ROPA,
  anteojos: ANTEOJOS,
  objeto: OBJETOS,
};

const PELO_SUGERIDO: Record<IdGenero, IdPelo> = {
  mujer: 'largo',
  varon: 'corto',
  indefinido: 'despeinado',
};

/** Valores sugeridos para un género: los usa RESET y el primer ingreso (indefinido). */
export function avatarPorDefecto(genero: IdGenero): AvatarConfig {
  return {
    genero,
    piel: 'media',
    pelo: PELO_SUGERIDO[genero],
    colorPelo: 'castaño',
    barba: 'ninguna',
    prenda: 'hoodie',
    colorRopa: 'violeta',
    emblema: 'tag',
    accesorio: 'ninguno',
    colorAccesorio: 'rosa',
    anteojos: 'ninguno',
    objeto: 'ninguno',
  };
}

/** Arma una config eligiendo un id por campo, de su propio catálogo. */
export function armarAvatar(
  elegir: <K extends keyof AvatarConfig>(campo: K, opciones: Catalogo<K>) => AvatarConfig[K],
): AvatarConfig {
  const config = {} as Record<keyof AvatarConfig, string>;
  for (const campo of Object.keys(OPCIONES_POR_CAMPO) as (keyof AvatarConfig)[]) {
    config[campo] = elegir(campo, OPCIONES_POR_CAMPO[campo]);
  }
  return config as AvatarConfig;
}

export function colorPorId(id: IdColor): OpcionColor {
  return COLORES.find((c) => c.id === id) ?? COLORES[0];
}

export function pielPorId(id: IdPiel): OpcionPiel {
  return PIELES.find((p) => p.id === id) ?? PIELES[1];
}

/**
 * Convierte lo guardado en una config válida. Dos casos distintos a propósito:
 * - campo **ausente** = el avatar se guardó antes de que ese campo existiera → look
 *   clásico (traje + cuadro), para que quien ya tenía avatar lo siga viendo igual;
 * - id **presente pero desconocido** (o de una lista que no le corresponde, como un verde
 *   terminal en el pelo) → default de su género.
 */
export function sanearAvatar(v: AvatarGuardado | null | undefined): AvatarConfig {
  if (!v || typeof v !== 'object') return avatarPorDefecto('indefinido');

  const valido = <K extends keyof AvatarConfig>(campo: K, x: unknown, fb: AvatarConfig[K]) =>
    OPCIONES_POR_CAMPO[campo].some((o) => o.id === x) ? (x as AvatarConfig[K]) : fb;

  const genero = valido('genero', v.genero, 'indefinido');
  const d = avatarPorDefecto(genero);
  const conLegado = <K extends 'prenda' | 'emblema'>(campo: K, clasico: AvatarConfig[K]) =>
    v[campo] === undefined ? clasico : valido(campo, v[campo], d[campo]);

  return {
    genero,
    piel: valido('piel', v.piel, d.piel),
    pelo: valido('pelo', v.pelo, d.pelo),
    colorPelo: valido('colorPelo', v.colorPelo, d.colorPelo),
    barba: valido('barba', v.barba, d.barba),
    prenda: conLegado('prenda', 'traje'),
    colorRopa: valido('colorRopa', v.colorRopa ?? v.colorTraje, d.colorRopa),
    emblema: conLegado('emblema', 'cuadro'),
    accesorio: valido('accesorio', v.accesorio, d.accesorio),
    colorAccesorio: valido('colorAccesorio', v.colorAccesorio, d.colorAccesorio),
    anteojos: valido('anteojos', v.anteojos, d.anteojos),
    objeto: valido('objeto', v.objeto, d.objeto),
  };
}
