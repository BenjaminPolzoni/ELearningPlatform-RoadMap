import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraController, yawMovement } from './camera-controller';

function ctrl(): CameraController {
  const c = new CameraController(16 / 9);
  c.eyeHeight = 1;
  return c;
}

function character(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(2, 0, 4);
  return g;
}

describe('CameraController (views)', () => {
  it('free: orbital behind and above like the previous third (default)', () => {
    const c = ctrl();
    expect(c.view).toBe('libre');
    c.yaw = 0;
    c.dist = 10;
    c.height = 6;
    c.update(1, character());
    expect(c.camera.position.toArray()).toEqual([2, 6, 14]);
  });

  it('first: eyes on the head looking toward the view', () => {
    const c = ctrl();
    c.toggleView(); // switches to third
    expect(c.toggleView()).toBe('primera');
    c.yaw = 0;
    c.update(1, character());
    expect(c.camera.position.toArray()).toEqual([2, 1, 3.5]);
    const dir = c.camera.getWorldDirection(new THREE.Vector3());
    expect(dir.x).toBeCloseTo(0);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(-1);
  });

  it('third is like free but close, behind and not responding to yaw/dist', () => {
    const c = ctrl();
    expect(c.toggleView()).toBe('tercera');
    // yaw/dist/height are only used by free: in third they do not move the output.
    c.yaw = 1.2;
    c.dist = 16;
    c.height = 12;
    const pj = character();
    pj.rotation.y = 0; // facing +z: camera close behind (-z)
    c.update(1, pj);
    expect(c.camera.position.toArray()).toEqual([2, 3.2, 4 - 5.5]);
    // Looks at the character with the same formula as free.
    const dir = c.camera.getWorldDirection(new THREE.Vector3());
    expect(dir.y).toBeCloseTo(-0.371, 2);
    expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(0.928, 2);
  });

  it('third follows the turn with delay (no whiplash)', () => {
    const c = ctrl();
    c.toggleView(); // switches to third
    const pj = character();
    pj.rotation.y = Math.PI / 2;
    c.update(1, pj); // first frame: it hooks on
    pj.rotation.y = 0;
    c.update(0.001, pj); // sharp turn: it barely moved (k≈0.003)
    const partial = c.camera.position.toArray();
    expect(partial[0]).toBeCloseTo(2 - 5.5, 1);
    for (let i = 0; i < 300; i++) c.update(0.05, pj);
    const final = c.camera.position.toArray();
    expect(final[0]).toBeCloseTo(2, 2);
    expect(final[2]).toBeCloseTo(4 - 5.5, 2);
  });

  it('toggleView cycles Free → Third → First → Free', () => {
    const c = ctrl();
    expect(c.view).toBe('libre');
    expect(c.toggleView()).toBe('tercera');
    expect(c.toggleView()).toBe('primera');
    expect(c.toggleView()).toBe('libre');
  });
});

describe('yawMovement', () => {
  it('in third it inverts the front (Forward = where it looks)', () => {
    expect(yawMovement('tercera', 1.2, 0.3)).toBeCloseTo(0.3 + Math.PI, 10);
  });

  it('in first and free it uses the camera yaw', () => {
    expect(yawMovement('primera', 1.2, 0.3)).toBe(1.2);
    expect(yawMovement('libre', 1.2, 0.3)).toBe(1.2);
  });
});
