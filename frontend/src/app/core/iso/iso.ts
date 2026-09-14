/**
 * Proyección isométrica y layout procedural del mapa de islas.
 *
 * Es la implementación en SVG del contrato descrito en `path/04-engine-2-5d.md`: mismas
 * reglas (posición **siempre calculada**, ruido determinista por índice, reflow solo al
 * agregar/quitar unidades), pero con matemática 2D en vez de three.js — sin dependencias
 * nuevas, y con nodos que siguen siendo DOM (accesibles y focusables, 05 §5/§7).
 *
 * Si más adelante entra el engine con three.js, `layoutIslas()` es lo único que se
 * reutiliza tal cual: devuelve coordenadas de mundo, no píxeles.
 */

/** Punto en el mundo isométrico. `y` es profundidad, `z` es altura (flotación). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Punto {
  x: number;
  y: number;
}

/** Tile 2:1 — la proporción clásica del pixel-art isométrico. */
export const TILE_W = 64;
export const TILE_H = 32;

/** Mundo → pantalla. La altura (`z`) solo levanta el sprite, no lo desplaza en x. */
export function proyectar(v: Vec3): Punto {
  return {
    x: (v.x - v.y) * (TILE_W / 2),
    y: (v.x + v.y) * (TILE_H / 2) - v.z,
  };
}

export interface LayoutOpts {
  /** Avance por unidad sobre el eje **horizontal de pantalla** (u = x − y). */
  pasoU?: number;
  /** Descenso por unidad sobre el eje **vertical de pantalla** (w = x + y). */
  pasoW?: number;
  /** Amplitud del zig-zag vertical: sin esto el mapa es una diagonal recta y aburrida. */
  zigzag?: number;
  /** Desorden determinista para que no se lea como una grilla (04 §4). */
  jitter?: number;
  /** Altura de flotación alternada, en px de pantalla. */
  alturas?: readonly number[];
}

/**
 * Ruta serpenteante que avanza hacia la derecha alternando arriba/abajo. Elegida sobre la
 * serpentina en filas de 04 §4 porque el mapa se recorre con **paneo horizontal** (04 §9):
 * una cinta larga se lee mejor que un bloque que crece hacia abajo, y es lo que muestra la
 * referencia de estilo.
 *
 * El layout se parametriza en los **ejes de pantalla** (`u` horizontal, `w` vertical) y
 * recién después se convierte a coordenadas de mundo. Parametrizarlo directo en `x`/`y`
 * de mundo es la trampa: como la proyección resta (`u = x − y`), un zig-zag simétrico en
 * mundo se amplifica en horizontal y termina apilando islas encima de las anteriores.
 *
 * Determinista: la unidad `i` cae siempre en el mismo lugar, con o sin las demás.
 */
export function layoutIslas(n: number, o: LayoutOpts = {}): Vec3[] {
  const { pasoU = 8.2, pasoW = 2.6, zigzag = 2.2, jitter = 0.5, alturas = [0, 28, 10, 36] } = o;
  const out: Vec3[] = [];

  for (let i = 0; i < n; i++) {
    // ruido determinista por índice — mismo input, mismo output (04 §4)
    const u = i * pasoU + ruido(i * 127.1) * jitter;
    const w = i * pasoW + (i % 2 === 0 ? -zigzag : zigzag) + ruido(i * 311.7) * jitter;

    out.push({
      x: (u + w) / 2,
      y: (w - u) / 2,
      z: alturas[i % alturas.length],
    });
  }
  return out;
}

/** Ruido pseudo-aleatorio en [-0.5, 0.5], estable para el mismo `semilla`. */
function ruido(semilla: number): number {
  const r = Math.sin(semilla) * 43758.5453;
  return r - Math.floor(r) - 0.5;
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Bounding box de los puntos proyectados, con margen — de acá sale el `viewBox`. */
export function caja(puntos: readonly Punto[], margen: number): Caja {
  if (puntos.length === 0) return { x: 0, y: 0, ancho: 800, alto: 500 };
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const x = Math.min(...xs) - margen;
  const y = Math.min(...ys) - margen;
  return {
    x,
    y,
    ancho: Math.max(...xs) + margen - x,
    alto: Math.max(...ys) + margen - y,
  };
}

/** Rombo (cara superior de la isla) como lista de puntos para un `<polygon>`. */
export function rombo(c: Punto, semiAncho: number, semiAlto: number): string {
  return [
    `${c.x},${c.y - semiAlto}`,
    `${c.x + semiAncho},${c.y}`,
    `${c.x},${c.y + semiAlto}`,
    `${c.x - semiAncho},${c.y}`,
  ].join(' ');
}

/** Cara lateral extruida hacia abajo — es lo que convierte el rombo en un volumen. */
export function caraLateral(
  c: Punto,
  semiAncho: number,
  semiAlto: number,
  espesor: number,
  lado: 'izq' | 'der',
): string {
  const sx = lado === 'izq' ? -semiAncho : semiAncho;
  return [
    `${c.x + sx},${c.y}`,
    `${c.x},${c.y + semiAlto}`,
    `${c.x},${c.y + semiAlto + espesor}`,
    `${c.x + sx},${c.y + espesor}`,
  ].join(' ');
}

/** Base rocosa que se afina hacia abajo: da el efecto de isla flotante de la referencia. */
export function base(c: Punto, semiAncho: number, semiAlto: number, espesor: number, largo: number): string {
  return [
    `${c.x - semiAncho},${c.y + espesor}`,
    `${c.x},${c.y + semiAlto + espesor}`,
    `${c.x + semiAncho},${c.y + espesor}`,
    `${c.x + semiAncho * 0.32},${c.y + espesor + largo * 0.55}`,
    `${c.x},${c.y + espesor + largo}`,
    `${c.x - semiAncho * 0.32},${c.y + espesor + largo * 0.55}`,
  ].join(' ');
}

/**
 * Camino curvo entre dos islas. El control se levanta perpendicular al tramo para que la
 * cinta se arquee — un segmento recto entre rombos isométricos se lee plano.
 */
export function camino(a: Punto, b: Punto, arco = 0.22): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy) || 1;
  // normal del tramo, siempre hacia arriba en pantalla
  const nx = -dy / largo;
  const ny = -Math.abs(dx / largo);
  const d = largo * arco;
  return `M ${a.x} ${a.y} Q ${mx + nx * d} ${my + ny * d} ${b.x} ${b.y}`;
}

/** Parte fraccionaria en [0,1) — base del ruido determinista de decorado. */
export function frac(v: number): number {
  return v - Math.floor(v);
}
