/**
 * Isometric projection and procedural layout of the island map.
 *
 * It is the SVG implementation of the contract described in `path/04-engine-2-5d.md`: same
 * rules (position **always computed**, deterministic noise by index, reflow only when
 * adding/removing sections), but with 2D math instead of three.js — no new dependencies,
 * and with nodes that remain DOM (accessible and focusable, 05 §5/§7).
 *
 * If the three.js engine comes in later, `layoutIslands()` is the only thing that is
 * reused as is: it returns world coordinates, not pixels.
 */

/** Point in the isometric world. `y` is depth, `z` is height (floating). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

/** 2:1 tile — the classic proportion of isometric pixel art. */
export const TILE_W = 64;
export const TILE_H = 32;

/** World → screen. Height (`z`) only lifts the sprite, it does not shift it in x. */
export function project(v: Vec3): Point {
  return {
    x: (v.x - v.y) * (TILE_W / 2),
    y: (v.x + v.y) * (TILE_H / 2) - v.z,
  };
}

export interface LayoutOpts {
  /** Advance per unit along the **horizontal screen axis** (u = x − y). */
  stepU?: number;
  /** Descent per unit along the **vertical screen axis** (w = x + y). */
  stepW?: number;
  /** Amplitude of the vertical zig-zag: without it the map is a straight, boring diagonal. */
  zigzag?: number;
  /** Deterministic disorder so it does not read as a grid (04 §4). */
  jitter?: number;
  /** Alternating floating height, in screen px. */
  heights?: readonly number[];
}

/**
 * Winding route that advances to the right alternating up/down. Chosen over the
 * row-based serpentine of 04 §4 because the map is traversed with **horizontal panning** (04 §9):
 * a long ribbon reads better than a block growing downwards, and it is what the
 * style reference shows.
 *
 * The layout is parameterized in **screen axes** (`u` horizontal, `w` vertical) and
 * only afterwards converted to world coordinates. Parameterizing it directly in world `x`/`y`
 * is the trap: since the projection subtracts (`u = x − y`), a symmetric zig-zag in
 * world gets amplified horizontally and ends up stacking islands on top of the previous ones.
 *
 * Deterministic: section `i` always lands in the same place, with or without the others.
 */
export function layoutIslands(n: number, o: LayoutOpts = {}): Vec3[] {
  const { stepU = 8.2, stepW = 2.6, zigzag = 2.2, jitter = 0.5, heights = [0, 28, 10, 36] } = o;
  const out: Vec3[] = [];

  for (let i = 0; i < n; i++) {
    // deterministic noise by index — same input, same output (04 §4)
    const u = i * stepU + noise(i * 127.1) * jitter;
    const w = i * stepW + (i % 2 === 0 ? -zigzag : zigzag) + noise(i * 311.7) * jitter;

    out.push({
      x: (u + w) / 2,
      y: (w - u) / 2,
      z: heights[i % heights.length],
    });
  }
  return out;
}

/** Pseudo-random noise in [-0.5, 0.5], stable for the same `seed`. */
function noise(seed: number): number {
  const r = Math.sin(seed) * 43758.5453;
  return r - Math.floor(r) - 0.5;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Bounding box of the projected points, with margin — the `viewBox` comes from here. */
export function box(points: readonly Point[], margin: number): Box {
  if (points.length === 0) return { x: 0, y: 0, width: 800, height: 500 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  return {
    x,
    y,
    width: Math.max(...xs) + margin - x,
    height: Math.max(...ys) + margin - y,
  };
}

/** Rhombus (top face of the island) as a list of points for a `<polygon>`. */
export function diamond(c: Point, semiWidth: number, semiHeight: number): string {
  return [
    `${c.x},${c.y - semiHeight}`,
    `${c.x + semiWidth},${c.y}`,
    `${c.x},${c.y + semiHeight}`,
    `${c.x - semiWidth},${c.y}`,
  ].join(' ');
}

/** Side face extruded downwards — it is what turns the rhombus into a volume. */
export function faceLateral(
  c: Point,
  semiWidth: number,
  semiHeight: number,
  thickness: number,
  side: 'left' | 'right',
): string {
  const sx = side === 'left' ? -semiWidth : semiWidth;
  return [
    `${c.x + sx},${c.y}`,
    `${c.x},${c.y + semiHeight}`,
    `${c.x},${c.y + semiHeight + thickness}`,
    `${c.x + sx},${c.y + thickness}`,
  ].join(' ');
}

/** Rocky base that tapers downwards: gives the floating island effect of the reference. */
export function base(c: Point, semiWidth: number, semiHeight: number, thickness: number, long: number): string {
  return [
    `${c.x - semiWidth},${c.y + thickness}`,
    `${c.x},${c.y + semiHeight + thickness}`,
    `${c.x + semiWidth},${c.y + thickness}`,
    `${c.x + semiWidth * 0.32},${c.y + thickness + long * 0.55}`,
    `${c.x},${c.y + thickness + long}`,
    `${c.x - semiWidth * 0.32},${c.y + thickness + long * 0.55}`,
  ].join(' ');
}

/**
 * Right-angle path between two islands: a single right-angle bend (goes straight up/down,
 * then runs horizontally), never a curve nor several short bends in a row — like the
 * long runs of the Super Mario Bros. 3 map, not a staircase of small steps. Each
 * segment ends up as long as the real gap between islands.
 */
export function path(a: Point, b: Point): string {
  const elbow: Point = { x: a.x, y: b.y };
  return `M ${a.x} ${a.y} L ${elbow.x} ${elbow.y} L ${b.x} ${b.y}`;
}

/** Fractional part in [0,1) — basis of the deterministic decor noise. */
export function frac(v: number): number {
  return v - Math.floor(v);
}
