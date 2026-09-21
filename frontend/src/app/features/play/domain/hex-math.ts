export interface TileRef {
  q: number;
  r: number;
}

// Axial neighbors (pointy-topped) in angular order (0°, 60°, 120°, 180°, 240°, 300°)
export const NB: ReadonlyArray<readonly [number, number]> = [
  [1, 0],   // 0: East (0°)
  [1, -1],  // 1: Northeast (60°)
  [0, -1],  // 2: Northwest (120°)
  [-1, 0],  // 3: West (180°)
  [-1, 1],  // 4: Southwest (240°)
  [0, 1],   // 5: Southeast (300°)
];

export const key = (q: number, r: number): string => `${q},${r}`;

export const dist = (q: number, r: number): number =>
  (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

export const dd = (a: TileRef, b: TileRef): number =>
  dist(a.q - b.q, a.r - b.r);

// Nominal heading: rotY that points the model to the axial heading (dq, dr)
export const rotFor = (dq: number, dr: number): number =>
  -Math.atan2(1.7325 * dr, 2 * (dq + dr / 2));

// Wide curve hex_road_B: model exits at 180° and 300° (compatibility)
export const curveRot = (
  a: readonly [number, number],
  b: readonly [number, number],
): number => {
  const TAU = Math.PI * 2;
  const norm = (x: number): number => ((x % TAU) + TAU) % TAU;
  const r1 = Math.PI + rotFor(a[0], a[1]);
  const r2 = (5 * Math.PI) / 3 + rotFor(b[0], b[1]);
  const base = Math.abs(norm(r1 - r2)) < 1e-9 ? r1 : Math.PI + rotFor(b[0], b[1]);
  return norm(TAU - base);
};

// Orientation of the building's facade to face its road / door
export const faceDoor = (bq: number, br: number, dq: number, dr: number): number => {
  const bx = bq + br / 2;
  const bz = br * 0.866;
  const dx = dq + dr / 2;
  const dz = dr * 0.866;
  return Math.atan2(dx - bx, dz - bz);
};

// Deterministic pseudo-random generator (PRNG mulberry32)
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
