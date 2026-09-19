import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraController, yawMovimiento } from './camera-controller';

function ctrl(): CameraController {
  const c = new CameraController(16 / 9);
  c.alturaOjos = 1;
  return c;
}

function personaje(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(2, 0, 4);
  return g;
}

describe('CameraController (vistas)', () => {
  it('libre: orbital detrás y arriba como la tercera anterior', () => {
    const c = ctrl();
    c.alternarVista(); // primera
    c.alternarVista(); // libre
    c.yaw = 0;
    c.dist = 10;
    c.height = 6;
    c.update(1, personaje());
    expect(c.camera.position.toArray()).toEqual([2, 6, 14]);
  });

  it('primera: ojos en la cabeza mirando hacia la vista', () => {
    const c = ctrl();
    expect(c.alternarVista()).toBe('primera');
    c.yaw = 0;
    c.update(1, personaje());
    expect(c.camera.position.toArray()).toEqual([2, 1, 3.5]);
    const dir = c.camera.getWorldDirection(new THREE.Vector3());
    expect(dir.x).toBeCloseTo(0);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(-1);
  });

  it('tercera es como la libre pero cerca, detrás y sin responder a yaw/dist', () => {
    const c = ctrl();
    // yaw/dist/height solo los usa la libre: en tercera no mueven la salida.
    c.yaw = 1.2;
    c.dist = 16;
    c.height = 12;
    const pj = personaje();
    pj.rotation.y = 0; // facing +z: cámara cerca detrás (-z)
    c.update(1, pj);
    expect(c.camera.position.toArray()).toEqual([2, 3.2, 4 - 5.5]);
    // Mira al personaje con la misma fórmula que la libre.
    const dir = c.camera.getWorldDirection(new THREE.Vector3());
    expect(dir.y).toBeCloseTo(-0.371, 2);
    expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(0.928, 2);
  });

  it('tercera sigue el giro con retardo (sin latigazo)', () => {
    const c = ctrl();
    const pj = personaje();
    pj.rotation.y = Math.PI / 2;
    c.update(1, pj); // primer frame: engancha
    pj.rotation.y = 0;
    c.update(0.001, pj); // giro brusco: apenas se movió (k≈0.003)
    const parcial = c.camera.position.toArray();
    expect(parcial[0]).toBeCloseTo(2 - 5.5, 1);
    for (let i = 0; i < 300; i++) c.update(0.05, pj);
    const final = c.camera.position.toArray();
    expect(final[0]).toBeCloseTo(2, 2);
    expect(final[2]).toBeCloseTo(4 - 5.5, 2);
  });

  it('alternarVista cicla Tercera → Primera → Libre → Tercera', () => {
    const c = ctrl();
    expect(c.alternarVista()).toBe('primera');
    expect(c.alternarVista()).toBe('libre');
    expect(c.alternarVista()).toBe('tercera');
  });
});

describe('yawMovimiento', () => {
  it('en tercera invierte el frente (Adelante = donde mira)', () => {
    expect(yawMovimiento('tercera', 1.2, 0.3)).toBeCloseTo(0.3 + Math.PI, 10);
  });

  it('en primera y libre usa el yaw de cámara', () => {
    expect(yawMovimiento('primera', 1.2, 0.3)).toBe(1.2);
    expect(yawMovimiento('libre', 1.2, 0.3)).toBe(1.2);
  });
});
