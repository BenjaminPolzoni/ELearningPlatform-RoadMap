import { genQuestion } from './math';

describe('math', () => {
  it('respuesta dentro de 4 opciones únicas', () => {
    for (const seed of ['m1', 'm2', 'otro-seed', 'x'.repeat(50)]) {
      const q = genQuestion(seed);
      expect(q.opciones).toContain(q.respuesta);
      expect(new Set(q.opciones).size).toBe(4);
      expect(q.opciones.every((o) => o >= 0)).toBe(true);
    }
  });

  it('determinista por semilla y nivel primaria', () => {
    expect(genQuestion('abc')).toEqual(genQuestion('abc'));
    for (let i = 0; i < 30; i++) {
      const q = genQuestion(`s${i}`);
      if (q.texto.includes('+')) {
        const [a, b] = q.texto.replace(' = ?', '').split(' + ').map(Number);
        expect(a + b).toBeLessThanOrEqual(20);
      }
      if (q.texto.includes('×')) {
        const [a, b] = q.texto.replace(' = ?', '').split(' × ').map(Number);
        expect(a).toBeLessThanOrEqual(5);
        expect(b).toBeLessThanOrEqual(5);
      }
    }
  });
});
