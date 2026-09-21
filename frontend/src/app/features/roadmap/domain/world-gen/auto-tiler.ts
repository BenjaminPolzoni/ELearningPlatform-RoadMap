export const G = '/assets/roadmap/world/Hexagon/Assets/gltf';
export const ROAD_A = `${G}/tiles/roads/hex_road_A.gltf`;
export const ROAD_B = `${G}/tiles/roads/hex_road_B.gltf`;
export const ROAD_C = `${G}/tiles/roads/hex_road_C.gltf`;
export const ROAD_D = `${G}/tiles/roads/hex_road_D.gltf`;
export const ROAD_E = `${G}/tiles/roads/hex_road_E.gltf`;
export const ROAD_F = `${G}/tiles/roads/hex_road_F.gltf`;
export const ROAD_END = `${G}/tiles/roads/hex_road_M.gltf`;

export interface RoadTileInfo {
  model: string;
  rotY: number;
}

/**
 * Auto-tiling engine: selects the KayKit modular piece and its rotation
 * by evaluating the connected angular indices [0..5] on the hexagonal grid.
 */
export function getRoadModelAndRot(connectedIndices: number[]): RoadTileInfo {
  const sorted = [...connectedIndices].sort((a, b) => a - b);
  const n = sorted.length;

  // 1 connection: End cap / Cul-de-sac (hex_road_M)
  if (n <= 1) {
    const r = n === 1 ? (sorted[0] + 3) % 6 : 0;
    return { model: ROAD_END, rotY: (r * Math.PI) / 3 };
  }

  // 2 connections: Straight (A), 120° Curve (B) or 60° Curve (C)
  if (n === 2) {
    const diff = (sorted[1] - sorted[0] + 6) % 6;
    if (diff === 3) {
      return { model: ROAD_A, rotY: (sorted[0] * Math.PI) / 3 };
    }
    if (diff === 2 || diff === 4) {
      for (let r = 0; r < 6; r++) {
        const e1 = (1 + r) % 6;
        const e2 = (3 + r) % 6;
        if ((e1 === sorted[0] && e2 === sorted[1]) || (e1 === sorted[1] && e2 === sorted[0])) {
          return { model: ROAD_B, rotY: (r * Math.PI) / 3 };
        }
      }
    }
    if (diff === 1 || diff === 5) {
      for (let r = 0; r < 6; r++) {
        const e1 = (2 + r) % 6;
        const e2 = (3 + r) % 6;
        if ((e1 === sorted[0] && e2 === sorted[1]) || (e1 === sorted[1] && e2 === sorted[0])) {
          return { model: ROAD_C, rotY: (r * Math.PI) / 3 };
        }
      }
    }
  }

  // 3 connections: Y forks (D) and T forks (E, F)
  if (n === 3) {
    for (let r = 0; r < 6; r++) {
      const e = [(1 + r) % 6, (3 + r) % 6, (5 + r) % 6].sort((a, b) => a - b);
      if (e[0] === sorted[0] && e[1] === sorted[1] && e[2] === sorted[2]) {
        return { model: ROAD_D, rotY: (r * Math.PI) / 3 };
      }
    }
    for (let r = 0; r < 6; r++) {
      const e = [(0 + r) % 6, (1 + r) % 6, (3 + r) % 6].sort((a, b) => a - b);
      if (e[0] === sorted[0] && e[1] === sorted[1] && e[2] === sorted[2]) {
        return { model: ROAD_E, rotY: (r * Math.PI) / 3 };
      }
    }
    for (let r = 0; r < 6; r++) {
      const e = [(0 + r) % 6, (3 + r) % 6, (5 + r) % 6].sort((a, b) => a - b);
      if (e[0] === sorted[0] && e[1] === sorted[1] && e[2] === sorted[2]) {
        return { model: ROAD_F, rotY: (r * Math.PI) / 3 };
      }
    }
  }

  return { model: ROAD_A, rotY: 0 };
}
