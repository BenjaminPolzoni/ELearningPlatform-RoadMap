# Avatar: género y catálogo dev — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el avatar del alumno se pueda elegir como mujer, varón o indefinido (cambia la silueta y el peinado sugerido) y que su catálogo sume elementos de programador (prenda, emblema, anteojos, objeto en mano, barba, peinados, accesorios y colores), con el editor reorganizado en pestañas.

**Architecture:** El catálogo y la migración viven en `core/avatar/avatar.models.ts`; un mapa `OPCIONES_POR_CAMPO` asocia cada campo de `AvatarConfig` con su lista válida y lo usan `sanearAvatar`, `AvatarService.aleatorio()` y `avatarConfigMock`. El sprite sigue siendo un `@switch` por capa (enfoque elegido por el usuario), con el template extraído a `avatar-sprite.html` y cada capa envuelta en un `<g data-capa="...">` para poder testear las reglas de convivencia. El editor pasa a 4 pestañas con `ng-template`s reutilizables para chips y muestras de color.

**Tech Stack:** Angular 22 (standalone, signals, `input()`, zoneless), Tailwind 4 + daisyUI 5, Vitest vía `@angular/build:unit-test` (globals `describe/it/expect` sin import).

**Spec:** [`docs/superpowers/specs/2026-09-11-avatar-genero-catalogo-dev-design.md`](../specs/2026-09-11-avatar-genero-catalogo-dev-design.md)

## Global Constraints

- Rama de trabajo: `pruebas-iker`. No pushear sin confirmación explícita del usuario.
- Todos los comandos `npx ng ...` se corren desde `frontend/`.
- Línea base antes de empezar: `npx ng test --watch=false` → 4 archivos, 19 tests en verde.
- La API pública de `ui-avatar-sprite` (`config`, `alto`, `caminando`, `celebrando`, `mirando`, `sombra`, `etiqueta`) **no cambia**. HUD, mapa, tablero y ranking no se tocan.
- Grilla del sprite: 16×22 (`viewBox="0 0 16 22"`). Manos siempre en `x=2` y `x=12`, `y=16`, en las tres siluetas.
- Se persisten **ids**, nunca hex. La clave de localStorage sigue siendo `mock-avatar`.
- `colorTraje` se renombra a `colorRopa`; `sanearAvatar` sigue leyendo `colorTraje` de avatares viejos.
- Campo **ausente** en un avatar guardado → look clásico (`genero: 'indefinido'`, `prenda: 'traje'`, `emblema: 'cuadro'`, ranuras nuevas en `ninguno`/`ninguna`). Id **presente pero desconocido** → default del género.
- `avatarPorDefecto(g)`: piel `media`, `colorPelo` `castaño`, barba `ninguna`, prenda `hoodie`, `colorRopa` `violeta`, emblema `tag`, accesorio `ninguno`, `colorAccesorio` `rosa`, anteojos `ninguno`, objeto `ninguno`; pelo `largo` (mujer) · `corto` (varón) · `despeinado` (indefinido).
- Todo el catálogo está disponible para los tres géneros. No hay desbloqueos.
- Textos de UI en español, en mayúsculas en los rótulos `ui-font` (como el editor actual). No hay i18n montado; no se agrega.
- Comentarios solo donde la regla no es obvia (explican el *por qué*). Sin código muerto: `AVATAR_POR_DEFECTO` desaparece.
- Mensajes de commit en español, Conventional Commits, cerrando con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

```
frontend/src/app/core/avatar/
  avatar.models.ts              (modificado) catálogo nuevo, OPCIONES_POR_CAMPO, avatarPorDefecto,
                                             armarAvatar, sanearAvatar con migración, reglas de convivencia
  avatar.models.spec.ts         (nuevo)
  avatar.service.ts             (modificado) reiniciar por género, aleatorio vía armarAvatar
  avatar.service.spec.ts        (nuevo)
frontend/src/app/mocks/
  ranking.seed.ts               (modificado) avatarConfigMock con hash por campo
  ranking.seed.spec.ts          (nuevo)
frontend/src/app/domain/ranking/ranking.reglas.spec.ts   (modificado) AVATAR_POR_DEFECTO → avatarPorDefecto
frontend/src/app/shared/ui/
  avatar-sprite.ts              (modificado) templateUrl + computed de colores y reglas
  avatar-sprite.html            (nuevo) template por capas
  avatar-sprite.spec.ts         (nuevo)
frontend/src/app/features/alumno/
  avatar-editor.ts              (modificado) pestañas
  avatar-editor.spec.ts         (nuevo)
path/05-design-system.md                                (modificado) §"El avatar del alumno"
path/deuda-tecnica/tarea-deuda-05-design-system.md      (modificado) ítem nuevo: textos sin i18n
path/deuda-tecnica/README.md                            (modificado) índice
```

---

### Task 1: Catálogo, migración, servicio y mock del ranking

Deja la capa de datos completa. El sprite y el editor solo reciben el renombre `colorTraje` → `colorRopa` y las listas de color correctas para seguir compilando; su rediseño viene en las tasks 2–4.

**Files:**
- Modify: `frontend/src/app/core/avatar/avatar.models.ts` (reescritura completa)
- Create: `frontend/src/app/core/avatar/avatar.models.spec.ts`
- Modify: `frontend/src/app/core/avatar/avatar.service.ts`
- Create: `frontend/src/app/core/avatar/avatar.service.spec.ts`
- Modify: `frontend/src/app/mocks/ranking.seed.ts:11-33`
- Create: `frontend/src/app/mocks/ranking.seed.spec.ts`
- Modify: `frontend/src/app/domain/ranking/ranking.reglas.spec.ts:1,19`
- Modify: `frontend/src/app/shared/ui/avatar-sprite.ts:159-173`
- Modify: `frontend/src/app/features/alumno/avatar-editor.ts`

**Interfaces:**
- Consumes: nada.
- Produces (todo exportado desde `core/avatar/avatar.models.ts`):
  - Tipos: `IdGenero`, `IdPiel`, `IdPelo`, `IdBarba`, `IdPrenda`, `IdEmblema`, `IdAccesorio`, `IdAnteojos`, `IdObjeto`, `IdColor`, `AvatarConfig`, `AvatarGuardado`, `OpcionColor`, `OpcionPiel`, `Opcion<T>`, `OpcionEmblema` (`Opcion<IdEmblema> & { glifo: string }`).
  - Catálogos: `GENEROS`, `PIELES`, `PELOS`, `BARBAS`, `PRENDAS`, `EMBLEMAS`, `ACCESORIOS`, `ANTEOJOS`, `OBJETOS`.
  - Colores: `COLORES_MARCA`, `COLORES_PELO_NATURALES`, `COLORES_PELO`, `COLORES_ROPA`, `COLORES` (registro único).
  - `OPCIONES_POR_CAMPO: { readonly [K in keyof AvatarConfig]: readonly { id: AvatarConfig[K] }[] }`
  - `avatarPorDefecto(genero: IdGenero): AvatarConfig`
  - `armarAvatar(elegir: <K extends keyof AvatarConfig>(campo: K, opciones: readonly { id: AvatarConfig[K] }[]) => AvatarConfig[K]): AvatarConfig`
  - `sanearAvatar(v: AvatarGuardado | null | undefined): AvatarConfig`
  - `colorPorId(id: IdColor): OpcionColor`, `pielPorId(id: IdPiel): OpcionPiel` (sin cambios)
  - `AvatarService`: `avatar()`, `set(parte, valor)`, `reiniciar()`, `aleatorio()` (misma API)

- [ ] **Step 1: Write the failing tests del modelo**

Crear `frontend/src/app/core/avatar/avatar.models.spec.ts`:

```ts
import {
  ACCESORIOS,
  ANTEOJOS,
  avatarPorDefecto,
  BARBAS,
  COLORES,
  COLORES_PELO,
  COLORES_ROPA,
  EMBLEMAS,
  GENEROS,
  IdGenero,
  OBJETOS,
  PELOS,
  PIELES,
  PRENDAS,
  sanearAvatar,
} from './avatar.models';

const GENEROS_IDS: IdGenero[] = ['mujer', 'varon', 'indefinido'];

describe('avatarPorDefecto', () => {
  it.each(GENEROS_IDS)('el default de %s pasa por sanearAvatar sin cambios', (g) => {
    expect(sanearAvatar(avatarPorDefecto(g))).toEqual(avatarPorDefecto(g));
  });

  it('los géneros solo difieren en el peinado sugerido', () => {
    expect(avatarPorDefecto('mujer').pelo).toBe('largo');
    expect(avatarPorDefecto('varon').pelo).toBe('corto');
    expect(avatarPorDefecto('indefinido').pelo).toBe('despeinado');
    const sinPelo = (g: IdGenero) => ({ ...avatarPorDefecto(g), genero: null, pelo: null });
    expect(sinPelo('mujer')).toEqual(sinPelo('varon'));
    expect(sinPelo('varon')).toEqual(sinPelo('indefinido'));
  });
});

describe('sanearAvatar', () => {
  it('sin nada guardado devuelve el default de indefinido', () => {
    expect(sanearAvatar(null)).toEqual(avatarPorDefecto('indefinido'));
    expect(sanearAvatar(undefined)).toEqual(avatarPorDefecto('indefinido'));
  });

  it('migra un avatar de la versión anterior al look clásico', () => {
    const viejo = {
      piel: 'oscura',
      pelo: 'afro',
      colorPelo: 'noche',
      colorTraje: 'violeta',
      accesorio: 'gorra',
      colorAccesorio: 'rosa',
    };
    expect(sanearAvatar(viejo)).toEqual({
      genero: 'indefinido',
      piel: 'oscura',
      pelo: 'afro',
      colorPelo: 'noche',
      barba: 'ninguna',
      prenda: 'traje',
      colorRopa: 'violeta',
      emblema: 'cuadro',
      accesorio: 'gorra',
      colorAccesorio: 'rosa',
      anteojos: 'ninguno',
      objeto: 'ninguno',
    });
  });

  it('un id desconocido vuelve al default de su género', () => {
    const a = sanearAvatar({
      ...avatarPorDefecto('mujer'),
      pelo: 'mohicano',
      prenda: 'smoking',
      emblema: '???',
      objeto: 'tostadora',
    });
    expect(a.genero).toBe('mujer');
    expect(a.pelo).toBe('largo');
    expect(a.prenda).toBe('hoodie');
    expect(a.emblema).toBe('tag');
    expect(a.objeto).toBe('ninguno');
  });

  it('un género desconocido cae en indefinido', () => {
    expect(sanearAvatar({ ...avatarPorDefecto('varon'), genero: 'robot' }).genero).toBe('indefinido');
  });

  it('descarta un color que existe pero no corresponde a esa parte', () => {
    const a = sanearAvatar({
      ...avatarPorDefecto('varon'),
      colorPelo: 'verde-terminal',
      colorRopa: 'rubio',
      colorAccesorio: 'castaño',
    });
    expect(a.colorPelo).toBe('castaño');
    expect(a.colorRopa).toBe('violeta');
    expect(a.colorAccesorio).toBe('rosa');
  });

  it('colorRopa tiene prioridad sobre el colorTraje legado', () => {
    const a = sanearAvatar({ ...avatarPorDefecto('varon'), colorRopa: 'grafito', colorTraje: 'rosa' });
    expect(a.colorRopa).toBe('grafito');
  });
});

describe('catálogo', () => {
  it('el registro de colores no repite ids', () => {
    const ids = COLORES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo color de pelo y de ropa está en el registro', () => {
    for (const c of [...COLORES_PELO, ...COLORES_ROPA]) expect(COLORES).toContain(c);
  });

  it('pelo y ropa comparten el mismo negro', () => {
    expect(COLORES_PELO.find((c) => c.id === 'negro')).toBe(COLORES_ROPA.find((c) => c.id === 'negro'));
  });

  it('ningún catálogo repite ids', () => {
    for (const lista of [GENEROS, PIELES, PELOS, BARBAS, PRENDAS, EMBLEMAS, ACCESORIOS, ANTEOJOS, OBJETOS]) {
      const ids = lista.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/core/avatar/avatar.models.spec.ts`
Expected: FAIL — error de compilación (`avatarPorDefecto`, `GENEROS`, `COLORES_PELO`… no están exportados).

- [ ] **Step 3: Reescribir `avatar.models.ts`**

Reemplazar el archivo entero por:

```ts
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
```

- [ ] **Step 4: Run the model test to verify it passes**

Run: `npx ng test --watch=false --include src/app/core/avatar/avatar.models.spec.ts`
Expected: PASS (14 tests). Si falla por errores de compilación en **otros** archivos (`avatar.service.ts`, `ranking.seed.ts`, `avatar-sprite.ts`, `avatar-editor.ts`, `ranking.reglas.spec.ts`), es esperable: se arreglan en los steps 5–9. Hacer esos steps y volver a correr.

- [ ] **Step 5: Write the failing tests del servicio**

Crear `frontend/src/app/core/avatar/avatar.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { avatarPorDefecto, sanearAvatar } from './avatar.models';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('sin nada guardado arranca con el default de indefinido', () => {
    expect(TestBed.inject(AvatarService).avatar()).toEqual(avatarPorDefecto('indefinido'));
  });

  it('migra el avatar guardado con la versión anterior sin cambiarle el look', () => {
    localStorage.setItem(
      'mock-avatar',
      JSON.stringify({
        piel: 'clara',
        pelo: 'cresta',
        colorPelo: 'rosa',
        colorTraje: 'noche',
        accesorio: 'visor',
        colorAccesorio: 'violeta',
      }),
    );
    const a = TestBed.inject(AvatarService).avatar();
    expect(a.genero).toBe('indefinido');
    expect(a.prenda).toBe('traje');
    expect(a.emblema).toBe('cuadro');
    expect(a.colorRopa).toBe('noche');
    expect(a.pelo).toBe('cresta');
  });

  it('RESET vuelve a los valores sugeridos pero conserva el género', () => {
    const srv = TestBed.inject(AvatarService);
    srv.set('genero', 'mujer');
    srv.set('pelo', 'afro');
    srv.set('objeto', 'mate');
    srv.reiniciar();
    expect(srv.avatar()).toEqual(avatarPorDefecto('mujer'));
  });

  it('AL AZAR siempre produce una config válida y completa', () => {
    const srv = TestBed.inject(AvatarService);
    for (let i = 0; i < 50; i++) {
      srv.aleatorio();
      expect(sanearAvatar(srv.avatar())).toEqual(srv.avatar());
    }
  });
});
```

- [ ] **Step 6: Actualizar `avatar.service.ts`**

Reemplazar el archivo entero por:

```ts
import { effect, Injectable, signal } from '@angular/core';
import { armarAvatar, AvatarConfig, avatarPorDefecto, sanearAvatar } from './avatar.models';

const LS_KEY = 'mock-avatar';

/**
 * Persistencia del avatar personalizado. Igual que `AuthMockService` y `ThemeService`,
 * hoy vive en localStorage; en Fase 3 el avatar es parte del perfil que devuelve el BFF
 * y este servicio pasa a ser un cache local de eso — la API pública no cambia.
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly _avatar = signal<AvatarConfig>(this.leer());
  readonly avatar = this._avatar.asReadonly();

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this._avatar()));
      } catch {
        /* ignorar: sin storage el avatar simplemente no sobrevive al refresh */
      }
    });
  }

  /** Cambia una sola parte; el resto queda como estaba (cambiar el género no toca nada más). */
  set<K extends keyof AvatarConfig>(parte: K, valor: AvatarConfig[K]): void {
    this._avatar.update((a) => ({ ...a, [parte]: valor }));
  }

  /** Vuelve a los valores sugeridos del género elegido: RESET no te cambia el género. */
  reiniciar(): void {
    this._avatar.set(avatarPorDefecto(this._avatar().genero));
  }

  /** Combinación aleatoria válida — atajo "sorprendeme" del editor. Sortea también el género. */
  aleatorio(): void {
    this._avatar.set(
      armarAvatar((_, opciones) => opciones[Math.floor(Math.random() * opciones.length)].id),
    );
  }

  private leer(): AvatarConfig {
    try {
      const crudo = localStorage.getItem(LS_KEY);
      return sanearAvatar(crudo ? JSON.parse(crudo) : null);
    } catch {
      return avatarPorDefecto('indefinido');
    }
  }
}
```

- [ ] **Step 7: Write the failing test del mock del ranking**

Crear `frontend/src/app/mocks/ranking.seed.spec.ts`:

```ts
import { sanearAvatar } from '../core/avatar/avatar.models';
import { avatarConfigMock } from './ranking.seed';
import { alumnosSeed } from './seed';

describe('avatarConfigMock', () => {
  it('es determinístico: la misma semilla da siempre el mismo avatar', () => {
    expect(avatarConfigMock('alu-05')).toEqual(avatarConfigMock('alu-05'));
  });

  it('da una config válida y completa para cada alumno del seed', () => {
    for (const a of alumnosSeed()) {
      const c = avatarConfigMock(a.id);
      expect(sanearAvatar(c)).toEqual(c);
    }
  });

  it('no hay dos alumnos del seed con exactamente el mismo look', () => {
    const looks = alumnosSeed().map((a) => JSON.stringify(avatarConfigMock(a.id)));
    expect(new Set(looks).size).toBe(looks.length);
  });
});
```

- [ ] **Step 8: Actualizar `avatarConfigMock` en `ranking.seed.ts`**

Reemplazar la línea 11 (import) por:

```ts
import { armarAvatar, AvatarConfig } from '../core/avatar/avatar.models';
```

Reemplazar la función `avatarConfigMock` (líneas 19-33) por:

```ts
/** Combinación de avatar determinística por `seed` — mismo catálogo que el editor de avatar. */
export function avatarConfigMock(seed: string): AvatarConfig {
  // Un hash por campo: con 12 campos, repartir los 32 bits de un único hash a 3 bits por
  // campo ya no alcanza (los últimos campos saldrían siempre del mismo resto).
  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  };
  return armarAvatar((campo, opciones) => opciones[hash(`${seed}:${campo}`) % opciones.length].id);
}
```

- [ ] **Step 9: Ajustar el resto de los consumidores para que compile**

`frontend/src/app/domain/ranking/ranking.reglas.spec.ts` — línea 1:

```ts
import { avatarPorDefecto } from '../../core/avatar/avatar.models';
```

y línea 19:

```ts
    avatar: avatarPorDefecto('indefinido'),
```

`frontend/src/app/shared/ui/avatar-sprite.ts` — en las líneas 159-173, reemplazar las tres apariciones de `colorTraje` por `colorRopa` (queda `computed(() => colorPorId(this.config().colorRopa))` y las dos comparaciones `this.config().colorRopa === ...`). No cambiar nada más: el sprite se rediseña en la Task 2.

`frontend/src/app/features/alumno/avatar-editor.ts` — solo para que compile y no ofrezca colores inválidos (se reescribe en la Task 4):
- en el import, cambiar `COLORES,` por `COLORES_PELO,` y agregar `COLORES_ROPA,`;
- reemplazar `protected readonly colores = COLORES;` por:
  ```ts
  protected readonly coloresPelo = COLORES_PELO;
  protected readonly coloresRopa = COLORES_ROPA;
  ```
- en la sección PELO del template: `@for (c of colores; ...)` → `@for (c of coloresPelo; ...)`;
- en las secciones TRAJE y ACCESORIO: `@for (c of colores; ...)` → `@for (c of coloresRopa; ...)`;
- en la sección TRAJE: `colorTraje` → `colorRopa` (tres apariciones: `[class.sel]`, `[attr.aria-pressed]`, `elegirColor(...)`).

- [ ] **Step 10: Run the full suite**

Run: `npx ng test --watch=false`
Expected: PASS — 7 archivos (los 4 de antes + `avatar.models.spec.ts`, `avatar.service.spec.ts`, `ranking.seed.spec.ts`), 19 + 14 + 4 + 3 = 40 tests.

Run: `npx ng build`
Expected: build OK, sin errores de tipos.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/app/core/avatar frontend/src/app/mocks/ranking.seed.ts frontend/src/app/mocks/ranking.seed.spec.ts frontend/src/app/domain/ranking/ranking.reglas.spec.ts frontend/src/app/shared/ui/avatar-sprite.ts frontend/src/app/features/alumno/avatar-editor.ts
git commit -m "feat(avatar): catálogo con género y elementos dev, con migración de avatares guardados

OPCIONES_POR_CAMPO es la única fuente de ids válidos: la usan sanearAvatar,
el sorteo del editor y los avatares mock del ranking. Un campo ausente se
completa con el look clásico (traje + cuadro) para que los avatares ya
guardados se sigan viendo igual; colorTraje pasa a colorRopa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Sprite por capas — siluetas, prendas y emblemas

Extrae el template a `avatar-sprite.html`, envuelve cada capa en `<g data-capa="...">` (lo que usan los tests) y agrega las tres siluetas, el cuello, las prendas y los emblemas. Pelo y accesorio quedan con las opciones actuales; las nuevas llegan en la Task 3.

**Files:**
- Modify: `frontend/src/app/core/avatar/avatar.models.ts` (agregar `emblemaVisible` al final)
- Modify: `frontend/src/app/core/avatar/avatar.models.spec.ts` (agregar un `describe`)
- Modify: `frontend/src/app/shared/ui/avatar-sprite.ts` (reescritura)
- Create: `frontend/src/app/shared/ui/avatar-sprite.html`
- Create: `frontend/src/app/shared/ui/avatar-sprite.spec.ts`

**Interfaces:**
- Consumes (Task 1): `AvatarConfig`, `IdColor`, `avatarPorDefecto`, `colorPorId`, `pielPorId`, `PRENDAS`, `EMBLEMAS`.
- Produces:
  - `emblemaVisible(a: AvatarConfig): boolean` en `avatar.models.ts` (la usa el editor en la Task 4).
  - Capas del sprite, cada una un `<g data-capa="...">`: `piernas`, `torso` (con `data-silueta` = género), `brazos`, `prenda`, `emblema` (solo si `emblemaVisible`; lleva `fill` y `transform` en el `<g>`), `cabeza` (con `pestanas` o `cejas` anidados), `pelo`, `accesorio`. La Task 3 agrega `barba`, `anteojos` y `objeto`.
  - Orden de rects dentro de `piernas`: pierna izquierda, pierna derecha, zapato izquierdo, zapato derecho.

- [ ] **Step 1: Write the failing tests del sprite**

Crear `frontend/src/app/shared/ui/avatar-sprite.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import {
  AvatarConfig,
  avatarPorDefecto,
  EMBLEMAS,
  IdGenero,
  PRENDAS,
} from '../../core/avatar/avatar.models';
import { AvatarSprite } from './avatar-sprite';

function dibujar(
  cambios: Partial<AvatarConfig> = {},
  mirando: 'derecha' | 'izquierda' = 'derecha',
): HTMLElement {
  const f = TestBed.createComponent(AvatarSprite);
  f.componentRef.setInput('config', { ...avatarPorDefecto('indefinido'), ...cambios });
  f.componentRef.setInput('mirando', mirando);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const capa = (el: HTMLElement, nombre: string) =>
  el.querySelector<SVGGElement>(`[data-capa="${nombre}"]`);
const pixeles = (el: HTMLElement, nombre: string) =>
  capa(el, nombre)?.querySelectorAll('rect').length ?? 0;
const fills = (el: HTMLElement, nombre: string) =>
  [...(capa(el, nombre)?.querySelectorAll('rect') ?? [])].map((r) => r.getAttribute('fill'));

const GENEROS_IDS: IdGenero[] = ['mujer', 'varon', 'indefinido'];

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [AvatarSprite] }).compileComponents();
});

describe('AvatarSprite — siluetas', () => {
  it.each(GENEROS_IDS)('marca la silueta %s', (genero) => {
    expect(capa(dibujar({ genero }), 'torso')?.getAttribute('data-silueta')).toBe(genero);
  });

  it('solo la mujer tiene pestañas y solo el varón cejas', () => {
    const mujer = dibujar({ genero: 'mujer' });
    const varon = dibujar({ genero: 'varon' });
    const indefinido = dibujar({ genero: 'indefinido' });
    expect(capa(mujer, 'pestanas')).not.toBeNull();
    expect(capa(mujer, 'cejas')).toBeNull();
    expect(capa(varon, 'cejas')).not.toBeNull();
    expect(capa(varon, 'pestanas')).toBeNull();
    expect(capa(indefinido, 'cejas')).toBeNull();
    expect(capa(indefinido, 'pestanas')).toBeNull();
  });

  it.each(GENEROS_IDS)('las manos de %s quedan donde se sostiene el objeto', (genero) => {
    const posiciones = [...capa(dibujar({ genero }), 'brazos')!.querySelectorAll('rect')].map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    expect(posiciones).toContain('2,16');
    expect(posiciones).toContain('12,16');
  });
});

describe('AvatarSprite — prendas', () => {
  it.each(PRENDAS.filter((p) => p.id !== 'traje').map((p) => p.id))(
    'la prenda %s dibuja sus detalles',
    (prenda) => {
      expect(pixeles(dibujar({ prenda }), 'prenda')).toBeGreaterThan(0);
    },
  );

  it('el traje es un mono: las piernas van del color de la ropa', () => {
    expect(fills(dibujar({ prenda: 'traje', colorRopa: 'rosa' }), 'piernas')[0]).toBe('#B3123A');
  });

  it('con las demás prendas las piernas llevan pantalón, que contrasta con la ropa', () => {
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'rosa' }), 'piernas')[0]).toBe('#2D164A');
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'negro' }), 'piernas')[0]).toBe('#4B4A57');
  });

  it('los zapatos se ven aunque la ropa sea hueso', () => {
    expect(fills(dibujar({ prenda: 'traje', colorRopa: 'hueso' }), 'piernas')[2]).toBe('#2D164A');
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'hueso' }), 'piernas')[2]).toBe('#F3EAFF');
  });
});

describe('AvatarSprite — emblema', () => {
  it.each(EMBLEMAS.filter((e) => e.id !== 'ninguno').map((e) => e.id))(
    'el emblema %s se dibuja',
    (emblema) => {
      expect(pixeles(dibujar({ prenda: 'hoodie', emblema }), 'emblema')).toBeGreaterThan(0);
    },
  );

  it('sin emblema, con camisa o con laptop no hay capa de emblema', () => {
    expect(capa(dibujar({ emblema: 'ninguno' }), 'emblema')).toBeNull();
    expect(capa(dibujar({ prenda: 'camisa', emblema: 'tag' }), 'emblema')).toBeNull();
    expect(capa(dibujar({ prenda: 'hoodie', objeto: 'laptop', emblema: 'tag' }), 'emblema')).toBeNull();
  });

  it('contrasta con lo que tiene debajo (la remera, si la campera está abierta)', () => {
    const color = (c: Partial<AvatarConfig>) => capa(dibujar(c), 'emblema')!.getAttribute('fill');
    expect(color({ prenda: 'hoodie', colorRopa: 'violeta' })).toBe('#FF2758');
    expect(color({ prenda: 'hoodie', colorRopa: 'rosa' })).toBe('#F3EAFF');
    expect(color({ prenda: 'hoodie', colorRopa: 'rosa-pastel' })).toBe('#F3EAFF');
    expect(color({ prenda: 'campera', colorRopa: 'rosa' })).toBe('#FF2758');
  });

  it('mirando a la izquierda se contra-espeja para que el glifo siga legible', () => {
    expect(capa(dibujar({ emblema: 'lambda' }, 'izquierda'), 'emblema')!.getAttribute('transform')).toBe(
      'translate(16 0) scale(-1 1)',
    );
    expect(capa(dibujar({ emblema: 'lambda' }, 'derecha'), 'emblema')!.getAttribute('transform')).toBeNull();
  });
});
```

Agregar al final de `frontend/src/app/core/avatar/avatar.models.spec.ts` (y sumar `emblemaVisible` al import de arriba):

```ts
describe('emblemaVisible', () => {
  const base = avatarPorDefecto('indefinido');

  it('se ve sobre las prendas que dejan el pecho libre', () => {
    expect(emblemaVisible({ ...base, prenda: 'hoodie' })).toBe(true);
    expect(emblemaVisible({ ...base, prenda: 'campera' })).toBe(true);
  });

  it('se oculta sin emblema, con la corbata de la camisa o con la laptop delante', () => {
    expect(emblemaVisible({ ...base, emblema: 'ninguno' })).toBe(false);
    expect(emblemaVisible({ ...base, prenda: 'camisa' })).toBe(false);
    expect(emblemaVisible({ ...base, objeto: 'laptop' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/shared/ui/avatar-sprite.spec.ts --include src/app/core/avatar/avatar.models.spec.ts`
Expected: FAIL — `emblemaVisible` no existe; en el sprite no hay ningún `[data-capa]`.

- [ ] **Step 3: Agregar `emblemaVisible` al final de `avatar.models.ts`**

```ts
/**
 * La corbata de la camisa ocupa el centro del pecho y la laptop va sostenida delante: en
 * ambos casos el emblema no se dibuja (el editor lo avisa).
 */
export function emblemaVisible(a: AvatarConfig): boolean {
  return a.emblema !== 'ninguno' && a.prenda !== 'camisa' && a.objeto !== 'laptop';
}
```

- [ ] **Step 4: Reescribir `avatar-sprite.ts`**

Reemplazar el archivo entero por:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  AvatarConfig,
  colorPorId,
  emblemaVisible,
  IdColor,
  pielPorId,
} from '../../core/avatar/avatar.models';

const HUESO = '#F3EAFF';
const NOCHE = '#2D164A';
const ROSA = '#FF2758';
const VIOLETA_PROFUNDO = '#6B21C9';
const GRAFITO = '#4B4A57';

const esRosa = (c: IdColor) => c === 'rosa' || c === 'rosa-pastel';

/**
 * Sprite pixel-art del alumno (05-design-system.md §4, `ui-avatar`).
 *
 * Es un SVG de grilla 16×22 con `shape-rendering: crispEdges`: escala a cualquier tamaño
 * sin perder el borde duro del pixel-art y sin necesitar un atlas de PNGs — el arte real
 * (04-engine §8) puede reemplazarlo después sin tocar a los consumidores, que solo pasan
 * `config` y `alto`.
 *
 * Se usa en cuatro lugares con el mismo componente: HUD (chico), isla actual del mapa 2.5D,
 * ficha del tablero de unidad (grande, animado) y ranking.
 *
 * El template (`avatar-sprite.html`) pinta una capa por `<g data-capa>`, en orden de atrás
 * hacia adelante. Las reglas de convivencia entre partes (qué tapa a qué, qué contrasta con
 * qué) se resuelven acá, en `computed`, para que el template solo dibuje.
 */
@Component({
  selector: 'ui-avatar-sprite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block leading-none' },
  styles: `
    /* Paso de caminata: el sprite entero pisa fuerte en lugar de animar las piernas por
       separado — a 16×22 px un ciclo de piernas real no se lee. */
    @keyframes paso {
      0%, 100% { transform: translateY(0) }
      25%      { transform: translateY(-8%) }
      50%      { transform: translateY(0) }
      75%      { transform: translateY(-4%) }
    }
    .caminando { animation: paso 0.42s steps(4, end) infinite }

    /* Salto de alegría (unidad completada): squash-stretch tipo arcade. Va en un wrapper
       aparte para no pelear con el scaleX(-1) que orienta el sprite sobre el propio <svg>. */
    @keyframes salto-alegria {
      0%   { transform: translateY(0) scaleY(1); }
      20%  { transform: translateY(2%) scaleY(0.82); }
      50%  { transform: translateY(-38%) scaleY(1.12); }
      75%  { transform: translateY(0) scaleY(0.88); }
      100% { transform: translateY(0) scaleY(1); }
    }
    .celebrando { display: inline-block; animation: salto-alegria 0.75s ease-in-out 4; transform-origin: 50% 100%; }

    @media (prefers-reduced-motion: reduce) {
      .caminando, .celebrando { animation: none }
    }
  `,
  templateUrl: './avatar-sprite.html',
})
export class AvatarSprite {
  readonly config = input.required<AvatarConfig>();
  /** Alto en px del sprite; el ancho se deriva del aspect 16:22. */
  readonly alto = input(64);
  readonly caminando = input(false);
  /** Salto de alegría (ej. al completar una unidad). Independiente de `caminando`. */
  readonly celebrando = input(false);
  readonly mirando = input<'derecha' | 'izquierda'>('derecha');
  readonly sombra = input(false);
  readonly etiqueta = input('Tu avatar');

  protected readonly piel = computed(() => pielPorId(this.config().piel));
  protected readonly pelo = computed(() => colorPorId(this.config().colorPelo));
  protected readonly ropa = computed(() => colorPorId(this.config().colorRopa));
  protected readonly acc = computed(() => colorPorId(this.config().colorAccesorio));

  /** El traje es un mono: piernas del color de la ropa. Con las demás prendas va pantalón. */
  protected readonly pantalon = computed(() => {
    const { prenda, colorRopa } = this.config();
    if (prenda === 'traje') return this.ropa().sombra;
    return colorRopa === 'noche' || colorRopa === 'negro' ? GRAFITO : NOCHE;
  });

  /**
   * Los zapatos son el punto de apoyo del sprite sobre la isla o el casillero: van siempre
   * en hueso, salvo con un traje hueso (piernas claras), donde un zapato hueso desaparece.
   */
  protected readonly zapatos = computed(() => {
    const { prenda, colorRopa } = this.config();
    return prenda === 'traje' && colorRopa === 'hueso' ? NOCHE : HUESO;
  });

  /** Remera que asoma debajo de la campera abierta: tiene que contrastar con la campera. */
  protected readonly remera = computed(() => (this.config().colorRopa === 'hueso' ? NOCHE : HUESO));

  /** La corbata va en el rosa de marca, salvo que la camisa ya sea rosa. */
  protected readonly corbata = computed(() =>
    esRosa(this.config().colorRopa) ? VIOLETA_PROFUNDO : ROSA,
  );

  protected readonly mostrarEmblema = computed(() => emblemaVisible(this.config()));

  /**
   * El emblema tiene que contrastar contra lo que tiene debajo, si no desaparece: la remera
   * cuando la campera está abierta, la ropa en el resto de los casos.
   */
  protected readonly colorEmblema = computed(() => {
    const { prenda, colorRopa } = this.config();
    const fondo: IdColor =
      prenda === 'campera' ? (colorRopa === 'hueso' ? 'noche' : 'hueso') : colorRopa;
    return esRosa(fondo) ? HUESO : ROSA;
  });

  /**
   * Mirando a la izquierda el `<svg>` entero se espeja con `scaleX(-1)`, y eso invertiría
   * glifos como `λ` o `>_`. El grupo del emblema se vuelve a espejar para anularlo; como la
   * grilla es simétrica respecto de x=8, el emblema no se mueve de lugar.
   */
  protected readonly contraEspejo = computed(() =>
    this.mirando() === 'izquierda' ? 'translate(16 0) scale(-1 1)' : null,
  );
}
```

- [ ] **Step 5: Crear `avatar-sprite.html`**

```html
<span [class.celebrando]="celebrando()">
  <svg
    [attr.height]="alto()"
    viewBox="0 0 16 22"
    class="pixelado overflow-visible"
    [class.caminando]="caminando()"
    [style.width.px]="alto() * (16 / 22)"
    [style.transform]="mirando() === 'izquierda' ? 'scaleX(-1)' : null"
    role="img"
    [attr.aria-label]="etiqueta()"
  >
    <!-- sombra en el piso: ancla el sprite sobre la isla / el casillero -->
    @if (sombra()) {
      <ellipse cx="8" cy="22" rx="6" ry="1.4" fill="#0E0120" opacity="0.55" />
    }

    <!-- piernas y zapatos -->
    <g data-capa="piernas">
      <rect x="4" y="17" width="3" height="4" [attr.fill]="pantalon()" />
      <rect x="9" y="17" width="3" height="4" [attr.fill]="pantalon()" />
      <rect x="3" y="21" width="4" height="1" [attr.fill]="zapatos()" />
      <rect x="9" y="21" width="4" height="1" [attr.fill]="zapatos()" />
    </g>

    <!-- torso: la silueta define el contorno; la prenda solo agrega detalles encima -->
    <g data-capa="torso" [attr.data-silueta]="config().genero">
      @if (config().genero === 'mujer') {
        <rect x="4" y="11" width="8" height="3" [attr.fill]="ropa().base" />
        <rect x="5" y="14" width="6" height="2" [attr.fill]="ropa().base" />
        <rect x="4" y="16" width="8" height="1" [attr.fill]="ropa().base" />
      } @else {
        <rect x="4" y="11" width="8" height="6" [attr.fill]="ropa().base" />
      }
    </g>

    <!-- brazos y manos (misma posición en las tres siluetas); la remera es de manga corta -->
    <g data-capa="brazos">
      <rect x="2" y="11" width="2" height="5" [attr.fill]="ropa().sombra" />
      <rect x="12" y="11" width="2" height="5" [attr.fill]="ropa().sombra" />
      @if (config().prenda === 'remera') {
        <rect x="2" y="13" width="2" height="3" [attr.fill]="piel().base" />
        <rect x="12" y="13" width="2" height="3" [attr.fill]="piel().base" />
      }
      <rect x="2" y="16" width="2" height="1" [attr.fill]="piel().base" />
      <rect x="12" y="16" width="2" height="1" [attr.fill]="piel().base" />
      @if (config().genero === 'varon') {
        <!-- hombros anchos: la fila de arriba del torso se extiende sobre los brazos -->
        <rect x="2" y="11" width="12" height="1" [attr.fill]="ropa().base" />
      }
    </g>

    <!-- detalles de la prenda (el traje no tiene: es el mono liso de siempre) -->
    <g data-capa="prenda">
      @switch (config().prenda) {
        @case ('hoodie') {
          <!-- capucha alrededor del cuello: la cabeza y el cuello la tapan en el centro -->
          <rect x="3" y="9" width="10" height="2" [attr.fill]="ropa().sombra" />
          <rect x="6" y="11" width="1" height="1" fill="#F3EAFF" />
          <rect x="9" y="11" width="1" height="1" fill="#F3EAFF" />
          <rect x="4" y="16" width="8" height="1" [attr.fill]="ropa().sombra" />
        }
        @case ('remera') {
          <rect x="6" y="11" width="4" height="1" [attr.fill]="ropa().sombra" />
        }
        @case ('camisa') {
          <rect x="5" y="11" width="2" height="1" fill="#F3EAFF" />
          <rect x="9" y="11" width="2" height="1" fill="#F3EAFF" />
          <rect x="7" y="11" width="2" height="1" [attr.fill]="corbata()" />
          <rect x="7" y="12" width="2" height="4" [attr.fill]="corbata()" />
        }
        @case ('campera') {
          <rect x="6" y="11" width="4" height="6" [attr.fill]="remera()" />
          <rect x="5" y="12" width="1" height="5" [attr.fill]="ropa().sombra" />
          <rect x="10" y="12" width="1" height="5" [attr.fill]="ropa().sombra" />
        }
      }
    </g>

    <!-- emblema del pecho: los rects heredan el fill del grupo -->
    @if (mostrarEmblema()) {
      <g data-capa="emblema" [attr.fill]="colorEmblema()" [attr.transform]="contraEspejo()">
        @switch (config().emblema) {
          @case ('cuadro') {
            <rect x="7" y="13" width="2" height="2" />
          }
          @case ('tag') {
            <rect x="6" y="12" width="1" height="1" />
            <rect x="5" y="13" width="1" height="1" />
            <rect x="6" y="14" width="1" height="1" />
            <rect x="8" y="12" width="1" height="2" />
            <rect x="7" y="14" width="1" height="1" />
            <rect x="9" y="12" width="1" height="1" />
            <rect x="10" y="13" width="1" height="1" />
            <rect x="9" y="14" width="1" height="1" />
          }
          @case ('llaves') {
            <rect x="6" y="12" width="1" height="3" />
            <rect x="5" y="13" width="1" height="1" />
            <rect x="9" y="12" width="1" height="3" />
            <rect x="10" y="13" width="1" height="1" />
          }
          @case ('prompt') {
            <rect x="5" y="12" width="1" height="1" />
            <rect x="6" y="13" width="1" height="1" />
            <rect x="5" y="14" width="1" height="1" />
            <rect x="8" y="14" width="3" height="1" />
          }
          @case ('lambda') {
            <rect x="6" y="12" width="2" height="1" />
            <rect x="7" y="13" width="1" height="1" />
            <rect x="6" y="14" width="1" height="1" />
            <rect x="8" y="14" width="1" height="1" />
          }
          @case ('punto-y-coma') {
            <rect x="7" y="12" width="1" height="1" />
            <rect x="7" y="14" width="1" height="1" />
            <rect x="6" y="15" width="1" height="1" />
          }
          @case ('hash') {
            <rect x="6" y="12" width="1" height="4" />
            <rect x="8" y="12" width="1" height="4" />
            <rect x="5" y="13" width="5" height="1" />
            <rect x="5" y="15" width="5" height="1" />
          }
        }
      </g>
    }

    <!-- cuello, cabeza y rasgos según la silueta -->
    <g data-capa="cabeza">
      @if (config().genero === 'mujer') {
        <rect x="7" y="10" width="2" height="1" [attr.fill]="piel().sombra" />
        <rect x="4" y="3" width="8" height="6" [attr.fill]="piel().base" />
        <!-- mentón redondeado -->
        <rect x="5" y="9" width="6" height="1" [attr.fill]="piel().sombra" />
      } @else {
        <rect x="6" y="10" width="4" height="1" [attr.fill]="piel().sombra" />
        <rect x="4" y="3" width="8" height="7" [attr.fill]="piel().base" />
        <rect x="4" y="9" width="8" height="1" [attr.fill]="piel().sombra" />
      }
      <rect x="5" y="6" width="2" height="2" fill="#190236" />
      <rect x="9" y="6" width="2" height="2" fill="#190236" />
      <rect x="5" y="6" width="1" height="1" fill="#F3EAFF" />
      <rect x="9" y="6" width="1" height="1" fill="#F3EAFF" />
      @switch (config().genero) {
        @case ('mujer') {
          <g data-capa="pestanas">
            <rect x="4" y="6" width="1" height="1" fill="#190236" />
            <rect x="11" y="6" width="1" height="1" fill="#190236" />
          </g>
          <rect x="7" y="8" width="2" height="1" fill="#E0567A" />
        }
        @case ('varon') {
          <g data-capa="cejas">
            <rect x="5" y="5" width="2" height="1" [attr.fill]="pelo().sombra" />
            <rect x="9" y="5" width="2" height="1" [attr.fill]="pelo().sombra" />
          </g>
          <rect x="7" y="8" width="2" height="1" [attr.fill]="piel().sombra" />
        }
        @default {
          <rect x="7" y="8" width="2" height="1" [attr.fill]="piel().sombra" />
        }
      }
    </g>

    <!-- pelo -->
    <g data-capa="pelo">
      @switch (config().pelo) {
        @case ('corto') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('largo') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="3" y="3" width="1" height="8" [attr.fill]="pelo().base" />
          <rect x="12" y="3" width="1" height="8" [attr.fill]="pelo().sombra" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('cresta') {
          <rect x="7" y="0" width="2" height="3" [attr.fill]="pelo().base" />
          <rect x="6" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="9" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('rapado') {
          <rect x="4" y="2" width="8" height="1" [attr.fill]="pelo().sombra" />
        }
        @case ('afro') {
          <rect x="3" y="1" width="10" height="3" [attr.fill]="pelo().base" />
          <rect x="2" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="13" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="4" y="0" width="8" height="1" [attr.fill]="pelo().base" />
        }
      }
    </g>

    <!-- accesorio de cabeza: siempre por encima del pelo -->
    <g data-capa="accesorio">
      @switch (config().accesorio) {
        @case ('visor') {
          <rect x="3" y="5" width="10" height="3" [attr.fill]="acc().base" opacity="0.85" />
          <rect x="3" y="5" width="10" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('gorra') {
          <rect x="3" y="1" width="10" height="2" [attr.fill]="acc().base" />
          <rect x="3" y="3" width="10" height="1" [attr.fill]="acc().sombra" />
          <rect x="0" y="3" width="4" height="1" [attr.fill]="acc().base" />
        }
        @case ('corona') {
          <rect x="4" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="7" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="10" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="4" y="2" width="8" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('auriculares') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="12" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="2" width="2" height="5" [attr.fill]="acc().base" />
          <rect x="12" y="2" width="2" height="5" [attr.fill]="acc().sombra" />
        }
      }
    </g>
  </svg>
</span>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/shared/ui/avatar-sprite.spec.ts --include src/app/core/avatar/avatar.models.spec.ts`
Expected: PASS.

Run: `npx ng test --watch=false`
Expected: PASS — toda la suite (8 archivos).

- [ ] **Step 7: Mirada rápida en el navegador**

Levantar el dev server con la config `frontend` de `.claude/launch.json` (herramienta `preview_start`, `name: "frontend"`), iniciar sesión como alumno en `/login` e ir a `/alumno/avatar`. Con AL AZAR varias veces, comprobar que el sprite no se rompe (sin huecos entre cabeza y torso, manos pegadas a los brazos, emblema dentro del pecho). La verificación completa es la Task 5; acá solo se busca un error grosero.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/core/avatar frontend/src/app/shared/ui/avatar-sprite.ts frontend/src/app/shared/ui/avatar-sprite.html frontend/src/app/shared/ui/avatar-sprite.spec.ts
git commit -m "feat(avatar): siluetas por género, prendas y emblemas dev en el sprite

El template pasa a avatar-sprite.html con una capa por <g data-capa>, lo que
permite testear las reglas de convivencia. La silueta indefinido es la de
siempre; mujer y varón cambian contorno y rasgos sin mover las manos. El
emblema se contra-espeja al caminar a la izquierda para que λ o >_ no se
lean al revés, y se oculta con camisa o laptop.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sprite — peinados, barba, accesorios, anteojos y objeto en mano

**Files:**
- Modify: `frontend/src/app/core/avatar/avatar.models.ts` (agregar `anteojosVisibles` al final)
- Modify: `frontend/src/app/core/avatar/avatar.models.spec.ts` (agregar un `describe`)
- Modify: `frontend/src/app/shared/ui/avatar-sprite.ts` (un `computed` y un import)
- Modify: `frontend/src/app/shared/ui/avatar-sprite.html` (bloque de pelo en adelante)
- Modify: `frontend/src/app/shared/ui/avatar-sprite.spec.ts` (agregar un `describe`)

**Interfaces:**
- Consumes (Tasks 1–2): `PELOS`, `BARBAS`, `ACCESORIOS`, `ANTEOJOS`, `OBJETOS`, helpers `dibujar` / `capa` / `pixeles` / `fills` del spec del sprite.
- Produces:
  - `anteojosVisibles(a: AvatarConfig): boolean` en `avatar.models.ts` (la usa el editor en la Task 4).
  - Capas nuevas: `barba` (solo si `barba !== 'ninguna'`), `anteojos` (solo si `anteojosVisibles`), `objeto` (solo si `objeto !== 'ninguno'`). Orden final de capas de primer nivel: `piernas`, `torso`, `brazos`, `prenda`, `emblema`, `cabeza`, `barba`, `pelo`, `anteojos`, `accesorio`, `objeto`.

- [ ] **Step 1: Write the failing tests**

Agregar al final de `frontend/src/app/shared/ui/avatar-sprite.spec.ts` (y sumar `ACCESORIOS`, `ANTEOJOS`, `BARBAS`, `OBJETOS`, `PELOS` al import de `avatar.models`):

```ts
describe('AvatarSprite — cabeza y equipo', () => {
  const capasEnOrden = (el: HTMLElement) =>
    [...el.querySelectorAll('svg > g[data-capa]')].map((g) => g.getAttribute('data-capa'));

  it.each(PELOS.map((p) => p.id))('el pelo %s se dibuja', (pelo) => {
    expect(pixeles(dibujar({ pelo }), 'pelo')).toBeGreaterThan(0);
  });

  it.each(BARBAS.filter((b) => b.id !== 'ninguna').map((b) => b.id))(
    'la barba %s se dibuja del color del pelo',
    (barba) => {
      const el = dibujar({ barba, colorPelo: 'pelirrojo' });
      expect(pixeles(el, 'barba')).toBeGreaterThan(0);
      expect(fills(el, 'barba').every((f) => f === '#C2502A' || f === '#853316')).toBe(true);
    },
  );

  it('sin barba no hay capa de barba', () => {
    expect(capa(dibujar({ barba: 'ninguna' }), 'barba')).toBeNull();
  });

  it.each(ACCESORIOS.filter((a) => a.id !== 'ninguno').map((a) => a.id))(
    'el accesorio %s se dibuja',
    (accesorio) => {
      expect(pixeles(dibujar({ accesorio }), 'accesorio')).toBeGreaterThan(0);
    },
  );

  it.each(['gorra', 'gorra-atras', 'beanie'] as const)(
    '%s tapa todo el casco (filas 0-3) para que ningún peinado lo atraviese',
    (accesorio) => {
      const filasTapadas = new Set<number>();
      for (const r of capa(dibujar({ accesorio, pelo: 'cresta' }), 'accesorio')!.querySelectorAll('rect')) {
        const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => Number(r.getAttribute(a)));
        // la cresta ocupa las columnas 6..9: la fila queda tapada si un rect las cubre enteras
        if (x <= 6 && x + w >= 10) for (let fila = y; fila < y + h; fila++) filasTapadas.add(fila);
      }
      expect([0, 1, 2, 3].every((f) => filasTapadas.has(f))).toBe(true);
    },
  );

  it.each(ANTEOJOS.filter((a) => a.id !== 'ninguno').map((a) => a.id))(
    'los anteojos %s se dibujan',
    (anteojos) => {
      expect(pixeles(dibujar({ anteojos }), 'anteojos')).toBeGreaterThan(0);
    },
  );

  it('con visor no se dibujan los anteojos', () => {
    expect(capa(dibujar({ accesorio: 'visor', anteojos: 'sol' }), 'anteojos')).toBeNull();
    expect(capa(dibujar({ accesorio: 'gorra', anteojos: 'sol' }), 'anteojos')).not.toBeNull();
  });

  it.each(OBJETOS.filter((o) => o.id !== 'ninguno').map((o) => o.id))(
    'el objeto %s se dibuja por delante de todo',
    (objeto) => {
      const el = dibujar({ objeto });
      expect(pixeles(el, 'objeto')).toBeGreaterThan(0);
      expect(capasEnOrden(el).at(-1)).toBe('objeto');
    },
  );

  it('respeta el orden de capas: barba < pelo < anteojos < accesorio', () => {
    const el = dibujar({ prenda: 'hoodie', barba: 'barba', anteojos: 'redondos', accesorio: 'gorra' });
    expect(capasEnOrden(el)).toEqual([
      'piernas',
      'torso',
      'brazos',
      'prenda',
      'emblema',
      'cabeza',
      'barba',
      'pelo',
      'anteojos',
      'accesorio',
    ]);
  });
});
```

Agregar al final de `frontend/src/app/core/avatar/avatar.models.spec.ts` (y sumar `anteojosVisibles` al import):

```ts
describe('anteojosVisibles', () => {
  const base = avatarPorDefecto('indefinido');

  it('se ven con cualquier accesorio salvo el visor, que ya tapa los ojos', () => {
    expect(anteojosVisibles({ ...base, anteojos: 'codigo', accesorio: 'beanie' })).toBe(true);
    expect(anteojosVisibles({ ...base, anteojos: 'codigo', accesorio: 'visor' })).toBe(false);
  });

  it('sin anteojos no hay nada que ver', () => {
    expect(anteojosVisibles({ ...base, anteojos: 'ninguno' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx ng test --watch=false --include src/app/shared/ui/avatar-sprite.spec.ts --include src/app/core/avatar/avatar.models.spec.ts`
Expected: FAIL — `anteojosVisibles` no existe; los peinados, accesorios nuevos, barba, anteojos y objeto no dibujan nada.

- [ ] **Step 3: Agregar `anteojosVisibles` al final de `avatar.models.ts`**

```ts
/** El visor tapa los ojos: con visor, los anteojos no se dibujan (el editor lo avisa). */
export function anteojosVisibles(a: AvatarConfig): boolean {
  return a.anteojos !== 'ninguno' && a.accesorio !== 'visor';
}
```

- [ ] **Step 4: Sumar el `computed` al sprite**

En `frontend/src/app/shared/ui/avatar-sprite.ts`, agregar `anteojosVisibles,` al import de `avatar.models` y, debajo de `mostrarEmblema`, agregar:

```ts
  protected readonly mostrarAnteojos = computed(() => anteojosVisibles(this.config()));
```

- [ ] **Step 5: Reemplazar el bloque de pelo y accesorio del template**

En `frontend/src/app/shared/ui/avatar-sprite.html`, reemplazar desde la línea `<!-- pelo -->` hasta el `</g>` que cierra `<g data-capa="accesorio">` (inclusive) por:

```html
    <!-- barba: del color del pelo, por debajo del pelo -->
    @if (config().barba !== 'ninguna') {
      <g data-capa="barba">
        @switch (config().barba) {
          @case ('barba') {
            <rect x="4" y="7" width="1" height="3" [attr.fill]="pelo().sombra" />
            <rect x="11" y="7" width="1" height="3" [attr.fill]="pelo().sombra" />
            <rect x="5" y="8" width="2" height="1" [attr.fill]="pelo().base" />
            <rect x="9" y="8" width="2" height="1" [attr.fill]="pelo().base" />
            <rect x="5" y="9" width="6" height="1" [attr.fill]="pelo().base" />
          }
          @case ('bigote') {
            <rect x="6" y="8" width="4" height="1" [attr.fill]="pelo().base" />
          }
          @case ('candado') {
            <rect x="6" y="8" width="1" height="2" [attr.fill]="pelo().base" />
            <rect x="9" y="8" width="1" height="2" [attr.fill]="pelo().base" />
            <rect x="7" y="9" width="2" height="1" [attr.fill]="pelo().base" />
          }
        }
      </g>
    }

    <!-- pelo (el largo y la coleta asoman por los costados de la cabeza) -->
    <g data-capa="pelo">
      @switch (config().pelo) {
        @case ('corto') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('largo') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="3" y="3" width="1" height="8" [attr.fill]="pelo().base" />
          <rect x="12" y="3" width="1" height="8" [attr.fill]="pelo().sombra" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('cresta') {
          <rect x="7" y="0" width="2" height="3" [attr.fill]="pelo().base" />
          <rect x="6" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="9" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('rapado') {
          <rect x="4" y="2" width="8" height="1" [attr.fill]="pelo().sombra" />
        }
        @case ('afro') {
          <rect x="3" y="1" width="10" height="3" [attr.fill]="pelo().base" />
          <rect x="2" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="13" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="4" y="0" width="8" height="1" [attr.fill]="pelo().base" />
        }
        @case ('rodete') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="6" y="0" width="4" height="2" [attr.fill]="pelo().base" />
          <rect x="6" y="1" width="4" height="1" [attr.fill]="pelo().sombra" />
          <rect x="4" y="4" width="1" height="1" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="1" [attr.fill]="pelo().sombra" />
        }
        @case ('coleta') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="4" y="4" width="1" height="1" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="1" [attr.fill]="pelo().sombra" />
          <rect x="12" y="3" width="2" height="2" [attr.fill]="pelo().base" />
          <rect x="13" y="5" width="1" height="3" [attr.fill]="pelo().base" />
          <rect x="13" y="8" width="1" height="1" [attr.fill]="pelo().sombra" />
        }
        @case ('despeinado') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="3" y="1" width="2" height="2" [attr.fill]="pelo().base" />
          <rect x="6" y="1" width="2" height="1" [attr.fill]="pelo().base" />
          <rect x="9" y="0" width="2" height="2" [attr.fill]="pelo().base" />
          <rect x="12" y="2" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="5" y="4" width="1" height="1" [attr.fill]="pelo().base" />
          <rect x="8" y="4" width="2" height="1" [attr.fill]="pelo().base" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
      }
    </g>

    <!-- anteojos: colores fijos; con visor no se dibujan -->
    @if (mostrarAnteojos()) {
      <g data-capa="anteojos">
        @switch (config().anteojos) {
          @case ('marco-grueso') {
            <rect x="4" y="5" width="8" height="1" fill="#190236" />
            <rect x="4" y="6" width="1" height="2" fill="#190236" />
            <rect x="7" y="6" width="2" height="1" fill="#190236" />
            <rect x="11" y="6" width="1" height="2" fill="#190236" />
          }
          @case ('redondos') {
            <rect x="5" y="5" width="2" height="1" fill="#B9A6D6" />
            <rect x="4" y="6" width="1" height="2" fill="#B9A6D6" />
            <rect x="5" y="8" width="2" height="1" fill="#B9A6D6" />
            <rect x="9" y="5" width="2" height="1" fill="#B9A6D6" />
            <rect x="11" y="6" width="1" height="2" fill="#B9A6D6" />
            <rect x="9" y="8" width="2" height="1" fill="#B9A6D6" />
            <rect x="7" y="6" width="2" height="1" fill="#B9A6D6" />
          }
          @case ('sol') {
            <rect x="4" y="5" width="8" height="1" fill="#190236" />
            <rect x="4" y="6" width="3" height="2" fill="#0E0120" />
            <rect x="9" y="6" width="3" height="2" fill="#0E0120" />
            <rect x="7" y="6" width="2" height="1" fill="#190236" />
            <rect x="5" y="6" width="1" height="1" fill="#8B3DF5" />
            <rect x="10" y="6" width="1" height="1" fill="#8B3DF5" />
          }
          @case ('codigo') {
            <rect x="4" y="5" width="8" height="1" fill="#190236" />
            <rect x="4" y="6" width="1" height="2" fill="#190236" />
            <rect x="7" y="6" width="2" height="1" fill="#190236" />
            <rect x="11" y="6" width="1" height="2" fill="#190236" />
            <!-- reflejo de líneas de código sobre los lentes -->
            <rect x="5" y="6" width="2" height="1" fill="#2BD46A" />
            <rect x="5" y="7" width="1" height="1" fill="#2BD46A" />
            <rect x="9" y="6" width="1" height="1" fill="#2BD46A" />
            <rect x="9" y="7" width="2" height="1" fill="#2BD46A" />
          }
        }
      </g>
    }

    <!-- accesorio de cabeza: siempre por encima del pelo. Gorra, gorra hacia atrás y beanie
         pintan todo el casco (filas 0-3) para que ningún peinado los atraviese. -->
    <g data-capa="accesorio">
      @switch (config().accesorio) {
        @case ('visor') {
          <rect x="3" y="5" width="10" height="3" [attr.fill]="acc().base" opacity="0.85" />
          <rect x="3" y="5" width="10" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('gorra') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="3" y="1" width="10" height="2" [attr.fill]="acc().base" />
          <rect x="3" y="3" width="10" height="1" [attr.fill]="acc().sombra" />
          <rect x="0" y="3" width="4" height="1" [attr.fill]="acc().base" />
        }
        @case ('gorra-atras') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="3" y="1" width="10" height="2" [attr.fill]="acc().base" />
          <rect x="3" y="3" width="10" height="1" [attr.fill]="acc().sombra" />
          <!-- abertura del ajuste y visera asomando por detrás -->
          <rect x="7" y="2" width="2" height="1" [attr.fill]="acc().sombra" />
          <rect x="12" y="2" width="3" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('beanie') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="3" y="1" width="10" height="2" [attr.fill]="acc().base" />
          <rect x="3" y="3" width="10" height="1" [attr.fill]="acc().sombra" />
          <!-- tejido acanalado -->
          <rect x="5" y="1" width="1" height="2" [attr.fill]="acc().sombra" />
          <rect x="8" y="1" width="1" height="2" [attr.fill]="acc().sombra" />
          <rect x="11" y="1" width="1" height="2" [attr.fill]="acc().sombra" />
        }
        @case ('corona') {
          <rect x="4" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="7" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="10" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="4" y="2" width="8" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('auriculares') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="12" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="2" width="2" height="5" [attr.fill]="acc().base" />
          <rect x="12" y="2" width="2" height="5" [attr.fill]="acc().sombra" />
        }
        @case ('headset') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="12" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="2" width="2" height="5" [attr.fill]="acc().base" />
          <rect x="12" y="2" width="2" height="5" [attr.fill]="acc().sombra" />
          <!-- micrófono: brazo desde el auricular hasta la boca -->
          <rect x="3" y="7" width="1" height="1" [attr.fill]="acc().sombra" />
          <rect x="4" y="8" width="2" height="1" [attr.fill]="acc().sombra" />
          <rect x="6" y="8" width="1" height="1" fill="#190236" />
        }
      }
    </g>

    <!-- objeto en mano: colores fijos, por delante de todo. La laptop va sostenida delante
         del pecho con las dos manos; café y mate en la mano derecha; el teclado contra el
         costado izquierdo. -->
    @if (config().objeto !== 'ninguno') {
      <g data-capa="objeto">
        @switch (config().objeto) {
          @case ('laptop') {
            <rect x="4" y="12" width="8" height="5" fill="#4B4A57" />
            <rect x="4" y="16" width="8" height="1" fill="#2B2A35" />
            <!-- stickers en la tapa -->
            <rect x="5" y="13" width="2" height="2" fill="#FF2758" />
            <rect x="9" y="14" width="2" height="1" fill="#2BD46A" />
            <rect x="8" y="12" width="1" height="1" fill="#F3EAFF" />
          }
          @case ('cafe') {
            <rect x="13" y="14" width="3" height="3" fill="#F3EAFF" />
            <rect x="13" y="14" width="3" height="1" fill="#6B4226" />
            <rect x="15" y="15" width="1" height="2" fill="#B9A6D6" />
            <!-- vapor -->
            <rect x="14" y="12" width="1" height="1" fill="#B9A6D6" />
            <rect x="13" y="11" width="1" height="1" fill="#B9A6D6" />
          }
          @case ('mate') {
            <rect x="13" y="14" width="3" height="3" fill="#6B4226" />
            <rect x="13" y="14" width="3" height="1" fill="#8A5A36" />
            <rect x="14" y="14" width="1" height="1" fill="#4F8A2B" />
            <!-- bombilla -->
            <rect x="15" y="11" width="1" height="3" fill="#CFCAD6" />
          }
          @case ('teclado') {
            <rect x="0" y="14" width="6" height="2" fill="#4B4A57" />
            <rect x="0" y="14" width="1" height="1" fill="#F3EAFF" />
            <rect x="2" y="14" width="1" height="1" fill="#F3EAFF" />
            <rect x="4" y="14" width="1" height="1" fill="#F3EAFF" />
            <rect x="1" y="15" width="1" height="1" fill="#FF2758" />
          }
        }
      </g>
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --watch=false --include src/app/shared/ui/avatar-sprite.spec.ts --include src/app/core/avatar/avatar.models.spec.ts`
Expected: PASS.

Run: `npx ng test --watch=false`
Expected: PASS — toda la suite.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/avatar frontend/src/app/shared/ui/avatar-sprite.ts frontend/src/app/shared/ui/avatar-sprite.html frontend/src/app/shared/ui/avatar-sprite.spec.ts
git commit -m "feat(avatar): peinados, barba, accesorios, anteojos y objeto en mano

Suma rodete, coleta y despeinado; barba, bigote y candado; beanie, gorra
hacia atrás y headset; cuatro anteojos (incluidos los lentes con código) y
laptop, café, mate o teclado en mano. Las gorras y el beanie tapan todo el
casco para que ningún peinado los atraviese, y con visor no se dibujan los
anteojos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Editor con pestañas

**Files:**
- Modify: `frontend/src/app/features/alumno/avatar-editor.ts` (reescritura)
- Create: `frontend/src/app/features/alumno/avatar-editor.spec.ts`

**Interfaces:**
- Consumes (Tasks 1–3): `AvatarService` (`avatar()`, `set`, `reiniciar`, `aleatorio`), catálogos `GENEROS`, `PIELES`, `PELOS`, `BARBAS`, `PRENDAS`, `EMBLEMAS`, `ACCESORIOS`, `ANTEOJOS`, `OBJETOS`, colores `COLORES_PELO_NATURALES`, `COLORES_MARCA`, `COLORES_ROPA`, reglas `emblemaVisible`, `anteojosVisibles`, componente `AvatarSprite`.
- Produces: nada que consuman otras tasks. Textos que los tests buscan: pestañas `CUERPO` · `ROPA` · `ACCESORIOS` · `EQUIPO`; rótulos `GÉNERO`, `PRENDA`, `OBJETO EN MANO`; avisos `LA CORBATA DE LA CAMISA TAPA EL EMBLEMA`, `LA LAPTOP TAPA EL EMBLEMA`, `EL VISOR TAPA LOS ANTEOJOS`.

- [ ] **Step 1: Write the failing test**

Crear `frontend/src/app/features/alumno/avatar-editor.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarEditor } from './avatar-editor';

describe('AvatarEditor', () => {
  let fixture: ComponentFixture<AvatarEditor>;
  let el: HTMLElement;
  let srv: AvatarService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AvatarEditor],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AvatarEditor);
    srv = TestBed.inject(AvatarService);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  const boton = (texto: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
  const click = (texto: string) => {
    const b = boton(texto);
    expect(b, `botón "${texto}"`).toBeTruthy();
    b!.click();
    fixture.detectChanges();
  };
  const panel = () => el.querySelector('[role="tabpanel"]')?.textContent ?? '';

  it('arranca en la pestaña CUERPO', () => {
    expect(boton('CUERPO')!.getAttribute('aria-selected')).toBe('true');
    expect(panel()).toContain('GÉNERO');
  });

  it('cambiar de pestaña muestra solo sus secciones', () => {
    click('ROPA');
    expect(boton('ROPA')!.getAttribute('aria-selected')).toBe('true');
    expect(boton('CUERPO')!.getAttribute('aria-selected')).toBe('false');
    expect(panel()).toContain('PRENDA');
    expect(panel()).not.toContain('GÉNERO');

    click('EQUIPO');
    expect(panel()).toContain('OBJETO EN MANO');
  });

  it('elegir un género cambia la silueta y no toca el resto', () => {
    srv.set('pelo', 'afro');
    fixture.detectChanges();
    click('Varón');
    expect(srv.avatar().genero).toBe('varon');
    expect(srv.avatar().pelo).toBe('afro');
    expect(boton('Varón')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('avisa cuando la camisa o la laptop tapan el emblema', () => {
    click('ROPA');
    expect(panel()).not.toContain('TAPA EL EMBLEMA');
    click('Camisa y corbata');
    expect(panel()).toContain('LA CORBATA DE LA CAMISA TAPA EL EMBLEMA');
    click('Hoodie');
    srv.set('objeto', 'laptop');
    fixture.detectChanges();
    expect(panel()).toContain('LA LAPTOP TAPA EL EMBLEMA');
  });

  it('avisa cuando el visor tapa los anteojos', () => {
    click('ACCESORIOS');
    click('Con código');
    expect(panel()).not.toContain('EL VISOR TAPA LOS ANTEOJOS');
    click('Visor');
    expect(panel()).toContain('EL VISOR TAPA LOS ANTEOJOS');
  });

  it('RESET conserva el género elegido', () => {
    click('Mujer');
    srv.set('objeto', 'mate');
    click('RESET');
    expect(srv.avatar().genero).toBe('mujer');
    expect(srv.avatar().pelo).toBe('largo');
    expect(srv.avatar().objeto).toBe('ninguno');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --watch=false --include src/app/features/alumno/avatar-editor.spec.ts`
Expected: FAIL — no existen las pestañas (`boton('CUERPO')` es `undefined`).

- [ ] **Step 3: Reescribir `avatar-editor.ts`**

Reemplazar el archivo entero por:

```ts
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ACCESORIOS,
  ANTEOJOS,
  anteojosVisibles,
  AvatarConfig,
  BARBAS,
  COLORES_MARCA,
  COLORES_PELO_NATURALES,
  COLORES_ROPA,
  EMBLEMAS,
  emblemaVisible,
  GENEROS,
  OBJETOS,
  PELOS,
  PIELES,
  PRENDAS,
} from '../../core/avatar/avatar.models';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

type Pestana = 'cuerpo' | 'ropa' | 'accesorios' | 'equipo';

/**
 * Personalización del avatar. Todo cambio se aplica en vivo sobre el preview y se guarda
 * solo (`AvatarService` persiste en cada `set`): no hay botón "guardar" porque no hay nada
 * que se pueda perder — es la misma decisión que el toggle de tema.
 *
 * Las partes se reparten en cuatro pestañas para que la vitrina quede siempre a la vista
 * mientras se elige. La pestaña activa no se persiste: al volver se arranca por CUERPO.
 */
@Component({
  selector: 'app-avatar-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink, NgTemplateOutlet],
  host: { class: 'block' },
  styles: `
    /* La muestra elegida se marca con un doble anillo, no solo con el color del borde:
       sobre swatches oscuros un borde de 2 px es indistinguible del no-seleccionado. */
    .swatch {
      border: 2px solid var(--color-base-300);
      transition:
        transform 0.12s,
        box-shadow 0.12s;
    }
    .swatch:hover {
      transform: scale(1.12);
    }
    .swatch.sel {
      border-color: #f3eaff;
      box-shadow:
        0 0 0 2px var(--color-base-100),
        0 0 0 4px #ff2758;
      transform: scale(1.12);
    }
    .swatch:focus-visible {
      outline: 2px solid #f3eaff;
      outline-offset: 3px;
    }
    /* Los emblemas se eligen por su glifo: en la pixel font de UI "</>" y "{}" no se leen. */
    .glifo {
      font-family: var(--font-console);
      font-size: 18px;
      line-height: 1;
    }
  `,
  template: `
    <div class="mb-4 flex items-center gap-3">
      <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]">◀ AL MAPA</a>
      <h2 class="title-font text-2xl text-primary">Tu personaje</h2>
    </div>

    <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <!-- vitrina del avatar: queda fija mientras se recorren las pestañas -->
      <div
        class="escena-neon chaflan flex flex-col items-center gap-4 border-2 border-primary p-6 lg:sticky lg:top-4 lg:self-start"
      >
        <div class="grid h-56 w-full place-items-center">
          <ui-avatar-sprite
            [config]="srv.avatar()"
            [alto]="190"
            [sombra]="true"
            [caminando]="true"
            etiqueta="Vista previa de tu avatar"
          />
        </div>
        <p class="ui-font text-center text-[8px] leading-relaxed text-accent">
          ASÍ TE VAS A VER<br />RECORRIENDO EL MAPA
        </p>
        <div class="flex w-full gap-2">
          <button type="button" class="btn btn-sm btn-primary ui-font flex-1 text-[8px]" (click)="srv.aleatorio()">
            ⟳ AL AZAR
          </button>
          <button type="button" class="btn btn-sm btn-outline ui-font flex-1 text-[8px]" (click)="srv.reiniciar()">
            RESET
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-5">
        <div role="tablist" aria-label="Partes del personaje" class="tabs tabs-border">
          @for (p of pestanas; track p.id) {
            <button
              type="button"
              role="tab"
              class="tab ui-font text-[8px]"
              [id]="'tab-' + p.id"
              [class.tab-active]="pestana() === p.id"
              [attr.aria-selected]="pestana() === p.id"
              [attr.aria-controls]="'panel-' + p.id"
              (click)="pestana.set(p.id)"
            >
              {{ p.nombre }}
            </button>
          }
        </div>

        <div
          role="tabpanel"
          class="flex flex-col gap-5"
          [id]="'panel-' + pestana()"
          [attr.aria-labelledby]="'tab-' + pestana()"
        >
          @switch (pestana()) {
            @case ('cuerpo') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">GÉNERO</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: generos, campo: 'genero' }" />
                <p class="ui-font mt-2 text-[7px] leading-relaxed opacity-60">
                  CAMBIA LA SILUETA · TODO EL CATÁLOGO SIGUE DISPONIBLE
                </p>
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">TONO DE PIEL</h3>
                <ng-container
                  *ngTemplateOutlet="muestras; context: { $implicit: pieles, campo: 'piel', etiqueta: 'Piel' }"
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PELO</h3>
                <div class="mb-2">
                  <ng-container *ngTemplateOutlet="chips; context: { $implicit: pelos, campo: 'pelo' }" />
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresPeloNaturales, campo: 'colorPelo', etiqueta: 'Pelo' }
                    "
                  />
                  <span class="h-8 w-px bg-base-300" aria-hidden="true"></span>
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresMarca, campo: 'colorPelo', etiqueta: 'Pelo' }
                    "
                  />
                </div>
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">BARBA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: barbas, campo: 'barba' }" />
              </section>
            }

            @case ('ropa') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PRENDA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: prendas, campo: 'prenda' }" />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">COLOR</h3>
                <ng-container
                  *ngTemplateOutlet="
                    muestras;
                    context: { $implicit: coloresRopa, campo: 'colorRopa', etiqueta: 'Ropa' }
                  "
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">EMBLEMA</h3>
                <div class="flex flex-wrap gap-2">
                  @for (e of emblemas; track e.id) {
                    <button
                      type="button"
                      class="btn btn-sm glifo min-w-12"
                      [class.btn-primary]="elegido('emblema', e.id)"
                      [class.btn-outline]="!elegido('emblema', e.id)"
                      [attr.aria-pressed]="elegido('emblema', e.id)"
                      [attr.aria-label]="'Emblema ' + e.nombre"
                      [title]="e.nombre"
                      (click)="elegir('emblema', e.id)"
                    >
                      {{ e.glifo }}
                    </button>
                  }
                </div>
                @if (avisoEmblema(); as aviso) {
                  <p class="ui-font mt-2 text-[7px] leading-relaxed text-warning">{{ aviso }}</p>
                }
              </section>
            }

            @case ('accesorios') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">CABEZA</h3>
                <div class="mb-2">
                  <ng-container
                    *ngTemplateOutlet="chips; context: { $implicit: accesorios, campo: 'accesorio' }"
                  />
                </div>
                @if (srv.avatar().accesorio !== 'ninguno') {
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresRopa, campo: 'colorAccesorio', etiqueta: 'Accesorio' }
                    "
                  />
                }
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">ANTEOJOS</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: anteojos, campo: 'anteojos' }" />
                @if (avisoAnteojos()) {
                  <p class="ui-font mt-2 text-[7px] leading-relaxed text-warning">EL VISOR TAPA LOS ANTEOJOS</p>
                }
              </section>
            }

            @case ('equipo') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">OBJETO EN MANO</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: objetos, campo: 'objeto' }" />
                <p class="ui-font mt-2 text-[7px] leading-relaxed opacity-60">
                  LO LLEVÁS TAMBIÉN MIENTRAS CAMINÁS POR EL MAPA
                </p>
              </section>
            }
          }
        </div>

        <p class="ui-font text-[8px] leading-relaxed opacity-50">SE GUARDA SOLO</p>
      </div>
    </div>

    <!-- fila de opciones de texto; los ids vienen del catálogo del campo -->
    <ng-template #chips let-opciones let-campo="campo">
      <div class="flex flex-wrap gap-2">
        @for (o of opciones; track o.id) {
          <button
            type="button"
            class="btn btn-xs ui-font text-[8px]"
            [class.btn-primary]="elegido(campo, o.id)"
            [class.btn-outline]="!elegido(campo, o.id)"
            [attr.aria-pressed]="elegido(campo, o.id)"
            (click)="elegir(campo, o.id)"
          >
            {{ o.nombre }}
          </button>
        }
      </div>
    </ng-template>

    <!-- fila de muestras de color -->
    <ng-template #muestras let-opciones let-campo="campo" let-etiqueta="etiqueta">
      <div class="flex flex-wrap gap-2">
        @for (c of opciones; track c.id) {
          <button
            type="button"
            class="swatch h-9 w-9"
            [style.background]="c.base"
            [class.sel]="elegido(campo, c.id)"
            [attr.aria-pressed]="elegido(campo, c.id)"
            [attr.aria-label]="etiqueta + ' ' + c.nombre"
            [title]="c.nombre"
            (click)="elegir(campo, c.id)"
          ></button>
        }
      </div>
    </ng-template>
  `,
})
export class AvatarEditor {
  protected readonly srv = inject(AvatarService);

  protected readonly pestanas: readonly { id: Pestana; nombre: string }[] = [
    { id: 'cuerpo', nombre: 'CUERPO' },
    { id: 'ropa', nombre: 'ROPA' },
    { id: 'accesorios', nombre: 'ACCESORIOS' },
    { id: 'equipo', nombre: 'EQUIPO' },
  ];
  protected readonly pestana = signal<Pestana>('cuerpo');

  protected readonly generos = GENEROS;
  protected readonly pieles = PIELES;
  protected readonly pelos = PELOS;
  protected readonly barbas = BARBAS;
  protected readonly prendas = PRENDAS;
  protected readonly emblemas = EMBLEMAS;
  protected readonly accesorios = ACCESORIOS;
  protected readonly anteojos = ANTEOJOS;
  protected readonly objetos = OBJETOS;
  protected readonly coloresPeloNaturales = COLORES_PELO_NATURALES;
  protected readonly coloresMarca = COLORES_MARCA;
  protected readonly coloresRopa = COLORES_ROPA;

  /** El sprite oculta el emblema en estos casos; sin el aviso, parecería que no anda. */
  protected readonly avisoEmblema = computed(() => {
    const a = this.srv.avatar();
    if (a.emblema === 'ninguno' || emblemaVisible(a)) return null;
    return a.prenda === 'camisa'
      ? 'LA CORBATA DE LA CAMISA TAPA EL EMBLEMA'
      : 'LA LAPTOP TAPA EL EMBLEMA';
  });

  protected readonly avisoAnteojos = computed(() => {
    const a = this.srv.avatar();
    return a.anteojos !== 'ninguno' && !anteojosVisibles(a);
  });

  protected elegido(campo: keyof AvatarConfig, id: string): boolean {
    return this.srv.avatar()[campo] === id;
  }

  /** Los ids llegan de los catálogos que el propio template recorre para ese campo. */
  protected elegir<K extends keyof AvatarConfig>(campo: K, id: AvatarConfig[K]): void {
    this.srv.set(campo, id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --watch=false --include src/app/features/alumno/avatar-editor.spec.ts`
Expected: PASS (6 tests).

Run: `npx ng test --watch=false`
Expected: PASS — toda la suite (9 archivos).

Run: `npx ng build`
Expected: build OK.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alumno/avatar-editor.ts frontend/src/app/features/alumno/avatar-editor.spec.ts
git commit -m "feat(avatar): editor en pestañas con género y catálogo dev

CUERPO, ROPA, ACCESORIOS y EQUIPO, con la vitrina fija a la izquierda. Los
avisos explican por qué el sprite no muestra el emblema (camisa o laptop) o
los anteojos (visor), en vez de que parezca que la opción no anda.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Verificación visual, documentación y deuda técnica

**Files:**
- Modify: `path/05-design-system.md` (§"El avatar del alumno", líneas ~139-160)
- Modify: `path/deuda-tecnica/tarea-deuda-05-design-system.md` (ítem nuevo al final)
- Modify: `path/deuda-tecnica/README.md` (índice)
- Posibles ajustes de pixel-art en `frontend/src/app/shared/ui/avatar-sprite.html`

**Interfaces:**
- Consumes: todo lo anterior, ya integrado.
- Produces: nada de código.

- [ ] **Step 1: Verificación visual en el navegador**

1. Levantar el dev server: herramienta `preview_start` con `name: "frontend"` (config de `.claude/launch.json`, puerto 4200).
2. Ir a `/login` y entrar como alumno. Navegar a `/alumno/avatar`.
3. Revisar y sacar una captura (`computer` → `screenshot`) de cada punto:
   - Las tres siluetas (MUJER, VARÓN, INDEFINIDO) con el mismo peinado: se distinguen por contorno y rasgos, y las manos quedan en el mismo lugar.
   - Cada prenda (traje, hoodie, remera, camisa, campera) en un color claro y uno oscuro. Los zapatos siempre se ven.
   - Cada emblema sobre hoodie; `</>`, `λ` y `>_` tienen que ser reconocibles en la vitrina (190 px).
   - Cada peinado bajo gorra, gorra hacia atrás y beanie: nada atraviesa el casco.
   - Cada anteojo; con visor, el aviso aparece y los anteojos no se dibujan.
   - Cada objeto en mano; con laptop, el aviso del emblema aparece.
   - Barba, bigote y candado con cada silueta.
4. Fuera del editor:
   - HUD (busto recortado) en `/alumno`: la cabeza y el torso se ven bien encuadrados con accesorios altos (cresta, rodete, corona).
   - Entrar a una unidad y mirar al avatar caminar hacia la izquierda con emblema `λ`: el glifo tiene que leerse igual que hacia la derecha.
   - Ranking: los avatares mock de la cohorte se ven variados y ninguno está roto.
5. Revisar la consola (`read_console_messages`, `onlyErrors: true`): sin errores.

Si algún dibujo no se lee, ajustar **solo coordenadas** de los rects en `avatar-sprite.html`, sin cambiar las capas ni los ids. Después correr `npx ng test --watch=false` (tiene que seguir en verde) y commitear aparte:

```bash
git add frontend/src/app/shared/ui/avatar-sprite.html
git commit -m "fix(avatar): ajustes de pixel-art tras la revisión visual

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Actualizar `path/05-design-system.md`**

Reemplazar la línea

```markdown
El mismo componente se usa en tres lugares — HUD (busto recortado), isla actual del mapa
2.5D y ficha del tablero de unidad — variando solo `alto`.
```

por

```markdown
El mismo componente se usa en cuatro lugares — HUD (busto recortado), isla actual del mapa
2.5D, ficha del tablero de unidad y ranking — variando solo `alto`. El template
(`avatar-sprite.html`) pinta una capa por `<g data-capa>`, de atrás hacia adelante.
```

Reemplazar desde la tabla `| Parte | Opciones |` hasta el párrafo que termina en `...un traje "noche" dejaba al personaje sin pies).` (inclusive) por:

```markdown
| Parte | Opciones |
|---|---|
| Género | mujer · varón · indefinido — cambia la silueta (contorno, cuello, rasgos) y el peinado sugerido de RESET; **no filtra el catálogo** |
| Piel | 6 tonos — 4 naturales + 2 estilizados de la paleta |
| Pelo | corto · largo · cresta · rapado · afro · rodete · coleta · despeinado, en 5 colores naturales + 6 de marca |
| Barba | ninguna · barba · bigote · candado, del color del pelo |
| Prenda | traje · hoodie · remera · camisa y corbata · campera abierta, en 6 colores de marca + verde terminal, grafito y negro |
| Emblema | ninguno · ■ · `</>` · `{}` · `>_` · `λ` · `;` · `#` |
| Accesorio | ninguno · visor · gorra · gorra hacia atrás · beanie · corona · auriculares · headset, en los colores de ropa |
| Anteojos | ninguno · marco grueso · redondos · de sol · con código (colores fijos) |
| Objeto en mano | ninguno · laptop · café · mate · teclado (colores fijos) |

Reglas que el componente resuelve solo, porque si no el sprite se rompe con ciertas
combinaciones:

- **Contraste.** El emblema va en rosa, salvo sobre fondo rosa (entonces hueso); con la
  campera abierta el fondo es la remera de abajo. Los **zapatos** van siempre en hueso —
  son el punto de apoyo del sprite contra el suelo oscuro — salvo con traje hueso. Con
  cualquier prenda que no sea el traje (un mono) va pantalón noche, o grafito si la ropa ya
  es oscura.
- **Qué tapa a qué.** Gorra, gorra hacia atrás y beanie pintan todo el casco para que
  ningún peinado los atraviese. Con visor no se dibujan los anteojos; con camisa (la
  corbata) o laptop (va delante del pecho) no se dibuja el emblema. El editor avisa en los
  dos casos.
- **Espejado.** Mirando a la izquierda el `<svg>` se espeja entero; el emblema se vuelve a
  espejar para que `λ` o `>_` no se lean al revés.
- **Manos fijas.** Las tres siluetas tienen las manos en el mismo lugar, así el objeto en
  mano calza siempre.
```

Y al final del párrafo que empieza con `Lo que se persiste son **ids del catálogo**`, agregar:

```markdown
Un avatar guardado antes de que existiera un campo se completa con el look clásico (traje +
cuadro, silueta indefinido) en `sanearAvatar`, así que nadie pierde su personaje al ampliar
el catálogo.
```

- [ ] **Step 3: Registrar la deuda de i18n**

Agregar al final de `path/deuda-tecnica/tarea-deuda-05-design-system.md` (usar el próximo número libre: hoy es el 5; si otro plan ya agregó un ítem 5, usar el siguiente):

```markdown

---

## 🔴 5. Los textos del editor de avatar (y del resto del front) no pasan por i18n

**Qué falta:** que los textos visibles del frontend se resuelvan por i18n, como pide la
regla "Sin strings hardcodeados (RF-NFR-07)" de `path/05-design-system.md`. Hoy están
escritos directo en los templates, y el rediseño del avatar (género + catálogo dev) sumó
más: rótulos de pestañas y secciones, avisos del editor y el `nombre` de cada opción del
catálogo.

**Dónde vive:** `frontend/src/app/features/alumno/avatar-editor.ts` (template) y
`frontend/src/app/core/avatar/avatar.models.ts` (campo `nombre` de cada opción). El mismo
patrón se repite en todas las features del frontend; no hay ninguna librería de i18n
instalada (`frontend/package.json`).

**Por qué no bloquea la tarea actual:** el MVP es solo en español y el editor funciona y es
accesible igual. Montar i18n es una decisión transversal a todo el front, no del avatar.

**Cómo se paga:** sin trigger claro todavía — cuando se monte i18n en el frontend. Los
`nombre` del catálogo pasan a ser claves de traducción indexadas por `id`, que ya son
estables.
```

- [ ] **Step 4: Actualizar el índice de deuda técnica**

En `path/deuda-tecnica/README.md`:
- Fila de `tarea-deuda-05-design-system.md`: `| 4 | 0 |` → `| 4 | 1 |`. (Corrección: el ítem #1 de ese archivo ya estaba pagado pero el índice lo seguía contando como abierto; con el ítem nuevo quedan 4 abiertos y 1 pagado.)
- Línea del total: `**Total: 19 ítems abiertos, 2 pagados.**` → `**Total: 19 ítems abiertos, 3 pagados.**`
- Al principio del texto de "Última revisión", agregar: `al rediseñar el avatar (género + catálogo dev): abrió el ítem #5 de 05-design-system.md (textos sin i18n) y corrigió el conteo del ítem #1, que ya estaba pagado. Antes:` — y dejar el resto del párrafo como está.

- [ ] **Step 5: Verificación final**

Run (desde `frontend/`): `npx ng test --watch=false`
Expected: PASS — 9 archivos, toda la suite en verde.

Run: `npx ng build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add path/05-design-system.md path/deuda-tecnica/tarea-deuda-05-design-system.md path/deuda-tecnica/README.md
git commit -m "docs(avatar): catálogo, reglas de convivencia y deuda de i18n

Actualiza la sección del avatar en 05-design-system con las partes nuevas y
las reglas que resuelve el sprite. Registra que los textos del editor no pasan
por i18n (RF-NFR-07) y corrige el índice de deuda, que contaba como abierto
un ítem ya pagado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```
