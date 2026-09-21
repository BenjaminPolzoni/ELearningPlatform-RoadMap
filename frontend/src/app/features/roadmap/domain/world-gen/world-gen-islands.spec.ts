import { describe, expect, it } from 'vitest';
import { genIslandsLayout } from './world-gen';

const UN = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i + 1}`, attachments: 3 }));

describe('genIslandsLayout', () => {
  it('empty does not break', () => {
    const m = genIslandsLayout([]);
    expect(m.islands).toEqual([]);
    expect(m.h).toBe(0);
    expect(m.route).toBe('');
  });

  it('deterministic serpentine by order', () => {
    const a = genIslandsLayout(UN(4));
    const b = genIslandsLayout(UN(4));
    expect(a).toEqual(b);
    // Row 0: left→right; row 1: right→left.
    expect(a.islands.map((s) => s.cx)).toEqual([200, 600, 1000, 1000]);
    expect(a.islands.map((s) => s.cy)).toEqual([150, 150, 150, 420]);
  });

  it('islands with more attachments are bigger, with a cap', () => {
    const m = genIslandsLayout([
      { id: 'chica', attachments: 1 },
      { id: 'grande', attachments: 40 },
    ]);
    expect(m.islands[0].r).toBe(57);
    expect(m.islands[1].r).toBe(82);
  });

  it('no overlap: minimum distance between centers exceeds two maximum radii', () => {
    const m = genIslandsLayout(UN(7));
    for (let i = 0; i < m.islands.length; i++) {
      for (let j = i + 1; j < m.islands.length; j++) {
        const d = Math.hypot(m.islands[i].cx - m.islands[j].cx, m.islands[i].cy - m.islands[j].cy);
        expect(d).toBeGreaterThan(m.islands[i].r + m.islands[j].r);
      }
    }
  });

  it('the route joins the islands in course order', () => {
    const m = genIslandsLayout(UN(2));
    expect(m.route).toBe('M200,150 L600,150');
  });
});
