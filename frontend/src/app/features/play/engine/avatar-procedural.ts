import * as THREE from 'three';

/**
 * Procedural models of the character (port of `public/mundo-3d/avatar-preview.html`).
 *
 * Everything the city editor generates with geometry instead of GLTF: backpack,
 * head accessories, hand objects, keyboard, pets. No Angular dependencies:
 * they receive what they need by parameter to stay testable.
 */

export type RgbTick = (time: number) => void;
export type AnimTick = (time: number, delta: number) => void;

/** Lazy load of a GLTF accessory (stars, flowers, chicken, cube). */
export type LoadScene = (file: string) => Promise<THREE.Group | null>;

function hex(color: string, fb: number): number {
  const n = parseInt(color.replace('#', '0x'), 16);
  return Number.isNaN(n) ? fb : n;
}

function std(color: number, roughness = 0.5, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// — Back —

export function createBackpack(color = '#2563eb'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'backpack';
  const mainMat = std(hex(color, 0x2563eb), 0.6, 0.1);
  const darkMat = std(0x1e293b, 0.7);
  const zipMat = std(0x94a3b8, 0.3, 0.8);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.22), mainMat);
  body.castShadow = true;
  group.add(body);

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.1), mainMat);
  pocket.position.set(0, -0.09, -0.15);
  pocket.castShadow = true;
  group.add(pocket);

  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 0.102), zipMat);
  zipper.position.set(0, 0.05, -0.15);
  group.add(zipper);

  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.18), darkMat);
  strapL.position.set(0.14, 0.02, 0.1);
  group.add(strapL);

  const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.18), darkMat);
  strapR.position.set(-0.14, 0.02, 0.1);
  group.add(strapR);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), darkMat);
  handle.position.set(0, 0.26, 0);
  handle.rotation.x = Math.PI;
  group.add(handle);
  return group;
}

export function createGamerKeyboard(): THREE.Group {
  const keyboardGroup = new THREE.Group();
  keyboardGroup.name = 'keyboard_gamer';
  const baseMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.25, 0.04),
    std(0x18181b, 0.35, 0.7),
  );
  baseMesh.castShadow = true;
  keyboardGroup.add(baseMesh);

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.1,
  });
  const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.22, 0.012), plateMat);
  plateMesh.position.z = 0.022;
  keyboardGroup.add(plateMesh);

  const keyMat = std(0x27272a, 0.5, 0.3);
  const wasdMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.75, roughness: 0.3, metalness: 0.2,
  });
  const spaceMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.65, roughness: 0.4, metalness: 0.2,
  });
  const numCols = 12;
  const numRows = 4;
  const keyW = 0.034;
  const keyH = 0.034;
  const keyD = 0.015;
  const gap = 0.007;
  const startX = -((numCols * (keyW + gap)) / 2) + keyW / 2;
  const startY = ((numRows * (keyH + gap)) / 2) - keyH / 2;
  const keyGeom = new THREE.BoxGeometry(keyW, keyH, keyD);
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (r === 3 && c >= 4 && c <= 7) continue;
      const isWASD = (r === 1 && c === 2) || (r === 2 && (c === 1 || c === 2 || c === 3));
      const kMesh = new THREE.Mesh(keyGeom, isWASD ? wasdMat : keyMat);
      kMesh.position.set(startX + c * (keyW + gap), startY - r * (keyH + gap), 0.032);
      kMesh.castShadow = true;
      keyboardGroup.add(kMesh);
    }
  }
  const spaceMesh = new THREE.Mesh(new THREE.BoxGeometry(4 * (keyW + gap) - gap, keyH, keyD), spaceMat);
  spaceMesh.position.set(0, startY - 3 * (keyH + gap), 0.032);
  spaceMesh.castShadow = true;
  keyboardGroup.add(spaceMesh);

  const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const ledGeom = new THREE.BoxGeometry(0.012, 0.012, 0.008);
  for (let l = 0; l < 3; l++) {
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(0.19 + l * 0.022, startY + 0.038, 0.025);
    keyboardGroup.add(led);
  }
  const port = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.018, 0.02),
    std(0x71717a, 0.2, 0.9),
  );
  port.position.set(0, 0.13, 0);
  keyboardGroup.add(port);

  keyboardGroup.userData['updateRGB'] = ((time: number) => {
    const color = new THREE.Color().setHSL((time * 0.35) % 1, 1.0, 0.52);
    plateMat.emissive.copy(color);
    plateMat.color.copy(color);
  }) satisfies RgbTick;
  return keyboardGroup;
}

export function createKeyboardBack(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'keyboard_back';
  const harnessMat = std(0x1f2937, 0.8);
  const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.16), harnessMat);
  strap1.rotation.z = Math.PI / 5;
  strap1.position.set(0, 0, 0.04);
  group.add(strap1);
  const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.16), harnessMat);
  strap2.rotation.z = -Math.PI / 5;
  strap2.position.set(0, 0, 0.04);
  group.add(strap2);
  const kb = createGamerKeyboard();
  kb.scale.set(1.2, 1.2, 1.2);
  kb.rotation.set(0, Math.PI, Math.PI / 3);
  kb.position.set(0.05, 0, -0.1);
  group.add(kb);
  group.userData['updateRGB'] = ((time: number) => {
    (kb.userData['updateRGB'] as RgbTick | undefined)?.(time);
  }) satisfies RgbTick;
  return group;
}

export function createGiantUSB(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'giant_usb';
  const bodyMat = std(0x18181b, 0.35, 0.7);
  const plugMat = std(0xe2e8f0, 0.15, 0.95);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.9 });
  const harnessMat = std(0x1f2937, 0.8);

  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.14), harnessMat);
  s1.rotation.z = Math.PI / 5;
  s1.position.set(0, 0, 0.04);
  group.add(s1);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.14), harnessMat);
  s2.rotation.z = -Math.PI / 5;
  s2.position.set(0, 0, 0.04);
  group.add(s2);

  const usbBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.08), bodyMat);
  usbBody.position.set(0.04, -0.02, -0.06);
  usbBody.castShadow = true;
  group.add(usbBody);

  const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.085), ledMat);
  led.position.set(0.04, 0.12, -0.06);
  group.add(led);

  const plug = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.06), plugMat);
  plug.position.set(0.04, 0.28, -0.06);
  group.add(plug);

  const hole1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.065), bodyMat);
  hole1.position.set(0.01, 0.29, -0.06);
  group.add(hole1);
  const hole2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.065), bodyMat);
  hole2.position.set(0.07, 0.29, -0.06);
  group.add(hole2);

  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), plugMat);
  loop.position.set(0.04, -0.28, -0.06);
  group.add(loop);

  group.rotation.z = -Math.PI / 6;
  return group;
}

// — Head —

export function createGamerHeadphones(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'headphones';
  const blackMat = std(0x18181b, 0.4, 0.5);
  const cushionMat = std(0x27272a, 0.8);
  const rgbMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x06b6d4, emissiveIntensity: 0.9, roughness: 0.2,
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 12, 32, Math.PI), blackMat);
  arch.position.set(0, 0.4, 0.02);
  group.add(arch);

  const archPad = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.038, 8, 20, Math.PI * 0.6), cushionMat);
  archPad.rotation.z = Math.PI * 0.2;
  archPad.position.set(0, 0.4, 0.02);
  group.add(archPad);

  for (const side of [-1, 1]) {
    const x = side * 0.54;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 24), blackMat);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(x, 0.38, 0.02);
    group.add(cup);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 12, 24), rgbMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x + side * 0.052, 0.38, 0.02);
    group.add(ring);

    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 12, 24), cushionMat);
    pad.rotation.y = Math.PI / 2;
    pad.position.set(x - side * 0.032, 0.38, 0.02);
    group.add(pad);
  }

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.54, 0.32, 0.08),
    new THREE.Vector3(-0.48, 0.26, 0.34),
    new THREE.Vector3(-0.32, 0.22, 0.56),
    new THREE.Vector3(-0.16, 0.22, 0.6),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.016, 8, false), blackMat));

  const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), rgbMat);
  micTip.position.set(-0.16, 0.22, 0.6);
  group.add(micTip);

  group.userData['updateRGB'] = ((time: number) => {
    const c = new THREE.Color().setHSL((time * 0.4) % 1, 1, 0.5);
    rgbMat.color.copy(c);
    rgbMat.emissive.copy(c);
  }) satisfies RgbTick;
  return group;
}

export function createPropellerHat(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'propeller_hat';
  const redMat = std(0xef4444);
  const blueMat = std(0x2563eb);
  const yellowMat = std(0xfacc15, 0.4);
  const greenMat = std(0x16a34a);
  const metalMat = std(0xe2e8f0, 0.2, 0.8);
  const orangeMat = std(0xf97316, 0.4);

  const capRadius = 0.57;
  const capY = 0.49;
  const capZ = 0.01;
  const quarters = [
    { mat: redMat, start: 0 },
    { mat: blueMat, start: Math.PI * 0.5 },
    { mat: yellowMat, start: Math.PI },
    { mat: greenMat, start: Math.PI * 1.5 },
  ];
  for (const q of quarters) {
    const segMesh = new THREE.Mesh(
      new THREE.SphereGeometry(capRadius, 18, 14, q.start, Math.PI * 0.5, 0, Math.PI * 0.54),
      q.mat,
    );
    segMesh.position.set(0, capY, capZ);
    group.add(segMesh);
  }

  const baseGrommet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16), metalMat);
  baseGrommet.position.set(0, capY + capRadius - 0.01, capZ);
  group.add(baseGrommet);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), metalMat);
  shaft.position.set(0, capY + capRadius + 0.08, capZ);
  group.add(shaft);

  const propGroup = new THREE.Group();
  propGroup.position.set(0, capY + capRadius + 0.16, capZ);
  propGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), yellowMat));
  const topBead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), orangeMat);
  topBead.position.set(0, 0.025, 0);
  propGroup.add(topBead);

  const bladeGeom = new THREE.BoxGeometry(0.28, 0.012, 0.065);
  const bladeMat = std(0xfacc15, 0.3);
  const tipMat = std(0xef4444, 0.4);
  const blade1 = new THREE.Mesh(bladeGeom, bladeMat);
  blade1.position.set(0.16, 0, 0);
  blade1.rotation.x = 0.18;
  propGroup.add(blade1);
  const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.065), tipMat);
  tip1.position.set(0.28, 0, 0);
  tip1.rotation.x = 0.18;
  propGroup.add(tip1);
  const blade2 = new THREE.Mesh(bladeGeom, bladeMat);
  blade2.position.set(-0.16, 0, 0);
  blade2.rotation.x = -0.18;
  propGroup.add(blade2);
  const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.065), tipMat);
  tip2.position.set(-0.28, 0, 0);
  tip2.rotation.x = -0.18;
  propGroup.add(tip2);
  group.add(propGroup);

  group.userData['updateRGB'] = ((time: number) => {
    propGroup.rotation.y = time * 24;
  }) satisfies RgbTick;
  group.scale.set(0.8, 0.56, 0.8);
  return group;
}

export function createStarOrbit(color: string, load: LoadScene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'star_orbit_' + color;
  const COUNT = 7;
  const RADIUS = 0.55;
  const HEIGHT = 1.05;
  const holders: THREE.Group[] = [];
  for (let i = 0; i < COUNT; i++) {
    const holder = new THREE.Group();
    group.add(holder);
    holders.push(holder);
  }

  group.userData['updateRGB'] = ((time: number) => {
    for (let i = 0; i < holders.length; i++) {
      const a = time * 1.8 + (i / holders.length) * Math.PI * 2;
      holders[i].position.set(
        Math.cos(a) * RADIUS,
        HEIGHT + Math.sin(time * 3 + i * 1.3) * 0.05,
        Math.sin(a) * RADIUS,
      );
      const star = holders[i].children[0];
      if (star) star.rotation.y = time * 3 + i;
    }
  }) satisfies RgbTick;

  load('star_' + color + '.gltf').then((scene) => {
    if (!scene) return;
    scene.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = true;
    });
    holders.forEach((holder) => {
      if (holder.children.length) return;
      const clone = scene.clone(true);
      clone.scale.setScalar(0.3);
      holder.add(clone);
    });
  }).catch(() => undefined);
  return group;
}

export function createFlowerAntennae(load: LoadScene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'flower_antennae';
  const files = ['flax_flower_A.gltf', 'flax_flower_B.gltf'];
  const spots = [
    { x: -0.3, tilt: 0.35 },
    { x: 0.3, tilt: -0.35 },
  ];
  group.userData['updateRGB'] = ((time: number) => {
    group.rotation.z = Math.sin(time * 1.6) * 0.04;
  }) satisfies RgbTick;

  files.forEach((file, i) => {
    load(file).then((scene) => {
      if (!scene || group.children.length >= files.length) return;
      const f = scene.clone(true);
      f.scale.setScalar(0.35);
      f.position.set(spots[i].x, 0.86, 0.12);
      f.rotation.z = spots[i].tilt;
      group.add(f);
    }).catch(() => undefined);
  });
  return group;
}

export function createSaiyanScouter(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'saiyan_scouter';
  const bodyMat = std(0xe2e8f0, 0.3, 0.8);
  const darkMat = std(0x1e293b, 0.4);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.95,
    transparent: true, opacity: 0.78, roughness: 0.1,
  });

  const earpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), bodyMat);
  earpiece.rotation.z = Math.PI / 2;
  earpiece.position.set(0.54, 0.38, 0.04);
  group.add(earpiece);

  const earCore = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), darkMat);
  earCore.position.set(0.58, 0.38, 0.04);
  group.add(earCore);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), bodyMat);
  arm.position.set(0.52, 0.38, 0.24);
  group.add(arm);

  const joint = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), bodyMat);
  joint.position.set(0.4, 0.38, 0.44);
  group.add(joint);

  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.02), lensMat);
  lens.rotation.y = -0.15;
  lens.position.set(0.22, 0.38, 0.48);
  group.add(lens);
  return group;
}

export function createGamerGlasses(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'gamer_glasses';
  const frameMat = std(0x0f172a, 0.3, 0.6);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35,
    transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.2,
  });
  const eyeY = 0.34;
  const eyeZ = 0.48;

  for (const side of [-1, 1]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.03), frameMat);
    frame.position.set(side * 0.21, eyeY, eyeZ);
    group.add(frame);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.02), lensMat);
    lens.position.set(side * 0.21, eyeY, eyeZ + 0.006);
    group.add(lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), frameMat);
  bridge.position.set(0, eyeY + 0.04, eyeZ);
  group.add(bridge);

  for (const side of [-1, 1]) {
    const templeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.34, eyeY + 0.035, eyeZ - 0.01),
      new THREE.Vector3(side * 0.46, eyeY + 0.04, 0.26),
      new THREE.Vector3(side * 0.51, eyeY + 0.035, 0.04),
      new THREE.Vector3(side * 0.51, eyeY - 0.035, -0.04),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(templeCurve, 16, 0.016, 6, false), frameMat));
  }
  return group;
}

// — Hands —

export function createGamingMouse(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mouse_gamer';
  const bodyMat = std(0x18181b, 0.4, 0.4);
  const rgbMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x06b6d4, emissiveIntensity: 0.85 });
  const cordMat = std(0x3f3f46, 0.8);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.26), bodyMat);
  body.castShadow = true;
  group.add(body);

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 12), rgbMat);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, 0.045, 0.06);
  group.add(wheel);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.08), rgbMat);
  strip.position.set(0, 0.042, -0.05);
  group.add(strip);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.13),
    new THREE.Vector3(0.02, -0.06, 0.18),
    new THREE.Vector3(-0.03, -0.15, 0.16),
    new THREE.Vector3(0.01, -0.26, 0.12),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.008, 6, false), cordMat));

  group.userData['updateRGB'] = ((time: number) => {
    const c = new THREE.Color().setHSL((time * 0.4) % 1, 1, 0.5);
    rgbMat.color.copy(c);
    rgbMat.emissive.copy(c);
  }) satisfies RgbTick;
  return group;
}

export function createRubberDuck(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rubber_duck';
  const yellowMat = std(0xfacc15, 0.3);
  const orangeMat = std(0xf97316, 0.4);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 14), yellowMat);
  body.scale.set(1, 0.85, 1.3);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), yellowMat);
  head.position.set(0, 0.11, 0.08);
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), orangeMat);
  beak.position.set(0, 0.09, 0.17);
  group.add(beak);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeMat);
    eye.position.set(side * 0.065, 0.13, 0.13);
    group.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 8), yellowMat);
  tail.rotation.x = -Math.PI / 4;
  tail.position.set(0, 0.06, -0.15);
  group.add(tail);
  return group;
}

export function createMate(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mate_argentino';
  const gourdMat = std(0x451a03, 0.6);
  const metalMat = std(0xe2e8f0, 0.15, 0.95);
  const herbMat = std(0x365314, 0.9);

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 16), gourdMat);
  cup.position.set(0, 0.02, 0);
  cup.castShadow = true;
  group.add(cup);

  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), gourdMat);
  bottom.position.set(0, -0.07, 0);
  group.add(bottom);

  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), metalMat);
  ferrule.position.set(0, 0.12, 0);
  group.add(ferrule);

  const herb = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), herbMat);
  herb.position.set(0, 0.11, 0);
  group.add(herb);

  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), metalMat);
  straw.rotation.x = -0.35;
  straw.rotation.z = 0.15;
  straw.position.set(-0.02, 0.2, 0.03);
  group.add(straw);

  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.012), metalMat);
  spout.rotation.x = -0.35;
  spout.rotation.z = 0.15;
  spout.position.set(-0.04, 0.33, 0.08);
  group.add(spout);
  return group;
}

export function createRedBullCan(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'energy_can';
  const canMat = std(0x1e3a8a, 0.25, 0.8);
  const silverMat = std(0xe2e8f0, 0.15, 0.95);
  const redMat = std(0xdc2626, 0.3, 0.6);
  const yellowMat = std(0xfacc15, 0.3, 0.5);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 20), canMat);
  body.castShadow = true;
  group.add(body);

  const silverSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.082, 0.14, 20, 1, false, 0, Math.PI), silverMat,
  );
  silverSleeve.position.set(0, 0.05, 0);
  group.add(silverSleeve);

  const sun = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.085, 12, 1, false, 0, Math.PI), yellowMat,
  );
  sun.rotation.y = Math.PI / 2;
  sun.position.set(0, 0, 0.045);
  group.add(sun);

  const bull = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), redMat);
  bull.position.set(0, 0, 0.08);
  group.add(bull);

  const topLid = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.02, 20), silverMat);
  topLid.position.set(0, 0.145, 0);
  group.add(topLid);

  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.05), silverMat);
  tab.position.set(0, 0.156, 0.015);
  group.add(tab);
  return group;
}

export function createPokeball(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pokeball';
  const redMat = std(0xef4444, 0.3, 0.2);
  const whiteMat = std(0xf8fafc, 0.3, 0.1);
  const bandMat = std(0x18181b, 0.5);
  const buttonRingMat = std(0x09090b, 0.3, 0.8);
  const buttonCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.1,
  });

  const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.47), redMat);
  top.position.set(0, 0.005, 0);
  top.castShadow = true;
  group.add(top);

  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, Math.PI * 0.53, Math.PI * 0.47), whiteMat,
  );
  bottom.position.set(0, -0.005, 0);
  bottom.castShadow = true;
  group.add(bottom);

  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 20), bandMat));

  const bRing = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 16), buttonRingMat);
  bRing.rotation.x = Math.PI / 2;
  bRing.position.set(0, 0, 0.108);
  group.add(bRing);

  const bCore = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.015, 16), buttonCoreMat);
  bCore.rotation.x = Math.PI / 2;
  bCore.position.set(0, 0, 0.112);
  group.add(bCore);
  return group;
}

// — Pets —

export function createFlyingDrone(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pet_drone';
  const bodyMat = std(0x18181b, 0.3, 0.8);
  const whiteMat = std(0xf8fafc, 0.4);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true, opacity: 0.7 });
  const ledG = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const ledR = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), whiteMat);
  pod.scale.set(1.1, 0.7, 1.2);
  group.add(pod);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat);
  eye.position.set(0, 0.01, 0.08);
  group.add(eye);

  const props: THREE.Mesh[] = [];
  const armOffsets = [
    [-0.12, 0, 0.1],
    [0.12, 0, 0.1],
    [-0.12, 0, -0.1],
    [0.12, 0, -0.1],
  ];
  armOffsets.forEach(([x, y, z], i) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), bodyMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(x * 0.5, y, z * 0.5);
    group.add(arm);

    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), bodyMat);
    engine.position.set(x, y + 0.01, z);
    group.add(engine);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), i % 2 === 0 ? ledG : ledR);
    led.position.set(x, y - 0.015, z);
    group.add(led);

    const propBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.018), propMat);
    propBlade.position.set(x, y + 0.028, z);
    group.add(propBlade);
    props.push(propBlade);
  });

  group.userData['updateAnim'] = ((_time: number, delta: number) => {
    for (const p of props) p.rotation.y += delta * 30;
  }) satisfies AnimTick;
  return group;
}

export function createFlyingOwl(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pet_owl';
  const bodyMat = std(0x8a5a2b, 0.85);
  const darkMat = std(0x451a03, 0.8);
  const chestMat = std(0xfef3c7, 0.9);
  const featherMat = std(0xd6a35c, 0.9);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.9, roughness: 0.25 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const beakMat = std(0xf59e0b, 0.35);
  const wingMat = std(0x5b2d0e, 0.75, 0);
  wingMat.side = THREE.DoubleSide;
  const wingTipMat = std(0x2f1503, 0.8, 0);
  wingTipMat.side = THREE.DoubleSide;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), bodyMat);
  body.scale.set(0.92, 1.05, 0.9);
  group.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), chestMat);
  chest.position.set(0, -0.02, 0.045);
  chest.scale.set(0.85, 0.95, 0.65);
  group.add(chest);

  for (let i = 0; i < 3; i++) {
    const scallop = new THREE.Mesh(new THREE.SphereGeometry(0.028 - i * 0.004, 10, 8), i % 2 ? chestMat : featherMat);
    scallop.position.set((i - 1) * 0.032, -0.045 - Math.abs(i - 1) * -0.008, 0.085);
    scallop.scale.set(1, 0.8, 0.5);
    group.add(scallop);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 8), darkMat);
  tail.position.set(0, -0.09, -0.08);
  tail.rotation.x = -Math.PI * 0.35;
  tail.scale.set(1.4, 1, 0.45);
  group.add(tail);

  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), beakMat);
    foot.position.set(side * 0.035, -0.095, 0.01);
    foot.scale.set(1, 0.6, 1.3);
    group.add(foot);
  }

  const headG = new THREE.Group();
  headG.position.set(0, 0.075, 0.01);
  group.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), bodyMat));

  const eyes: { eye: THREE.Mesh; pupil: THREE.Mesh; side: number }[] = [];
  for (const side of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), chestMat);
    disc.position.set(side * 0.028, 0.008, 0.052);
    headG.add(disc);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), eyeMat);
    eye.position.set(side * 0.028, 0.008, 0.058);
    headG.add(eye);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), pupilMat);
    pupil.position.set(side * 0.028, 0.008, 0.075);
    headG.add(pupil);
    eyes.push({ eye, pupil, side });

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(side * 0.028 - 0.006, 0.015, 0.078);
    headG.add(glint);

    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 6), darkMat);
    tuft.position.set(side * 0.048, 0.062, -0.005);
    tuft.rotation.z = side * -0.35;
    headG.add(tuft);
  }

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.038, 8), beakMat);
  beak.rotation.x = Math.PI / 2 + 0.15;
  beak.position.set(0, -0.012, 0.072);
  headG.add(beak);

  const makeWing = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.075, 0.03, 0);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.045);
    shape.quadraticCurveTo(side * 0.13, 0.05, side * 0.19, 0.0);
    shape.quadraticCurveTo(side * 0.2, -0.02, side * 0.175, -0.035);
    shape.quadraticCurveTo(side * 0.185, -0.05, side * 0.155, -0.055);
    shape.quadraticCurveTo(side * 0.16, -0.07, side * 0.13, -0.065);
    shape.quadraticCurveTo(side * 0.07, -0.06, 0, -0.045);
    shape.closePath();
    pivot.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 6), wingMat));
    const tipShape = new THREE.Shape();
    tipShape.moveTo(side * 0.13, 0.01);
    tipShape.lineTo(side * 0.19, 0.0);
    tipShape.lineTo(side * 0.16, -0.055);
    tipShape.lineTo(side * 0.11, -0.03);
    tipShape.closePath();
    const tip = new THREE.Mesh(new THREE.ShapeGeometry(tipShape), wingTipMat);
    tip.position.z = 0.001;
    pivot.add(tip);
    group.add(pivot);
    return pivot;
  };
  const wingL = makeWing(-1);
  const wingR = makeWing(1);

  group.userData['updateAnim'] = ((time: number, delta: number) => {
    const glide = 0.55 + 0.45 * Math.sin(time * 0.6);
    const amp = 0.18 + 0.5 * Math.max(0, glide);
    const flap = Math.sin(time * 10) * amp + Math.sin(time * 23) * 0.06;
    wingL.rotation.z = 0.12 + flap;
    wingR.rotation.z = -0.12 - flap;
    wingL.rotation.y = Math.sin(time * 10) * 0.08;
    wingR.rotation.y = -Math.sin(time * 10) * 0.08;
    const breathe = 1 + Math.sin(time * 3.1) * 0.018;
    body.scale.set(0.92, 1.05 * breathe, 0.9);
    group.rotation.x = Math.sin(time * 2.1) * 0.05;
    tail.rotation.x = -Math.PI * 0.35 + Math.sin(time * 10) * 0.08;
    const ud = group.userData as Record<string, number>;
    if (ud['nextLook'] === undefined || time > (ud['nextLook'] as number)) {
      ud['lookTarget'] = (Math.random() - 0.5) * 0.9;
      ud['nextLook'] = time + 2.5 + Math.random() * 4;
    }
    headG.rotation.y += (((ud['lookTarget'] as number) || 0) - headG.rotation.y) * Math.min(1, delta * 4);
    headG.rotation.z = Math.sin(time * 1.7) * 0.05;
    if (ud['blinkUntil'] === undefined) ud['blinkUntil'] = time + 2 + Math.random() * 3;
    if (time > (ud['blinkUntil'] as number) - 0.12 && time < (ud['blinkUntil'] as number)) {
      for (const e of eyes) { e.eye.scale.y = 0.12; e.pupil.scale.y = 0.12; }
    } else {
      for (const e of eyes) { e.eye.scale.y = 1; e.pupil.scale.y = 1; }
      if (time >= (ud['blinkUntil'] as number)) ud['blinkUntil'] = time + 2.5 + Math.random() * 3.5;
    }
    for (const e of eyes) e.pupil.position.x = e.side * 0.028 - 0.008;
  }) satisfies AnimTick;
  return group;
}

export function createFlyingBat(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pet_bat';
  const bodyMat = std(0x1c1917, 0.6);
  const wingMat = std(0x292524, 0.8, 0);
  wingMat.side = THREE.DoubleSide;
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.0 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), bodyMat);
  body.scale.set(0.85, 1.05, 0.85);
  group.add(body);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), bodyMat);
    ear.position.set(side * 0.045, 0.1, 0);
    ear.rotation.z = side * -0.25;
    ear.rotation.x = -0.15;
    group.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), eyeMat);
    eye.position.set(side * 0.03, 0.03, 0.07);
    group.add(eye);
  }

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), bodyMat);
  snout.position.set(0, 0.01, 0.075);
  group.add(snout);

  const createBatWing = (side: number): THREE.Group => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(side * 0.07, 0.02, 0);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(side * 0.18, 0.06);
    shape.lineTo(side * 0.24, -0.04);
    shape.lineTo(side * 0.16, -0.1);
    shape.lineTo(side * 0.08, -0.06);
    shape.lineTo(0, -0.08);
    shape.closePath();
    wingGroup.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMat));
    return wingGroup;
  };
  const wingL = createBatWing(-1);
  const wingR = createBatWing(1);
  group.add(wingL);
  group.add(wingR);

  group.userData['updateAnim'] = ((time: number) => {
    const flap = Math.sin(time * 11) * 0.65;
    wingL.rotation.y = flap * 0.5;
    wingL.rotation.z = flap;
    wingR.rotation.y = -flap * 0.5;
    wingR.rotation.z = -flap;
  }) satisfies AnimTick;
  return group;
}

export function createFlyingGhost(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pet_ghost';
  const ghostMat = new THREE.MeshStandardMaterial({
    color: 0xeaf6ff, emissive: 0x38bdf8, emissiveIntensity: 0.45,
    transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0, depthWrite: false,
  });
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc, transparent: true, opacity: 0.28, side: THREE.BackSide, depthWrite: false,
  });
  const faceMat = new THREE.MeshBasicMaterial({ color: 0x0c4a6e });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.55, depthWrite: false });

  group.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), ghostMat));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.098, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), rimMat);
  halo.position.y = 0.002;
  group.add(halo);

  const skirtGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.17, 18, 4, true);
  const skirt = new THREE.Mesh(skirtGeo, ghostMat);
  skirt.position.set(0, -0.085, 0);
  group.add(skirt);
  const skirtBase = skirtGeo.attributes['position'].array.slice();

  const hemGeo = new THREE.TorusGeometry(0.068, 0.012, 8, 18);
  const hem = new THREE.Mesh(hemGeo, ghostMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.17;
  group.add(hem);

  const tailGeo = new THREE.PlaneGeometry(0.07, 0.16, 4, 6);
  const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({
    color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.4,
    transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3,
  }));
  tail.position.set(0, -0.16, -0.06);
  tail.rotation.x = 0.5;
  group.add(tail);
  const tailBase = tailGeo.attributes['position'].array.slice();

  const pupils: { pupil: THREE.Mesh; side: number }[] = [];
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    white.position.set(side * 0.034, -0.005, 0.078);
    white.scale.set(1, 1.25, 0.6);
    group.add(white);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), faceMat);
    pupil.position.set(side * 0.034, -0.008, 0.09);
    group.add(pupil);
    pupils.push({ pupil, side });

    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), blushMat);
    blush.position.set(side * 0.058, -0.035, 0.062);
    blush.rotation.y = side * 0.5;
    group.add(blush);

    const armG = new THREE.Group();
    armG.position.set(side * 0.085, -0.05, 0.01);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.035, 4, 8), ghostMat);
    arm.rotation.z = side * 1.1;
    armG.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), ghostMat);
    hand.position.set(side * 0.035, -0.012, 0);
    armG.add(hand);
    group.add(armG);
    const arms = (group.userData['arms'] ?? []) as { g: THREE.Group; side: number; phase: number }[];
    arms.push({ g: armG, side, phase: side * 1.3 });
    group.userData['arms'] = arms;
  }

  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), faceMat);
  mouth.position.set(0, -0.048, 0.08);
  mouth.scale.set(0.9, 1.2, 0.5);
  group.add(mouth);

  group.userData['updateAnim'] = ((time: number) => {
    const floatY = Math.sin(time * 2.2) * 0.5 + Math.sin(time * 5.1) * 0.12;
    ghostMat.emissiveIntensity = 0.42 + Math.sin(time * 3.2) * 0.14 + Math.sin(time * 7.7) * 0.04;
    rimMat.opacity = 0.22 + Math.sin(time * 3.2) * 0.07;
    group.scale.set(1 - floatY * 0.02, 1 + floatY * 0.035, 1 - floatY * 0.02);
    group.rotation.z = Math.sin(time * 1.8) * 0.06;
    group.rotation.x = Math.sin(time * 2.6) * 0.04;
    const pos = skirtGeo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const bx = skirtBase[i * 3];
      const by = skirtBase[i * 3 + 1];
      const bz = skirtBase[i * 3 + 2];
      const lower = THREE.MathUtils.clamp(-by / 0.17, 0, 1);
      const ang = Math.atan2(bz, bx);
      const w = Math.sin(ang * 3 + time * 5) * 0.012 * lower + Math.cos(ang * 2 - time * 4) * 0.008 * lower;
      pos.setXYZ(i, bx + Math.cos(ang) * w, by, bz + Math.sin(ang) * w);
    }
    pos.needsUpdate = true;
    skirtGeo.computeVertexNormals();
    hem.position.y = -0.17 + Math.sin(time * 5) * 0.006;
    hem.scale.set(1 + Math.sin(time * 5) * 0.03, 1 + Math.cos(time * 5) * 0.03, 1);
    const tp = tailGeo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) {
      const bx = tailBase[i * 3];
      const by = tailBase[i * 3 + 1];
      const k = (0.08 - by) / 0.16;
      tp.setX(i, bx + Math.sin(time * 6 + k * 4) * 0.02 * k);
    }
    tp.needsUpdate = true;
    mouth.scale.y = 1.1 + Math.max(0, Math.sin(time * 2.2)) * 0.7;
    for (const a of (group.userData['arms'] ?? []) as { g: THREE.Group; side: number; phase: number }[]) {
      a.g.position.y = -0.05 + Math.sin(time * 3 + a.phase) * 0.015;
      a.g.rotation.z = a.side * (0.25 + Math.sin(time * 3 + a.phase) * 0.25);
    }
    for (const p of pupils) p.pupil.position.x = p.side * 0.034 - 0.007;
  }) satisfies AnimTick;
  return group;
}

/** Ground hen in world space (not a child of the player): follows on a leash. */
export function createGroundChicken(load: LoadScene, variant = 'A'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'chicken_' + variant;
  group.userData['isGroundPet'] = true;
  const file = variant === 'B' ? 'chicken_plushie_B.gltf' : 'chicken_plushie_A.gltf';
  load(file).then((scene) => {
    if (!scene || group.children.length) return;
    const c = scene.clone(true);
    c.scale.setScalar(0.2);
    group.add(c);
  }).catch(() => undefined);
  return group;
}
