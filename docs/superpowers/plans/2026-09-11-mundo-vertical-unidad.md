# Mapa panorámico por unidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el tablero interno de las unidades 1-3 (`/alumno/unidad/:id`) por el mapa panorámico vertical del prototipo `feature/integrar-prototipo-mapas` (desierto / selva / castillo), integrado con el progreso real, y permitir entrar a ver el mapa de cualquier unidad desde el mapa general.

**Architecture:** El motor del prototipo (JS vanilla) se porta a funciones puras de TypeScript (ruta procedural, arte SVG por tema, escenario) con tests unitarios. Un componente de presentación nuevo, `MundoVertical`, dibuja esas piezas. El render actual del tablero plano se extrae sin cambios a `TableroPlano`. `UnidadMapa` queda como contenedor de datos: resuelve unidad y progreso reales y elige qué render usar según `temaDeOrden(unidad.orden)`.

**Tech Stack:** Angular 22 (standalone, signals, `input()`/`output()`), Tailwind 4 + daisyUI 5, Vitest vía `@angular/build:unit-test` (globals `describe/it/expect`, sin import).

**Spec:** [`docs/superpowers/specs/2026-09-11-mundo-vertical-unidad-design.md`](../specs/2026-09-11-mundo-vertical-unidad-design.md)

## Global Constraints

- Rama de trabajo: `pruebas-iker`. No pushear sin confirmación explícita del usuario.
- Todos los comandos `npx ng ...` se corren desde `frontend/`.
- Del prototipo se porta **solo** el mapa de la unidad. No se traen bancos de preguntas, diálogos de actividad, pantalla de cantidad, header/HUD, sonido ni imágenes ilustradas de referencia.
- No se inventa el nodo sintético "recuperar vida" del prototipo: `Actividad` no lo modela.
- Tema por `orden`: 1→`desert`, 2→`jungle`, 3→`castle`. La unidad 4 en adelante sigue con el tablero plano.
- `tipo: 'hito'` → nodo bonus en ramal lateral. Los demás tipos van al camino principal, en el orden de `Unidad.actividades`. El último nodo del camino principal usa el arte "final" (en el seed es el `boss`).
- El estado de cada nodo sale del `EstadoNodo` real. `fallado` se dibuja como disponible y lleva `✕` en el cartel.
- **Nunca** interpolar texto del usuario (nombres de actividad, descripciones) dentro de strings HTML/SVG que se inyectan con `[innerHTML]`. Esos textos van solo en bindings de Angular (`title`, `aria-label`, `{{ }}`).
- No usar el atributo `data-theme`: la app lo usa para daisyUI (`arcade-dark`/`arcade-light`). El mundo se identifica con `data-mundo`.
- Fuentes: `var(--pixel)` del prototipo → `var(--font-pixel)`, y `var(--body)` → `var(--font-body)`.
- Mensajes de commit en español, Conventional Commits, cerrando con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Texturas: solo `mapa_desierto_tile_vertical.png`, `mapa_selva_tile.png` y `mapa_castillo_tile.png`, copiadas a `frontend/public/mundos/`.

## File Structure

```
frontend/public/mundos/                                   (nuevo) 3 texturas tileables
frontend/src/app/features/alumno/
  casillero.ts                                            (nuevo) tipo Casillero + etiquetaCasillero()
  tablero-plano.ts                                        (nuevo) render SVG-grid extraído de unidad-mapa.ts, sin cambios
  unidad-mapa.ts                                          (modificado) solo datos + HUD + ficha; elige render
  mapa.ts                                                 (modificado) botón "👁 VER MAPA" en unidades bloqueadas
  mundo-vertical/
    mundo-ruta.ts          + mundo-ruta.spec.ts           (nuevo) generador de ruta, puro
    mundo-appearance.ts    + mundo-appearance.spec.ts     (nuevo) temas, texturas, carriles, arte de meta, estadoArte
    mundo-arte-nodo.ts     + mundo-arte-nodo.spec.ts      (nuevo) arte SVG de nodo por tema/estado
    mundo-escenario.ts     + mundo-escenario.spec.ts      (nuevo) SVG de ruta, decorado, posiciones de meta/inicio/sectores
    mundo-vertical.ts                                     (nuevo) componente de presentación
path/deuda-tecnica/tarea-deuda-05-design-system.md        (modificado) ítem #2 actualizado + ítem #5 nuevo
path/deuda-tecnica/README.md                              (modificado) índice
path/README.md                                            (modificado) §6 dudas 11 y 12
```

Respecto del spec §4, el port de `world-appearance.js` se reparte en tres archivos (`mundo-appearance.ts`, `mundo-arte-nodo.ts` y `mundo-escenario.ts`) para que cada uno tenga una sola responsabilidad y un spec propio.

---

### Task 1: Generador de ruta (`mundo-ruta.ts`)

Port de `makeVerticalUnit` (`vertical-world.js`) y de `measureRoute`/`pointOnRoute` (`journey.js`). Recibe la cantidad de nodos del camino principal en lugar del `count` libre del prototipo.

**Files:**
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.ts`
- Test: `frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type PuntoPct = readonly [number, number]`: `[x 0-100 sobre worldWidth, y 0-100 sobre worldHeight]`
  - `const WORLD_WIDTH = 1600`, `const CHALLENGE_STEP = 180`, `const PUNTOS_POR_TRAMO = 33`
  - `interface Ruta { worldWidth: number; worldHeight: number; stops: PuntoPct[]; roads: PuntoPct[][] }`. `stops[0]` es el START; el nodo j (0-based) vive en `stops[j + 1]`; `roads[i]` va de `stops[i-1]` a `stops[i]`; `roads[0]` es `[]`.
  - `interface Ramal { desde: PuntoPct; hasta: PuntoPct }`
  - `interface RutaMedida { points: PuntoPct[]; lengths: number[]; distance: number }`
  - `variacion(id: number, salt?: number): number`
  - `espaciado(id: number): number`
  - `generarRuta(cantidad: number, carriles: readonly number[]): Ruta` (lanza `RangeError` si `cantidad` no es entero ≥ 1)
  - `ramalBonus(ruta: Ruta, k: number): Ramal`
  - `recorrido(ruta: Ruta, desde: number, hasta: number): PuntoPct[]` (índices 0-based del camino principal)
  - `medirRuta(points: PuntoPct[], width: number, height: number): RutaMedida`
  - `puntoEnRuta(ruta: RutaMedida, fraccion: number): PuntoPct`

- [ ] **Step 1: Write the failing test**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.spec.ts`:

```ts
import {
  CHALLENGE_STEP,
  espaciado,
  generarRuta,
  medirRuta,
  PUNTOS_POR_TRAMO,
  puntoEnRuta,
  ramalBonus,
  recorrido,
  WORLD_WIDTH,
} from './mundo-ruta';

// Carriles del desierto (world-appearance.js del prototipo).
const CARRILES = [24, 64, 81, 73, 42, 18, 30, 62, 82, 68, 36, 21];

describe('generarRuta', () => {
  it('es determinista: la misma cantidad da siempre el mismo recorrido', () => {
    expect(generarRuta(6, CARRILES)).toEqual(generarRuta(6, CARRILES));
  });

  it('tiene un START más un stop por nodo, y un tramo de curva por nodo', () => {
    const r = generarRuta(6, CARRILES);
    expect(r.stops).toHaveLength(7);
    expect(r.roads).toHaveLength(7);
    expect(r.roads[0]).toEqual([]);
    r.roads.slice(1).forEach((tramo) => expect(tramo).toHaveLength(PUNTOS_POR_TRAMO));
  });

  it('cada tramo arranca y termina exactamente en sus dos stops', () => {
    const r = generarRuta(6, CARRILES);
    for (let i = 1; i < r.roads.length; i++) {
      expect(r.roads[i][0]).toEqual(r.stops[i - 1]);
      expect(r.roads[i][PUNTOS_POR_TRAMO - 1]).toEqual(r.stops[i]);
    }
  });

  it('sube: cada nodo queda más arriba que el anterior', () => {
    const r = generarRuta(6, CARRILES);
    for (let i = 1; i < r.stops.length; i++) {
      expect(r.stops[i][1]).toBeLessThan(r.stops[i - 1][1]);
    }
  });

  it('START y meta van centrados; el resto dentro de los márgenes laterales', () => {
    const r = generarRuta(6, CARRILES);
    expect(r.stops[0][0]).toBe(50);
    expect(r.stops[6][0]).toBe(50);
    r.stops.forEach(([x]) => {
      expect(x).toBeGreaterThanOrEqual(12);
      expect(x).toBeLessThanOrEqual(88);
    });
  });

  it('la altura del mundo es la suma de espaciados más 600 de aire', () => {
    const r = generarRuta(6, CARRILES);
    const suma = [1, 2, 3, 4, 5, 6].reduce((s, id) => s + espaciado(id), 0);
    expect(r.worldHeight).toBe(suma + 600);
    expect(r.worldWidth).toBe(WORLD_WIDTH);
  });

  it('funciona con un solo nodo', () => {
    const r = generarRuta(1, CARRILES);
    expect(r.stops).toHaveLength(2);
    expect(r.stops[1][0]).toBe(50);
  });

  it('rechaza cantidades no positivas o no enteras', () => {
    expect(() => generarRuta(0, CARRILES)).toThrow(RangeError);
    expect(() => generarRuta(2.5, CARRILES)).toThrow(RangeError);
  });
});

describe('espaciado', () => {
  it('nunca baja del paso base ni pasa de base + 90', () => {
    for (let id = 1; id <= 50; id++) {
      expect(espaciado(id)).toBeGreaterThanOrEqual(CHALLENGE_STEP);
      expect(espaciado(id)).toBeLessThanOrEqual(CHALLENGE_STEP + 90);
    }
  });
});

describe('ramalBonus', () => {
  it('sale de un punto de la curva y termina contra un borde lateral a la misma altura', () => {
    const r = generarRuta(6, CARRILES);
    const ramal = ramalBonus(r, 0);
    // ⌈6 × 0.6⌉ = 4 → sale del tramo que llega al nodo 4
    expect(r.roads[4]).toContainEqual(ramal.desde);
    expect([8, 92]).toContain(ramal.hasta[0]);
    expect(ramal.hasta[1]).toBe(ramal.desde[1]);
  });

  it('cada bonus extra sale de un tramo más arriba, sin pasarse del último', () => {
    const r = generarRuta(6, CARRILES);
    expect(r.roads[5]).toContainEqual(ramalBonus(r, 1).desde);
    expect(r.roads[6]).toContainEqual(ramalBonus(r, 9).desde);
  });
});

describe('recorrido', () => {
  it('va de un nodo al siguiente siguiendo la curva dibujada', () => {
    const r = generarRuta(6, CARRILES);
    const pts = recorrido(r, 0, 2);
    expect(pts[0]).toEqual(r.stops[1]);
    expect(pts[pts.length - 1]).toEqual(r.stops[3]);
    expect(pts).toHaveLength(1 + 2 * (PUNTOS_POR_TRAMO - 1));
  });

  it('hacia atrás es el mismo camino invertido', () => {
    const r = generarRuta(6, CARRILES);
    expect(recorrido(r, 2, 0)).toEqual([...recorrido(r, 0, 2)].reverse());
  });

  it('quedarse en el lugar es un único punto', () => {
    const r = generarRuta(6, CARRILES);
    expect(recorrido(r, 3, 3)).toEqual([r.stops[4]]);
  });
});

describe('medirRuta / puntoEnRuta', () => {
  const recta = medirRuta(
    [
      [0, 0],
      [100, 0],
    ],
    1600,
    1000,
  );

  it('mide en unidades lógicas del mundo, no en porcentaje', () => {
    expect(recta.distance).toBe(1600);
  });

  it('interpola por distancia recorrida y acota la fracción a [0, 1]', () => {
    expect(puntoEnRuta(recta, 0)).toEqual([0, 0]);
    expect(puntoEnRuta(recta, 0.25)).toEqual([25, 0]);
    expect(puntoEnRuta(recta, 1)).toEqual([100, 0]);
    expect(puntoEnRuta(recta, 7)).toEqual([100, 0]);
    expect(puntoEnRuta(recta, -1)).toEqual([0, 0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-ruta.spec.ts`
Expected: FAIL. El build no resuelve `./mundo-ruta` ("Could not resolve" / "Failed to load").

- [ ] **Step 3: Write minimal implementation**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.ts`:

```ts
/**
 * Generador de ruta del mapa panorámico de unidad: port de `makeVerticalUnit`
 * (`vertical-world.js`) y de `measureRoute`/`pointOnRoute` (`journey.js`) del prototipo
 * `feature/integrar-prototipo-mapas`.
 *
 * Todo va en porcentaje del mundo: `x` sobre `WORLD_WIDTH` e `y` sobre `worldHeight`. El
 * mundo crece hacia arriba, con el START abajo y la meta arriba.
 *
 * Es determinista a propósito: la misma cantidad de nodos da siempre el mismo recorrido,
 * así que recargar la página no reordena el mapa.
 */

/** Punto en % del mundo: [x 0-100, y 0-100]. */
export type PuntoPct = readonly [number, number];

export const WORLD_WIDTH = 1600;
export const CHALLENGE_STEP = 180;
/** El prototipo muestrea cada curva bezier en 33 puntos. */
export const PUNTOS_POR_TRAMO = 33;

export interface Ruta {
  worldWidth: number;
  worldHeight: number;
  /** stops[0] es el START; el nodo j (0-based) del camino principal vive en stops[j + 1]. */
  stops: PuntoPct[];
  /** roads[i] es la curva de stops[i - 1] a stops[i]; roads[0] está vacío. */
  roads: PuntoPct[][];
}

export interface Ramal {
  desde: PuntoPct;
  hasta: PuntoPct;
}

export interface RutaMedida {
  points: PuntoPct[];
  lengths: number[];
  distance: number;
}

/** Hash entero estable: el `variation` del prototipo. */
export function variacion(id: number, salt = 0): number {
  let n = Math.imul(id + salt, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** Distancia vertical, en unidades lógicas, entre el nodo `id - 1` y el `id`. */
export function espaciado(id: number): number {
  return CHALLENGE_STEP + [0, 45, 15, 70, 30, 90][variacion(id, 7) % 6];
}

const acotarX = (x: number): number => Math.max(12, Math.min(88, x));

export function generarRuta(cantidad: number, carriles: readonly number[]): Ruta {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new RangeError(`La ruta necesita al menos un nodo (recibió ${cantidad}).`);
  }
  const ascenso = [0];
  for (let id = 1; id <= cantidad; id++) ascenso.push(ascenso[id - 1] + espaciado(id));
  const worldHeight = ascenso[cantidad] + 600;
  const sueloY = (id: number): number => ((worldHeight - 150 - ascenso[id]) / worldHeight) * 100;

  // Cada tanda de carriles invierte el lado (zona impar = espejo), así el recorrido cruza
  // el mapa de un borde al otro en lugar de apilarse sobre un solo costado.
  const stops: PuntoPct[] = [[50, sueloY(0)]];
  for (let id = 1; id <= cantidad; id++) {
    const zona = Math.floor((id - 1) / carriles.length);
    const carril = carriles[(id - 1) % carriles.length];
    const x = acotarX((zona % 2 ? 100 - carril : carril) + (variacion(id, 13) % 7) - 3);
    stops.push([id === cantidad ? 50 : x, sueloY(id)]);
  }

  // Tangentes compartidas: dos tramos vecinos se encuentran sin quiebre en cada nodo.
  const pendiente = (id: number): number =>
    id === 0 || id === cantidad
      ? 0
      : (stops[id + 1][0] - stops[id - 1][0]) / (stops[id + 1][1] - stops[id - 1][1]);

  const roads: PuntoPct[][] = [[]];
  for (let i = 0; i < cantidad; i++) {
    const desde = stops[i];
    const hasta = stops[i + 1];
    const dy = hasta[1] - desde[1];
    const curva = variacion(i + 1, 29) % 4;
    const y1 = [0.48, 0.28, 0.4, 0.3][curva];
    const y2 = [0.7, 0.75, 0.6, 0.8][curva];
    const cx1 = acotarX(desde[0] + pendiente(i) * dy * y1);
    const cx2 = acotarX(hasta[0] - pendiente(i + 1) * dy * (1 - y2));
    const cy1 = desde[1] + dy * y1;
    const cy2 = desde[1] + dy * y2;
    roads.push(
      Array.from({ length: PUNTOS_POR_TRAMO }, (_, paso): PuntoPct => {
        const t = paso / (PUNTOS_POR_TRAMO - 1);
        const u = 1 - t;
        return [
          u * u * u * desde[0] + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * hasta[0],
          u * u * u * desde[1] + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * hasta[1],
        ];
      }),
    );
  }
  return { worldWidth: WORLD_WIDTH, worldHeight, stops, roads };
}

/**
 * Ramal lateral del k-ésimo nodo bonus (`hito`), el "support road" del prototipo. Sale del
 * tramo que llega al nodo ⌈60 %⌉ del recorrido (uno más arriba por cada bonus extra, sin
 * pasarse del último) y va hacia el borde del mismo lado en que corre la ruta en ese punto.
 */
export function ramalBonus(ruta: Ruta, k: number): Ramal {
  const cantidad = ruta.stops.length - 1;
  const id = Math.min(cantidad, Math.max(1, Math.ceil(cantidad * 0.6)) + k);
  const desde = ruta.roads[id][17];
  return { desde, hasta: [desde[0] > 50 ? 92 : 8, desde[1]] };
}

/**
 * Puntos que recorre el avatar para ir del nodo `desde` al nodo `hasta` del camino
 * principal (índices 0-based). Sigue las curvas dibujadas tramo por tramo y sirve en
 * cualquiera de los dos sentidos.
 */
export function recorrido(ruta: Ruta, desde: number, hasta: number): PuntoPct[] {
  const puntos: PuntoPct[] = [ruta.stops[desde + 1]];
  const paso = hasta > desde ? 1 : -1;
  for (let j = desde; j !== hasta; j += paso) {
    // El tramo entre los nodos j y j + paso es roads[max(j, j + paso) + 1].
    const tramo = ruta.roads[Math.max(j, j + paso) + 1];
    const orientado = paso > 0 ? tramo : [...tramo].reverse();
    puntos.push(...orientado.slice(1));
  }
  return puntos;
}

/** Longitudes medidas en unidades lógicas: un % de x no mide lo mismo que un % de y. */
export function medirRuta(points: PuntoPct[], width: number, height: number): RutaMedida {
  const lengths = points
    .slice(1)
    .map((p, i) =>
      Math.hypot(((p[0] - points[i][0]) * width) / 100, ((p[1] - points[i][1]) * height) / 100),
    );
  return { points, lengths, distance: lengths.reduce((s, n) => s + n, 0) };
}

export function puntoEnRuta(ruta: RutaMedida, fraccion: number): PuntoPct {
  let resto = Math.max(0, Math.min(1, fraccion)) * ruta.distance;
  for (let i = 0; i < ruta.lengths.length; i++) {
    if (resto <= ruta.lengths[i]) {
      const t = ruta.lengths[i] ? resto / ruta.lengths[i] : 0;
      const a = ruta.points[i];
      const b = ruta.points[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    resto -= ruta.lengths[i];
  }
  return ruta.points[ruta.points.length - 1];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-ruta.spec.ts`
Expected: PASS. `Test Files 1 passed (1)` y `Tests 16 passed (16)`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.ts frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.spec.ts
git commit -m "feat: generador de ruta del mapa panorámico de unidad

Port de makeVerticalUnit / measureRoute / pointOnRoute del prototipo
feature/integrar-prototipo-mapas a funciones puras con tests: la ruta
es determinista y se adapta a la cantidad real de nodos de la unidad.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Temas y apariencia (`mundo-appearance.ts`)

Port de `WORLD_APPEARANCE` (`world-appearance.js`) más el arte de meta (`castleArt` de `vertical-world.js`, `templeArt`/`fortressArt` de `world-appearance.js`). También define cómo se traduce el `EstadoNodo` real a los estados de arte del prototipo.

**Files:**
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.ts`
- Test: `frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.spec.ts`

**Interfaces:**
- Consumes: `EstadoNodo` de `frontend/src/app/core/data/roadmap.models.ts`.
- Produces:
  - `type Tema = 'desert' | 'jungle' | 'castle'`
  - `type EstadoArte = 'locked' | 'available' | 'completed'`
  - `interface Apariencia { tile: string; suelo: string; meta: string; carriles: readonly number[] }`
  - `const APARIENCIA: Record<Tema, Apariencia>` (`tile` es una URL absoluta `/mundos/...`)
  - `temaDeOrden(orden: number): Tema | null`
  - `estadoArte(e: EstadoNodo): EstadoArte`
  - `arteMeta(tema: Tema): string` (un `<svg>` completo)

- [ ] **Step 1: Write the failing test**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.spec.ts`:

```ts
import { APARIENCIA, arteMeta, estadoArte, temaDeOrden } from './mundo-appearance';

describe('temaDeOrden', () => {
  it('asigna los tres mundos del prototipo por orden de unidad', () => {
    expect(temaDeOrden(1)).toBe('desert');
    expect(temaDeOrden(2)).toBe('jungle');
    expect(temaDeOrden(3)).toBe('castle');
  });

  it('una unidad sin mundo en el prototipo vuelve al tablero plano (null)', () => {
    expect(temaDeOrden(4)).toBeNull();
    expect(temaDeOrden(0)).toBeNull();
  });
});

describe('estadoArte', () => {
  it('traduce el EstadoNodo real; fallado se dibuja como disponible (se puede reintentar)', () => {
    expect(estadoArte('bloqueado')).toBe('locked');
    expect(estadoArte('habilitado')).toBe('available');
    expect(estadoArte('fallado')).toBe('available');
    expect(estadoArte('completado')).toBe('completed');
  });
});

describe('APARIENCIA', () => {
  it('cada mundo usa su textura de public/mundos y un trazado de 12 carriles', () => {
    for (const a of Object.values(APARIENCIA)) {
      expect(a.tile).toMatch(/^\/mundos\/mapa_.+\.png$/);
      expect(a.carriles).toHaveLength(12);
    }
  });
});

describe('arteMeta', () => {
  it('cada mundo tiene su propia meta, como SVG completo', () => {
    const metas = (['desert', 'jungle', 'castle'] as const).map(arteMeta);
    metas.forEach((m) => expect(m).toMatch(/^<svg viewBox="0 0 240 200"/));
    expect(new Set(metas).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-appearance.spec.ts`
Expected: FAIL. No resuelve `./mundo-appearance`.

- [ ] **Step 3: Write minimal implementation**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.ts`:

```ts
import { EstadoNodo } from '../../../core/data/roadmap.models';

/** Los tres mundos del prototipo `feature/integrar-prototipo-mapas`. */
export type Tema = 'desert' | 'jungle' | 'castle';

/** Estados del arte del prototipo. El `EstadoNodo` real se traduce con `estadoArte`. */
export type EstadoArte = 'locked' | 'available' | 'completed';

export interface Apariencia {
  /** Textura tileable del fondo, servida desde `frontend/public/mundos/`. */
  tile: string;
  /** Color de suelo detrás de la textura: es lo que se ve mientras la imagen carga. */
  suelo: string;
  /** Qué hay al final del recorrido; rotula el botón "ver meta" y la barra del mapa. */
  meta: string;
  /** Carriles horizontales (en %) que va visitando la ruta: cada mundo tiene su trazado. */
  carriles: readonly number[];
}

export const APARIENCIA: Record<Tema, Apariencia> = {
  desert: {
    tile: '/mundos/mapa_desierto_tile_vertical.png',
    suelo: '#f6c25d',
    meta: 'castillo',
    carriles: [24, 64, 81, 73, 42, 18, 30, 62, 82, 68, 36, 21],
  },
  jungle: {
    tile: '/mundos/mapa_selva_tile.png',
    suelo: '#638c3e',
    meta: 'templo',
    carriles: [70, 84, 62, 24, 18, 32, 68, 81, 55, 28, 16, 42],
  },
  castle: {
    tile: '/mundos/mapa_castillo_tile.png',
    suelo: '#343f5c',
    meta: 'fortaleza',
    carriles: [28, 18, 44, 78, 82, 65, 40, 16, 25, 60, 83, 67],
  },
};

const TEMA_POR_ORDEN: Partial<Record<number, Tema>> = { 1: 'desert', 2: 'jungle', 3: 'castle' };

/**
 * Mundo de cada unidad según su `orden`, no según el nombre: el temario real no coincide
 * 1:1 con el del prototipo. La unidad 4 en adelante no tiene mundo (el prototipo define
 * tres) y sigue con el tablero plano.
 */
export function temaDeOrden(orden: number): Tema | null {
  return TEMA_POR_ORDEN[orden] ?? null;
}

/**
 * `fallado` se dibuja como disponible: el nodo se puede reintentar (RF-DES-07) y el
 * prototipo no tiene arte de "fallado". El ✕ lo pone el cartel del nodo.
 */
export function estadoArte(e: EstadoNodo): EstadoArte {
  return e === 'completado' ? 'completed' : e === 'bloqueado' ? 'locked' : 'available';
}

// Arte de meta, copiado literal del prototipo (castleArt de vertical-world.js;
// templeArt y fortressArt de world-appearance.js).
const svgMeta = (contenido: string): string =>
  `<svg viewBox="0 0 240 200" aria-hidden="true" shape-rendering="crispEdges">${contenido}</svg>`;

const CASTILLO = svgMeta(`
  <ellipse cx="120" cy="180" rx="110" ry="13" fill="#775028" opacity=".24"/>
  <path d="M12 170h216v12H12zM24 158h192v14H24z" fill="#b8884d" stroke="#6d462a" stroke-width="3"/>
  <path d="M28 68h44v94H28zM168 68h44v94h-44zM70 93h100v69H70zM94 42h52v62H94z" fill="#dcb679" stroke="#63452d" stroke-width="4"/>
  <path d="M30 72h10v86H30zM96 47h10v54H96zM170 72h10v86h-10zM74 100h8v58h-8z" fill="#ffe2a5"/>
  <path d="M60 72h10v86H60zM136 47h8v51h-8zM200 72h10v86h-10zM158 100h10v58h-10z" fill="#ae7a49"/>
  <path d="m24 68 26-35 26 35zm65-25 31-42 31 42zm75 25 26-35 26 35z" fill="#d95c45" stroke="#773b2d" stroke-width="4"/>
  <path d="m33 58 17-22 5 9-12 13zm68-25 19-27 5 9-13 18zm72 25 17-22 5 9-12 13z" fill="#ff9260"/>
  <path d="M74 86h13v10h13V86h13v10h14V86h13v10h13V86h13v22H74z" fill="#f3d096" stroke="#755434" stroke-width="3"/>
  <path d="M102 165v-31l8-12h20l8 12v31z" fill="#563524" stroke="#9e7040" stroke-width="5"/>
  <path d="M110 164v-28l6-8h9l6 8v28z" fill="#2e2529"/>
  <path d="M43 88h12v22H43zM183 88h12v22h-12zM114 57h12v22h-12z" fill="#5f4430" stroke="#b78b55" stroke-width="3"/>
  <path d="M32 119h34m-34 16h34m-34 16h34m106-32h36m-36 16h36m-36 16h36M80 117h20m40 0h21" stroke="#b28550" stroke-width="3"/>
  <path d="M96 166h48v7H96zM89 174h62v8H89zM80 183h80v8H80z" fill="#ffe1a1" stroke="#a57948" stroke-width="3"/>
  <path d="M50 34V8m140 26V8" stroke="#68432e" stroke-width="3"/>
  <path d="M52 8h24l-6 7 6 7H52zM192 8h24l-6 7 6 7h-24z" fill="#e25c45" stroke="#8f442b" stroke-width="2"/>`);

const TEMPLO = svgMeta(
  `<ellipse cx="120" cy="184" rx="111" ry="12" fill="#153629" opacity=".4"/><path d="M12 162h216v23H12zM30 139h180v23H30zM49 115h142v24H49zM65 89h110v26H65zM77 43h86v47H77z" fill="#938958" stroke="#384d32" stroke-width="4"/><path d="M15 164h210M33 142h174M53 118h134M69 93h102M81 47h77" stroke="#d2c38b" stroke-width="6"/><path d="M100 183V91h40v92z" fill="#b2a577"/><path d="M99 112h42m-42 16h42m-42 16h42m-42 16h42m-42 16h42" stroke="#635e3b" stroke-width="4"/><path d="M104 88V62h32v26z" fill="#263729"/><path d="M73 44V29h93v15zM89 28V15h60v13z" fill="#78824b" stroke="#34472e" stroke-width="4"/><path d="M30 164v-21h14m18-28h15v-21m85-9v21h19m18 38h14v27" fill="none" stroke="#4f8e43" stroke-width="8"/><path d="M82 54h9v15h-9zm67 0h8v15h-8z" fill="#ddb65e"/>`,
);

const FORTALEZA = svgMeta(
  `<ellipse cx="120" cy="184" rx="111" ry="12" fill="#100f20" opacity=".6"/><path d="M14 164h212v23H14zM25 70h42v94H25zM173 70h42v94h-42zM65 104h110v60H65zM94 42h52v76H94z" fill="#4b506f" stroke="#1b213a" stroke-width="4"/><path d="m20 70 26-48 26 48zm69-28 31-42 31 42zm79 28 26-48 26 48z" fill="#773453" stroke="#211c38" stroke-width="4"/><path d="M32 77h7v83h-7zm70-31h7v63h-7zm79 31h7v83h-7z" fill="#8484a1"/><path d="M103 164v-31l17-19 17 19v31z" fill="#ae4265" stroke="#27233e" stroke-width="5"/><path d="M112 164v-27l8-11 8 11v27z" fill="#251a32"/><path d="M41 91h9v20h-9zm149 0h9v20h-9zm-74-34h8v23h-8z" fill="#ec7181"/><path d="M68 95h12v12h15V95h13v12h24V95h13v12h15V95h12v25H68z" fill="#6e6b88" stroke="#262b44" stroke-width="3"/><path d="M98 166h44v8H98zM89 175h62v9H89zM79 185h82v8H79z" fill="#a07e91" stroke="#3a334f" stroke-width="3"/><path d="M46 20V4m148 16V4" stroke="#9991a8" stroke-width="2"/>`,
);

const META: Record<Tema, string> = { desert: CASTILLO, jungle: TEMPLO, castle: FORTALEZA };

export function arteMeta(tema: Tema): string {
  return META[tema];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-appearance.spec.ts`
Expected: PASS. `Tests 5 passed (5)`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.ts frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.spec.ts
git commit -m "feat: temas, texturas y arte de meta de los mundos de unidad

Port de WORLD_APPEARANCE y del arte de meta del prototipo. El tema se
asigna por orden de unidad (1-3); la 4 no tiene mundo y sigue con el
tablero plano.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Arte de nodo (`mundo-arte-nodo.ts`)

Port de `node-art.js`: caja "?" en el desierto, barril en la selva y portal en el castillo, cada uno con variantes bloqueado, disponible, completado, final y bonus. El prototipo referencia íconos con `<use href="#icon-…">` contra símbolos de su `index.html` que en esta app no existen, así que acá se inlinean. Se omite el arte de "recuperar vida" porque no hay nodo de recuperación (ver Global Constraints).

**Files:**
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.ts`
- Test: `frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.spec.ts`

**Interfaces:**
- Consumes: `Tema` y `EstadoArte` de `./mundo-appearance` (Task 2).
- Produces:
  - `arteNodo(tema: Tema, estado: EstadoArte, opciones: { final: boolean; bonus: boolean }): string`: `<svg class="node-art" viewBox="0 0 72 84" …>`
  - `verboNodo(tema: Tema, estado: EstadoArte): string`

- [ ] **Step 1: Write the failing test**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.spec.ts`:

```ts
import { EstadoArte, Tema } from './mundo-appearance';
import { arteNodo, verboNodo } from './mundo-arte-nodo';

const TEMAS: Tema[] = ['desert', 'jungle', 'castle'];
const ESTADOS: EstadoArte[] = ['locked', 'available', 'completed'];
const COMUN = { final: false, bonus: false };

describe('arteNodo', () => {
  it('devuelve siempre un SVG de sprite de 72×84', () => {
    for (const t of TEMAS) {
      for (const e of ESTADOS) {
        expect(arteNodo(t, e, COMUN)).toMatch(/^<svg class="node-art" viewBox="0 0 72 84"/);
      }
    }
  });

  it('la cadena de sello aparece solo en los nodos bloqueados', () => {
    for (const t of TEMAS) {
      expect(arteNodo(t, 'locked', COMUN)).toContain('seal-chain');
      expect(arteNodo(t, 'available', COMUN)).not.toContain('seal-chain');
      expect(arteNodo(t, 'completed', COMUN)).not.toContain('seal-chain');
    }
  });

  it('cada mundo tiene su objeto: caja "?", barril con tapa, portal con runas', () => {
    expect(arteNodo('desert', 'available', COMUN)).toContain('M27 24h16v4');
    expect(arteNodo('jungle', 'available', COMUN)).toContain('object-lid');
    expect(arteNodo('castle', 'available', COMUN)).toContain('portal-runes');
  });

  it('el último nodo del camino usa el arte final de su mundo', () => {
    const final = { final: true, bonus: false };
    expect(arteNodo('desert', 'available', final)).toContain('object-banner');
    expect(arteNodo('jungle', 'available', final)).toContain('m22 15-2-11');
    expect(arteNodo('castle', 'available', final)).toContain('M10 31 3 19');
  });

  it('un bonus bloqueado lleva sello y uno completado lleva la insignia de resuelto', () => {
    const bonus = { final: false, bonus: true };
    for (const t of TEMAS) {
      expect(arteNodo(t, 'locked', bonus)).toContain('seal-chain');
      expect(arteNodo(t, 'completed', bonus)).toContain('<circle cx="56" cy="66"');
    }
  });

  it('no depende de símbolos externos (<use href>) que esta app no define', () => {
    for (const t of TEMAS) {
      for (const e of ESTADOS) {
        expect(arteNodo(t, e, COMUN)).not.toContain('<use');
        expect(arteNodo(t, e, { final: false, bonus: true })).not.toContain('<use');
      }
    }
  });
});

describe('verboNodo', () => {
  it('invita según el mundo y el estado', () => {
    expect(verboNodo('desert', 'available')).toBe('¡GOLPEA!');
    expect(verboNodo('jungle', 'available')).toBe('¡ABRE!');
    expect(verboNodo('castle', 'available')).toBe('¡DESPIERTA!');
    expect(verboNodo('castle', 'locked')).toBe('SELLADO');
    expect(verboNodo('desert', 'locked')).toBe('CERRADO');
    expect(verboNodo('jungle', 'completed')).toBe('RESUELTO');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-arte-nodo.spec.ts`
Expected: FAIL. No resuelve `./mundo-arte-nodo`.

- [ ] **Step 3: Write minimal implementation**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.ts`:

```ts
import { EstadoArte, Tema } from './mundo-appearance';

// Objetos de juego en SVG, port de node-art.js del prototipo. La silueta y el material
// identifican al mundo; el número de nodo va en un cartel aparte, no sobre el objeto.
//
// Los íconos del prototipo eran <use href="#icon-…"> contra símbolos de su index.html.
// Acá no existen, así que se inlinea el path de cada uno.
const ICONO = {
  check: '<path d="m3 12 5 5L21 4l3 3L8 23 0 15z" fill="currentColor"/>',
  bolt: '<path d="M12 0h9l-6 9h6L6 24l3-12H3z" fill="currentColor"/>',
  star: '<path d="M9 0h6v6h3v3h6v6h-6v3h3v6h-6v-3H9v3H3v-6h3v-3H0V9h6V6h3z" fill="currentColor"/>',
} as const;

function marca(icono: keyof typeof ICONO, x: number, y: number, lado: number): string {
  return `<svg x="${x}" y="${y}" width="${lado}" height="${lado}" style="width:${lado}px;height:${lado}px;filter:none" viewBox="0 0 24 24">${ICONO[icono]}</svg>`;
}

const PREGUNTA =
  '<path d="M27 24h16v4h4v12h-4v4h-8v6h-7V39h8v-4h4v-5H27zm1 30h8v7h-8z" fill="#fff0b4" stroke="#915125" stroke-width="2"/>';
const SOMBRA =
  '<ellipse class="object-shadow" cx="36" cy="76" rx="25" ry="6" fill="#221828" opacity=".28"/>';
const SELLO =
  '<g class="seal-chain" fill="none" stroke="#aca2a5" stroke-width="4"><path d="m14 27 43 35M58 27 13 62" stroke="#392e32" stroke-width="7"/><path d="m14 27 43 35M58 27 13 62" stroke-dasharray="5 3"/><rect x="28" y="36" width="16" height="17" rx="2" fill="#a88246" stroke="#513924" stroke-width="2"/><path d="M33 34v-4h7v4"/><path d="M36 42v6" stroke="#513924"/></g>';

function bloque(estado: EstadoArte, final: boolean): string {
  if (final) {
    return `<g class="object-shell"><path d="M14 69h45v8H10v-4h4z" fill="#b2723d" stroke="#694528" stroke-width="2"/><path d="M28 13h5v56h-5z" fill="#fff1c4" stroke="#674528" stroke-width="2"/><path class="object-banner" d="M34 15h28v8H51v10H34z" fill="${estado === 'completed' ? '#6bbc77' : '#ea6350'}" stroke="#743c36" stroke-width="2"/><path d="M21 65h19v7H21z" fill="#e1aa57"/><path d="m27 8 4-4 4 4-4 5z" fill="#ffd85d"/></g>`;
  }
  const usado = estado === 'completed';
  return `<g class="object-shell"><path d="m10 24 10-9h43l-9 9z" fill="${usado ? '#c5aa75' : '#fff1a1'}" stroke="#6a3d22" stroke-width="2"/><path d="m54 24 9-9v43l-9 11z" fill="${usado ? '#957447' : '#cc7b25'}" stroke="#6a3d22" stroke-width="2"/><path d="M10 24h44v45H10z" fill="${usado ? '#ba915a' : estado === 'locked' ? '#dc9c39' : '#ffc94b'}" stroke="#6a3d22" stroke-width="3"/><path d="M14 28h35v4H18v31h-4z" fill="${usado ? '#debd81' : '#ffe890'}"/><path d="M49 32v32H18v-4h27V32z" fill="#b46d28"/><path d="M16 29h3v3h-3zm29 0h3v3h-3zm-29 31h3v3h-3zm29 0h3v3h-3z" fill="#6a3d22"/>${usado ? `<g class="resolved-symbol" color="#fff6cf">${marca('check', 24, 36, 21)}</g>` : PREGUNTA}</g>${estado === 'locked' ? SELLO : ''}`;
}

function barril(estado: EstadoArte, final: boolean): string {
  const usado = estado === 'completed';
  return `<g class="object-shell"><path d="M18 24h36l5 9 3 22-7 17H17l-7-17 3-22z" fill="#ad7038" stroke="#4d3421" stroke-width="3"/><path d="M22 27 18 54l4 16m9-43-2 43m12-43 2 43m7-43 6 27-5 16" fill="none" stroke="#754421" stroke-width="2"/><path d="m16 33 4-6h5l-5 25 3 15h-5l-5-15z" fill="#dea954"/><path d="M13 34h46v8H13zM12 58h48v8H12z" fill="${final ? '#e4bf53' : '#a1a19a'}" stroke="#4c4c3d" stroke-width="2"/><path d="M15 35h41v2H15zm0 24h41v2H15z" fill="#e5d8b1"/><g class="object-lid" ${usado ? 'transform="translate(2,-10) rotate(-15 36 26)"' : ''}><ellipse cx="36" cy="25" rx="20" ry="8" fill="#d59e55" stroke="#52371f" stroke-width="3"/><ellipse cx="36" cy="25" rx="14" ry="4" fill="${usado ? '#664729' : '#b67d3e'}"/><path d="M24 23h25m-23 4h21" stroke="#80532a" stroke-width="2"/></g><g color="${usado ? '#e5f6b1' : '#ffdf70'}">${marca(usado ? 'check' : 'bolt', 27, 43, 18)}</g>${final ? '<path d="m22 15-2-11 10 6 6-9 7 9 10-6-3 11z" fill="#ffd35c" stroke="#815526" stroke-width="2"/>' : ''}</g>${estado === 'locked' ? SELLO : ''}`;
}

function portal(estado: EstadoArte, final: boolean): string {
  const usado = estado === 'completed';
  return `<g class="object-shell"><path d="M9 72h54v7H9zM14 64h44v9H14z" fill="#8b7799" stroke="#33283f" stroke-width="2"/><path d="M14 65V24l7-7V9h10V4h10v5h10v8l7 7v41H47V27l-7-6h-8l-7 6v38z" fill="#64516f" stroke="#2b2438" stroke-width="3"/><path d="M18 25h5v35h-5zM48 25h6v35h-6zM25 13h7v5h-7zm15 0h7v5h-7z" fill="#b7a0bb"/><path d="M25 64V30l7-8h8l7 8v34z" fill="#20182e"/><g class="portal-core"><path d="M28 60V32l6-6h4l6 6v28z" fill="${usado ? '#419aaf' : estado === 'locked' ? '#633351' : '#d94d88'}"/><path d="M32 57V35l4-5 4 5v22z" fill="${usado ? '#b0f4ef' : estado === 'locked' ? '#9d5978' : '#ffabc8'}"/><path d="M35 37h3v16h-3z" fill="#fff1e4"/></g><path class="portal-runes" d="m17 32 4 4-4 4m35-8-4 4 4 4M18 51h4m-2-2v4m30-2h4m-2-2v4" fill="none" stroke="${usado ? '#92e7e0' : '#e6b073'}" stroke-width="2"/>${final ? '<path d="M10 31 3 19v-8l14 9m45 11 7-12v-8L55 20" fill="#8a7295" stroke="#322739" stroke-width="2"/>' : ''}${usado ? `<g color="#defdff">${marca('check', 30, 43, 13)}</g>` : ''}</g>${estado === 'locked' ? SELLO : ''}`;
}

function bonus(tema: Tema): string {
  if (tema === 'desert') {
    return `<g class="object-shell bonus-object"><path d="M10 69h52v7H10z" fill="#a76d34"/><g color="#ffdc45">${marca('star', 13, 13, 46)}</g><path d="M28 30v7m14-7v7" stroke="#6c471f" stroke-width="3"/></g>`;
  }
  if (tema === 'jungle') {
    return '<g class="object-shell bonus-object"><path d="M37 9v13m0-8 10-8" stroke="#577b32" stroke-width="5"/><path d="M31 22q-17 30 18 38-19-13-12-35M39 22q-3 34 24 29-20-3-17-30M28 23Q5 40 17 57 14 39 32 29" fill="#ffd64a" stroke="#95712a" stroke-width="3"/><path d="M15 69h44v7H15z" fill="#705234"/></g>';
  }
  return '<g class="object-shell bonus-object"><path d="M12 69h48v8H12zM20 61h32v9H20z" fill="#83708e" stroke="#362b42" stroke-width="2"/><g class="portal-core"><path d="m36 12 17 15v22L36 61 19 49V27z" fill="#b779c9" stroke="#f4c680" stroke-width="3"/><path d="m36 17 7 13-7 25-7-25z" fill="#f3c8ff"/><path d="m21 29 15 26-7-25z" fill="#9562b4"/></g></g>';
}

export function arteNodo(
  tema: Tema,
  estado: EstadoArte,
  opciones: { final: boolean; bonus: boolean },
): string {
  // El prototipo no sella los bonus. Acá sí: el estado tiene que leerse por ícono y no
  // solo por color (05 §7), y un `hito` bloqueado no se puede abrir.
  const arte = opciones.bonus
    ? bonus(tema) + (estado === 'locked' ? SELLO : '')
    : tema === 'desert'
      ? bloque(estado, opciones.final)
      : tema === 'jungle'
        ? barril(estado, opciones.final)
        : portal(estado, opciones.final);
  const bonusResuelto =
    opciones.bonus && estado === 'completed'
      ? `<g color="#f2ffe2"><circle cx="56" cy="66" r="11" fill="#3c845e" stroke="#d9eeb0" stroke-width="2"/>${marca('check', 48, 58, 16)}</g>`
      : '';
  return `<svg class="node-art" viewBox="0 0 72 84" aria-hidden="true">${SOMBRA}${arte}${bonusResuelto}<path class="sprite-glint" d="M58 6v12m-6-6h12M8 35v8m-4-4h8" stroke="#fff1b1" stroke-width="2"/></svg>`;
}

export function verboNodo(tema: Tema, estado: EstadoArte): string {
  if (estado === 'completed') return 'RESUELTO';
  if (estado === 'locked') return tema === 'castle' ? 'SELLADO' : 'CERRADO';
  return tema === 'desert' ? '¡GOLPEA!' : tema === 'jungle' ? '¡ABRE!' : '¡DESPIERTA!';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-arte-nodo.spec.ts`
Expected: PASS. `Tests 7 passed (7)`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.ts frontend/src/app/features/alumno/mundo-vertical/mundo-arte-nodo.spec.ts
git commit -m "feat: arte SVG de nodo por mundo y estado

Port de node-art.js: caja, barril y portal con variantes bloqueado,
disponible, completado, final y bonus. Los íconos se inlinean porque
los símbolos <use href> del prototipo no existen en esta app.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Escenario (`mundo-escenario.ts`)

Port de `renderVerticalTerrain` (`vertical-world.js`), `renderWorldScenery` (`world-appearance.js`) y `renderDesertScenery` (`desert-scenery.js`). Del desierto se omite la "casa hongo", que marcaba el nodo de recuperación. La clase `desert-scenery`, que el prototipo usaba para los tres mundos, pasa a llamarse `mundo-decorado`.

**Files:**
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.ts`
- Test: `frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.spec.ts`

**Interfaces:**
- Consumes: `Ruta`, `Ramal`, `PuntoPct`, `generarRuta` de `./mundo-ruta` (Task 1); `Tema`, `APARIENCIA` de `./mundo-appearance` (Task 2).
- Produces:
  - `trazadoRuta(ruta: Ruta, ramales: readonly Ramal[]): string`: `<svg class="vertical-road" …>`
  - `decorado(tema: Tema, ruta: Ruta, bonus: readonly PuntoPct[]): string`: `<svg class="mundo-decorado" …>`
  - `topMeta(ruta: Ruta): number`: `top` en % del arte de meta
  - `topInicio(ruta: Ruta): number`: `top` en % del cartel START
  - `sectores(ruta: Ruta): { top: number; etiqueta: string }[]`

- [ ] **Step 1: Write the failing test**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.spec.ts`:

```ts
import { APARIENCIA } from './mundo-appearance';
import { decorado, sectores, topInicio, topMeta, trazadoRuta } from './mundo-escenario';
import { generarRuta, ramalBonus } from './mundo-ruta';

const ruta6 = generarRuta(6, APARIENCIA.desert.carriles);
const cuenta = (html: string, fragmento: string): number => html.split(fragmento).length - 1;

describe('trazadoRuta', () => {
  it('dibuja las cuatro capas del camino arrancando en el START centrado', () => {
    const svg = trazadoRuta(ruta6, []);
    expect(svg).toMatch(
      new RegExp(`^<svg class="vertical-road" viewBox="0 0 1600 ${ruta6.worldHeight}"`),
    );
    ['road-shadow', 'road-edge', 'road-sand', 'road-center'].forEach((capa) =>
      expect(svg).toContain(`class="${capa}"`),
    );
    expect(svg).toContain('d="M800,');
  });

  it('agrega un ramal punteado por cada bonus, y ninguno si no hay', () => {
    expect(trazadoRuta(ruta6, [])).not.toContain('support-road');
    const conRamal = trazadoRuta(ruta6, [ramalBonus(ruta6, 0)]);
    expect(cuenta(conRamal, 'class="support-road"')).toBe(1);
    expect(cuenta(conRamal, 'class="support-road-edge"')).toBe(1);
  });
});

describe('decorado', () => {
  it('siembra monedas de rastro en un tramo sí y otro no (3 por tramo)', () => {
    // tramos 1, 3 y 5 → 9 monedas
    expect(cuenta(decorado('desert', ruta6, []), 'class="trail-coin"')).toBe(9);
    expect(cuenta(decorado('jungle', ruta6, []), 'class="trail-coin"')).toBe(9);
  });

  it('cada mundo usa su propio decorado', () => {
    const selva = decorado('jungle', ruta6, []);
    const castillo = decorado('castle', ruta6, []);
    expect(selva).toMatch(/^<svg class="mundo-decorado"/);
    expect(selva).toContain('#ffdc54'); // banana
    expect(selva).toContain('#8c9560'); // tótem
    expect(castillo).toContain('#a776d4'); // cristal
    expect(castillo).toContain('torch-flame');
  });
});

describe('posiciones de meta, inicio y sectores', () => {
  it('la meta queda 355 unidades por encima del último nodo; el START, 95 sobre el piso', () => {
    const H = ruta6.worldHeight;
    const ultimoY = (ruta6.stops[6][1] / 100) * H;
    expect((topMeta(ruta6) / 100) * H).toBeCloseTo(ultimoY - 355);
    expect((topInicio(ruta6) / 100) * H).toBeCloseTo(H - 95);
  });

  it('pone un cartel de sector cada 4 nodos, a la altura del nodo 4, 8…', () => {
    expect(sectores(ruta6)).toEqual([{ top: ruta6.stops[4][1], etiqueta: 'SECTOR 01' }]);
    expect(sectores(generarRuta(3, APARIENCIA.desert.carriles))).toEqual([]);
    expect(sectores(generarRuta(9, APARIENCIA.desert.carriles)).map((s) => s.etiqueta)).toEqual([
      'SECTOR 01',
      'SECTOR 02',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-escenario.spec.ts`
Expected: FAIL. No resuelve `./mundo-escenario`.

- [ ] **Step 3: Write minimal implementation**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.ts`:

```ts
import { Tema } from './mundo-appearance';
import { PuntoPct, Ramal, Ruta } from './mundo-ruta';

// Port de renderVerticalTerrain (vertical-world.js), renderWorldScenery
// (world-appearance.js) y renderDesertScenery (desert-scenery.js). El decorado nunca
// otorga XP ni es un desafío: es pura escenografía.

// --- siluetas del desierto (desert-scenery.js) ---
const MONEDA = `<path d="M-6-14H6v4h4v20H6v4H-6v-4h-4v-20h4z" fill="#ffd950" stroke="#a86627" stroke-width="2"/><path d="M-4-10h5v20h-5z" fill="#fff4a5"/><path d="M5-8v16" stroke="#d9992f" stroke-width="2"/>`;
const FLOR = `<ellipse cx="0" cy="37" rx="32" ry="7" fill="#654531" opacity=".22"/>
<path d="M-21 7h42v29h-42z" fill="#29a353" stroke="#245d32" stroke-width="3"/><path d="M-15 8h9v25h-9z" fill="#8ae477"/>
<path d="M-27 0h54v12h-54z" fill="#4ec467" stroke="#245d32" stroke-width="3"/>
<g class="desert-flower"><path d="M0 0v-30m0 16-15-9m15 2 15-9" fill="none" stroke="#30884a" stroke-width="6"/>
<path d="M-20-51h30v6h10v23H10v6h-25v-7h-8v-19h3z" fill="#e75c4b" stroke="#793e2d" stroke-width="3"/>
<path d="M5-41h17v12H5z" fill="#fff0c1"/><path d="M10-36h12" stroke="#70402d" stroke-width="3"/>
<path d="M-15-45h6v6h-6zm-2 16h6v6h-6zm16-18h5v5h-5z" fill="#ffe7bf"/></g>`;
const LADRILLOS = `<ellipse cx="0" cy="31" rx="48" ry="8" fill="#76502f" opacity=".2"/>
<path d="M-45-10h90v36h-90zM-15-45h30v35h-30z" fill="#c9783b" stroke="#794729" stroke-width="3"/>
<path d="M-42-7h84M-42 9h84M-42 24h84M-12-42h24M-12-26h24M-15-8V9M15-8V9M-30 10v14M0 10v14M30 10v14M0-42v16" stroke="#f0b766" stroke-width="3"/>
<path d="M-17-63v-10h7v-7h20v7h7v10H7v9H-7v-9z" fill="#ef7354" stroke="#75432a" stroke-width="2"/><path d="M-6-77h10v9H-6z" fill="#ffedc0"/>`;
const NUBE = `<path d="M-42 4v-13h13v-12h20v-8h23v9h16v11h13V8h-85z" fill="#fff5d9" stroke="#deb978" stroke-width="3"/><path d="M-32 7h66v5h-66z" fill="#dcab69" opacity=".35"/>`;

// --- siluetas de selva y castillo (world-appearance.js) ---
const BANANA = '<path d="M-12-20Q-26 15 9 24L23 14Q-1 18 0-17z" fill="#ffdc54" stroke="#95702c" stroke-width="3"/><path d="M-11-18Q-16 9 8 17" fill="none" stroke="#fff194" stroke-width="4"/><path d="M-13-20h13" stroke="#546a31" stroke-width="5"/>';
const CRISTAL = '<path d="m0-22 13 13v24L0 26-13 15V-9z" fill="#a776d4" stroke="#e1b594" stroke-width="2"/><path d="m0-19 6 11L0 22-6-8z" fill="#ecc1ff"/>';
const TOTEM = '<path d="M-34 39h68v9h-68zM-24-37h48v76h-48z" fill="#8c9560" stroke="#30442e" stroke-width="4"/><path d="M-19-30h38v12h-38z" fill="#c3c084"/><path d="M-15-9h10v10h-10zM5-9h10v10H5zM-11 16h22v7h-22z" fill="#36472d"/><path d="M-20 28h8v10h-8zm26-64h10v14H6z" fill="#53a04e"/>';
const ANTORCHA = '<path d="M-22 42h44v8h-44zM-10-7h20v48h-20z" fill="#74718a" stroke="#292c43" stroke-width="3"/><path d="M-18-11h36v9h-36z" fill="#ab9070"/><g class="torch-flame"><path d="M-15-14v-17l9-14 5 9 6-22 11 27v17z" fill="#ed8653" stroke="#a74744" stroke-width="2"/><path d="M-7-15v-15l7-12 7 22v5z" fill="#ffe396"/></g>';

const svgMundo = (clase: string, ruta: Ruta, contenido: string): string =>
  `<svg class="${clase}" viewBox="0 0 ${ruta.worldWidth} ${ruta.worldHeight}" preserveAspectRatio="none" aria-hidden="true">${contenido}</svg>`;

const moneda = (x: number, y: number, j: number, silueta: string): string =>
  `<g class="trail-coin" style="--delay:-${j * 0.4}s" transform="translate(${x} ${y})"><g>${silueta}</g></g>`;

/** Camino principal (cuatro capas: sombra, borde, arena, centro) más un ramal por bonus. */
export function trazadoRuta(ruta: Ruta, ramales: readonly Ramal[]): string {
  const W = ruta.worldWidth;
  const H = ruta.worldHeight;
  const px = ([x, y]: PuntoPct): string => `${(x / 100) * W},${(y / 100) * H}`;
  const puntos = ruta.roads.slice(1).flatMap((tramo, i) => (i ? tramo.slice(1) : tramo));
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${px(p)}`).join(' ');
  const laterales = ramales
    .map(({ desde, hasta }) => {
      const dr = `M${px(desde)} Q${((desde[0] + hasta[0]) / 200) * W},${(desde[1] / 100) * H + 24} ${px(hasta)}`;
      return `<path class="support-road-edge" d="${dr}"/><path class="support-road" d="${dr}"/>`;
    })
    .join('');
  return svgMundo(
    'vertical-road',
    ruta,
    `${laterales}<path d="${d}" class="road-shadow"/><path d="${d}" class="road-edge"/><path d="${d}" class="road-sand"/><path d="${d}" class="road-center"/>`,
  );
}

function decoradoDesierto(ruta: Ruta, bonus: readonly PuntoPct[]): string {
  const W = ruta.worldWidth;
  const H = ruta.worldHeight;
  const cantidad = ruta.stops.length - 1;
  const px = ([x, y]: PuntoPct): [number, number] => [(x * W) / 100, (y * H) / 100];
  const items: string[] = [];
  for (let id = 1; id <= cantidad; id += 2) {
    [7, 13, 20].forEach((indice, j) => {
      const [x, y] = px(ruta.roads[id][indice]);
      items.push(moneda(x, y, j, MONEDA));
    });
  }
  for (let id = 3; id <= cantidad; id += 3) {
    const [x, y] = px(ruta.roads[id][16]);
    const decorX = W * (x > W / 2 ? 0.3 : 0.7);
    // Un ladrillo o una flor encima del cartel de un bonus lo taparía.
    const cercaDeBonus = bonus.some((b) => {
      const [sx, sy] = px(b);
      return Math.hypot(sx - decorX, sy - y) < 145;
    });
    if (!cercaDeBonus) items.push(`<g transform="translate(${decorX} ${y})">${id % 2 ? LADRILLOS : FLOR}</g>`);
    if (id % 6 === 3) {
      items.push(
        `<g class="desert-cloud" transform="translate(${W * (x > W / 2 ? 0.8 : 0.2)} ${y - 110})"><g>${NUBE}</g></g>`,
      );
    }
  }
  return svgMundo('mundo-decorado', ruta, items.join(''));
}

function decoradoGenerico(tema: 'jungle' | 'castle', ruta: Ruta): string {
  const W = ruta.worldWidth;
  const H = ruta.worldHeight;
  const cantidad = ruta.stops.length - 1;
  const items: string[] = [];
  for (let id = 1; id <= cantidad; id += 2) {
    [8, 16, 23].forEach((paso, j) => {
      const [x, y] = ruta.roads[id][paso];
      items.push(moneda((x / 100) * W, (y / 100) * H, j, tema === 'jungle' ? BANANA : CRISTAL));
    });
  }
  for (let id = 2; id <= cantidad; id += 3) {
    const [x, y] = ruta.roads[id][16];
    const lado = x > 50 ? 30 : 70;
    items.push(
      `<g transform="translate(${(lado / 100) * W} ${(y / 100) * H})">${tema === 'jungle' ? TOTEM : ANTORCHA}</g>`,
    );
  }
  return svgMundo('mundo-decorado', ruta, items.join(''));
}

/** Decorado ambiental determinista; `bonus` son las puntas de los ramales (para no taparlas). */
export function decorado(tema: Tema, ruta: Ruta, bonus: readonly PuntoPct[]): string {
  return tema === 'desert' ? decoradoDesierto(ruta, bonus) : decoradoGenerico(tema, ruta);
}

/** `top` (en %) del arte de meta: 355 unidades lógicas por encima del último nodo. */
export function topMeta(ruta: Ruta): number {
  const ultimo = ruta.stops[ruta.stops.length - 1];
  return (((ultimo[1] / 100) * ruta.worldHeight - 355) / ruta.worldHeight) * 100;
}

/** `top` (en %) del cartel START: 95 unidades lógicas sobre el borde inferior. */
export function topInicio(ruta: Ruta): number {
  return ((ruta.worldHeight - 95) / ruta.worldHeight) * 100;
}

/** Carteles "SECTOR NN", uno cada 4 nodos, a la altura del nodo 4, 8, … */
export function sectores(ruta: Ruta): { top: number; etiqueta: string }[] {
  const cantidad = ruta.stops.length - 1;
  return Array.from({ length: Math.floor((cantidad - 1) / 4) }, (_, i) => ({
    top: ruta.stops[(i + 1) * 4][1],
    etiqueta: `SECTOR ${String(i + 1).padStart(2, '0')}`,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (desde `frontend/`): `npx ng test --watch=false --include src/app/features/alumno/mundo-vertical/mundo-escenario.spec.ts`
Expected: PASS. `Tests 6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.ts frontend/src/app/features/alumno/mundo-vertical/mundo-escenario.spec.ts
git commit -m "feat: camino, decorado y carteles del mapa panorámico

Port de renderVerticalTerrain / renderWorldScenery / renderDesertScenery.
Se omite la casa hongo del desierto: marcaba el nodo de recuperación,
que no existe en el dominio real.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Extraer `TableroPlano` y adelgazar `UnidadMapa` (sin cambios de comportamiento)

Hoy `unidad-mapa.ts` mezcla tres cosas: datos (unidad, progreso, alcanzable), render del tablero SVG-grid y caminata del avatar. Para que el mundo vertical se sume como un segundo render, el tablero se mueve **tal cual** a su propio componente. La geometría (`x`/`y`, serpentina de fallback) pasa a ser del tablero: `Casillero` queda sin coordenadas porque el mundo vertical no las usa.

Esta tarea es una refactorización pura: al terminar, `/alumno/unidad/u1` tiene que verse y comportarse exactamente igual que antes.

**Files:**
- Create: `frontend/src/app/features/alumno/casillero.ts`
- Create: `frontend/src/app/features/alumno/tablero-plano.ts`
- Modify: `frontend/src/app/features/alumno/unidad-mapa.ts` (reescritura completa, ver Step 3)
- Modify: `path/deuda-tecnica/tarea-deuda-05-design-system.md` (ítem #2, "Dónde vive")

**Interfaces:**
- Consumes: `Actividad`, `EstadoNodo`, `TipoNodo` de `core/data/roadmap.models.ts`; `AvatarService`, `AvatarSprite`, `Hud`, `RoadmapStore`, `RoadmapDataPort`, `CURSO_SEED_ID` (existentes).
- Produces:
  - `interface Casillero { a: Actividad; i: number; estado: EstadoNodo; alcanzable: boolean }` en `casillero.ts`
  - `etiquetaCasillero(c: Casillero): string` en `casillero.ts`
  - Componente `TableroPlano` (`selector: 'app-tablero-plano'`), con inputs `casilleros: Casillero[]` (requerido) y `nombreUnidad: string` (requerido), y output `elegir: Casillero`. Solo emite para casilleros alcanzables.
  - `UnidadMapa` sigue exponiendo `id` (input de ruta) y agrega el `sel` compartido por ambos renders.

- [ ] **Step 1: Crear `casillero.ts`**

```ts
import { Actividad, EstadoNodo } from '../../core/data/roadmap.models';

/**
 * Una actividad de la unidad tal como la dibujan el tablero plano y el mundo vertical.
 * No lleva coordenadas: cada render ubica los nodos a su manera (grilla del editor
 * gráfico en uno, ruta procedural en el otro).
 */
export interface Casillero {
  a: Actividad;
  /** Índice en `Unidad.actividades`: el orden del recorrido. */
  i: number;
  estado: EstadoNodo;
  /** Movimiento lineal (05 §5): se llega hasta el primer nodo no completado, no más allá. */
  alcanzable: boolean;
}

/** Nombre, tipo y estado para lectores de pantalla: el estado nunca va solo por color (05 §7). */
export function etiquetaCasillero(c: Casillero): string {
  return `${c.a.nombre}, ${c.a.tipo}, ${c.estado}${c.a.esObligatorio ? ', obligatoria' : ''}`;
}
```

- [ ] **Step 2: Crear `tablero-plano.ts`**

Es el template SVG, la geometría y la caminata que hoy están en `unidad-mapa.ts`, movidos sin cambios salvo en cuatro puntos:

1. Recibe `casilleros` y `nombreUnidad` por input en vez de calcularlos.
2. Agrega `x`/`y` en su propio `computed` `ubicados`.
3. `ir()` emite `elegir` en vez de setear la ficha.
4. `etiqueta()` delega en `etiquetaCasillero`.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarService } from '../../core/avatar/avatar.service';
import { EstadoNodo, TipoNodo } from '../../core/data/roadmap.models';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';
import { Casillero, etiquetaCasillero } from './casillero';

/** Casillero con su posición en el tablero (editor gráfico, o la serpentina de fallback). */
interface CasilleroPlano extends Casillero {
  x: number;
  y: number;
}

// Serpentina de 4 columnas: fallback para actividades sin posición propia (no debería
// pasar en la práctica, porque el adapter les asigna una default al crearlas, pero cubre
// datos viejos de localStorage de antes de este editor).
const COLS = 4;
const CW = 168;
const CH = 138;
const X0 = 104;
const Y0 = 96;
const LADO = 72; // lado del casillero
const MARGEN_TABLERO = 90; // aire alrededor del bounding box de los nodos posicionados

/** Duración de un tramo de caminata, en ms. */
const MS_POR_TRAMO = 420;

function posicionSerpentina(indice: number): { x: number; y: number } {
  const fila = Math.floor(indice / COLS);
  const enFila = indice % COLS;
  const col = fila % 2 === 0 ? enFila : COLS - 1 - enFila;
  return { x: X0 + col * CW, y: Y0 + fila * CH };
}

const GLIFO: Record<TipoNodo, string> = {
  teoria: '≡',
  practica: '▤',
  desafio: '◆',
  boss: '★',
  hito: '❖',
};

/**
 * Tablero interno de una unidad (05-design-system.md §5): tablero plano estilo Mario 3,
 * con casilleros unidos por caminos ortogonales y recorridos por el **avatar
 * personalizado** del alumno, que camina de nodo en nodo en vez de teletransportarse.
 *
 * SVG y no canvas a propósito: cada casillero es un elemento del DOM, con foco, rol y
 * `aria-label` (05 §5/§7).
 *
 * Las posiciones son las que el profesor definió en el editor gráfico (`posicion_x`/
 * `posicion_y`, ver `features/profesor/nodo-canvas.ts`). La serpentina de acá arriba es
 * solo el fallback para una actividad que por lo que sea no tenga posición propia
 * (deuda-tecnica/tarea-deuda-05-design-system.md #1, ya pagada).
 *
 * Es el render de las unidades sin mundo panorámico (ver `UnidadMapa`).
 */
@Component({
  selector: 'app-tablero-plano',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite],
  host: { class: 'block' },
  styles: `
    .casillero:focus-visible {
      outline: none;
    }
    .casillero:focus-visible .foco {
      stroke: #f3eaff;
      stroke-width: 3;
      stroke-dasharray: 5 4;
    }
  `,
  template: `
    <!-- marco doble estilo consola: el tablero vive adentro de un cartucho -->
    <div class="border-4 border-primary/30 p-1">
      <svg
        [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto()"
        class="block w-full"
        [style.max-height.px]="560"
        role="application"
        [attr.aria-label]="'Tablero de la unidad ' + nombreUnidad()"
      >
        <defs>
          <!-- suelo del tablero: trama de puntos, el equivalente al arenal de la referencia -->
          <pattern id="trama" width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill="#241046" />
            <circle cx="4" cy="4" r="1.4" fill="#3A1568" />
            <circle cx="12" cy="12" r="1.4" fill="#3A1568" />
          </pattern>
          <filter id="neon-t" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect [attr.width]="ancho()" [attr.height]="alto()" fill="url(#trama)" />

        <!-- decorado determinista: cristales del paisaje, fuera de los caminos -->
        <g class="pixelado" opacity="0.75">
          @for (d of decorado(); track $index) {
            <polygon
              [attr.points]="
                d.x + ',' + (d.y - d.h) + ' ' + (d.x + d.w) + ',' + d.y + ' ' + (d.x - d.w) + ',' + d.y
              "
              [attr.fill]="d.color"
              opacity="0.55"
            />
          }
        </g>

        <!-- caminos ortogonales entre casilleros consecutivos -->
        <g stroke-linecap="butt">
          @for (t of tramos(); track t.id) {
            <line
              [attr.x1]="t.x1"
              [attr.y1]="t.y1"
              [attr.x2]="t.x2"
              [attr.y2]="t.y2"
              [attr.stroke]="t.color"
              stroke-width="16"
              opacity="0.9"
            />
            <line
              [attr.x1]="t.x1"
              [attr.y1]="t.y1"
              [attr.x2]="t.x2"
              [attr.y2]="t.y2"
              stroke="#190236"
              stroke-width="16"
              stroke-dasharray="2 14"
              opacity="0.35"
            />
          }
        </g>

        <!-- casilleros -->
        @for (c of ubicados(); track c.a.id) {
          <g
            class="casillero"
            [class.cursor-pointer]="c.alcanzable"
            [attr.tabindex]="c.alcanzable ? 0 : -1"
            role="button"
            [attr.aria-label]="etiqueta(c)"
            [attr.aria-disabled]="!c.alcanzable"
            (click)="ir(c)"
            (keydown.enter)="ir(c)"
            (keydown.space)="ir(c)"
          >
            <!-- sombra dura de 4px: da el relieve de sprite sobre el suelo -->
            <rect
              [attr.x]="c.x - LADO / 2 + 4"
              [attr.y]="c.y - LADO / 2 + 4"
              [attr.width]="LADO"
              [attr.height]="LADO"
              fill="#0E0120"
              opacity="0.6"
            />
            <rect
              [attr.x]="c.x - LADO / 2"
              [attr.y]="c.y - LADO / 2"
              [attr.width]="LADO"
              [attr.height]="LADO"
              [attr.fill]="relleno(c.estado)"
              [attr.stroke]="c.estado === 'bloqueado' ? '#190236' : '#F3EAFF'"
              stroke-width="3"
              [attr.filter]="c.estado === 'habilitado' ? 'url(#neon-t)' : null"
            />
            <rect
              class="foco"
              [attr.x]="c.x - LADO / 2 - 5"
              [attr.y]="c.y - LADO / 2 - 5"
              [attr.width]="LADO + 10"
              [attr.height]="LADO + 10"
              fill="none"
              stroke="none"
            />
            <text
              [attr.x]="c.x"
              [attr.y]="c.y + 9"
              text-anchor="middle"
              font-size="26"
              [attr.fill]="c.estado === 'bloqueado' ? '#7A66A0' : '#FFFFFF'"
            >
              {{ glifo(c) }}
            </text>
            <text
              [attr.x]="c.x"
              [attr.y]="c.y + LADO / 2 + 18"
              text-anchor="middle"
              font-size="11"
              [attr.fill]="c.estado === 'bloqueado' ? '#8A76B0' : '#F3EAFF'"
              style="font-family: var(--font-title)"
            >
              {{ c.a.nombre }}
            </text>
            @if (c.a.esObligatorio) {
              <circle [attr.cx]="c.x + LADO / 2 - 4" [attr.cy]="c.y - LADO / 2 + 4" r="5" fill="#FF2758" />
            }
          </g>
        }

        <!-- avatar caminando: su posición es una interpolación, no la del casillero -->
        <g
          [attr.transform]="'translate(' + pos().x + ',' + pos().y + ')'"
          class="pointer-events-none"
          style="transition: none"
        >
          <foreignObject x="-20" y="-62" width="40" height="66">
            <ui-avatar-sprite
              [config]="avatarSrv.avatar()"
              [alto]="58"
              [sombra]="true"
              [caminando]="caminando()"
              [mirando]="mirando()"
            />
          </foreignObject>
        </g>
      </svg>
    </div>
  `,
})
export class TableroPlano {
  readonly casilleros = input.required<Casillero[]>();
  readonly nombreUnidad = input.required<string>();
  /** El alumno tocó un casillero alcanzable: `UnidadMapa` abre su ficha. */
  readonly elegir = output<Casillero>();

  protected readonly avatarSrv = inject(AvatarService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly LADO = LADO;

  protected readonly ubicados = computed<CasilleroPlano[]>(() =>
    this.casilleros().map((c) => {
      const serpentina = posicionSerpentina(c.i);
      return {
        ...c,
        x: typeof c.a.posicionX === 'number' ? c.a.posicionX : serpentina.x,
        y: typeof c.a.posicionY === 'number' ? c.a.posicionY : serpentina.y,
      };
    }),
  );

  // Bounding box de los nodos ya posicionados + margen: crece solo si el profesor arrastra
  // uno más allá del encuadre por defecto (mismo criterio que `Mapa.encuadreBase`).
  protected readonly ancho = computed(() => {
    const xs = this.ubicados().map((c) => c.x);
    return Math.max(X0 * 2, ...xs) + MARGEN_TABLERO;
  });
  protected readonly alto = computed(() => {
    const ys = this.ubicados().map((c) => c.y);
    return Math.max(Y0 * 2, ...ys) + MARGEN_TABLERO;
  });

  protected readonly tramos = computed(() => {
    const cs = this.ubicados();
    return cs.slice(0, -1).map((a, i) => {
      const b = cs[i + 1];
      return {
        id: `${a.a.id}->${b.a.id}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        color: a.estado === 'completado' ? 'var(--color-node-done)' : 'var(--color-node-locked)',
      };
    });
  });

  /**
   * Cristales de fondo. Son deterministas por índice y quedan confinados a la franja
   * **entre** dos filas de casilleros: si se los deja caer en cualquier lado tapan
   * casilleros y rótulos, que es justo lo que tiene que quedar legible.
   */
  protected readonly decorado = computed(() => {
    const filas = Math.max(1, Math.ceil(this.ubicados().length / COLS));
    const W = this.ancho();
    const colores = ['#6B21C9', '#8B3DF5', '#FF2758'];
    const carriles = Math.max(1, filas);

    return Array.from({ length: carriles * 5 }, (_, i) => {
      const r1 = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin(i * 31.416) * 43758.5453) % 1;
      const carril = i % carriles;
      return {
        x: 44 + r1 * (W - 88),
        // el carril arranca debajo del rótulo de la fila y termina antes de la siguiente
        y: Y0 + carril * CH + LADO / 2 + 46 + r2 * 34,
        w: 7 + r2 * 9,
        h: 14 + r1 * 20,
        color: colores[i % colores.length],
      };
    });
  });

  // ---------- caminata del avatar ----------

  private readonly indiceAvatar = signal(0);
  protected readonly pos = signal<{ x: number; y: number }>({ x: X0, y: Y0 });
  protected readonly caminando = signal(false);
  protected readonly mirando = signal<'derecha' | 'izquierda'>('derecha');
  private raf = 0;

  constructor() {
    // Al abrir la unidad (o si cambia el progreso) el avatar aparece parado en el frente.
    effect(() => {
      const cs = this.ubicados();
      if (cs.length === 0) return;
      const frente = cs.findIndex((c) => c.estado !== 'completado');
      const destino = frente === -1 ? cs.length - 1 : frente;
      if (this.raf === 0) {
        this.indiceAvatar.set(destino);
        this.pos.set({ x: cs[destino].x, y: cs[destino].y });
      }
    });

    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.raf));
  }

  protected ir(c: CasilleroPlano): void {
    if (!c.alcanzable) return;
    this.elegir.emit(c);
    if (c.i !== this.indiceAvatar()) this.caminar(c.i);
  }

  /**
   * Camina tramo a tramo hasta el casillero destino. Pasa por cada nodo intermedio en vez
   * de ir en línea recta: los tramos consecutivos son ortogonales, así que recorrerlos uno
   * por uno es exactamente seguir el camino dibujado.
   */
  private caminar(destino: number): void {
    cancelAnimationFrame(this.raf);
    const cs = this.ubicados();
    const paso = destino > this.indiceAvatar() ? 1 : -1;

    const siguiente = (): void => {
      const actual = this.indiceAvatar();
      if (actual === destino) {
        this.caminando.set(false);
        this.raf = 0;
        return;
      }
      const desde = cs[actual];
      const hasta = cs[actual + paso];
      if (!desde || !hasta) {
        this.caminando.set(false);
        this.raf = 0;
        return;
      }

      this.caminando.set(true);
      if (hasta.x !== desde.x) this.mirando.set(hasta.x > desde.x ? 'derecha' : 'izquierda');
      const t0 = performance.now();

      const tick = (t: number): void => {
        const k = Math.min(1, (t - t0) / MS_POR_TRAMO);
        this.pos.set({
          x: desde.x + (hasta.x - desde.x) * k,
          y: desde.y + (hasta.y - desde.y) * k,
        });
        if (k < 1) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.indiceAvatar.set(actual + paso);
          siguiente();
        }
      };
      this.raf = requestAnimationFrame(tick);
    };

    siguiente();
  }

  // ---------- presentación ----------

  protected relleno(e: EstadoNodo): string {
    return e === 'completado'
      ? 'var(--color-node-done)'
      : e === 'habilitado'
        ? 'var(--color-node-open)'
        : e === 'fallado'
          ? 'var(--color-node-failed)'
          : 'var(--color-node-locked)';
  }

  /** Estado + tipo, siempre por ícono además de por color (05 §7). */
  protected glifo(c: Casillero): string {
    if (c.estado === 'bloqueado') return '🔒';
    if (c.estado === 'completado') return '✓';
    if (c.estado === 'fallado') return '✕';
    return GLIFO[c.a.tipo];
  }

  protected etiqueta(c: Casillero): string {
    return etiquetaCasillero(c);
  }
}
```

- [ ] **Step 3: Reescribir `unidad-mapa.ts` como contenedor de datos**

Reemplazar el contenido completo de `frontend/src/app/features/alumno/unidad-mapa.ts` por:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { Hud } from '../../shared/ui/hud';
import { Casillero } from './casillero';
import { TableroPlano } from './tablero-plano';

/**
 * Pantalla interna de una unidad (`/alumno/unidad/:id`). Resuelve la unidad y el progreso
 * reales, decide qué casilleros son alcanzables y muestra HUD, barra de estado y ficha del
 * casillero elegido. El dibujo del recorrido lo delega en un render: `TableroPlano`.
 */
@Component({
  selector: 'app-unidad-mapa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Hud, RouterLink, TableroPlano, UpperCasePipe],
  host: { class: 'block' },
  template: `
    @if (unidad(); as u) {
      <div class="relative overflow-hidden border-2 border-secondary bg-brand-night chaflan">
        <app-tablero-plano
          [casilleros]="casilleros()"
          [nombreUnidad]="u.nombre"
          (elegir)="sel.set($event)"
        />

        <!-- HUD flotante, en la misma posición que en el mapa general -->
        <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div class="pointer-events-auto"><ui-hud [xp]="xp()" [vidas]="vidas()" /></div>
          <a
            routerLink="/alumno"
            class="btn btn-sm btn-outline btn-primary ui-font pointer-events-auto text-[8px]"
          >
            ◀ VOLVER AL MAPA
          </a>
        </div>

        <!-- barra de estado estilo consola -->
        <div
          class="ui-font flex items-center gap-4 border-t-2 border-secondary bg-base-100 px-4 py-2 text-[9px]"
        >
          <span class="text-primary">UNIDAD {{ u.orden }}</span>
          <span class="text-accent">{{ u.nombre }}</span>
          <span class="tabular opacity-70">{{ hechas() }}/{{ casilleros().length }} COMPLETADAS</span>
          <span class="ml-auto tabular opacity-50">XP {{ xp() }}</span>
        </div>
      </div>

      <!-- ficha del casillero seleccionado -->
      @if (sel(); as c) {
        <div class="chaflan mt-4 border-2 border-primary bg-base-200 p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="title-font text-lg text-primary">{{ c.a.nombre }}</h3>
              <p class="ui-font mt-1 text-[8px] text-accent">
                {{ c.a.tipo | uppercase }}
                @if (c.a.dificultad) {
                  · {{ c.a.dificultad }}
                }
                @if (c.a.modalidad) {
                  · {{ c.a.modalidad | uppercase }}
                }
                · {{ c.a.reintentosPermitidos }} REINTENTOS
              </p>
            </div>
            <button class="btn btn-ghost btn-xs" (click)="sel.set(null)" aria-label="Cerrar ficha">✕</button>
          </div>
          @if (c.a.descripcion) {
            <p class="mt-3 text-sm opacity-80">{{ c.a.descripcion }}</p>
          }
          @if (c.a.recurso) {
            <a [href]="c.a.recurso" target="_blank" rel="noopener" class="link link-accent mt-2 block text-sm">
              Abrir material ↗
            </a>
          }
          <button class="btn btn-primary btn-sm ui-font mt-4 text-[8px]" [disabled]="c.estado !== 'habilitado'">
            {{ c.estado === 'completado' ? '✓ YA COMPLETADA' : '▶ COMENZAR' }}
          </button>
        </div>
      }
    } @else {
      <p class="opacity-70">Esa unidad no existe.</p>
    }
  `,
})
export class UnidadMapa {
  /** Viene del router (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly store = inject(RoadmapStore);
  private readonly data = inject(RoadmapDataPort);

  private readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly sel = signal<Casillero | null>(null);
  protected readonly xp = computed(() => this.progreso()?.xpTotal ?? 0);
  protected readonly vidas = computed(() => this.progreso()?.vidasVigentes ?? 0);

  protected readonly unidad = computed(() => this.store.unidadPorId(this.id()));

  protected readonly casilleros = computed<Casillero[]>(() => {
    const u = this.unidad();
    if (!u) return [];
    const estados = new Map((this.progreso()?.nodos ?? []).map((n) => [n.nodoId, n.estado]));

    const items = u.actividades.map(
      (a, i): Casillero => ({ a, i, estado: estados.get(a.id) ?? 'bloqueado', alcanzable: false }),
    );

    // Movimiento lineal (05 §5): se llega hasta el primer nodo no completado, no más allá.
    const frente = items.findIndex((c) => c.estado !== 'completado');
    const tope = frente === -1 ? items.length - 1 : frente;
    items.forEach((c) => (c.alcanzable = c.i <= tope));
    return items;
  });

  protected readonly hechas = computed(
    () => this.casilleros().filter((c) => c.estado === 'completado').length,
  );
}
```

- [ ] **Step 4: Actualizar "Dónde vive" del ítem #2 de deuda técnica**

El ítem #2 de `path/deuda-tecnica/tarea-deuda-05-design-system.md` apunta a código que se acaba de mover. Reemplazar este párrafo:

```markdown
**Dónde vive:** `frontend/src/app/features/alumno/unidad-mapa.ts` — `computed` `tramos()`
y el cálculo de `alcanzable` dentro de `casilleros()`.
```

por:

```markdown
**Dónde vive:** `frontend/src/app/features/alumno/tablero-plano.ts` — `computed` `tramos()`;
y `frontend/src/app/features/alumno/unidad-mapa.ts` — el cálculo de `alcanzable` dentro de
`casilleros()` (compartido por los dos renders de la unidad).
```

- [ ] **Step 5: Verificar build y tests**

Run (desde `frontend/`): `npx ng build`
Expected: `Application bundle generation complete.` sin errores. Los warnings preexistentes (Browserslist `samsung 30`, `9 rules skipped due to selector errors`) no cuentan.

Run (desde `frontend/`): `npx ng test --watch=false`
Expected: `Test Files 8 passed (8)` y `Tests 53 passed (53)`: los 19 de antes más los 34 de las Tasks 1-4 (16 + 5 + 7 + 6).

- [ ] **Step 6: Verificar en el navegador que el tablero no cambió**

1. Levantar el front con `preview_start` (`name: "frontend"`) y emular un viewport de 1440×900: por debajo de eso la app muestra "requiere una computadora".
2. En `http://localhost:4200/login`, entrar como **ALUMNO** y abrir `http://localhost:4200/alumno/unidad/u1`.
3. Tiene que verse igual que antes de la tarea: tablero SVG de 6 casilleros, avatar parado en "Ejercicio integrador" (el primer nodo no completado del seed de `alu-01`), HUD arriba y barra "UNIDAD 1 · Fundamentos · 3/6 COMPLETADAS".
4. Click en "Teoría": se abre la ficha y el avatar camina hacia atrás, casillero por casillero.
5. Click en "Boss": no pasa nada, porque no es alcanzable.
6. `read_console_messages` con `onlyErrors: true` tiene que devolver "No console logs."

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/alumno/casillero.ts frontend/src/app/features/alumno/tablero-plano.ts frontend/src/app/features/alumno/unidad-mapa.ts path/deuda-tecnica/tarea-deuda-05-design-system.md
git commit -m "refactor: extrae el tablero plano de la unidad a su propio componente

UnidadMapa queda como contenedor de datos (unidad, progreso, alcanzable,
HUD y ficha) y delega el dibujo en TableroPlano, sin cambios de
comportamiento. Prepara el terreno para sumar el mapa panorámico como
segundo render.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Componente `MundoVertical` + texturas + conexión en `UnidadMapa`

Componente de presentación del mapa panorámico. Arma la ruta con las piezas puras de las Tasks 1-4, posiciona los nodos en `%` sobre la curva y mueve al `AvatarSprite` de la app (no el explorador SVG del prototipo) a lo largo de ella. Además tiene cámara que sigue al avatar, botones "ver meta / mi personaje / inicio" y pantalla completa. `UnidadMapa` lo usa cuando `temaDeOrden(unidad.orden)` devuelve un tema y la unidad tiene al menos un nodo en el camino principal.

Según el spec §7, este componente no lleva test unitario: su lógica pura ya está cubierta por las Tasks 1-4 y lo visual se verifica en el navegador (Step 6).

**Files:**
- Create: `frontend/public/mundos/mapa_desierto_tile_vertical.png`, `mapa_selva_tile.png`, `mapa_castillo_tile.png`
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.css`
- Create: `frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.ts`
- Modify: `frontend/src/app/features/alumno/unidad-mapa.ts` (template + un `computed`)

**Interfaces:**
- Consumes: `Casillero`, `etiquetaCasillero` (Task 5); `generarRuta`, `ramalBonus`, `recorrido`, `medirRuta`, `puntoEnRuta`, `PuntoPct`, `Ruta` (Task 1); `APARIENCIA`, `arteMeta`, `estadoArte`, `EstadoArte`, `Tema`, `temaDeOrden` (Task 2); `arteNodo`, `verboNodo` (Task 3); `trazadoRuta`, `decorado`, `topMeta`, `topInicio`, `sectores` (Task 4).
- Produces: componente `MundoVertical` (`selector: 'app-mundo-vertical'`), con inputs `tema: Tema` (requerido) y `casilleros: Casillero[]` (requerido), y output `elegir: Casillero`. Solo emite para casilleros alcanzables, igual que `TableroPlano`.

- [ ] **Step 1: Copiar las tres texturas desde la rama del prototipo**

Run (desde la raíz del repo):

```bash
mkdir -p frontend/public/mundos
for f in mapa_desierto_tile_vertical.png mapa_selva_tile.png mapa_castillo_tile.png; do
  git show "origin/feature/integrar-prototipo-mapas:$f" > "frontend/public/mundos/$f"
done
wc -c frontend/public/mundos/*.png
```

Expected: los tamaños tienen que coincidir byte a byte con los de la rama.

```
3061376 frontend/public/mundos/mapa_castillo_tile.png
2155995 frontend/public/mundos/mapa_desierto_tile_vertical.png
3120817 frontend/public/mundos/mapa_selva_tile.png
```

Si alguno difiere, la redirección corrompió el binario. En ese caso, borrarlo y usar
`git restore --source=origin/feature/integrar-prototipo-mapas --worktree -- <archivo>` desde la raíz, y después moverlo a `frontend/public/mundos/`.

- [ ] **Step 2: Crear `mundo-vertical.css`**

El componente usa `ViewEncapsulation.None`. La ruta, el decorado y el arte de nodo se inyectan con `[innerHTML]`, y Angular no les pone los atributos de encapsulación, así que los estilos encapsulados no los alcanzarían. Por eso **todo** selector va colgado de `.mundo`. Los colores y medidas están copiados de `vertical-world.css` y `world-play.css` del prototipo, con `[data-theme=X]` → `.mundo[data-mundo='X']` y `var(--pixel)` → `var(--font-pixel)`.

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.css`:

```css
/* Mapa panorámico de unidad: port de vertical-world.css y world-play.css del prototipo
   feature/integrar-prototipo-mapas. ViewEncapsulation.None: todo cuelga de .mundo. */

app-mundo-vertical {
  display: block;
}

.mundo {
  position: relative;
  background: #382d23;
}
.mundo:fullscreen,
.mundo.expandido {
  display: flex;
  flex-direction: column;
  background: #271f19;
}
/* Respaldo si el navegador no tiene Fullscreen API: ocupa toda la ventana. */
.mundo.expandido {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.mundo .mundo-viewport {
  position: relative;
  height: clamp(470px, 73vh, 720px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #a57b40 #ebbd64;
  outline-offset: -4px;
}
.mundo:fullscreen .mundo-viewport,
.mundo.expandido .mundo-viewport {
  flex: 1;
  height: auto;
}

.mundo .mundo-world {
  position: relative;
  width: 100%;
  background-repeat: repeat-y;
  background-size: 100% auto;
  image-rendering: pixelated;
  overflow: hidden;
}

/* --- terreno: camino + decorado (SVG inyectado) --- */
.mundo .mundo-terreno {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.mundo .mundo-terreno > svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.mundo .vertical-road path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.mundo .vertical-road .road-shadow { stroke: #ae7336; stroke-width: 77; opacity: 0.3; transform: translateY(5px); }
.mundo .vertical-road .road-edge { stroke: #c48a40; stroke-width: 72; }
.mundo .vertical-road .road-sand { stroke: #ffe5a0; stroke-width: 64; }
.mundo .vertical-road .road-center { stroke: #fff0bd; stroke-width: 44; opacity: 0.45; }
.mundo .vertical-road .support-road-edge { stroke: #b78445; stroke-width: 24; opacity: 0.7; }
.mundo .vertical-road .support-road { stroke: #ffdf91; stroke-width: 16; stroke-dasharray: 12 8; }

.mundo[data-mundo='jungle'] .vertical-road .road-shadow { stroke: #213e26; }
.mundo[data-mundo='jungle'] .vertical-road .road-edge { stroke: #715438; }
.mundo[data-mundo='jungle'] .vertical-road .road-sand { stroke: #cdac6b; }
.mundo[data-mundo='jungle'] .vertical-road .road-center { stroke: #f0d495; }
.mundo[data-mundo='jungle'] .vertical-road .support-road-edge { stroke: #4e6332; }
.mundo[data-mundo='jungle'] .vertical-road .support-road { stroke: #b6c276; }
.mundo[data-mundo='castle'] .vertical-road .road-shadow { stroke: #0c152a; }
.mundo[data-mundo='castle'] .vertical-road .road-edge { stroke: #30334f; }
.mundo[data-mundo='castle'] .vertical-road .road-sand { stroke: #9393a9; }
.mundo[data-mundo='castle'] .vertical-road .road-center { stroke: #c3baca; stroke-dasharray: 14 3; opacity: 0.55; }
.mundo[data-mundo='castle'] .vertical-road .support-road-edge { stroke: #534064; }
.mundo[data-mundo='castle'] .vertical-road .support-road { stroke: #a98eaa; }

.mundo .trail-coin > g { animation: mundo-moneda 2.8s ease-in-out infinite; animation-delay: var(--delay); }
.mundo .desert-flower { animation: mundo-flor 4s ease-in-out infinite; }
.mundo .desert-cloud > g { animation: mundo-nube 7s ease-in-out infinite; }
.mundo .torch-flame { animation: mundo-antorcha 2s ease-in-out infinite; transform-origin: center; }

/* --- meta, START, sectores y carteles de bonus --- */
.mundo .mundo-meta {
  position: absolute;
  left: 41.25%;
  width: 17.5%;
  text-align: center;
  z-index: 2;
}
.mundo .mundo-meta svg {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(3px 5px 0 #89542744);
}
.mundo .mundo-meta > span {
  display: inline-block;
  margin-top: 6px;
  padding: 7px 10px;
  font: 8px var(--font-pixel);
  color: #77512c;
  background: #fff1c9;
  border: 2px solid #bf8a48;
  box-shadow: 2px 3px #9b713755;
  white-space: nowrap;
}
.mundo .mundo-inicio {
  position: absolute;
  left: 50%;
  translate: -50% 0;
  text-align: center;
  z-index: 2;
}
.mundo .mundo-inicio > span {
  display: inline-block;
  padding: 9px 18px;
  font: 18px var(--font-pixel);
  color: #65502f;
  background: #fff1bd;
  border: 3px solid #734a2f;
  box-shadow: 3px 3px #8f612f;
}
.mundo .mundo-inicio > small {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #765127;
  white-space: nowrap;
}
.mundo .mundo-sector {
  position: absolute;
  left: 10px;
  translate: 0 -50%;
  padding: 7px 8px;
  font: 8px var(--font-pixel);
  color: #99723b;
  background: #fce7afdd;
  border: 1px solid #b98b44;
  z-index: 2;
}
.mundo .mundo-sector span {
  margin-right: 6px;
  font-size: 16px;
  vertical-align: middle;
}
.mundo .mundo-cartel {
  position: absolute;
  translate: -50% 0;
  padding: 6px 8px;
  font: 8px var(--font-pixel);
  color: #796025;
  text-align: center;
  white-space: nowrap;
  background: #fff3cf;
  border: 2px solid #8a743c;
  box-shadow: 2px 3px #76502d44;
  z-index: 3;
}
.mundo .mundo-cartel small {
  display: block;
  margin-top: 4px;
  font: 11px var(--font-body);
}
.mundo[data-mundo='jungle'] .mundo-inicio > span,
.mundo[data-mundo='jungle'] .mundo-meta > span {
  background: #eddfae;
  border-color: #5d7140;
  color: #4d6339;
}
.mundo[data-mundo='castle'] .mundo-inicio > span,
.mundo[data-mundo='castle'] .mundo-meta > span,
.mundo[data-mundo='castle'] .mundo-sector {
  background: #302b44;
  color: #d9c5d7;
  border-color: #8d6d85;
  box-shadow: 2px 3px #15142655;
}
.mundo[data-mundo='castle'] .mundo-inicio > small { color: #c2afc7; }
.mundo[data-mundo='castle'] .mundo-cartel { background: #302b44; color: #e8bdd8; border-color: #987599; }

/* --- nodos: el hitbox es transparente, el sprite es la silueta del control --- */
.mundo .mundo-nodo {
  position: absolute;
  width: 7.2%;
  min-width: 44px;
  max-width: 72px;
  aspect-ratio: 72 / 84;
  padding: 0;
  border: 0;
  background: none;
  transform: translate(-50%, -64%);
  z-index: 4;
  isolation: isolate;
  cursor: default;
}
.mundo .mundo-nodo.alcanzable { cursor: pointer; }
.mundo .mundo-nodo:hover { z-index: 12; }
.mundo .mundo-nodo:focus-visible { outline: 2px dashed #fff5b5; outline-offset: 4px; }
.mundo .mundo-nodo .arte { display: block; width: 100%; height: 100%; }
.mundo .mundo-nodo .node-art {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(2px 3px 0 #271d2830);
}
.mundo .mundo-nodo .object-shell { transform-origin: 36px 70px; transition: translate 0.2s, rotate 0.2s; }
.mundo .mundo-nodo .sprite-glint { opacity: 0; }
.mundo .mundo-nodo .seal-chain { opacity: 0.85; }
.mundo .mundo-nodo.available .object-shell { animation: mundo-respira 2.8s ease-in-out infinite; }
.mundo .mundo-nodo.available .sprite-glint,
.mundo .mundo-nodo.bonus .sprite-glint { animation: mundo-destello 2s steps(2) infinite; }
.mundo .mundo-nodo.available .node-art { filter: drop-shadow(0 0 7px #ffe38fbb); }
.mundo .mundo-nodo.alcanzable:hover .object-shell,
.mundo .mundo-nodo:focus-visible .object-shell { translate: 0 -6px; }
.mundo .mundo-nodo.bonus .bonus-object { animation: mundo-bonus 3.3s ease-in-out infinite; }
.mundo .mundo-nodo.denied .seal-chain,
.mundo .mundo-nodo.denied .object-shell { animation: mundo-cadena 0.45s linear; }
/* El explorador se para debajo del objeto, como Mario debajo de un bloque. */
.mundo .mundo-nodo.player-here .object-shell,
.mundo .mundo-nodo.player-here .sprite-glint { transform: translateY(-32px); }
.mundo[data-mundo='jungle'] .mundo-nodo:hover .object-lid { translate: 0 -5px; }
.mundo[data-mundo='castle'] .mundo-nodo.available .node-art { filter: drop-shadow(0 0 8px #ff6098cc); }
.mundo[data-mundo='castle'] .mundo-nodo.available .portal-core { animation: mundo-portal 2s ease-in-out infinite; }
.mundo[data-mundo='castle'] .mundo-nodo.completed .portal-core { filter: drop-shadow(0 0 4px #81fff0); }

.mundo .mundo-nodo .object-ground {
  position: absolute;
  bottom: 4%;
  left: 8%;
  width: 83%;
  height: 22%;
  border: 2px solid #fff4b6;
  border-radius: 50%;
  box-shadow: 0 0 15px #fff1a4;
  opacity: 0;
  z-index: -1;
}
.mundo .mundo-nodo.available .object-ground { opacity: 0.7; animation: mundo-suelo 2.5s ease-in-out infinite; }
.mundo[data-mundo='castle'] .mundo-nodo .object-ground { border-color: #fc8cc3; box-shadow: 0 0 12px #ec448a88; }

.mundo .mundo-nodo .node-sign {
  position: absolute;
  top: 84%;
  left: 50%;
  translate: -50% 0;
  min-width: 23px;
  padding: 4px 6px;
  font: 9px var(--font-pixel);
  line-height: 1;
  white-space: nowrap;
  color: #694c32;
  background: #fff0b9;
  border: 1px solid #624b32;
  box-shadow: 2px 2px #65432466;
}
.mundo .mundo-nodo.completed .node-sign { background: #e2efcb; color: #3e7650; }
.mundo[data-mundo='jungle'] .mundo-nodo .node-sign { background: #ddbd77; border-color: #59432c; color: #503b23; }
.mundo[data-mundo='castle'] .mundo-nodo .node-sign { background: #352537; border-color: #b58aab; color: #efd5e9; }
.mundo[data-mundo='castle'] .mundo-nodo.completed .node-sign { background: #30454f; color: #b9f3e8; }
/* Va después de los de tema a propósito: el fallado se tiene que leer en los tres mundos. */
.mundo .mundo-nodo.fallado .node-sign { background: #ffd2d2; color: #9b1b3c; border-color: #9b1b3c; }

.mundo .mundo-nodo .node-invitation {
  position: absolute;
  bottom: 105%;
  left: 50%;
  translate: -50% 0;
  padding: 6px 8px;
  font: 7px var(--font-pixel);
  white-space: nowrap;
  color: #774b2e;
  background: #fff7d0;
  border: 2px solid #69462e;
  box-shadow: 2px 2px #0003;
  animation: mundo-invita 1.8s steps(2) infinite;
}
.mundo .mundo-nodo.player-here .node-invitation { bottom: 145%; }
.mundo[data-mundo='jungle'] .mundo-nodo .node-invitation { background: #f4db87; color: #425830; border-color: #4b652e; }
.mundo[data-mundo='castle'] .mundo-nodo .node-invitation { background: #42233a; color: #ffcce6; border-color: #d07ea2; }

/* --- explorador --- */
.mundo .mundo-explorador {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 9;
}

/* --- barra de navegación --- */
.mundo .mundo-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #f8efda;
  border-top: 1px solid #c7b17e;
}
.mundo .mundo-nav > span { font: 8px var(--font-pixel); color: #97713a; }
.mundo .mundo-nav > div { display: flex; flex-wrap: wrap; gap: 6px; }
.mundo .mundo-nav button {
  padding: 7px 10px;
  font-size: 12px;
  color: #7e653b;
  background: #fff9e9;
  border: 1px solid #c3ae7f;
  box-shadow: 0 2px #d1bc8b;
}
.mundo .mundo-nav button[aria-pressed='true'] {
  color: #fff4cf;
  background: #4a6147;
  border-color: #304633;
  box-shadow: 0 2px #304633;
}
.mundo[data-mundo='jungle'] .mundo-nav { background: #e6e9ce; border-color: #909d62; }
.mundo[data-mundo='castle'] .mundo-nav { background: #292538; color: #d0becb; border-color: #756078; }
.mundo[data-mundo='castle'] .mundo-nav button {
  color: #ead9e3;
  background: #393044;
  border-color: #876779;
  box-shadow: 0 2px #171723;
}

@keyframes mundo-moneda { 50% { transform: translateY(-4px); filter: brightness(1.15); } }
@keyframes mundo-flor { 50% { transform: translateY(8px); } }
@keyframes mundo-nube { 50% { transform: translateX(10px); } }
@keyframes mundo-antorcha { 50% { opacity: 0.7; transform: translateY(3px); } }
@keyframes mundo-respira { 50% { translate: 0 -3px; } }
@keyframes mundo-destello { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
@keyframes mundo-bonus { 50% { translate: 0 -5px; rotate: 3deg; } }
@keyframes mundo-portal { 50% { opacity: 0.7; filter: drop-shadow(0 0 4px #ff83b5); } }
@keyframes mundo-invita { 50% { translate: -50% -4px; } }
@keyframes mundo-suelo { 50% { scale: 1.12; opacity: 0.3; } }
@keyframes mundo-cadena { 20%, 60% { translate: -3px 0; } 40%, 80% { translate: 3px 0; } }

@media (max-width: 700px) {
  .mundo .mundo-nav { flex-wrap: wrap; justify-content: center; }
  .mundo .mundo-nav > span { display: none; }
  .mundo .mundo-viewport { height: 65vh; min-height: 390px; max-height: 620px; }
  .mundo .mundo-nodo .node-sign { font-size: 7px; min-width: 19px; padding: 3px 4px; }
  .mundo .mundo-meta > span, .mundo .mundo-sector { font-size: 5px; padding: 4px; }
  .mundo .mundo-inicio > span { font-size: 12px; padding: 6px 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .mundo .trail-coin > g,
  .mundo .desert-flower,
  .mundo .desert-cloud > g,
  .mundo .torch-flame,
  .mundo .mundo-nodo *,
  .mundo .mundo-nodo .node-invitation {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 3: Crear `mundo-vertical.ts`**

Crear `frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.ts`:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AvatarService } from '../../../core/avatar/avatar.service';
import { AvatarSprite } from '../../../shared/ui/avatar-sprite';
import { Casillero, etiquetaCasillero } from '../casillero';
import { APARIENCIA, arteMeta, EstadoArte, estadoArte, Tema } from './mundo-appearance';
import { arteNodo, verboNodo } from './mundo-arte-nodo';
import { decorado, sectores, topInicio, topMeta, trazadoRuta } from './mundo-escenario';
import {
  generarRuta,
  medirRuta,
  PuntoPct,
  puntoEnRuta,
  ramalBonus,
  recorrido,
  Ruta,
} from './mundo-ruta';

/** Velocidad de caminata sobre la curva, en unidades lógicas del mundo por segundo. */
const VELOCIDAD = 520;
/** Duración de la sacudida de cadena al tocar un nodo que todavía no se alcanza. */
const MS_DENEGADO = 450;

interface NodoMundo {
  c: Casillero;
  /** Posición en % del mundo. */
  p: PuntoPct;
  /** Índice 0-based en el camino principal, o null si es un bonus (`hito`) en un ramal. */
  paso: number | null;
  estado: EstadoArte;
  arte: SafeHtml;
  cartel: string;
}

/**
 * Mapa panorámico de una unidad: port del mapa vertical del prototipo
 * `feature/integrar-prototipo-mapas` (desierto / selva / castillo).
 *
 * El mundo mide 1600 unidades lógicas de ancho y crece hacia arriba según la cantidad de
 * nodos. Todo se posiciona en % sobre un contenedor con ese aspect-ratio, así que escala
 * con el ancho disponible sin recalcular nada.
 *
 * Es solo presentación. Qué casillero es alcanzable y qué muestra la ficha lo decide
 * `UnidadMapa`; acá solo se dibuja y se camina. El avatar recorre únicamente el camino
 * principal: un bonus se abre desde donde está parado el avatar, sin ir hasta él.
 *
 * `ViewEncapsulation.None` porque la ruta, el decorado y el arte de nodo llegan como SVG
 * por `[innerHTML]` y los estilos encapsulados no los alcanzarían. Todo selector de
 * `mundo-vertical.css` cuelga de `.mundo`.
 */
@Component({
  selector: 'app-mundo-vertical',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [AvatarSprite, UpperCasePipe],
  styleUrl: './mundo-vertical.css',
  host: { '(document:keydown.escape)': 'expandido.set(false)' },
  template: `
    <div #raiz class="mundo" [attr.data-mundo]="tema()" [class.expandido]="expandido()">
      <div
        #viewport
        class="mundo-viewport"
        role="region"
        tabindex="0"
        [attr.aria-label]="'Mapa de la unidad. Subí para seguir el camino ' + rumbo() + '.'"
        (wheel)="siguiendo.set(false)"
        (touchmove)="siguiendo.set(false)"
      >
        <div
          #mundo
          class="mundo-world"
          [style.aspect-ratio]="aspecto()"
          [style.background-color]="apariencia().suelo"
          [style.background-image]="'url(' + apariencia().tile + ')'"
        >
          <div class="mundo-terreno" [innerHTML]="terreno()"></div>

          <div class="mundo-meta" [style.top.%]="metaTop()">
            <div [innerHTML]="meta()"></div>
            <span>LA META DE TU AVENTURA</span>
          </div>
          <div class="mundo-inicio" [style.top.%]="inicioTop()">
            <span>START</span>
            <small>Tu aventura empieza aquí</small>
          </div>
          @for (s of sectoresAscenso(); track s.etiqueta) {
            <div class="mundo-sector" [style.top.%]="s.top"><span>↑</span>{{ s.etiqueta }}</div>
          }

          @for (n of nodos(); track n.c.a.id) {
            @if (n.paso === null) {
              <div
                class="mundo-cartel"
                [style.left.%]="n.p[0]"
                [style.top]="'calc(' + n.p[1] + '% + 32px)'"
              >
                ★ BONUS<small>Desafío opcional</small>
              </div>
            }
            <button
              type="button"
              class="mundo-nodo"
              [class.locked]="n.estado === 'locked'"
              [class.available]="n.estado === 'available'"
              [class.completed]="n.estado === 'completed'"
              [class.fallado]="n.c.estado === 'fallado'"
              [class.bonus]="n.paso === null"
              [class.alcanzable]="n.c.alcanzable"
              [class.player-here]="n.paso === pasoAvatar() && !caminando()"
              [class.denied]="denegado() === n.c.a.id"
              [style.left.%]="n.p[0]"
              [style.top.%]="n.p[1]"
              [attr.tabindex]="n.c.alcanzable ? 0 : -1"
              [attr.aria-label]="etiqueta(n)"
              [attr.aria-disabled]="!n.c.alcanzable"
              [title]="n.c.a.nombre"
              (click)="tocar(n)"
            >
              <span class="object-ground"></span>
              <span class="arte" [innerHTML]="n.arte"></span>
              <span class="node-sign">{{ n.cartel }}</span>
              @if (n.paso === pasoAvatar() && n.estado === 'available' && !caminando()) {
                <span class="node-invitation">{{ verbo(n) }}</span>
              }
            </button>
          }

          <div class="mundo-explorador" [style.left.%]="pos()[0]" [style.top.%]="pos()[1]">
            <ui-avatar-sprite
              [config]="avatarSrv.avatar()"
              [alto]="52"
              [sombra]="true"
              [caminando]="caminando()"
              [mirando]="mirando()"
            />
          </div>
        </div>
      </div>

      <div class="mundo-nav">
        <span>↑ RUMBO {{ rumbo() | uppercase }}</span>
        <div>
          <button type="button" (click)="verMeta()">Ver {{ apariencia().meta }} ↑</button>
          <button type="button" [attr.aria-pressed]="siguiendo()" (click)="seguir()">Mi personaje</button>
          <button type="button" (click)="verInicio()">Inicio ↓</button>
          <button
            type="button"
            [attr.aria-pressed]="ampliado() || expandido()"
            (click)="alternarPantallaCompleta()"
          >
            {{ ampliado() || expandido() ? '✕ Salir' : '⛶ Ampliar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MundoVertical {
  readonly tema = input.required<Tema>();
  readonly casilleros = input.required<Casillero[]>();
  /** El alumno tocó un casillero alcanzable: `UnidadMapa` abre su ficha. */
  readonly elegir = output<Casillero>();

  protected readonly avatarSrv = inject(AvatarService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly raiz = viewChild.required<ElementRef<HTMLDivElement>>('raiz');
  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly mundo = viewChild.required<ElementRef<HTMLDivElement>>('mundo');

  // ---------- geometría ----------

  private readonly principales = computed(() =>
    this.casilleros().filter((c) => c.a.tipo !== 'hito'),
  );
  private readonly bonus = computed(() => this.casilleros().filter((c) => c.a.tipo === 'hito'));
  private readonly ruta = computed<Ruta>(() =>
    generarRuta(this.principales().length, APARIENCIA[this.tema()].carriles),
  );
  private readonly ramales = computed(() => this.bonus().map((_, k) => ramalBonus(this.ruta(), k)));

  protected readonly apariencia = computed(() => APARIENCIA[this.tema()]);
  protected readonly rumbo = computed(() => {
    const meta = this.apariencia().meta;
    return meta === 'fortaleza' ? 'a la fortaleza' : `al ${meta}`;
  });
  protected readonly aspecto = computed(
    () => `${this.ruta().worldWidth} / ${this.ruta().worldHeight}`,
  );
  protected readonly terreno = computed(() => {
    const ruta = this.ruta();
    const ramales = this.ramales();
    return this.confiable(
      trazadoRuta(ruta, ramales) + decorado(this.tema(), ruta, ramales.map((r) => r.hasta)),
    );
  });
  protected readonly meta = computed(() => this.confiable(arteMeta(this.tema())));
  protected readonly metaTop = computed(() => topMeta(this.ruta()));
  protected readonly inicioTop = computed(() => topInicio(this.ruta()));
  protected readonly sectoresAscenso = computed(() => sectores(this.ruta()));

  protected readonly nodos = computed<NodoMundo[]>(() => {
    const tema = this.tema();
    const ruta = this.ruta();
    const principales = this.principales();
    const ramales = this.ramales();
    const delCamino = principales.map((c, j): NodoMundo => {
      const estado = estadoArte(c.estado);
      return {
        c,
        p: ruta.stops[j + 1],
        paso: j,
        estado,
        arte: this.confiable(
          arteNodo(tema, estado, { final: j === principales.length - 1, bonus: false }),
        ),
        // El ✕ del fallado va en el cartel: el estado se lee por ícono y no solo por color (05 §7).
        cartel: c.estado === 'fallado' ? `✕ ${j + 1}` : String(j + 1),
      };
    });
    const deRamal = this.bonus().map((c, k): NodoMundo => {
      const estado = estadoArte(c.estado);
      return {
        c,
        p: ramales[k].hasta,
        paso: null,
        estado,
        arte: this.confiable(arteNodo(tema, estado, { final: false, bonus: true })),
        cartel: c.estado === 'fallado' ? '✕ ★' : '★',
      };
    });
    return [...delCamino, ...deRamal];
  });

  // ---------- avatar y cámara ----------

  protected readonly pasoAvatar = signal(0);
  protected readonly pos = signal<PuntoPct>([50, 90]);
  protected readonly caminando = signal(false);
  protected readonly mirando = signal<'derecha' | 'izquierda'>('derecha');
  /** La cámara acompaña al avatar hasta que el alumno scrollea a mano. */
  protected readonly siguiendo = signal(true);
  protected readonly denegado = signal<string | null>(null);
  /** Pantalla completa nativa (Fullscreen API). */
  protected readonly ampliado = signal(false);
  /** Respaldo sin Fullscreen API: el mapa ocupa toda la ventana por CSS. */
  protected readonly expandido = signal(false);
  private raf = 0;
  /** Destino tocado mientras el avatar caminaba: se encadena al llegar. */
  private pendiente: number | null = null;

  constructor() {
    // Al abrir la unidad (o cuando llega el progreso) el avatar aparece parado en el frente
    // del camino principal y la cámara se centra en él.
    effect(() => {
      const principales = this.principales();
      const ruta = this.ruta();
      if (this.raf !== 0) return;
      const frente = principales.findIndex((c) => c.estado !== 'completado');
      const destino = frente === -1 ? principales.length - 1 : frente;
      this.pasoAvatar.set(destino);
      this.pos.set(ruta.stops[destino + 1]);
      // Un frame después: recién ahí el mundo tiene su alto real y el scroll es válido.
      requestAnimationFrame(() => this.enfocar(ruta.stops[destino + 1]));
    });

    const alCambiarPantalla = (): void => {
      this.ampliado.set(document.fullscreenElement === this.raiz().nativeElement);
      requestAnimationFrame(() => this.enfocar(this.pos()));
    };
    document.addEventListener('fullscreenchange', alCambiarPantalla);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', alCambiarPantalla);
      cancelAnimationFrame(this.raf);
    });
  }

  protected tocar(n: NodoMundo): void {
    if (!n.c.alcanzable) {
      this.denegado.set(n.c.a.id);
      setTimeout(() => this.denegado.set(null), MS_DENEGADO);
      return;
    }
    this.elegir.emit(n.c);
    if (n.paso !== null) this.irA(n.paso);
  }

  private irA(paso: number): void {
    if (this.caminando()) {
      this.pendiente = paso;
      return;
    }
    if (paso !== this.pasoAvatar()) this.caminar(paso);
  }

  /**
   * Camina sobre la curva dibujada a velocidad constante: la duración sale de la longitud
   * real del recorrido, así que un tramo largo tarda más que uno corto.
   */
  private caminar(destino: number): void {
    const ruta = this.ruta();
    const trayecto = medirRuta(
      recorrido(ruta, this.pasoAvatar(), destino),
      ruta.worldWidth,
      ruta.worldHeight,
    );
    const duracion = (trayecto.distance / VELOCIDAD) * 1000;
    const t0 = performance.now();
    this.caminando.set(true);
    this.siguiendo.set(true);

    const tick = (t: number): void => {
      const k = duracion > 0 ? Math.min(1, (t - t0) / duracion) : 1;
      const p = puntoEnRuta(trayecto, k);
      const antes = this.pos();
      if (Math.abs(p[0] - antes[0]) > 0.01) this.mirando.set(p[0] > antes[0] ? 'derecha' : 'izquierda');
      this.pos.set(p);
      if (this.siguiendo()) this.enfocar(p);
      if (k < 1) {
        this.raf = requestAnimationFrame(tick);
        return;
      }
      this.raf = 0;
      this.pasoAvatar.set(destino);
      this.caminando.set(false);
      const siguiente = this.pendiente;
      this.pendiente = null;
      if (siguiente !== null && siguiente !== destino) this.caminar(siguiente);
    };
    this.raf = requestAnimationFrame(tick);
  }

  protected verMeta(): void {
    this.siguiendo.set(false);
    this.viewport().nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected verInicio(): void {
    this.siguiendo.set(false);
    const vp = this.viewport().nativeElement;
    vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
  }

  protected seguir(): void {
    this.siguiendo.set(true);
    this.enfocar(this.pos(), 'smooth');
  }

  protected async alternarPantallaCompleta(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (this.expandido()) {
      this.expandido.set(false);
      return;
    }
    try {
      await this.raiz().nativeElement.requestFullscreen();
    } catch {
      // Sin Fullscreen API (p. ej. Safari en iPhone): se ocupa toda la ventana por CSS.
      this.expandido.set(true);
      requestAnimationFrame(() => this.enfocar(this.pos()));
    }
  }

  private enfocar([, y]: PuntoPct, comportamiento: ScrollBehavior = 'auto'): void {
    const vp = this.viewport().nativeElement;
    const alto = this.mundo().nativeElement.clientHeight;
    vp.scrollTo({ top: (y / 100) * alto - vp.clientHeight / 2, behavior: comportamiento });
  }

  // ---------- presentación ----------

  protected etiqueta(n: NodoMundo): string {
    return etiquetaCasillero(n.c) + (n.paso === null ? ', bonus' : '');
  }

  protected verbo(n: NodoMundo): string {
    return verboNodo(this.tema(), n.estado);
  }

  /**
   * El HTML se arma acá, solo con constantes y números: nunca lleva texto del usuario, que
   * va únicamente en bindings de Angular. Por eso se puede saltear el sanitizer, que si no
   * borraría el SVG entero.
   */
  private confiable(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
```

- [ ] **Step 4: Conectar `MundoVertical` en `UnidadMapa`**

Hay tres cambios en `frontend/src/app/features/alumno/unidad-mapa.ts`.

(a) Imports. Reemplazar:

```ts
import { Casillero } from './casillero';
import { TableroPlano } from './tablero-plano';
```

por:

```ts
import { Casillero } from './casillero';
import { temaDeOrden } from './mundo-vertical/mundo-appearance';
import { MundoVertical } from './mundo-vertical/mundo-vertical';
import { TableroPlano } from './tablero-plano';
```

y en el decorador reemplazar `imports: [Hud, RouterLink, TableroPlano, UpperCasePipe],` por `imports: [Hud, MundoVertical, RouterLink, TableroPlano, UpperCasePipe],`.

(b) JSDoc y template. Reemplazar:

```ts
 * casillero elegido. El dibujo del recorrido lo delega en un render: `TableroPlano`.
 */
```

por:

```ts
 * casillero elegido. El dibujo del recorrido lo delega en uno de dos renders:
 * `MundoVertical` (unidades 1-3, el mapa panorámico del prototipo
 * `feature/integrar-prototipo-mapas`) o `TableroPlano` (el resto).
 */
```

Y reemplazar:

```html
      <div class="relative overflow-hidden border-2 border-secondary bg-brand-night chaflan">
        <app-tablero-plano
          [casilleros]="casilleros()"
          [nombreUnidad]="u.nombre"
          (elegir)="sel.set($event)"
        />
```

por:

```html
      <!-- Sin chaflán para el mundo: su clip-path recortaría el modo "expandido" (position:
           fixed) que MundoVertical usa cuando no hay Fullscreen API. -->
      <div
        class="relative overflow-hidden border-2 border-secondary bg-brand-night"
        [class.chaflan]="!tema()"
      >
        @if (tema(); as t) {
          <app-mundo-vertical [tema]="t" [casilleros]="casilleros()" (elegir)="sel.set($event)" />
        } @else {
          <app-tablero-plano
            [casilleros]="casilleros()"
            [nombreUnidad]="u.nombre"
            (elegir)="sel.set($event)"
          />
        }
```

(c) Agregar el `computed` `tema` justo debajo de `protected readonly unidad = computed(...)`:

```ts
  /**
   * Mundo panorámico de la unidad, o null para dibujarla con el tablero plano. Pasa lo
   * segundo si la unidad no tiene mundo en el prototipo (orden 4+) o si no tiene ningún
   * nodo en el camino principal (una ruta necesita al menos uno; los `hito` van en ramales).
   */
  protected readonly tema = computed(() => {
    const u = this.unidad();
    if (!u || !u.actividades.some((a) => a.tipo !== 'hito')) return null;
    return temaDeOrden(u.orden);
  });
```

- [ ] **Step 5: Verificar build y tests**

Run (desde `frontend/`): `npx ng build`
Expected: `Application bundle generation complete.` sin errores. Los warnings preexistentes no cuentan. `unidad-mapa` sigue apareciendo como lazy chunk y las imágenes de `public/mundos/` se copian a `dist/frontend/browser/mundos/`.

Run (desde `frontend/`): `npx ng test --watch=false`
Expected: `Test Files 8 passed (8)` y `Tests 53 passed (53)`. Esta tarea no agrega tests.

- [ ] **Step 6: Verificar en el navegador los tres mundos y el tablero plano**

Con el front levantado (`preview_start`, `name: "frontend"`) en un viewport de 1440×900, entrar como **ALUMNO**. En cada punto, sacar screenshot como evidencia y correr `read_console_messages` con `onlyErrors: true` (tiene que devolver "No console logs.").

1. `http://localhost:4200/alumno/unidad/u1` → **desierto**:
   - Fondo de arena con textura y camino de arena curvo que sube.
   - 6 cajas: las 1-3 con ✓ (completadas), la 4 brillando con el cartel "¡GOLPEA!", la 5 con cadena de sello y la 6 como bandera final.
   - START abajo, castillo arriba, cartel "SECTOR 01" y barra inferior "↑ RUMBO AL CASTILLO".
   - El avatar arranca parado en la caja 4 y la cámara está centrada en él.
2. Click en la caja 1: se abre la ficha "Teoría" debajo del mapa y el avatar baja caminando por la curva, con la cámara siguiéndolo.
3. Click en la caja 6: la cadena se sacude y no se abre ninguna ficha.
4. "Ver castillo ↑" sube hasta la meta. "Mi personaje" vuelve al avatar y queda marcado (`aria-pressed="true"`). "⛶ Ampliar" pasa a pantalla completa (o a ventana completa si el panel no la permite); "✕ Salir" o `Esc` vuelve.
5. `http://localhost:4200/alumno/unidad/u2` → **selva**: barriles con cadena (todo bloqueado para `alu-01`), templo arriba y "↑ RUMBO AL TEMPLO".
6. `http://localhost:4200/alumno/unidad/u3` → **castillo**: portales sellados, fortaleza arriba y "↑ RUMBO A LA FORTALEZA".
7. `http://localhost:4200/alumno/unidad/u4` → **tablero plano**, idéntico al de antes (sin mundo, con chaflán).
8. `read_network_requests` con `urlPattern: "mundos/"`: las tres texturas responden 200. Cada una se pide solo al entrar a su unidad.

- [ ] **Step 7: Commit**

```bash
git add frontend/public/mundos frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.ts frontend/src/app/features/alumno/mundo-vertical/mundo-vertical.css frontend/src/app/features/alumno/unidad-mapa.ts
git commit -m "feat: mapa panorámico por unidad (desierto, selva y castillo)

Integra el mapa vertical del prototipo feature/integrar-prototipo-mapas
como render de las unidades 1-3: ruta procedural sobre textura temática,
arte de nodo por mundo, avatar que camina la curva con cámara que lo
sigue y pantalla completa. Usa el progreso y el AvatarSprite reales; la
unidad 4 sigue con el tablero plano.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: "👁 VER MAPA" para unidades bloqueadas (`mapa.ts`)

Hoy una unidad bloqueada por XP no tiene cómo entrarse: la ficha del mapa general solo dice "🔒 NECESITÁS X XP MÁS". Se agrega un botón secundario que lleva a la misma ruta que "▶ ENTRAR A LA UNIDAD".

La progresión no cambia. En una unidad no alcanzada todos los nodos tienen estado `bloqueado`, así que el único alcanzable es el primero (`tope = 0` en `UnidadMapa.casilleros`), y su ficha muestra "▶ COMENZAR" deshabilitado (`c.estado !== 'habilitado'`). Se puede mirar el mapa, pero no jugarlo.

**Files:**
- Modify: `frontend/src/app/features/alumno/mapa.ts` (ficha de la isla seleccionada, líneas 338-346)

**Interfaces:**
- Consumes: `Mapa.entrar(i: Isla)` (existente; navega a `['/alumno/unidad', i.u.id]`).
- Produces: nada nuevo.

- [ ] **Step 1: Agregar el botón**

En `frontend/src/app/features/alumno/mapa.ts`, reemplazar:

```html
            @if (isla.estado === 'bloqueada') {
              <p class="ui-font mt-3 text-[8px] leading-relaxed text-error">
                🔒 NECESITÁS {{ isla.u.umbralXpDesbloqueo - xp() }} XP MÁS
              </p>
            } @else {
```

por:

```html
            @if (isla.estado === 'bloqueada') {
              <p class="ui-font mt-3 text-[8px] leading-relaxed text-error">
                🔒 NECESITÁS {{ isla.u.umbralXpDesbloqueo - xp() }} XP MÁS
              </p>
              <!-- Mirar el mapa de una unidad todavía no alcanzada. Adentro los nodos siguen
                   con su estado real (bloqueados): la progresión no cambia, no se puede jugar. -->
              <button
                class="btn btn-outline btn-secondary btn-sm ui-font mt-2 w-full text-[8px]"
                (click)="entrar(isla)"
              >
                👁 VER MAPA
              </button>
            } @else {
```

- [ ] **Step 2: Verificar build y tests**

Run (desde `frontend/`): `npx ng build`
Expected: `Application bundle generation complete.` sin errores.

Run (desde `frontend/`): `npx ng test --watch=false`
Expected: `Test Files 8 passed (8)` y `Tests 53 passed (53)`.

- [ ] **Step 3: Verificar en el navegador**

Con el front levantado en 1440×900, entrar como **ALUMNO** en `http://localhost:4200/alumno`:

1. Click en la isla 2 ("Estructuras de control"). La ficha muestra "🔒 NECESITÁS 150 XP MÁS" (umbral 500 − 350 XP de `alu-01`) y, debajo, "👁 VER MAPA".
2. Click en "👁 VER MAPA": navega a `/alumno/unidad/u2` y se ve el mundo **selva** con todos los barriles sellados.
3. Click en el barril 1: se abre su ficha con "▶ COMENZAR" **deshabilitado**. Click en el barril 2: cadena que se sacude, sin ficha.
4. Volver al mapa y hacer click en la isla 1 ("Fundamentos"): la ficha sigue mostrando solo "▶ ENTRAR A LA UNIDAD", sin "VER MAPA".
5. `read_console_messages` con `onlyErrors: true` → "No console logs."

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/alumno/mapa.ts
git commit -m "feat: botón VER MAPA para mirar el mapa de una unidad bloqueada

Permite entrar a ver el mundo de cualquier unidad desde el mapa general.
Adentro los nodos conservan su estado real, así que la progresión
secuencial no cambia: se puede mirar el recorrido, no jugarlo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Deuda técnica, dudas abiertas y verificación final

`path/deuda-tecnica/AGENTS.md` distingue dos casos. **Deuda** es lo que el equipo puede pagar solo más adelante y va a `path/deuda-tecnica/`. **Duda** es lo que necesita que otra persona decida y va a `path/README.md` §6. Con ese criterio, de lo que el spec §8 listaba como "deuda":

- El peso de las texturas es **deuda**: ítem #5 de `tarea-deuda-05-design-system.md`.
- El mundo de la unidad 4 y la restricción por rol de "VER MAPA" son **dudas**: #11 y #12 de `path/README.md` §6.

**Files:**
- Modify: `path/deuda-tecnica/tarea-deuda-05-design-system.md`
- Modify: `path/deuda-tecnica/README.md`
- Modify: `path/README.md` (§6)
- Modify: `docs/superpowers/specs/2026-09-11-mundo-vertical-unidad-design.md` (§8)

**Interfaces:** no aplica (solo documentación).

- [ ] **Step 1: Deuda #2: sumar el mundo panorámico a "Dónde vive"**

En `path/deuda-tecnica/tarea-deuda-05-design-system.md`, reemplazar (el texto que dejó la Task 5):

```markdown
`casilleros()` (compartido por los dos renders de la unidad).
```

por:

```markdown
`casilleros()` (compartido por los dos renders de la unidad). El mapa panorámico tiene la
misma limitación: `generarRuta` en `frontend/src/app/features/alumno/mundo-vertical/mundo-ruta.ts`
encadena los nodos del camino principal por orden.
```

- [ ] **Step 2: Deuda #5 nueva**

Agregar al final de `path/deuda-tecnica/tarea-deuda-05-design-system.md`:

```markdown

---

## 🔴 5. Las texturas de los mundos pesan ~8 MB sin optimizar

**Qué falta:** comprimir las tres texturas del mapa panorámico de unidad:
`mapa_desierto_tile_vertical.png` (2,1 MB), `mapa_selva_tile.png` (3,0 MB) y
`mapa_castillo_tile.png` (2,9 MB). Llegaron tal cual del prototipo
`feature/integrar-prototipo-mapas`, sin ninguna optimización.

**Dónde vive:** `frontend/public/mundos/`, referenciadas desde `APARIENCIA` en
`frontend/src/app/features/alumno/mundo-vertical/mundo-appearance.ts`.

**Por qué no bloquea la tarea actual:** no están en el bundle inicial. Cada una se pide
recién al entrar a su unidad y después queda en la caché del navegador, así que el mapa
funciona y se ve igual.

**Cómo se paga:** convertirlas a WebP (o PNG cuantizado) con un ancho acorde a su uso
(`background-size: 100% auto` sobre un mapa que rara vez pasa de 1600 px de ancho) y
actualizar las rutas en `APARIENCIA`. Sin trigger claro todavía: conviene hacerlo antes del
primer deploy real del front.
```

- [ ] **Step 3: Actualizar el índice de deuda**

En `path/deuda-tecnica/README.md`, reemplazar la fila:

```markdown
| [tarea-deuda-05-design-system.md](tarea-deuda-05-design-system.md) | `05-design-system.md` | 4 | 0 |
```

por:

```markdown
| [tarea-deuda-05-design-system.md](tarea-deuda-05-design-system.md) | `05-design-system.md` | 4 | 1 |
```

(La fila decía "4 abiertos, 0 pagados", pero el ítem #1 ya estaba pagado desde G9. Con el #5 nuevo quedan 4 abiertos, del #2 al #5, y 1 pagado.)

Y reemplazar:

```markdown
**Total: 19 ítems abiertos, 2 pagados.** Última revisión: al rediseñar el front sobre la
```

por:

```markdown
**Total: 19 ítems abiertos, 3 pagados.** Última revisión: al integrar el mapa panorámico por
unidad del prototipo `feature/integrar-prototipo-mapas`. Sumó el ítem #5 de
`05-design-system.md` (peso de las texturas de los mundos) y corrigió la fila de ese
archivo, que contaba como abierto el ítem #1, pagado en G9. Antes: al rediseñar el front sobre la
```

- [ ] **Step 4: Dudas abiertas #11 y #12**

En `path/README.md` §6, reemplazar:

```markdown
    nombrado oficial (temático, tipo rangos), o los nombres los pone siempre el profesor?
```

por:

```markdown
    nombrado oficial (temático, tipo rangos), o los nombres los pone siempre el profesor?
11. **Mundo panorámico de la unidad 4 en adelante** — ⚠️ *surgida al implementar.* El prototipo
    `feature/integrar-prototipo-mapas` define tres mundos (desierto, selva, castillo), que se
    asignan a las unidades 1-3 por orden. La 4 ("Estructuras de datos") y cualquier unidad
    nueva siguen con el tablero plano. ¿Se diseña un 4º mundo, se reciclan los tres en ciclo,
    o el tablero plano queda como diseño definitivo para las unidades sin mundo?
12. **Quién puede entrar al mapa de una unidad bloqueada** — ⚠️ *surgida al implementar.* El
    mapa general tiene ahora "👁 VER MAPA" en las unidades bloqueadas por XP, para poder
    revisar los mundos implementados. Adentro no se puede jugar nada: los nodos siguen
    bloqueados. ¿Esa vista previa es para todos los alumnos o se restringe a PROFESOR/ADMIN?
    Si es lo segundo, se resuelve con un guard de ruta sobre `/alumno/unidad/:id`, sin tocar el mapa.
```

- [ ] **Step 5: Alinear el spec §8 con esta clasificación**

En `docs/superpowers/specs/2026-09-11-mundo-vertical-unidad-design.md`, reemplazar:

```markdown
## 8. Fuera de alcance / deuda técnica a registrar durante la implementación
```

por:

```markdown
## 8. Fuera de alcance: deuda técnica y dudas abiertas

Clasificado según `path/deuda-tecnica/AGENTS.md`. Lo que el equipo puede pagar solo va a
deuda (`tarea-deuda-05-design-system.md` #5, el peso de las imágenes). Lo que necesita que
otra persona decida va a las dudas abiertas de `path/README.md` §6: #11 (el mundo de la
unidad 4) y #12 (el rol para "VER MAPA").
```

- [ ] **Step 6: Verificación final completa**

Run (desde `frontend/`): `npx ng build`
Expected: `Application bundle generation complete.` sin errores.

Run (desde `frontend/`): `npx ng test --watch=false`
Expected: `Test Files 8 passed (8)` y `Tests 53 passed (53)`.

En el navegador (1440×900), revisar lo que no se tocó:

1. Entrar como **PROFESOR**. En `http://localhost:4200/profesor`, la lista de unidades y el "Preview del mapa" se ven como antes.
2. En `/profesor/unidad/u1`, las pestañas "Lista" y "Mapa de nodos" funcionan y arrastrar un nodo lo reubica.
3. Entrar como **ALUMNO** y repetir en `/alumno/unidad/u1`, `/alumno/unidad/u2` y `/alumno/unidad/u4` el recorrido rápido de la Task 6, Step 6.
4. `read_console_messages` con `onlyErrors: true` → "No console logs." en todas las pantallas.

Run (desde la raíz): `git status --short` y `git log --oneline -8`
Expected: el árbol de trabajo queda limpio después del commit del Step 7. En el log aparecen, en orden, los commits de las Tasks 1-7 y encima el de este paso.

- [ ] **Step 7: Commit**

```bash
git add path/deuda-tecnica/tarea-deuda-05-design-system.md path/deuda-tecnica/README.md path/README.md docs/superpowers/specs/2026-09-11-mundo-vertical-unidad-design.md
git commit -m "docs: deuda y dudas abiertas del mapa panorámico por unidad

Registra el peso de las texturas como deuda (#5 de 05-design-system)
y como dudas abiertas el mundo de la unidad 4 y el rol que puede usar
VER MAPA. Corrige el índice de deuda, que contaba como abierto un ítem
ya pagado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: No pushear**

Informar al usuario el resultado (commits, tests y screenshots de los tres mundos) y **preguntar** antes de hacer `git push origin pruebas-iker`.
