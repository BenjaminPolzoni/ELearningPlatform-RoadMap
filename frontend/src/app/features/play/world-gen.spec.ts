import type { Unidad } from '../../core/educa/models';
import { biomeOf, colorFor, genUnidadWorld, rotFor } from './world-gen';

const unidad = (over: Partial<Unidad> = {}): Unidad => ({
  id: 'u1',
  titulo: 'U1',
  descripcion: '',
  orden: 0,
  color: '#22c55e',
  modulos: [
    {
      id: 'm1',
      titulo: 'M1',
      descripcion: '',
      orden: 0,
      anexos: [
        { id: 'x1', titulo: 'A1', tipo: 'video' },
        { id: 'x2', titulo: 'A2', tipo: 'documento' },
      ],
    },
    { id: 'm2', titulo: 'M2', descripcion: '', orden: 1, anexos: [] },
  ],
  ...over,
});

describe('world-gen v2 (mundo por unidad)', () => {
  it('castillo del color de la unidad, torres = módulos, anexos variados', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    expect(w.castle.model).toContain('/green/');
    expect(w.castle.model).toContain('castle');
    expect(w.castle.s).toBe(1.3); // escalado al +30% según requerimiento
    const towers = w.modulos.filter((m) => !m.moduloId.startsWith('__'));
    expect(towers.map((m) => m.moduloId)).toEqual(['m1', 'm2']);
    expect(towers.every((t) => t.model.includes('tower_A'))).toBe(true);
    expect(w.anexos.map((x) => x.anexoId)).toEqual(['x1', 'x2']);
    const pool = ['building_tavern', 'building_barracks', 'building_archeryrange', 'building_lumbermill', 'building_windmill', 'building_home_B'];
    expect(w.anexos.every((x) => pool.some((p) => x.model.includes(p)))).toBe(true);
    expect(w.anexos.every((x) => x.model.includes('/green/'))).toBe(true);
    expect(new Set(w.anexos.map((x) => x.model)).size).toBe(w.anexos.length); // reparto sin repetir
  });

  it('bandera en el spawn y mercado a 2 hexes', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const flag = w.modulos.find((m) => m.moduloId.startsWith('__flag'));
    expect(flag).toBeTruthy();
    expect({ q: flag?.q, r: flag?.r }).toEqual({ q: w.spawn.q, r: w.spawn.r });
    const market = w.modulos.find((m) => m.moduloId.startsWith('__market'));
    expect(market?.model).toContain('market');
    expect(market?.model).toContain('/green/');
    expect(dd(market as { q: number; r: number }, w.spawn)).toBe(2);
  });

  it('red de caminos continua con troncal y ramales desde spawn hasta castillo', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const roadKeys = new Set(w.roads.map((r) => `${r.q},${r.r}`));
    // el camino arranca exactamente en el spawn del personaje
    expect(roadKeys.has(`${w.spawn.q},${w.spawn.r}`)).toBe(true);

    // red conexa: BFS desde spawn recorre todos los caminos hasta el castillo
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

    // el castillo sobre baldosa de remate __end hex_road_M (Foto 2) con conector previo completo (Foto 1)
    const endRoads = w.roads.filter((r) => r.group === '__end');
    expect(endRoads.length).toBeGreaterThanOrEqual(1);
    const castleRoad = endRoads.find((r) => r.q === w.castle.q && r.r === w.castle.r);
    expect(castleRoad).toBeTruthy();
    expect(castleRoad?.model).toContain('hex_road_M');

    // modelos y rotaciones válidas
    expect(w.roads.every((r) => Number.isFinite(r.rotY))).toBe(true);
    expect(w.roads.every((r) => r.model.includes('hex_road_'))).toBe(true);
    expect(w.castle.rotY).toBeCloseTo(-Math.PI / 2, 2); // la puerta del castillo mira directamente al camino de acceso

    // el castillo cierra más lejos que la última torre
    const towers = w.modulos.filter((m) => !m.moduloId.startsWith('__'));
    const last = towers[towers.length - 1];
    const d = (p: { q: number; r: number }): number =>
      (Math.abs(p.q) + Math.abs(p.r) + Math.abs(p.q + p.r)) / 2;
    expect(d(w.castle)).toBeGreaterThan(d(last));
  });

  it('edificios sobre baldosas de remate hex_road_M (Foto 2) con conector previo completo (Foto 1)', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const roadKeys = new Set(w.roads.map((r) => `${r.q},${r.r}`));
    const grassKeys = new Set(w.tiles.map((t) => `${t.q},${t.r}`));
    // ningún camino lleva hierba debajo
    for (const k of roadKeys) expect(grassKeys.has(k)).toBe(false);

    const buildings = [
      ...w.modulos
        .filter((m) => !m.moduloId.startsWith('__flag'))
        .map((m) => ({ ...m, group: m.moduloId.startsWith('__market') ? '__start' : m.moduloId })),
      ...w.anexos.map((x) => ({ ...x, group: x.moduloId })),
      { ...w.castle, group: '__end' },
    ];

    // cada edificio se asienta sobre una baldosa de camino de tipo remate hex_road_M (Foto 2)
    for (const b of buildings) {
      expect(roadKeys.has(`${b.q},${b.r}`)).toBe(true);
      const road = w.roads.find((r) => r.q === b.q && r.r === b.r);
      expect(road).toBeTruthy();
      expect(road?.model).toContain('hex_road_M');
      expect(road?.group).toBe(b.group);

      // y la baldosa conectora previa a distancia 1 es una baldosa de camino completo (Foto 1: A, B o C)
      const neighbors = w.roads.filter((r) => dd(b, r) === 1);
      expect(neighbors.length).toBeGreaterThanOrEqual(1);
      const conn = neighbors.find((r) => !r.model.includes('hex_road_M'));
      expect(conn).toBeTruthy();
    }

    // cada torre y anexo tiene carreteras de su grupo
    for (const t of w.modulos.filter((m) => !m.moduloId.startsWith('__'))) {
      const mine = w.roads.filter((r) => r.group === t.moduloId);
      expect(mine.length).toBeGreaterThanOrEqual(6);
    }
    // spawn en carretera
    const startRoads = w.roads.filter((r) => r.group === '__start');
    expect(startRoads.some((r) => r.q === w.spawn.q && r.r === w.spawn.r)).toBe(true);
  });

  it('respeta colores y es determinista', () => {
    expect(genUnidadWorld(unidad({ color: '#ef4444' }), 'a1').castle.model).toContain('/red/');
    expect(colorFor(undefined)).toBe('blue');
    expect(genUnidadWorld(unidad(), 'a1')).toEqual(genUnidadWorld(unidad(), 'a1'));
  });

  it('tiles únicos, spawn en camino de inicio, caminos sin hierba debajo', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const keys = w.tiles.map((t) => `${t.q},${t.r}`);
    expect(new Set(keys).size).toBe(keys.length);
    const roadKeys = w.roads.map((r) => `${r.q},${r.r}`);
    expect(new Set(roadKeys).size).toBe(roadKeys.length);
    expect(roadKeys).toContain(`${w.spawn.q},${w.spawn.r}`);
    for (const k of roadKeys) expect(keys).not.toContain(k);
  });

  it('isla conectada + cordón lejano (determinista)', () => {
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const NB: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const w = genUnidadWorld(unidad(), 'a1');
    // toda la hierba + caminos conectados a pie desde el spawn
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
    // cordón: 6-8 montañas fuera de la hierba jugable, cada una sobre hierba de islote
    expect(w.ridge.length).toBeGreaterThanOrEqual(6);
    expect(w.ridge.length).toBeLessThanOrEqual(8);
    expect(w.waters.length).toBeGreaterThan(110); // anillo + canales a islotes    expect(w.ridge.every((m) => m.model.includes('mountain_'))).toBe(true);
    const iset = new Set(w.islets.map((t) => `${t.q},${t.r}`));
    for (const m of w.ridge) {
      expect(set.has(`${m.q},${m.r}`)).toBe(false);
      expect(iset.has(`${m.q},${m.r}`) || set.has(`${m.q},${m.r}`)).toBe(true);
    }
    // islotes en 2+ tamaños distintos (3/5/7)
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
    // el agua de cada islote empalma con el anillo principal (BFS solo agua,
    // a nivel de islote: el centro de un 7 queda interior, sin agua pegada)
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
    expect(genUnidadWorld(unidad(), 'a1')).toEqual(w);
  });

  it('sin bordes al vacío: hierba y caminos lindan con hierba, camino o agua', () => {
    for (const seed of ['a1', 'otra', 'x'.repeat(20)]) {
      const w = genUnidadWorld(unidad(), seed);
      const ok = new Set([...w.tiles.map((t) => `${t.q},${t.r}`), ...w.waters.map((t) => `${t.q},${t.r}`), ...w.roads.map((t) => `${t.q},${t.r}`)]);
      const NB: ReadonlyArray<readonly [number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      for (const t of [...w.tiles, ...w.roads])
        for (const [dq, dr] of NB) expect(ok.has(`${t.q + dq},${t.r + dr}`)).toBe(true);
    }
  });

  it('variedad exterior: cordón con varios modelos y escalas', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    expect(new Set(w.ridge.map((m) => m.model)).size).toBeGreaterThanOrEqual(2);
    const ss = w.ridge.map((m) => m.s ?? 1);
    expect(Math.max(...ss) - Math.min(...ss)).toBeGreaterThan(0.5);
  });

  it('casas junto al tramo previo a SU torre (nunca pasada)', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    for (const x of w.anexos) {
      const segRoads = w.roads.filter((r) => r.group === x.moduloId);
      expect(segRoads.length).toBeGreaterThanOrEqual(6);
      expect(Math.min(...segRoads.map((r) => dd(x, r)))).toBeLessThanOrEqual(1);
      const tower = w.modulos.find((m) => m.moduloId === x.moduloId) as { q: number; r: number };
      expect(dd(x, tower)).toBeGreaterThanOrEqual(2);
    }
  });

  it('anexos separados entre sí (≥2, una casilla libre)', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    for (let i = 0; i < w.anexos.length; i++)
      for (let j = i + 1; j < w.anexos.length; j++) expect(dd(w.anexos[i], w.anexos[j])).toBeGreaterThanOrEqual(2);
  });

  it('red en pulpo orgánica: no es una línea recta y contiene bifurcaciones y curvas', () => {
    const w = genUnidadWorld(unidad(), 'a1');
    // r no es constante a 0: hay ondulaciones y desvíos
    const rs = w.roads.map((r) => r.r);
    const minR = Math.min(...rs);
    const maxR = Math.max(...rs);
    expect(maxR - minR).toBeGreaterThanOrEqual(2);

    // Contiene bifurcaciones (D, E o F) y curvas (B o C)
    const forks = w.roads.filter((r) => r.model.includes('hex_road_D') || r.model.includes('hex_road_E') || r.model.includes('hex_road_F'));
    expect(forks.length).toBeGreaterThanOrEqual(2);
    const curves = w.roads.filter((r) => r.model.includes('hex_road_B') || r.model.includes('hex_road_C'));
    expect(curves.length).toBeGreaterThanOrEqual(2);

    // Todas las baldosas de camino tienen modelos modulares válidos (A, B, C, D, E, F, M)
    const validModels = ['hex_road_A', 'hex_road_B', 'hex_road_C', 'hex_road_D', 'hex_road_E', 'hex_road_F', 'hex_road_M'];
    for (const r of w.roads) {
      expect(validModels.some((m) => r.model.includes(m))).toBe(true);
    }
  });

  it('biomas: pradera por defecto, desierto sin tree/grass/tent, con rock, determinista', () => {
    expect(biomeOf({})).toBe('pradera');
    expect(biomeOf({ bioma: 'desierto' })).toBe('desierto');
    const wD1 = genUnidadWorld(unidad({ bioma: 'desierto' }), 'a1');
    const wD2 = genUnidadWorld(unidad({ bioma: 'desierto' }), 'a1');
    expect(wD1).toEqual(wD2);
    expect(wD1.bioma).toBe('desierto');
    expect(genUnidadWorld(unidad(), 'a1').bioma).toBe('pradera');
    const models = [...wD1.decor.map((d) => d.model), ...wD1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree') || m.includes('grass') || m.includes('tent'))).toBe(false);
    expect(models.some((m) => m.includes('rock'))).toBe(true);
  });

  it('vegetación desértica: desierto incluye cactus.glb y tumbleweed.glb; pradera ningún proc:', () => {
    const wD = genUnidadWorld(unidad({ bioma: 'desierto' }), 'a1');
    const dModels = wD.decor.map((d) => d.model);
    expect(dModels.some((m) => m.includes('cactus_'))).toBe(true);
    expect(dModels.some((m) => m.includes('tumbleweed_lowpoly.glb'))).toBe(true);
    const wP = genUnidadWorld(unidad(), 'a1');
    expect(wP.decor.every((d) => !d.model.startsWith('proc:'))).toBe(true);
    expect(wP.decor.some((d) => d.model.includes('cactus_'))).toBe(false);
  });

  it('utilería desértica solo junto al mercado: barriles/cajas a dist 1 del mercado', () => {
    const wD = genUnidadWorld(unidad({ bioma: 'desierto' }), 'a1');
    const market = wD.modulos.find((m) => m.moduloId.startsWith('__market')) as { q: number; r: number };
    const dd = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
      (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
    const props = wD.decor.filter((d) => d.model.includes('barrel') || d.model.includes('crate'));
    for (const p of props) expect(dd(p, market)).toBe(1);
  });

  it('nieve: bioma blanco determinista, sin verde, con props de nieve y montañas peladas', () => {
    expect(biomeOf({ bioma: 'nieve' })).toBe('nieve');
    const wN1 = genUnidadWorld(unidad({ bioma: 'nieve' }), 'a1');
    const wN2 = genUnidadWorld(unidad({ bioma: 'nieve' }), 'a1');
    expect(wN1).toEqual(wN2);
    expect(wN1.bioma).toBe('nieve');
    const models = [...wN1.decor.map((d) => d.model), ...wN1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree_single') || m.includes('trees_A') || m.includes('_grass') || m.includes('tent'))).toBe(false);
    expect(
      wN1.decor.some((d) => d.model.includes('snowman') || d.model.includes('pine_snow') || d.model.includes('tree_snow')),
    ).toBe(true);
    expect(wN1.ridge.every((m) => /mountain_[ABC]\.gltf$/.test(m.model))).toBe(true);
    const wP = genUnidadWorld(unidad(), 'a1');
    expect(wP.decor.some((d) => d.model.includes('snowman') || d.model.includes('pine_snow') || d.model.includes('tree_snow'))).toBe(false);
  });

  it('islotes-volcán: 1-2 islotes-volcán + 1-2 cordón = 2-4 volcánes totales solo en lava', () => {
    const wL1 = genUnidadWorld(unidad({ bioma: 'lava' }), 'a1');
    const wL2 = genUnidadWorld(unidad({ bioma: 'lava' }), 'a1');
    expect(wL1).toEqual(wL2);
    const vols = wL1.ridge.filter((m) => m.model.includes('volcano.glb'));
    expect(vols.length).toBeGreaterThanOrEqual(1);
    expect(vols.length).toBeLessThanOrEqual(2);
    const vset = new Set(wL1.volcanes.map((v) => `${v.q},${v.r}`));
    for (const v of vols) expect(vset.has(`${v.q},${v.r}`)).toBe(true);
    for (const b of ['desierto', 'nieve', undefined] as const) {
      const w = genUnidadWorld(unidad(b === undefined ? {} : { bioma: b }), 'a1');
      expect(w.ridge.some((m) => m.model.includes('volcano.glb'))).toBe(false);
    }
  });

  it('lava: bioma volcánico determinista, sin verde, con 1-2 volcanes cerca del camino', () => {
    expect(biomeOf({ bioma: 'lava' })).toBe('lava');
    const wL1 = genUnidadWorld(unidad({ bioma: 'lava' }), 'a1');
    const wL2 = genUnidadWorld(unidad({ bioma: 'lava' }), 'a1');
    expect(wL1).toEqual(wL2);
    expect(wL1.bioma).toBe('lava');
    const models = [...wL1.decor.map((d) => d.model), ...wL1.ridge.map((m) => m.model)];
    expect(models.some((m) => m.includes('tree_single') || m.includes('trees_A') || m.includes('_grass') || m.includes('tent'))).toBe(false);
    expect(wL1.volcanes.length).toBeGreaterThanOrEqual(1);
    expect(wL1.volcanes.length).toBeLessThanOrEqual(2);
    const rset = new Set(wL1.ridge.map((m) => `${m.q},${m.r}`));
    for (const v of wL1.volcanes) expect(rset.has(`${v.q},${v.r}`)).toBe(true);
  });

  it('huesos desérticos: 2+ proc:huesos en desierto, nada en pradera', () => {
    const wD = genUnidadWorld(unidad({ bioma: 'desierto' }), 'a1');
    expect(wD.decor.filter((d) => d.model === 'proc:huesos').length).toBeGreaterThanOrEqual(2);
    const wP = genUnidadWorld(unidad(), 'a1');
    expect(wP.decor.some((d) => d.model === 'proc:huesos')).toBe(false);
  });
});
