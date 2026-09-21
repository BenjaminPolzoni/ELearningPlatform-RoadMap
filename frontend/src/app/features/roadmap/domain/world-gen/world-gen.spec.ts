import { describe, expect, it } from 'vitest';
import type { Section } from '../../data-access/educa/models';
import { biomeOf, colorFor, genSectionWorld, rotFor } from './world-gen';

const section = (over: Partial<Section> = {}): Section => ({
  id: 'u1',
  title: 'U1',
  description: '',
  order: 0,
  color: '#22c55e',
  modules: [
    {
      id: 'm1',
      title: 'M1',
      description: '',
      order: 0,
      attachments: [
        { id: 'x1', title: 'A1', type: 'video' },
        { id: 'x2', title: 'A2', type: 'document' },
      ],
    },
    { id: 'm2', title: 'M2', description: '', order: 1, attachments: [] },
  ],
  ...over,
});

describe('world-gen v2 (world per section)', () => {
  it('castle in the section\'s color, towers = modules, varied attachments', () => {
    const w = genSectionWorld(section(), 'a1');
    expect(w.castle.model).toContain('/green/');
    expect(w.castle.model).toContain('castle');
    expect(w.castle.s).toBe(1.3); // scaled +30% per requirement
    const towers = w.modules.filter((m) => !m.moduleId.startsWith('__'));
    expect(towers.map((m) => m.moduleId)).toEqual(['m1', 'm2']);
    expect(towers.every((t) => t.model.includes('tower_A'))).toBe(true);
    expect(w.attachments.map((x) => x.attachmentId)).toEqual(['x1', 'x2']);
    const pool = ['building_tavern', 'building_barracks', 'building_archeryrange', 'building_lumbermill', 'building_windmill', 'building_home_B'];
    expect(w.attachments.every((x) => pool.some((p) => x.model.includes(p)))).toBe(true);
    expect(w.attachments.every((x) => x.model.includes('/green/'))).toBe(true);
    expect(new Set(w.attachments.map((x) => x.model)).size).toBe(w.attachments.length); // distribution without repeats
  });

  it('flag at the spawn and market 2 hexes away', () => {
    const w = genSectionWorld(section(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const flag = w.modules.find((m) => m.moduleId.startsWith('__flag'));
    expect(flag).toBeTruthy();
    expect({ q: flag?.q, r: flag?.r }).toEqual({ q: w.spawn.q, r: w.spawn.r });
    const market = w.modules.find((m) => m.moduleId.startsWith('__market'));
    expect(market?.model).toContain('market');
    expect(market?.model).toContain('/green/');
    expect(dd(market as { q: number; r: number }, w.spawn)).toBe(2);
  });

  it('continuous road network with trunk and branches from spawn to castle', () => {
    const w = genSectionWorld(section(), 'a1');
    const roadKeys = new Set(w.roads.map((r) => `${r.q},${r.r}`));
    // the road starts exactly at the character's spawn
    expect(roadKeys.has(`${w.spawn.q},${w.spawn.r}`)).toBe(true);

    // connected network: BFS from spawn covers every road up to the castle
    const NB: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const seen = new Set<string>([`${w.spawn.q},${w.spawn.r}`]);
    const queue = [w.spawn];
    while (queue.length) {
      const c = queue.pop() as { q: number; r: number };
      for (const [dq, dr] of NB) {
        const k = `${c.q + dq},${c.r + dr}`;
        if (roadKeys.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push({ q: c.q + dq, r: c.r + dr });
        }
      }
    }
    expect(seen.size).toBe(roadKeys.size);

    // the castle on an __end hex_road_M finishing tile (Photo 2) with a complete preceding connector (Photo 1)
    const endRoads = w.roads.filter((r) => r.group === '__end');
    expect(endRoads.length).toBeGreaterThanOrEqual(1);
    const castleRoad = endRoads.find((r) => r.q === w.castle.q && r.r === w.castle.r);
    expect(castleRoad).toBeTruthy();
    expect(castleRoad?.model).toContain('hex_road_M');

    // valid models and rotations
    expect(w.roads.every((r) => Number.isFinite(r.rotY))).toBe(true);
    expect(w.roads.every((r) => r.model.includes('hex_road_'))).toBe(true);
    expect(w.castle.rotY).toBeCloseTo(-Math.PI / 2, 2); // the castle door faces directly toward the access road

    // the castle closes farther than the last tower
    const towers = w.modules.filter((m) => !m.moduleId.startsWith('__'));
    const last = towers[towers.length - 1];
    const d = (p: { q: number; r: number }): number =>
      (Math.abs(p.q) + Math.abs(p.r) + Math.abs(p.q + p.r)) / 2;
    expect(d(w.castle)).toBeGreaterThan(d(last));
  });

  it('buildings on hex_road_M finishing tiles (Photo 2) with a complete preceding connector (Photo 1)', () => {
    const w = genSectionWorld(section(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const roadKeys = new Set(w.roads.map((r) => `${r.q},${r.r}`));
    const grassKeys = new Set(w.tiles.map((t) => `${t.q},${t.r}`));
    // no road has grass underneath
    for (const k of roadKeys) expect(grassKeys.has(k)).toBe(false);

    const buildings = [
      ...w.modules
        .filter((m) => !m.moduleId.startsWith('__flag'))
        .map((m) => ({ ...m, group: m.moduleId.startsWith('__market') ? '__start' : m.moduleId })),
      ...w.attachments.map((x) => ({ ...x, group: x.moduleId })),
      { ...w.castle, group: '__end' },
    ];

    // each building sits on a hex_road_M finishing road tile (Photo 2)
    for (const b of buildings) {
      expect(roadKeys.has(`${b.q},${b.r}`)).toBe(true);
      const road = w.roads.find((r) => r.q === b.q && r.r === b.r);
      expect(road).toBeTruthy();
      expect(road?.model).toContain('hex_road_M');
      expect(road?.group).toBe(b.group);

      // and the connector tile preceding it at distance 1 is a complete road tile (Photo 1: A, B or C)
      const neighbors = w.roads.filter((r) => dd(b, r) === 1);
      expect(neighbors.length).toBeGreaterThanOrEqual(1);
      const conn = neighbors.find((r) => !r.model.includes('hex_road_M'));
      expect(conn).toBeTruthy();
    }

    // each tower and attachment has roads of its group
    for (const t of w.modules.filter((m) => !m.moduleId.startsWith('__'))) {
      const mine = w.roads.filter((r) => r.group === t.moduleId);
      expect(mine.length).toBeGreaterThanOrEqual(6);
    }
    // spawn on a road
    const startRoads = w.roads.filter((r) => r.group === '__start');
    expect(startRoads.some((r) => r.q === w.spawn.q && r.r === w.spawn.r)).toBe(true);
  });

  it('water does not overlap roads, grass or buildings', () => {
    const w = genSectionWorld(section(), 'a1');
    const roadKeys = new Set(w.roads.map((r) => `${r.q},${r.r}`));
    const grassKeys = new Set(w.tiles.map((t) => `${t.q},${t.r}`));
    const isletKeys = new Set(w.islets.map((i) => `${i.q},${i.r}`));

    expect(w.waters.length).toBeGreaterThan(0);
    for (const water of w.waters) {
      const k = `${water.q},${water.r}`;
      expect(roadKeys.has(k)).toBe(false);
      expect(grassKeys.has(k)).toBe(false);
      expect(isletKeys.has(k)).toBe(false);
    }
  });

  it('respects colors and is deterministic', () => {
    expect(genSectionWorld(section({ color: '#ef4444' }), 'a1').castle.model).toContain('/red/');
    expect(colorFor(undefined)).toBe('blue');
    expect(genSectionWorld(section(), 'a1')).toEqual(genSectionWorld(section(), 'a1'));
  });

  it('unique tiles, spawn on the starting road, roads without grass underneath', () => {
    const w = genSectionWorld(section(), 'a1');
    const keys = w.tiles.map((t) => `${t.q},${t.r}`);
    expect(new Set(keys).size).toBe(keys.length);
    const roadKeys = w.roads.map((r) => `${r.q},${r.r}`);
    expect(new Set(roadKeys).size).toBe(roadKeys.length);
    expect(roadKeys).toContain(`${w.spawn.q},${w.spawn.r}`);
    for (const k of roadKeys) expect(keys).not.toContain(k);
  });

  it('connected island + distant ring (deterministic)', () => {
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const NB: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const w = genSectionWorld(section(), 'a1');
    // all the grass + roads connected on foot from the spawn
    const set = new Set([...w.tiles, ...w.roads].map((t) => `${t.q},${t.r}`));
    const seen = new Set<string>([`${w.spawn.q},${w.spawn.r}`]);
    const queue = [w.spawn];
    while (queue.length) {
      const c = queue.pop() as { q: number; r: number };
      for (const [dq, dr] of NB) {
        const k = `${c.q + dq},${c.r + dr}`;
        if (set.has(k) && !seen.has(k)) {
          seen.add(k);
          queue.push({ q: c.q + dq, r: c.r + dr });
        }
      }
    }
    expect(seen.size).toBe(set.size);
    // ring: 6-8 mountains outside the playable grass, each one on islet grass
    expect(w.ridge.length).toBeGreaterThanOrEqual(6);
    expect(w.ridge.length).toBeLessThanOrEqual(8);
    expect(w.waters.length).toBeGreaterThan(110); // ring + channels to islets    expect(w.ridge.every((m) => m.model.includes('mountain_'))).toBe(true);
    const iset = new Set(w.islets.map((t) => `${t.q},${t.r}`));
    for (const m of w.ridge) {
      expect(set.has(`${m.q},${m.r}`)).toBe(false);
      expect(iset.has(`${m.q},${m.r}`) || set.has(`${m.q},${m.r}`)).toBe(true);
    }
    // islets in 2+ different sizes (3/5/7)
    const comps: number[] = [];
    const pending = new Set(iset);
    while (pending.size) {
      const [first] = pending;
      const [fq, fr] = (first as string).split(',').map(Number);
      let n = 0;
      const q2 = [{ q: fq, r: fr }];
      pending.delete(first as string);
      while (q2.length) {
        const c = q2.pop() as { q: number; r: number };
        n++;
        for (const [dq, dr] of NB) {
          const k = `${c.q + dq},${c.r + dr}`;
          if (pending.has(k)) {
            pending.delete(k);
            q2.push({ q: c.q + dq, r: c.r + dr });
          }
        }
      }
      comps.push(n);
    }
    expect(new Set(comps).size).toBeGreaterThanOrEqual(2);
    // the water of each islet joins the main ring (water-only BFS,
    // at islet level: the center of a 7 stays interior, without adjacent water)
    const wset = new Set(w.waters.map((t) => `${t.q},${t.r}`));
    const wseen = new Set<string>([`${w.waters[0].q},${w.waters[0].r}`]);
    const wq = [w.waters[0]];
    while (wq.length) {
      const c = wq.pop() as { q: number; r: number };
      for (const [dq, dr] of NB) {
        const k = `${c.q + dq},${c.r + dr}`;
        if (wset.has(k) && !wseen.has(k)) {
          wseen.add(k);
          wq.push({ q: c.q + dq, r: c.r + dr });
        }
      }
    }
    const pending2 = new Set(iset);
    while (pending2.size) {
      const [first] = pending2;
      const [fq, fr] = (first as string).split(',').map(Number);
      let ok = false;
      const q3 = [{ q: fq, r: fr }];
      pending2.delete(first as string);
      while (q3.length) {
        const c = q3.pop() as { q: number; r: number };
        if (NB.some(([dq, dr]) => wseen.has(`${c.q + dq},${c.r + dr}`))) ok = true;
        for (const [dq, dr] of NB) {
          const k = `${c.q + dq},${c.r + dr}`;
          if (pending2.has(k)) {
            pending2.delete(k);
            q3.push({ q: c.q + dq, r: c.r + dr });
          }
        }
      }
      expect(ok).toBe(true);
    }
    expect(genSectionWorld(section(), 'a1')).toEqual(w);
  });

  it('no edges to the void: grass and roads border grass, road or water', () => {
    for (const seed of ['a1', 'otra', 'x'.repeat(20)]) {
      const w = genSectionWorld(section(), seed);
      const ok = new Set([...w.tiles.map((t) => `${t.q},${t.r}`), ...w.waters.map((t) => `${t.q},${t.r}`), ...w.roads.map((t) => `${t.q},${t.r}`)]);
      const NB: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      for (const t of [...w.tiles, ...w.roads])
        for (const [dq, dr] of NB) expect(ok.has(`${t.q + dq},${t.r + dr}`)).toBe(true);
    }
  });

  it('exterior variety: ring with several models and scales', () => {
    const w = genSectionWorld(section(), 'a1');
    expect(new Set(w.ridge.map((m) => m.model)).size).toBeGreaterThanOrEqual(2);
    const ss = w.ridge.map((m) => m.s ?? 1);
    expect(Math.max(...ss) - Math.min(...ss)).toBeGreaterThan(0.5);
  });

  it('houses next to the stretch before THEIR tower (never past it)', () => {
    const w = genSectionWorld(section(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    for (const x of w.attachments) {
      const segRoads = w.roads.filter((r) => r.group === x.moduleId);
      expect(segRoads.length).toBeGreaterThanOrEqual(6);
      expect(Math.min(...segRoads.map((r) => dd(x, r)))).toBeLessThanOrEqual(1);
      const tower = w.modules.find((m) => m.moduleId === x.moduleId) as { q: number; r: number };
      expect(dd(x, tower)).toBeGreaterThanOrEqual(2);
    }
  });

  it('attachments separated from each other (≥2, one free cell)', () => {
    const w = genSectionWorld(section(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    for (let i = 0; i < w.attachments.length; i++)
      for (let j = i + 1; j < w.attachments.length; j++) expect(dd(w.attachments[i], w.attachments[j])).toBeGreaterThanOrEqual(2);
  });

  it('organic octopus network: it is not a straight line and contains forks and curves', () => {
    const w = genSectionWorld(section(), 'a1');
    // r is not constant at 0: there are undulations and detours
    const rs = w.roads.map((r) => r.r);
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    expect(maxR - minR).toBeGreaterThanOrEqual(2);

    // Contains forks (D, E or F) and curves (B or C)
    const forks = w.roads.filter((r) => r.model.includes('hex_road_D') || r.model.includes('hex_road_E') || r.model.includes('hex_road_F'));
    expect(forks.length).toBeGreaterThanOrEqual(2);
    const curves = w.roads.filter((r) => r.model.includes('hex_road_B') || r.model.includes('hex_road_C'));
    expect(curves.length).toBeGreaterThanOrEqual(2);

    // All the road tiles have valid modular models (A, B, C, D, E, F, M)
    const validModels = ['hex_road_A', 'hex_road_B', 'hex_road_C', 'hex_road_D', 'hex_road_E', 'hex_road_F', 'hex_road_M'];
    for (const r of w.roads) {
      expect(validModels.some((m) => r.model.includes(m))).toBe(true);
    }
  });

  it('biomes: meadow by default, desert without tree/grass/tent, with rock, deterministic', () => {
    expect(biomeOf({})).toBe('meadow');
    expect(biomeOf({ biome: 'desert' })).toBe('desert');
    const wD1 = genSectionWorld(section({ biome: 'desert' }), 'a1');
    const wD2 = genSectionWorld(section({ biome: 'desert' }), 'a1');
    expect(wD1).toEqual(wD2);
    expect(wD1.biome).toBe('desert');
    expect(genSectionWorld(section(), 'a1').biome).toBe('meadow');
    const models = [...wD1.decor.map((d) => d.model), ...wD1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree') || m.includes('grass') || m.includes('tent'))).toBe(false);
    expect(models.some((m) => m.includes('rock'))).toBe(true);
  });

  it('desert vegetation: desert includes cactus.glb and tumbleweed.glb; meadow no proc:', () => {
    const wD = genSectionWorld(section({ biome: 'desert' }), 'a1');
    const dModels = wD.decor.map((d) => d.model);
    expect(dModels.some((m) => m.includes('cactus_'))).toBe(true);
    expect(dModels.some((m) => m.includes('tumbleweed_lowpoly.glb'))).toBe(true);
    const wP = genSectionWorld(section(), 'a1');
    expect(wP.decor.every((d) => !d.model.startsWith('proc:'))).toBe(true);
    expect(wP.decor.some((d) => d.model.includes('cactus_'))).toBe(false);
  });

  it('desert props only next to the market: barrels/crates at dist 1 from the market', () => {
    const wD = genSectionWorld(section({ biome: 'desert' }), 'a1');
    const market = wD.modules.find((m) => m.moduleId.startsWith('__market')) as { q: number; r: number };
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const props = wD.decor.filter((d) => d.model.includes('barrel') || d.model.includes('crate'));
    for (const p of props) expect(dd(p, market)).toBe(1);
  });

  it('snow: deterministic white biome, no green, with snow props and bare mountains', () => {
    expect(biomeOf({ biome: 'snow' })).toBe('snow');
    const wN1 = genSectionWorld(section({ biome: 'snow' }), 'a1');
    const wN2 = genSectionWorld(section({ biome: 'snow' }), 'a1');
    expect(wN1).toEqual(wN2);
    expect(wN1.biome).toBe('snow');
    const models = [...wN1.decor.map((d) => d.model), ...wN1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree_single') || m.includes('trees_A') || m.includes('_grass') || m.includes('tent'))).toBe(false);
    expect(
      wN1.decor.some((d) => d.model.includes('snowman') || d.model.includes('pine_snow') || d.model.includes('tree_snow')),
    ).toBe(true);
    expect(wN1.ridge.every((m) => /mountain_[ABC]\.gltf$/.test(m.model))).toBe(true);
    const wP = genSectionWorld(section(), 'a1');
    expect(wP.decor.some((d) => d.model.includes('snowman') || d.model.includes('pine_snow') || d.model.includes('tree_snow'))).toBe(false);
  });

  it('volcano islets: 1-2 volcano islets + 1-2 ring = 2-4 volcanoes in total only in lava', () => {
    const wL1 = genSectionWorld(section({ biome: 'lava' }), 'a1');
    const wL2 = genSectionWorld(section({ biome: 'lava' }), 'a1');
    expect(wL1).toEqual(wL2);
    const vols = wL1.ridge.filter((m) => m.model.includes('volcano.glb'));
    expect(vols.length).toBeGreaterThanOrEqual(1);
    expect(vols.length).toBeLessThanOrEqual(2);
    const vset = new Set(wL1.volcanoes.map((v) => `${v.q},${v.r}`));
    for (const v of vols) expect(vset.has(`${v.q},${v.r}`)).toBe(true);
    for (const b of ['desert', 'snow', undefined] as const) {
      const w = genSectionWorld(section(b === undefined ? {} : { biome: b }), 'a1');
      expect(w.ridge.some((m) => m.model.includes('volcano.glb'))).toBe(false);
    }
  });

  it('lava: deterministic volcanic biome, no green, with 1-2 volcanoes near the road', () => {
    expect(biomeOf({ biome: 'lava' })).toBe('lava');
    const wL1 = genSectionWorld(section({ biome: 'lava' }), 'a1');
    const wL2 = genSectionWorld(section({ biome: 'lava' }), 'a1');
    expect(wL1).toEqual(wL2);
    expect(wL1.biome).toBe('lava');
    const models = [...wL1.decor.map((d) => d.model), ...wL1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree_single') || m.includes('trees_A') || m.includes('_grass') || m.includes('tent'))).toBe(false);
    expect(wL1.volcanoes.length).toBeGreaterThanOrEqual(1);
    expect(wL1.volcanoes.length).toBeLessThanOrEqual(2);
    const rset = new Set(wL1.ridge.map((m) => `${m.q},${m.r}`));
    for (const v of wL1.volcanoes) expect(rset.has(`${v.q},${v.r}`)).toBe(true);
  });

  it('desert bones: 2+ proc:huesos in desert, nothing in meadow', () => {
    const wD = genSectionWorld(section({ biome: 'desert' }), 'a1');
    expect(wD.decor.filter((d) => d.model === 'proc:huesos').length).toBeGreaterThanOrEqual(2);
    const wP = genSectionWorld(section(), 'a1');
    expect(wP.decor.some((d) => d.model === 'proc:huesos')).toBe(false);
  });
});
