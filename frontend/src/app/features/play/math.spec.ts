import { genQuestion } from './math';

describe('math', () => {
  it('answer within 4 unique options', () => {
    for (const seed of ['m1', 'm2', 'otro-seed', 'x'.repeat(50)]) {
      const q = genQuestion(seed);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options.every((o) => o >= 0)).toBe(true);
    }
  });

  it('deterministic by seed and primary level', () => {
    expect(genQuestion('abc')).toEqual(genQuestion('abc'));
    for (let i = 0; i < 30; i++) {
      const q = genQuestion(`s${i}`);
      if (q.text.includes('+')) {
        const [a, b] = q.text.replace(' = ?', '').split(' + ').map(Number);
        expect(a + b).toBeLessThanOrEqual(20);
      }
      if (q.text.includes('×')) {
        const [a, b] = q.text.replace(' = ?', '').split(' × ').map(Number);
        expect(a).toBeLessThanOrEqual(5);
        expect(b).toBeLessThanOrEqual(5);
      }
    }
  });
});
