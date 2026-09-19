// Desafíos de mates por semilla: fijos por módulo hasta acertar.
// ponytail: generador puro, sin assets ni deps.

export interface Question {
  texto: string;
  opciones: number[];
  respuesta: number;
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
  let texto = '';
  let respuesta = 0;
  if (kind === 0) {
    const a = 2 + pick(11);
    let b = 2 + pick(9);
    if (a + b > 20) b = 20 - a; // cap 20
    texto = `${a} + ${b} = ?`;
    respuesta = a + b;
  } else if (kind === 1) {
    const a = 3 + pick(18);
    const b = 1 + pick(a - 1);
    texto = `${a} − ${b} = ?`;
    respuesta = a - b;
  } else {
    const a = 2 + pick(4);
    const b = 2 + pick(4);
    texto = `${a} × ${b} = ?`;
    respuesta = a * b;
  }
  // 4 opciones únicas con la respuesta dentro, barajadas
  const set = new Set<number>([respuesta]);
  while (set.size < 4) {
    const d = respuesta + pick(7) - 3;
    if (d >= 0 && d !== respuesta) set.add(d);
  }
  const opciones = [...set];
  for (let i = opciones.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
  }
  return { texto, opciones, respuesta };
}
