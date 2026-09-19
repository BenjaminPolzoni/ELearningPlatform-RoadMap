import { describe, expect, it } from 'vitest';
import { genIslasLayout } from './world-gen';

const UN = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i + 1}`, anexos: 3 }));

describe('genIslasLayout', () => {
  it('vacío no rompe', () => {
    const m = genIslasLayout([]);
    expect(m.islas).toEqual([]);
    expect(m.h).toBe(0);
    expect(m.ruta).toBe('');
  });

  it('serpentina determinista por orden', () => {
    const a = genIslasLayout(UN(4));
    const b = genIslasLayout(UN(4));
    expect(a).toEqual(b);
    // Fila 0: izq→der; fila 1: der→izq.
    expect(a.islas.map((s) => s.cx)).toEqual([200, 600, 1000, 1000]);
    expect(a.islas.map((s) => s.cy)).toEqual([150, 150, 150, 420]);
  });

  it('islas con más anexos son más grandes, con tope', () => {
    const m = genIslasLayout([
      { id: 'chica', anexos: 1 },
      { id: 'grande', anexos: 40 },
    ]);
    expect(m.islas[0].r).toBe(57);
    expect(m.islas[1].r).toBe(82);
  });

  it('sin solape: distancia mínima entre centros supera dos radios máximos', () => {
    const m = genIslasLayout(UN(7));
    for (let i = 0; i < m.islas.length; i++) {
      for (let j = i + 1; j < m.islas.length; j++) {
        const d = Math.hypot(m.islas[i].cx - m.islas[j].cx, m.islas[i].cy - m.islas[j].cy);
        expect(d).toBeGreaterThan(m.islas[i].r + m.islas[j].r);
      }
    }
  });

  it('la ruta une las islas en orden de cursada', () => {
    const m = genIslasLayout(UN(2));
    expect(m.ruta).toBe('M200,150 L600,150');
  });
});
