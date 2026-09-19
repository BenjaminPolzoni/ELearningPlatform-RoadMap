import * as THREE from 'three';
import { CharacterController } from './character-controller';
import type { Vista } from './camera-controller';

const ctrl = (): CharacterController =>
  new CharacterController({} as never, 2, 1.73);

const wideWalk = (): Set<string> => {
  const s = new Set<string>();
  for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) s.add(`${q},${r}`);
  return s;
};

const step = (c: CharacterController, frames: number, vista: Vista = 'libre'): void => {
  for (let i = 0; i < frames; i++) {
    c.update(0.05, i * 0.05, -Math.PI / 2, false, [], wideWalk(), 1000, null, undefined, vista);
  }
};

describe('character-controller click-to-move', () => {
  it('sin destino no se mueve', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    step(c, 10);
    expect(c.char.position.x).toBe(0);
    expect(c.char.position.z).toBe(0);
    expect(c.hasTarget()).toBe(false);
  });

  it('avanza hacia el destino y se detiene al llegar', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    expect(c.hasTarget()).toBe(true);
    step(c, 60);
    expect(c.hasTarget()).toBe(false);
    expect(Math.hypot(c.char.position.x - 5, c.char.position.z)).toBeLessThan(0.35);
  });

  it('clearTarget cancela el destino', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    c.clearTarget();
    step(c, 10);
    expect(c.hasTarget()).toBe(false);
    expect(c.char.position.x).toBe(0);
  });

  it('destino inalcanzable se cancela tras atascarse', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    // solo el hex inicial es caminable: cada paso rebota
    for (let i = 0; i < 80; i++) {
      c.update(0.05, i * 0.05, -Math.PI / 2, false, [], new Set(['0,0']), 1000, null);
    }
    expect(c.hasTarget()).toBe(false);
  });

  it('velocidad base: avanza 1.92*sx por segundo (+20%)', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(50, 0);
    step(c, 10);
    // 10 frames × 0.05s × 1.92 × sx(2) = 1.92
    expect(c.char.position.x).toBeCloseTo(1.92, 2);
  });

  it('con Shift corre 1.75 veces más rápido', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      step(c, 10);
      // 10 × 0.05 × 1.92 × 2 × 1.75 = 3.36
      expect(c.char.position.x).toBeCloseTo(3.36, 2);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    } finally {
      c.dispose();
    }
  });

  it('en tercera A gira en el lugar sin trasladarse', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      step(c, 20, 'tercera');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      // 20 × 0.05 × 2.6 rad/s girados, desplazamiento nulo (antes pirueteaba).
      expect(c.char.rotation.y).toBeCloseTo(2.6, 2);
      expect(Math.hypot(c.char.position.x, c.char.position.z)).toBe(0);
    } finally {
      c.dispose();
    }
  });

  it('en tercera W avanza hacia el frente del personaje', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.char.rotation.y = Math.PI / 2; // frente +x
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      step(c, 10, 'tercera');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      expect(c.char.position.x).toBeCloseTo(1.92, 2);
      expect(c.char.position.z).toBeCloseTo(0, 2);
    } finally {
      c.dispose();
    }
  });

  it('en tercera S retrocede sin voltear al personaje (sin flip-flop)', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.char.rotation.y = Math.PI / 2; // frente +x
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      step(c, 10, 'tercera');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }));
      // Retrocede de frente: misma distancia que W pero en -x, frente intacto.
      expect(c.char.position.x).toBeCloseTo(-1.92, 2);
      expect(c.char.position.z).toBeCloseTo(0, 2);
      expect(c.char.rotation.y).toBeCloseTo(Math.PI / 2, 6);
    } finally {
      c.dispose();
    }
  });
});
