/**
 * Avatar del alumno (05-design-system.md §4, `ui-avatar`). Es el personaje que recorre
 * el mapa 2.5D y el tablero interno de la unidad, así que su configuración vive en
 * `core/` y no dentro de una feature: la consumen el HUD, el mapa y el tablero.
 *
 * Cada opción se identifica por `id` estable — lo que se persiste (y lo que en Fase 3
 * viajará al backend de Identidad) son los ids, nunca los hex. Así un retoque de paleta
 * no invalida los avatares ya guardados.
 */

export type IdPiel = 'clara' | 'media' | 'trigueña' | 'oscura' | 'violeta' | 'rosa';
export type IdPelo = 'corto' | 'largo' | 'cresta' | 'rapado' | 'afro';
export type IdAccesorio = 'ninguno' | 'visor' | 'gorra' | 'corona' | 'auriculares';
export type IdColor = 'rosa' | 'violeta' | 'violeta-profundo' | 'hueso' | 'noche' | 'rosa-pastel';

export interface AvatarConfig {
  piel: IdPiel;
  pelo: IdPelo;
  colorPelo: IdColor;
  colorTraje: IdColor;
  accesorio: IdAccesorio;
  colorAccesorio: IdColor;
}

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

/**
 * Colores de personalización: los 4 swatches de `Fotos_y_conceptos/paleta.jpg` más blanco hueso y
 * un rosa pastel derivado. Nada por fuera de la familia de marca.
 */
export const COLORES: readonly OpcionColor[] = [
  { id: 'rosa', nombre: 'Rosa fuego', base: '#FF2758', sombra: '#B3123A' },
  { id: 'violeta', nombre: 'Violeta eléctrico', base: '#8B3DF5', sombra: '#5D1BAF' },
  { id: 'violeta-profundo', nombre: 'Violeta profundo', base: '#6B21C9', sombra: '#43127F' },
  { id: 'hueso', nombre: 'Hueso', base: '#F3EAFF', sombra: '#B9A6D6' },
  { id: 'noche', nombre: 'Noche', base: '#2D164A', sombra: '#190236' },
  { id: 'rosa-pastel', nombre: 'Rosa pastel', base: '#FF7BA0', sombra: '#C94A70' },
] as const;

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
] as const;

export const PELOS: readonly Opcion<IdPelo>[] = [
  { id: 'corto', nombre: 'Corto' },
  { id: 'largo', nombre: 'Largo' },
  { id: 'cresta', nombre: 'Cresta' },
  { id: 'rapado', nombre: 'Rapado' },
  { id: 'afro', nombre: 'Afro' },
] as const;

export const ACCESORIOS: readonly Opcion<IdAccesorio>[] = [
  { id: 'ninguno', nombre: 'Sin accesorio' },
  { id: 'visor', nombre: 'Visor' },
  { id: 'gorra', nombre: 'Gorra' },
  { id: 'corona', nombre: 'Corona' },
  { id: 'auriculares', nombre: 'Auriculares' },
] as const;

export const AVATAR_POR_DEFECTO: AvatarConfig = {
  piel: 'media',
  pelo: 'corto',
  colorPelo: 'noche',
  colorTraje: 'rosa',
  accesorio: 'ninguno',
  colorAccesorio: 'violeta',
};

export function colorPorId(id: IdColor): OpcionColor {
  return COLORES.find((c) => c.id === id) ?? COLORES[0];
}

export function pielPorId(id: IdPiel): OpcionPiel {
  return PIELES.find((p) => p.id === id) ?? PIELES[1];
}

/** Descarta ids desconocidos (avatar guardado con una versión vieja del catálogo). */
export function sanearAvatar(v: Partial<AvatarConfig> | null | undefined): AvatarConfig {
  const d = AVATAR_POR_DEFECTO;
  const valido = <T extends string>(lista: readonly { id: T }[], x: unknown, fb: T): T =>
    lista.some((o) => o.id === x) ? (x as T) : fb;
  return {
    piel: valido(PIELES, v?.piel, d.piel),
    pelo: valido(PELOS, v?.pelo, d.pelo),
    colorPelo: valido(COLORES, v?.colorPelo, d.colorPelo),
    colorTraje: valido(COLORES, v?.colorTraje, d.colorTraje),
    accesorio: valido(ACCESORIOS, v?.accesorio, d.accesorio),
    colorAccesorio: valido(COLORES, v?.colorAccesorio, d.colorAccesorio),
  };
}
