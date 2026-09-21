// Math challenges by seed: fixed per module until answered correctly.
// ponytail: pure generator, no assets or deps.

export interface Question {
  text: string;
  options: number[];
  answer: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function genQuestion(seed: string): Question {
  const r = rng(hash(seed));
  const pick = (n: number): number => Math.floor(r() * n);
  const kind = pick(3);
  let text = '';
  let answer = 0;
  if (kind === 0) {
    const a = 2 + pick(11);
    let b = 2 + pick(9);
    if (a + b > 20) b = 20 - a; // cap 20
    text = `${a} + ${b} = ?`;
    answer = a + b;
  } else if (kind === 1) {
    const a = 3 + pick(18);
    const b = 1 + pick(a - 1);
    text = `${a} − ${b} = ?`;
    answer = a - b;
  } else {
    const a = 2 + pick(4);
    const b = 2 + pick(4);
    text = `${a} × ${b} = ?`;
    answer = a * b;
  }
  // 4 unique options with the answer included, shuffled
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const d = answer + pick(7) - 3;
    if (d >= 0 && d !== answer) set.add(d);
  }
  const options = [...set];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { text, options, answer };
}
