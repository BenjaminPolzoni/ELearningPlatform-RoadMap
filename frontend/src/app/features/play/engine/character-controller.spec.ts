import * as THREE from 'three';
import { CharacterController } from './character-controller';
import type { View } from './camera-controller';

const ctrl = (): CharacterController =>
  new CharacterController({} as never, 2, 1.73);

const wideWalk = (): Set<string> => {
  const s = new Set<string>();
  for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) s.add(`${q},${r}`);
  return s;
};

const step = (c: CharacterController, frames: number, view: View = 'free'): void => {
  for (let i = 0; i < frames; i++) {
    c.update(0.05, i * 0.05, -Math.PI / 2, false, [], wideWalk(), 1000, null, undefined, view);
  }
};

describe('character-controller click-to-move', () => {
  it('without a destination it does not move', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    step(c, 10);
    expect(c.char.position.x).toBe(0);
    expect(c.char.position.z).toBe(0);
    expect(c.hasTarget()).toBe(false);
  });

  it('advances toward the destination and stops on arrival', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    expect(c.hasTarget()).toBe(true);
    step(c, 60);
    expect(c.hasTarget()).toBe(false);
    expect(Math.hypot(c.char.position.x - 5, c.char.position.z)).toBeLessThan(0.35);
  });

  it('clearTarget cancels the destination', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    c.clearTarget();
    step(c, 10);
    expect(c.hasTarget()).toBe(false);
    expect(c.char.position.x).toBe(0);
  });

  it('unreachable destination is cancelled after getting stuck', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(5, 0);
    // only the initial hex is walkable: every step bounces
    for (let i = 0; i < 80; i++) {
      c.update(0.05, i * 0.05, -Math.PI / 2, false, [], new Set(['0,0']), 1000, null);
    }
    expect(c.hasTarget()).toBe(false);
  });

  it('base speed: advances 1.92*sx per second (+20%)', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.setTarget(50, 0);
    step(c, 10);
    // 10 frames × 0.05s × 1.92 × sx(2) = 1.92
    expect(c.char.position.x).toBeCloseTo(1.92, 2);
  });

  it('with Shift it runs 1.75 times faster', () => {
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

  it('in third A turns in place without moving', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      step(c, 20, 'third');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      // 20 × 0.05 × 2.6 rad/s turned, null displacement (it used to pirouette).
      expect(c.char.rotation.y).toBeCloseTo(2.6, 2);
      expect(Math.hypot(c.char.position.x, c.char.position.z)).toBe(0);
    } finally {
      c.dispose();
    }
  });

  it('in third W advances toward the character\'s front', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.char.rotation.y = Math.PI / 2; // front +x
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      step(c, 10, 'third');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      expect(c.char.position.x).toBeCloseTo(1.92, 2);
      expect(c.char.position.z).toBeCloseTo(0, 2);
    } finally {
      c.dispose();
    }
  });

  it('in third S moves back without flipping the character (no flip-flop)', () => {
    const c = ctrl();
    c.char = new THREE.Group();
    c.char.rotation.y = Math.PI / 2; // front +x
    c.bindInput();
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      step(c, 10, 'third');
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' }));
      // Moves back facing forward: same distance as W but in -x, front intact.
      expect(c.char.position.x).toBeCloseTo(-1.92, 2);
      expect(c.char.position.z).toBeCloseTo(0, 2);
      expect(c.char.rotation.y).toBeCloseTo(Math.PI / 2, 6);
    } finally {
      c.dispose();
    }
  });
});
