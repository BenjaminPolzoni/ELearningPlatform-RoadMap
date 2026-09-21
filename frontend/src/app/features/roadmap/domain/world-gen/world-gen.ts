import type { Biome, AttachmentType, Section } from '../../data-access/educa/models';
export type { Biome } from '../../data-access/educa/models';

// ponytail: absent = meadow (old worlds not yet migrated)
export function biomeOf(u: Pick<Section, 'biome'>): Biome {
  return u.biome === 'desert' || u.biome === 'snow' || u.biome === 'lava' ? u.biome : 'meadow';
}

// One world per section: castle (section) at the end of a straight spine of
// dirt → towers (modules) on side grass → houses (attachments) on grass
// next to their stretch. No building steps on a road: the connection is by adjacency
// (each building at dist 1 from a road of its group) + fog group.
// Only straight A and finishing M pieces (orientation verified); no curves.
// ponytail: deterministic by seed = id, stable world between visits.

export type BuildingColor = 'blue' | 'green' | 'red' | 'yellow';

export const AVATARS = ['Knight', 'Barbarian', 'Mage', 'Ranger', 'Rogue', 'Rogue_Hooded'] as const;
export type Avatar = (typeof AVATARS)[number];

export const ATTACHMENT_EMOJI: Record<AttachmentType, string> = {
  document: '📄',
  video: '🎬',
  link: '🔗',
  image: '🖼️',
  exercise: '✏️',
};

import { type TileRef, NB, faceDoor, key, dist, hash, rng } from './hex-math';
import { G, getRoadModelAndRot } from './auto-tiler';

export type { TileRef };
export { NB, rotFor, curveRot, faceDoor } from './hex-math';
export { getRoadModelAndRot } from './auto-tiler';

export interface Placed extends TileRef {
  model: string;
  ox: number; // offset as a fraction of a tile
  oz: number;
  rotY: number;
  group?: string; // fog stretch: moduleId, '__start' or '__end'
  s?: number; // scale (mountain ring)
}
export interface SectionHq extends Placed {
  sectionId: string;
  title: string;
  color: BuildingColor;
}
export interface ModulePlaced extends Placed {
  sectionId: string;
  moduleId: string;
  title: string;
}
export interface AttachmentMarker extends Placed {
  sectionId: string;
  moduleId: string;
  attachmentId: string;
  title: string;
  description: string;
  type: AttachmentType;
  url?: string;
}
export interface Cloud {
  x: number;
  z: number;
  y: number;
  model: string;
}
export interface WorldLayout {
  tiles: TileRef[];
  waters: TileRef[];
  roads: Placed[];
  castle: Placed;
  hqs: SectionHq[];
  modules: ModulePlaced[];
  attachments: AttachmentMarker[];
  decor: Placed[];
  clouds: Cloud[];
  islets: TileRef[]; // grass bases of the islets (outside walk and clamp)
  ridge: Placed[]; // background mountain ring
  volcanoes: TileRef[]; // ring mountains with an active crater (lava only)
  spawn: TileRef;
  boundR: number; // island radius in tiles for clamp
  biome: Biome;
}

export function colorFor(color: string | undefined): BuildingColor {
  const c = (color ?? '').toLowerCase();
  if (/green|22c55e|16a34a|4ade80|10b981|emerald|teal/.test(c)) return 'green';
  if (/red|ef4444|dc2626|f43f5e|rose|pink/.test(c)) return 'red';
  if (/yellow|amber|orange|eab308|f59e0b|f97316|lime/.test(c)) return 'yellow';
  return 'blue';
}

export function genSectionWorld(u: Section, subjectId: string): WorldLayout {
  const rand = rng(hash(`${subjectId}:${u.id}`));
  const color = colorFor(u.color);
  const biome = biomeOf(u);
  const desert = biome === 'desert';
  const snow = biome === 'snow';
  const lava = biome === 'lava';
  const VOLCANO = `${G}/decoration/nature/volcano.glb`;
  const tiles = new Map<string, TileRef>();
  const put = (q: number, r: number): void => {
    const k = key(q, r);
    if (!tiles.has(k)) tiles.set(k, { q, r });
  };

  const roadEdges = new Map<string, Set<string>>();
  const roadGroups = new Map<string, string>();
  const connect = (q1: number, r1: number, q2: number, r2: number, group: string): void => {
    const k1 = key(q1, r1);
    const k2 = key(q2, r2);
    if (!roadEdges.has(k1)) roadEdges.set(k1, new Set());
    if (!roadEdges.has(k2)) roadEdges.set(k2, new Set());
    roadEdges.get(k1)!.add(k2);
    roadEdges.get(k2)!.add(k1);
    if (!roadGroups.has(k1) || group === '__start') roadGroups.set(k1, group);
    if (!roadGroups.has(k2) || group === '__start') roadGroups.set(k2, group);
  };

  const roads: Placed[] = [];
  const modules: ModulePlaced[] = [];
  const attachments: AttachmentMarker[] = [];
  const taken = new Set<string>();

  // 1. Character spawn (the road starts directly at its position)
  const spawn: TileRef = { q: -2, r: 0 };
  connect(-2, 0, -1, 0, '__start');
  connect(-1, 0, 0, 0, '__start');

  // Section flag at the spawn
  modules.push({
    q: spawn.q,
    r: spawn.r,
    model: `${G}/decoration/props/flag_${color}.gltf`,
    ox: 0.3,
    oz: 0,
    rotY: 0,
    sectionId: u.id,
    moduleId: `__flag_${u.id}`,
    title: `Bandera ${u.title}`,
  });

  // 2. Initial market: on an hex_road_M finishing tile (Photo 2), with a complete preceding connector (Photo 1)
  const mkSpot = { q: -2, r: -2 };
  const mkDoor = { q: -2, r: -1 };
  connect(-2, 0, mkDoor.q, mkDoor.r, '__start');
  connect(mkDoor.q, mkDoor.r, mkSpot.q, mkSpot.r, '__start');
  taken.add(key(mkSpot.q, mkSpot.r));
  modules.push({
    q: mkSpot.q,
    r: mkSpot.r,
    model: `${G}/buildings/${color}/building_market_${color}.gltf`,
    ox: 0,
    oz: 0,
    rotY: faceDoor(mkSpot.q, mkSpot.r, mkDoor.q, mkDoor.r),
    sectionId: u.id,
    moduleId: `__market_${u.id}`,
    title: 'Mercado',
  });

  // Shuffled building deck
  const homes = ['building_tavern', 'building_barracks', 'building_archeryrange', 'building_lumbermill', 'building_windmill', 'building_home_B'];
  const deck: string[] = [];
  const deal = (): string => {
    if (!deck.length) {
      deck.push(...homes);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    return deck.pop() as string;
  };

  // 3. Winding trunk with an organic octopus network (several paths and branches to each building)
  let curQ = 0;
  let curR = 0;

  u.modules.forEach((m, mi) => {
    const side = mi % 2 === 0 ? -1 : 1;
    const numAttachments = m.attachments.length;
    // Generous length so the district and the branches have room
    const segLen = Math.max(6, (numAttachments + 1) * 2 + 2);

    // Winding trunk (organic S-curves that break the straight line)
    const trunkTiles: TileRef[] = [{ q: curQ, r: curR }];
    for (let s = 1; s <= segLen; s++) {
      let nq = curQ + 1;
      let nr = curR;
      if (s === 2) {
        if (side === -1) {
          nq = curQ + 1;
          nr = curR - 1;
        } else {
          nq = curQ;
          nr = curR + 1;
        }
      } else if (s === segLen - 1) {
        if (side === -1) {
          nq = curQ;
          nr = curR + 1;
        } else {
          nq = curQ + 1;
          nr = curR - 1;
        }
      }
      connect(curQ, curR, nq, nr, m.id);
      curQ = nq;
      curR = nr;
      trunkTiles.push({ q: curQ, r: curR });
    }

    // Module tower: on an hex_road_M finishing tile (Photo 2), with a complete preceding connector (Photo 1)
    const towerDoor = { q: curQ, r: curR + side };
    const towerSpot = { q: curQ, r: curR + side * 2 };
    connect(curQ, curR, towerDoor.q, towerDoor.r, m.id);
    connect(towerDoor.q, towerDoor.r, towerSpot.q, towerSpot.r, m.id);
    taken.add(key(towerSpot.q, towerSpot.r));
    modules.push({
      q: towerSpot.q,
      r: towerSpot.r,
      model: `${G}/buildings/${color}/building_tower_A_${color}.gltf`,
      ox: 0,
      oz: 0,
      rotY: faceDoor(towerSpot.q, towerSpot.r, towerDoor.q, towerDoor.r),
      sectionId: u.id,
      moduleId: m.id,
      title: m.title,
    });

    // Attachments: organic tentacles toward clearings in the landscape
    const attachmentDoors: { door: TileRef; spot: TileRef }[] = [];
    m.attachments.forEach((x, xi) => {
      const attachmentSide = xi % 2 === 0 ? -side : side;
      const trunkIdx = 1 + xi * 2;
      const anchor = trunkTiles[Math.min(trunkIdx, trunkTiles.length - 3)];

      let step1 = { q: anchor.q, r: anchor.r + attachmentSide };
      if (taken.has(key(step1.q, step1.r)) || (step1.q === curQ && step1.r === curR)) {
        step1 = { q: anchor.q + 1, r: anchor.r + attachmentSide };
      }

      const attachmentDoor = { q: step1.q, r: step1.r + attachmentSide };
      const attachmentSpot = { q: step1.q, r: attachmentDoor.r + attachmentSide };

      connect(anchor.q, anchor.r, step1.q, step1.r, m.id);
      connect(step1.q, step1.r, attachmentDoor.q, attachmentDoor.r, m.id);
      connect(attachmentDoor.q, attachmentDoor.r, attachmentSpot.q, attachmentSpot.r, m.id);

      taken.add(key(attachmentSpot.q, attachmentSpot.r));

      attachmentDoors.push({ door: attachmentDoor, spot: attachmentSpot });
      attachments.push({
        q: attachmentSpot.q,
        r: attachmentSpot.r,
        model: `${G}/buildings/${color}/${deal()}_${color}.gltf`,
        ox: 0,
        oz: 0,
        rotY: faceDoor(attachmentSpot.q, attachmentSpot.r, attachmentDoor.q, attachmentDoor.r),
        sectionId: u.id,
        moduleId: m.id,
        attachmentId: x.id,
        title: x.title,
        description: x.description ?? '',
        type: x.type,
        url: x.url,
      });
    });

    // Secondary route / Loop between nearby appendices (creates alternative routes)
    if (attachmentDoors.length >= 2) {
      const d1 = attachmentDoors[0].door;
      const d2 = attachmentDoors[1].door;
      const distD = dist(d1.q - d2.q, d1.r - d2.r);
      if (distD >= 2 && distD <= 3) {
        for (const [dq, dr] of NB) {
          const mid = { q: d1.q + dq, r: d1.r + dr };
          if (dist(mid.q - d2.q, mid.r - d2.r) === 1 && !taken.has(key(mid.q, mid.r))) {
            const d1Deg = roadEdges.get(key(d1.q, d1.r))?.size ?? 0;
            const d2Deg = roadEdges.get(key(d2.q, d2.r))?.size ?? 0;
            if (d1Deg < 3 && d2Deg < 3) {
              connect(d1.q, d1.r, mid.q, mid.r, m.id);
              connect(mid.q, mid.r, d2.q, d2.r, m.id);
              break;
            }
          }
        }
      }
    }
  });

  // 4. Final castle: on an hex_road_M finishing tile (Photo 2), with a complete preceding connector (Photo 1)
  connect(curQ, curR, curQ + 1, curR, '__end');
  connect(curQ + 1, curR, curQ + 2, curR, '__end');
  connect(curQ + 2, curR, curQ + 3, curR, '__end');
  const castleDoor = { q: curQ + 3, r: curR };
  const endQ = curQ + 4;
  const endR = curR;
  connect(curQ + 3, curR, endQ, endR, '__end');
  taken.add(key(endQ, endR));

  // 5. Resolve road pieces and rotations through Auto-Tiling
  for (const [k, nbs] of roadEdges) {
    const [q, r] = k.split(',').map(Number);
    const connIndices: number[] = [];
    nbs.forEach((nk) => {
      const [nq, nr] = nk.split(',').map(Number);
      const dq = nq - q;
      const dr = nr - r;
      const idx = NB.findIndex(([bx, bz]) => bx === dq && bz === dr);
      if (idx !== -1) connIndices.push(idx);
    });
    const info = getRoadModelAndRot(connIndices);
    roads.push({
      q,
      r,
      model: info.model,
      ox: 0,
      oz: 0,
      rotY: info.rotY,
      group: roadGroups.get(k) ?? '__start',
    });
  }

  // 6. Island body: surround roads and buildings with grass (roads have no grass underneath)
  const roadKeySet = new Set(roadEdges.keys());
  const corePlots = [
    ...tiles.values(),
    ...[...roadKeySet].map((k) => {
      const [q, r] = k.split(',').map(Number);
      return { q, r };
    }),
  ];
  for (const t of corePlots) {
    if (tiles.size > 260) break;
    for (const [dq, dr] of NB) {
      const nq = t.q + dq;
      const nr = t.r + dr;
      if (!roadKeySet.has(key(nq, nr))) put(nq, nr);
    }
  }

  // Decorative grass peninsulas
  const blobTiles: TileRef[] = [];
  const nB = 2 + Math.floor(rand() * 2);
  for (let b = 0; b < nB; b++) {
    const edge = [...tiles.values()];
    let tip = edge[Math.floor(rand() * edge.length)];
    const size = 5 + Math.floor(rand() * 5);
    for (let i = 0; i < size; i++) {
      const [dq, dr] = NB[Math.floor(rand() * NB.length)];
      const nq = tip.q + dq;
      const nr = tip.r + dr;
      if (roadKeySet.has(key(nq, nr))) continue;
      const k = key(nq, nr);
      if (!tiles.has(k)) {
        put(nq, nr);
        blobTiles.push({ q: nq, r: nr });
      }
      if (rand() < 0.6) tip = { q: nq, r: nr };
    }
  }

  // Reserve of outer islets
  const islets: TileRef[] = [];
  const isletSeen = new Set<string>();
  const iput = (q: number, r: number): void => {
    const k = key(q, r);
    if (tiles.has(k) || isletSeen.has(k)) return;
    isletSeen.add(k);
    islets.push({ q, r });
  };

  // Water: ring + connections (strictly excludes any land, road or building)
  const isLand = (q: number, r: number): boolean => {
    const k = key(q, r);
    return tiles.has(k) || roadKeySet.has(k) || taken.has(k) || isletSeen.has(k);
  };

  const waters: TileRef[] = [];
  const wseen = new Set<string>();
  const wput = (q: number, r: number): void => {
    const k = key(q, r);
    if (!isLand(q, r) && !wseen.has(k) && waters.length <= 260) {
      wseen.add(k);
      waters.push({ q, r });
    }
  };

  for (const t of blobTiles) {
    for (const [dq, dr] of NB) wput(t.q + dq, t.r + dr);
  }

  // Islets with mountains
  const NB6V: ReadonlyArray<readonly [number, number]> = [[1, 0], [0.5, -0.866], [-0.5, -0.866], [-1, 0], [-0.5, 0.866], [0.5, 0.866]];
  const allGrass = [...tiles.values()];
  const gcx = allGrass.reduce((n, t) => n + t.q, 0) / allGrass.length;
  const gcy = allGrass.reduce((n, t) => n + t.r, 0) / allGrass.length;
  const edgeTiles = allGrass.filter((t) => NB.some(([dq, dr]) => !tiles.has(key(t.q + dq, t.r + dr))));
  const pool = edgeTiles.length ? edgeTiles : allGrass;
  const ridge: Placed[] = [];
  const isletDecor: Placed[] = [];
  const mounts = desert || snow || lava
    ? ['mountain_A', 'mountain_B', 'mountain_C']
    : [
        'mountain_A',
        'mountain_B',
        'mountain_C',
        'mountain_A_grass',
        'mountain_B_grass',
        'mountain_C_grass',
        'mountain_A_grass_trees',
        'mountain_B_grass_trees',
        'mountain_C_grass_trees',
      ];
  const centers: TileRef[] = [];
  const nR = 6 + Math.floor(rand() * 3);
  const SZ = [3, 5, 7];
  const clearOf = (q: number, r: number): boolean =>
    !NB.some(([dq, dr]) => tiles.has(key(q + dq, r + dr)));
  const isletTreeModels = desert || snow || lava
    ? [
        `${G}/decoration/nature/rock_single_A.gltf`,
        `${G}/decoration/nature/rock_single_B.gltf`,
      ]
    : [
        `${G}/decoration/nature/tree_single_A.gltf`,
        `${G}/decoration/nature/tree_single_B.gltf`,
        `${G}/decoration/nature/trees_A_medium.gltf`,
      ];

  for (let i = 0; i < nR; i++) {
    let center: TileRef | null = null;
    for (let tr = 0; tr < 80 && !center; tr++) {
      const e = pool[Math.floor(rand() * pool.length)];
      const vx = e.q + e.r / 2 - gcx;
      const vz = (e.r - gcy) * 0.866;
      let bi = 0;
      let bd = -Infinity;
      NB6V.forEach((v, di) => {
        const d = v[0] * vx + v[1] * vz;
        if (d > bd) {
          bd = d;
          bi = di;
        }
      });
      const steps = 6 + Math.floor(rand() * 2);
      const c = { q: e.q + NB[bi][0] * steps, r: e.r + NB[bi][1] * steps };
      if (tiles.has(key(c.q, c.r)) || !clearOf(c.q, c.r)) continue;
      if (centers.some((o) => dist(c.q - o.q, c.r - o.r) < 5)) continue;
      center = c;
    }
    if (!center) continue;
    centers.push(center);

    {
      let p = { ...center };
      const own = new Set<string>();
      const shore = (t: TileRef): number =>
        Math.min(...pool.map((e) => dist(t.q - e.q, t.r - e.r)));
      const isGrass = (t: TileRef): boolean => isLand(t.q, t.r);
      for (let s = 0; s < 32; s++) {
        if (isGrass(p)) break;
        const nbs = NB.map(([dq, dr]) => ({ q: p.q + dq, r: p.r + dr }));
        if (nbs.some((t) => isGrass(t))) break;
        const nxt = nbs.filter((t) => !isGrass(t) && !own.has(key(t.q, t.r)));
        if (nxt.some((t) => wseen.has(key(t.q, t.r)))) break;
        nxt.sort((a, b) => shore(a) - shore(b));
        const step = nxt[0];
        if (!step) break;
        wput(step.q, step.r);
        own.add(key(step.q, step.r));
        p = step;
      }
    }

    const size = SZ[Math.floor(rand() * SZ.length)];
    iput(center.q, center.r);
    const grown: TileRef[] = [{ q: center.q, r: center.r }];
    for (let g = 0; g < NB.length && grown.length < size; g++) {
      const [dq, dr] = NB[(i + g) % NB.length];
      const nq = center.q + dq;
      const nr = center.r + dr;
      if (roadKeySet.has(key(nq, nr)) || !clearOf(nq, nr)) continue;
      iput(nq, nr);
      grown.push({ q: nq, r: nr });
    }
    for (const t of grown) for (const [dq, dr] of NB) wput(t.q + dq, t.r + dr);
    grown.forEach((t, gi) => {
      if (grown.length < 5 || gi % 2 !== 0) return;
      isletDecor.push({ ...t, model: isletTreeModels[Math.floor(rand() * isletTreeModels.length)], ox: (rand() - 0.5) * 0.4, oz: (rand() - 0.5) * 0.4, rotY: rand() * Math.PI * 2, s: 0.8 + rand() * 0.5 });
    });
    ridge.push({
      ...center,
      model: `${G}/decoration/nature/${mounts[Math.floor(rand() * mounts.length)]}.gltf`,
      ox: 0,
      oz: 0,
      rotY: rand() * Math.PI * 2,
      s: size <= 3 ? 1.6 + rand() * 0.6 : size <= 5 ? 2.2 + rand() * 0.8 : 2.8 + rand() * 0.8,
    });
  }

  // Water ring around grass and roads
  for (const t of [...tiles.values(), ...roads]) {
    for (const [dq, dr] of NB) {
      wput(t.q + dq, t.r + dr);
    }
  }
  const rows = [...tiles.values()].map((t) => t.r);
  const minR = Math.min(...rows);
  const maxR = Math.max(...rows);
  for (let r = minR - 1; r <= maxR + 1; r++) {
    const qs = [...tiles.values()].filter((t) => t.r === r).map((t) => t.q);
    if (!qs.length) continue;
    const lo = Math.min(...qs);
    const hi = Math.max(...qs);
    wput(lo - 1, r);
    wput(lo - 2, r);
    wput(hi + 1, r);
    wput(hi + 2, r);
  }

  // Decoration on free grass (trees and rocks)
  const busy = new Set<string>([
    ...roadKeySet,
    ...modules.map((m) => key(m.q, m.r)),
    ...attachments.map((x) => key(x.q, x.r)),
    key(endQ, endR),
    key(spawn.q, spawn.r),
  ]);
  const free = [...tiles.values()].filter((t) => !busy.has(key(t.q, t.r)));
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  const CACTUS = [
    `${G}/decoration/nature/cactus_1.glb`,
    `${G}/decoration/nature/cactus_2.glb`,
    `${G}/decoration/nature/cactus_3.glb`,
    `${G}/decoration/nature/cactus_4.glb`,
  ];
  const SNOW = [
    `${G}/decoration/nature/snowman.glb`,
    `${G}/decoration/nature/pine_snow.glb`,
    `${G}/decoration/nature/tree_snow.glb`,
  ];
  const decorModels = desert
    ? [
        `${G}/decoration/nature/rock_single_A.gltf`,
        `${G}/decoration/nature/rock_single_B.gltf`,
        ...CACTUS,
      ]
    : snow
      ? [
          `${G}/decoration/nature/rock_single_A.gltf`,
          `${G}/decoration/nature/rock_single_B.gltf`,
          ...SNOW,
        ]
    : lava
      ? [
          `${G}/decoration/nature/rock_single_A.gltf`,
          `${G}/decoration/nature/rock_single_B.gltf`,
        ]
    : [
        `${G}/decoration/nature/trees_A_medium.gltf`,
        `${G}/decoration/nature/tree_single_A.gltf`,
        `${G}/decoration/nature/tree_single_B.gltf`,
        `${G}/decoration/nature/rock_single_A.gltf`,
        `${G}/decoration/nature/rock_single_B.gltf`,
      ];
  const decor: Placed[] = free.slice(0, Math.min(40, Math.floor(free.length / 3))).map((t, i) => ({
    ...t,
    model: decorModels[i % decorModels.length],
    ox: (rand() - 0.5) * 0.5,
    oz: (rand() - 0.5) * 0.5,
    rotY: rand() * Math.PI * 2,
  }));

  const boundTiles = Math.max(
    ...[...tiles.values(), ...roads].map((t) => dist(t.q, t.r)),
    3,
  );
  const clouds: Cloud[] = Array.from({ length: 5 }, (_, i) => ({
    x: (rand() - 0.5) * boundTiles * 4,
    z: (rand() - 0.5) * boundTiles * 4,
    y: 5.5 + rand() * 2.5,
    model: `${G}/decoration/nature/cloud_${i % 2 === 0 ? 'big' : 'small'}.gltf`,
  }));

  const TUMBLEWEED = `${G}/decoration/nature/tumbleweed_lowpoly.glb`;
  const blobDecor = desert
    ? [
        `${G}/decoration/nature/rock_single_A.gltf`,
        `${G}/decoration/nature/rock_single_B.gltf`,
        ...CACTUS,
        TUMBLEWEED,
        'proc:huesos',
      ]
    : snow
      ? [
          `${G}/decoration/nature/rock_single_A.gltf`,
          `${G}/decoration/nature/rock_single_B.gltf`,
          ...SNOW,
        ]
    : lava
      ? [
          `${G}/decoration/nature/rock_single_A.gltf`,
          `${G}/decoration/nature/rock_single_B.gltf`,
        ]
    : [
        `${G}/decoration/nature/tree_single_A.gltf`,
        `${G}/decoration/nature/tree_single_B.gltf`,
        `${G}/decoration/nature/trees_A_medium.gltf`,
        `${G}/decoration/nature/rock_single_A.gltf`,
        `${G}/decoration/nature/rock_single_B.gltf`,
        `${G}/decoration/props/tent.gltf`,
        `${G}/decoration/props/barrel.gltf`,
        `${G}/decoration/props/crate_A_small.gltf`,
      ];
  blobTiles.forEach((t, i) => {
    if (i % 2 !== 0) return;
    decor.push({ ...t, model: blobDecor[Math.floor(rand() * blobDecor.length)], ox: (rand() - 0.5) * 0.4, oz: (rand() - 0.5) * 0.4, rotY: rand() * Math.PI * 2, s: 0.8 + rand() * 0.6 });
  });
  // Vegetation guarantee (the pool's randomness might omit it)
  if (desert) {
    const has = new Set(decor.map((d) => d.model));
    const needs: string[] = [];
    if (!CACTUS.some((c) => has.has(c))) needs.push(CACTUS[Math.floor(rand() * CACTUS.length)]);
    if (!has.has(TUMBLEWEED)) needs.push(TUMBLEWEED);
    for (const need of needs) {
      if (has.has(need)) continue;
      const spot =
        blobTiles.find((t) => !decor.some((d) => d.q === t.q && d.r === t.r)) ??
        free.find((t) => !decor.some((d) => d.q === t.q && d.r === t.r));
      if (!spot) break;
      decor.push({ ...spot, model: need, ox: 0, oz: 0, rotY: rand() * Math.PI * 2, s: 1 });
      has.add(need);
    }
  }
  if (snow && !SNOW.some((s) => decor.some((d) => d.model === s))) {
    const spot =
      blobTiles.find((t) => !decor.some((d) => d.q === t.q && d.r === t.r)) ??
      free.find((t) => !decor.some((d) => d.q === t.q && d.r === t.r));
    if (spot) {
      const pick = SNOW[Math.floor(rand() * SNOW.length)];
      decor.push({ ...spot, model: pick, ox: 0, oz: 0, rotY: rand() * Math.PI * 2, s: 1 });
    }
  }
  decor.push(...isletDecor);

  // Desert bones: 2 skeletons on random free tiles (deterministic, without filling)
  if (desert) {
    for (let i = 0; i < 2; i++) {
      const boneSpot = free.find((t) => !decor.some((d) => d.q === t.q && d.r === t.r));
      if (!boneSpot) break;
      decor.push({ ...boneSpot, model: 'proc:huesos', ox: 0, oz: 0, rotY: rand() * Math.PI * 2, s: 0.9 + rand() * 0.3 });
    }
  }
  // Props only next to the market: barrels and crates (desert, snow and lava)
  if (desert || snow || lava) {
    const marketProps = [
      `${G}/decoration/props/barrel.gltf`,
      `${G}/decoration/props/crate_A_small.gltf`,
      `${G}/decoration/props/crate_open.gltf`,
    ];
    const nearMarket = free
      .filter((t) => dist(t.q - mkSpot.q, t.r - mkSpot.r) === 1 && !decor.some((d) => d.q === t.q && d.r === t.r))
      .slice(0, 3);
    nearMarket.forEach((spot, i) => {
      decor.push({ ...spot, model: marketProps[i % marketProps.length], ox: 0, oz: 0, rotY: rand() * Math.PI * 2, s: 0.9 + rand() * 0.3 });
    });
  }

  // Volcanoes: new volcano-type islets only in the lava biome (they do not replace existing ones)
  const volcanoes: TileRef[] = [];
  if (lava && ridge.length) {
    // Candidates: ridge entries close to the main road (spawn -> castle)
    // The road goes roughly from q=-2 to endQ, with variable r
    const roadQs = roads.map((r) => r.q);
    const minRoadQ = Math.min(...roadQs, -2);
    const maxRoadQ = Math.max(...roadQs, endQ);
    const roadQCenter = (minRoadQ + maxRoadQ) / 2;

    const volcanoCandidates = ridge
      .map((p, i) => ({ ...p, idx: i, distToPath: Math.abs(p.q - roadQCenter) }))
      .filter((p) => p.distToPath <= 6) // Near the road's horizontal axis (more permissive)
      .sort((a, b) => a.distToPath - b.distToPath);

    // Fallback: if there are no candidates near the road, use those closest to the center
    const finalCandidates = volcanoCandidates.length
      ? volcanoCandidates
      : ridge
          .map((p, i) => ({ ...p, idx: i, distToPath: Math.abs(p.q - roadQCenter) }))
          .sort((a, b) => a.distToPath - b.distToPath);

    if (finalCandidates.length) {
      // Randomize candidates (but keeping priority by proximity to the road)
      for (let i = finalCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [finalCandidates[i], finalCandidates[j]] = [finalCandidates[j], finalCandidates[i]];
      }
      // 1-2 new volcanoes near the road (max 2 in total)
      const nV = Math.min(1 + Math.floor(rand() * 2), finalCandidates.length);
      for (const c of finalCandidates.slice(0, nV)) {
        ridge.push({
          q: c.q,
          r: c.r,
          model: VOLCANO,
          ox: 0,
          oz: 0,
          rotY: rand() * Math.PI * 2,
          s: (c.s ?? 2) * 3,
        });
        volcanoes.push({ q: c.q, r: c.r });
      }
    }
  }

  // Cleanup of decor on top of buildings
  const reserved = new Set<string>([
    key(spawn.q, spawn.r),
    key(endQ, endR),
    ...modules.map((m) => key(m.q, m.r)),
    ...attachments.map((x) => key(x.q, x.r)),
  ]);
  for (let i = decor.length - 1; i >= 0; i--) {
    if (reserved.has(key(decor[i].q, decor[i].r))) decor.splice(i, 1);
  }

  // Final water cleanup to ensure no water cell coincides with land, roads, islets or buildings
  const finalLand = new Set<string>([
    ...tiles.keys(),
    ...roadKeySet,
    ...isletSeen,
    ...taken,
  ]);
  const finalWaters = waters.filter((w) => !finalLand.has(key(w.q, w.r)));

  return {
    tiles: [...tiles.values()],
    waters: finalWaters,
    roads,
    castle: {
      q: endQ,
      r: endR,
      model: `${G}/buildings/${color}/building_castle_${color}.gltf`,
      ox: 0,
      oz: 0,
      rotY: faceDoor(endQ, endR, castleDoor.q, castleDoor.r),
      s: 1.3,
    },
    hqs: [],
    modules,
    attachments,
    decor,
    clouds,
    islets,
    ridge,
    volcanoes,
    spawn,
    boundR: boundTiles + 2,
    biome,
  };
}

// — Map of the course's islands (hub /play/:id): one island per section —

export interface IslandEntry {
  id: string;
  attachments: number;
}

export interface PlacedIsland extends IslandEntry {
  cx: number;
  cy: number;
  r: number;
}

export interface Archipelago {
  islands: PlacedIsland[];
  /** Width of the SVG viewBox. */
  w: number;
  /** Height of the SVG viewBox (grows with the rows). */
  h: number;
  /** Dotted route that joins the islands in course order. */
  route: string;
}

const ISLANDS_BY_ROW = 3;
const ISLANDS_WIDTH = 1200;
const ISLANDS_X0 = 200;
const ISLANDS_DX = 400;
const ISLANDS_Y0 = 150;
const ISLANDS_DY = 270;
const ISLAND_R_BASE = 54;
const ISLAND_R_MAX = 82;

// ponytail: deterministic serpentine by order, no physics or RNG.
export function genIslandsLayout(sections: IslandEntry[]): Archipelago {
  const islands: PlacedIsland[] = sections.map((u, i) => {
    const row = Math.floor(i / ISLANDS_BY_ROW);
    const pos = i % ISLANDS_BY_ROW;
    const col = row % 2 === 0 ? pos : ISLANDS_BY_ROW - 1 - pos;
    return {
      ...u,
      cx: ISLANDS_X0 + col * ISLANDS_DX,
      cy: ISLANDS_Y0 + row * ISLANDS_DY,
      r: Math.min(ISLAND_R_MAX, ISLAND_R_BASE + u.attachments * 3),
    };
  });
  const rows = Math.ceil(sections.length / ISLANDS_BY_ROW);
  const h = rows === 0 ? 0 : ISLANDS_Y0 + (rows - 1) * ISLANDS_DY + ISLAND_R_MAX + 120;
  const route = islands.map((s, i) => `${i === 0 ? 'M' : 'L'}${s.cx},${s.cy}`).join(' ');
  return { islands, w: ISLANDS_WIDTH, h, route };
}
