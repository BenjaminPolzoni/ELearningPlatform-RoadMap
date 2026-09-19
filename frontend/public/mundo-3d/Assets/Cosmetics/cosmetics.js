// =============================================================
// COSMETICS MODULE - 3D E-Learning Platform
// Ubicación: 3D/Assets/Cosmetics/cosmetics.js
// Contiene todos los modelos 3D de cosméticos (Espalda, Cabeza, Manos, Mascotas)
// =============================================================

import * as THREE from 'three';

// -------------------------------------------------------------
// CATÁLOGO COMPLETO DE COSMÉTICOS
// -------------------------------------------------------------
export const COSMETICS_CATALOG = {
  back: [
    { id: 'none', name: '🚫 Ninguno' },
    { id: 'cape', name: '🧣 Capa' },
    { id: 'backpack', name: '🎒 Mochila', hasColor: true, defaultColor: '#2563eb' },
    { id: 'keyboard_back', name: '⌨️ Teclado Gamer', hasRGB: true },
    { id: 'giant_usb', name: '💾 USB Gigante' },
    { id: 'guitar', name: '🎸 Guitarra', hasGuitarColor: true, defaultGuitarColor: 'A' },
    { id: 'shield_badge.gltf', name: '🛡️ Escudo Emblema' },
    { id: 'shield_badge_color.gltf', name: '🛡️ Escudo Emblema Color' },
    { id: 'shield_round.gltf', name: '🛡️ Escudo Redondo' },
    { id: 'shield_round_barbarian.gltf', name: '🛡️ Escudo Bárbaro' },
    { id: 'shield_round_color.gltf', name: '🛡️ Escudo Redondo Color' },
    { id: 'shield_spikes.gltf', name: '🛡️ Escudo con Púas' },
    { id: 'shield_spikes_color.gltf', name: '🛡️ Escudo Púas Color' },
    { id: 'shield_square.gltf', name: '🛡️ Escudo Cuadrado' },
    { id: 'shield_square_color.gltf', name: '🛡️ Escudo Cuadrado Color' },
    { id: 'Skeleton_Shield_Large_A.gltf', name: '🛡️ Escudo Grande A' },
    { id: 'Skeleton_Shield_Large_B.gltf', name: '🛡️ Escudo Grande B' },
    { id: 'Skeleton_Shield_Small_A.gltf', name: '🛡️ Escudo Pequeño A' },
    { id: 'Skeleton_Shield_Small_B.gltf', name: '🛡️ Escudo Pequeño B' },
  ],
  head: [
    { id: 'none', name: '🚫 Ninguno' },
    { id: 'headphones', name: '🎧 Auriculares Gamer', hasRGB: true },
    { id: 'propeller_hat', name: '🚁 Gorro Cóptero', hasAnimation: true },
    { id: 'star_orbit', name: '⭐ Estrellitas', hasStarColor: true, defaultStarColor: 'yellow' },
    { id: 'saiyan_scouter', name: '👁️ Visor Saiyajin' },
    { id: 'gamer_glasses', name: '👓 Anteojos Gamer' },
    { id: 'bear_hat', name: '🐻 Gorro de Oso' },
    { id: 'helmet', name: '🪖 Casco' },
    { id: 'skel_helmet', name: '🪖 Casco Esqueleto Guerrero' },
    { id: 'skel_mage_hat', name: '🧙 Sombrero Esqueleto Mago' },
    { id: 'skel_hood', name: '🥷 Capucha Esqueleto Pícaro' },
    { id: 'flower_antennae', name: '🌸 Flores Antena' },
  ],
  hand: [
    { id: 'none', name: '🚫 Ninguno' },
    { id: 'mouse_gamer', name: '🖱️ Mouse Gamer RGB', hasRGB: true },
    { id: 'mate_argentino', name: '🧉 Mate Argentino' },
    { id: 'energy_can', name: '⚡ Bebida Energizante' },
    { id: 'pokeball', name: '🔴 Pokébola' },
    { id: 'rubber_duck', name: '🦆 Patito de Goma' },
    { id: 'keyboard_gamer', name: '⌨️ Teclado Mecánico RGB', hasRGB: true },
    { id: 'sword_1handed.gltf', name: '🗡️ Espada Corta' },
    { id: 'sword_2handed.gltf', name: '⚔️ Espadón' },
    { id: 'dagger.gltf', name: '🗡️ Daga' },
    { id: 'bow.gltf', name: '🏹 Arco' },
    { id: 'bow_withString.gltf', name: '🏹 Arco con Cuerda' },
    { id: 'crossbow_1handed.gltf', name: '🏹 Ballesta' },
    { id: 'staff.gltf', name: '🪄 Báculo Mágico' },
    { id: 'wand.gltf', name: '✨ Varita Mágica' },
    { id: 'axe_1handed.gltf', name: '🪓 Hacha de Mano' },
    { id: 'axe_2handed.gltf', name: '🪓 Gran Hacha' },
    { id: 'Skeleton_Blade.gltf', name: '🗡️ Espada Esquelética' },
    { id: 'Skeleton_Axe.gltf', name: '🪓 Hacha Esquelética' },
    { id: 'Skeleton_Staff.gltf', name: '🪄 Báculo Esquelético' },
    { id: 'Skeleton_Crossbow.gltf', name: '🎯 Ballesta Esquelética' },
    { id: 'mug_full.gltf', name: '🍺 Jarra Llena' },
    { id: 'puzzlecube_complete.gltf', name: '🧩 Cubo Rubik' },
    { id: 'mug_empty.gltf', name: '🍺 Jarra Vacía' },
    { id: 'smokebomb.gltf', name: '💨 Bomba Humo' },
  ],
  pet: [
    { id: 'none', name: '🚫 Ninguno' },
    { id: 'drone', name: '🛸 Cyber Drone' },
    { id: 'owl', name: '🦉 Búho Mágico' },
    { id: 'bat', name: '🦇 Murciélago' },
    { id: 'chicken', name: '🐔 Gallina', hasChickenColor: true, defaultChickenColor: 'A' },
    { id: 'dog', name: '🐶 Perrito', mode: 'ground' },
    { id: 'dragonfly', name: '🪰 Libélula', mode: 'fly' },
    { id: 'frog', name: '🐸 Rana', mode: 'ground' },
    { id: 'salamander', name: '🦎 Salamandra', mode: 'ground' },
  ]
};

// -------------------------------------------------------------
// MODELOS 3D PROCEDURALES
// -------------------------------------------------------------
// -------------------------------------------------------------
    // PROCEDURAL 3D MODELS: ESPALDA
    // -------------------------------------------------------------
    function createBackpack(color = '#2563eb') {
      const group = new THREE.Group();
      group.name = 'backpack';

      const hex = parseInt(color.replace('#', '0x'), 16) || 0x2563eb;
      const mainMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, metalness: 0.1 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      const zipMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

      // Cuerpo principal ampliado un 25% para que luzca imponente y no quede embutido en el torso
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.22), mainMat);
      body.castShadow = true;
      group.add(body);

      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.10), mainMat);
      pocket.position.set(0, -0.09, -0.15);
      pocket.castShadow = true;
      group.add(pocket);

      const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 0.102), zipMat);
      zipper.position.set(0, 0.05, -0.15);
      group.add(zipper);

      const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.18), darkMat);
      strapL.position.set(0.14, 0.02, 0.10);
      group.add(strapL);

      const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.18), darkMat);
      strapR.position.set(-0.14, 0.02, 0.10);
      group.add(strapR);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), darkMat);
      handle.position.set(0, 0.26, 0);
      handle.rotation.x = Math.PI;
      group.add(handle);

      group.userData.setColor = (newColor) => {
        const c = parseInt(newColor.replace('#', '0x'), 16) || 0x2563eb;
        mainMat.color.setHex(c);
      };

      return group;
    }

    function createKeyboardBack(createGamerKeyboardFn) {
      const group = new THREE.Group();
      group.name = 'keyboard_back';

      const harnessMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
      const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.16), harnessMat);
      strap1.rotation.z = Math.PI / 5;
      strap1.position.set(0, 0, 0.04);
      group.add(strap1);

      const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.16), harnessMat);
      strap2.rotation.z = -Math.PI / 5;
      strap2.position.set(0, 0, 0.04);
      group.add(strap2);

      const kb = createGamerKeyboardFn();
      kb.scale.set(1.2, 1.2, 1.2);
      kb.rotation.set(0, Math.PI, Math.PI / 3);
      kb.position.set(0.05, 0, -0.10);
      group.add(kb);

      group.userData.updateRGB = (time) => {
        if (kb.userData && kb.userData.updateRGB) kb.userData.updateRGB(time);
      };

      return group;
    }

    // USB Gigante estilo pendrive gamer invertido 180°: el conector metálico apunta hacia ARRIBA
    function createGiantUSB() {
      const group = new THREE.Group();
      group.name = 'giant_usb';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.7 });
      const plugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.9 });
      const harnessMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });

      // Correas arnés
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.14), harnessMat);
      s1.rotation.z = Math.PI / 5;
      s1.position.set(0, 0, 0.04);
      group.add(s1);

      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.14), harnessMat);
      s2.rotation.z = -Math.PI / 5;
      s2.position.set(0, 0, 0.04);
      group.add(s2);

      // Cuerpo principal del USB
      const usbBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.44, 0.08), bodyMat);
      usbBody.position.set(0.04, -0.02, -0.06);
      usbBody.castShadow = true;
      group.add(usbBody);

      // Línea LED cyan
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.085), ledMat);
      led.position.set(0.04, 0.12, -0.06);
      group.add(led);

      // Conector metálico USB-A apuntando hacia ARRIBA
      const plug = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.06), plugMat);
      plug.position.set(0.04, 0.28, -0.06);
      group.add(plug);

      // Ranuras del conector USB
      const hole1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.065), bodyMat);
      hole1.position.set(0.01, 0.29, -0.06);
      group.add(hole1);
      const hole2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.065), bodyMat);
      hole2.position.set(0.07, 0.29, -0.06);
      group.add(hole2);

      // Aro inferior para llavero
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), plugMat);
      loop.position.set(0.04, -0.28, -0.06);
      group.add(loop);

      group.rotation.z = -Math.PI / 6;
      return group;
    }

    // -------------------------------------------------------------
    // PROCEDURAL 3D MODELS: CABEZA (Alineados con orejas y ojos)
    // -------------------------------------------------------------
    function createGamerHeadphones() {
      const group = new THREE.Group();
      group.name = 'headphones';

      const blackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.5 });
      const cushionMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
      const rgbMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });

      // Diadema asentada exactamente sobre la coronilla (radio 0.52, centro en Y=0.40)
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 12, 32, Math.PI), blackMat);
      arch.position.set(0, 0.40, 0.02);
      group.add(arch);

      // Almohadilla superior
      const archPad = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.038, 8, 20, Math.PI * 0.6), cushionMat);
      archPad.rotation.z = Math.PI * 0.2;
      archPad.position.set(0, 0.40, 0.02);
      group.add(archPad);

      // Auriculares a ambos lados de la cabeza a la altura de las orejas (Y = 0.38)
      for (const side of [-1, 1]) {
        const x = side * 0.54;

        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.09, 24), blackMat);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(x, 0.38, 0.02);
        group.add(cup);

        // Anillo RGB neón
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 12, 24), rgbMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(x + side * 0.052, 0.38, 0.02);
        group.add(ring);

        // Almohadilla interna
        const pad = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 12, 24), cushionMat);
        pad.rotation.y = Math.PI / 2;
        pad.position.set(x - side * 0.032, 0.38, 0.02);
        group.add(pad);
      }

      // Micrófono curvo bajado a nivel de la boca (Y = 0.22)
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.54, 0.32, 0.08),
        new THREE.Vector3(-0.48, 0.26, 0.34),
        new THREE.Vector3(-0.32, 0.22, 0.56),
        new THREE.Vector3(-0.16, 0.22, 0.60)
      ]);
      const micTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.016, 8, false), blackMat);
      group.add(micTube);

      const micTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), rgbMat);
      micTip.position.set(-0.16, 0.22, 0.60);
      group.add(micTip);

      group.userData.updateRGB = (time) => {
        const hue = (time * 0.4) % 1;
        const c = new THREE.Color().setHSL(hue, 1, 0.5);
        rgbMat.color.copy(c);
        rgbMat.emissive.copy(c);
      };

      return group;
    }

    function createPropellerHat() {
      const group = new THREE.Group();
      group.name = 'propeller_hat';

      // 4 gajos clásicos de colores primarios para la gorra cóptero
      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.8 });
      const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });

      // 1. Cúpula subida en la cabeza (Y = 0.49) y más envolvente (phiLength = 0.54 * PI) para cubrir completamente el cráneo
      const capRadius = 0.57;
      const capY = 0.49;
      const capZ = 0.01;

      const quarters = [
        { mat: redMat, start: 0 },
        { mat: blueMat, start: Math.PI * 0.5 },
        { mat: yellowMat, start: Math.PI },
        { mat: greenMat, start: Math.PI * 1.5 }
      ];

      quarters.forEach(q => {
        const segGeom = new THREE.SphereGeometry(capRadius, 18, 14, q.start, Math.PI * 0.5, 0, Math.PI * 0.54);
        const segMesh = new THREE.Mesh(segGeom, q.mat);
        segMesh.position.set(0, capY, capZ);
        group.add(segMesh);
      });

      // 2. Arandela base superior donde nace el eje
      const baseGrommet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 16), metalMat);
      baseGrommet.position.set(0, capY + capRadius - 0.01, capZ);
      group.add(baseGrommet);

      // Eje metálico vertical
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), metalMat);
      shaft.position.set(0, capY + capRadius + 0.08, capZ);
      group.add(shaft);

      // Grupo giratorio de la hélice
      const propGroup = new THREE.Group();
      propGroup.position.set(0, capY + capRadius + 0.16, capZ);

      // Núcleo central / buje
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), yellowMat);
      propGroup.add(hub);

      const topBead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), orangeMat);
      topBead.position.set(0, 0.025, 0);
      propGroup.add(topBead);

      // Palas de la hélice (2 aspas alargadas aerodinámicas con ligera inclinación y puntas rojas)
      const bladeGeom = new THREE.BoxGeometry(0.28, 0.012, 0.065);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });

      // Aspa 1
      const blade1 = new THREE.Mesh(bladeGeom, bladeMat);
      blade1.position.set(0.16, 0, 0);
      blade1.rotation.x = 0.18;
      propGroup.add(blade1);

      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.065), tipMat);
      tip1.position.set(0.28, 0, 0);
      tip1.rotation.x = 0.18;
      propGroup.add(tip1);

      // Aspa 2
      const blade2 = new THREE.Mesh(bladeGeom, bladeMat);
      blade2.position.set(-0.16, 0, 0);
      blade2.rotation.x = -0.18;
      propGroup.add(blade2);

      const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.065), tipMat);
      tip2.position.set(-0.28, 0, 0);
      tip2.rotation.x = -0.18;
      propGroup.add(tip2);

      group.add(propGroup);

      // Giro continuo de la hélice a 60 FPS
      group.userData.updateRGB = (time) => {
        propGroup.rotation.y = time * 24;
      };

      // Gorro un 20% más chico y con 30% menos altura (aplasto vertical)
      group.scale.set(0.8, 0.56, 0.8);

      return group;
    }

    // Estrellitas KayKit orbitando la cabeza: 7 copias del gltf del color elegido.
    // El loader se recibe por parámetro porque este módulo no crea su propio GLTFLoader.
    const starOrbitCache = new Map();

    function createStarOrbit(loader, color = 'yellow') {
      const group = new THREE.Group();
      group.name = 'star_orbit_' + color;

      // 7 soportes equidistantes: la órbita se anima en updateRGB aunque el gltf aún cargue.
      const COUNT = 7;
      const RADIUS = 0.55;
      const HEIGHT = 1.05;
      const holders = [];
      for (let i = 0; i < COUNT; i++) {
        const holder = new THREE.Group();
        group.add(holder);
        holders.push(holder);
      }

      group.userData.updateRGB = (time) => {
        for (let i = 0; i < holders.length; i++) {
          const a = time * 1.8 + (i / holders.length) * Math.PI * 2;
          holders[i].position.set(
            Math.cos(a) * RADIUS,
            HEIGHT + Math.sin(time * 3 + i * 1.3) * 0.05,
            Math.sin(a) * RADIUS
          );
          const star = holders[i].children[0];
          if (star) star.rotation.y = time * 3 + i;
        }
      };

      const place = (scene) => {
        scene.traverse((c) => {
          if (c.isMesh) c.castShadow = true;
        });
        holders.forEach((holder) => {
          if (holder.children.length) return;
          const clone = scene.clone(true);
          clone.scale.setScalar(0.3);
          holder.add(clone);
        });
      };

      const file = 'star_' + color + '.gltf';
      if (starOrbitCache.has(color)) {
        place(starOrbitCache.get(color));
      } else {
        loader.load('Assets/Cosmetics/stars/' + file, (gltf) => {
          starOrbitCache.set(color, gltf.scene);
          place(gltf.scene);
        }, undefined, (err) => {
          console.warn('No se pudo cargar la estrella:', file, err);
        });
      }

      return group;
    }

    // -------------------------------------------------------------
    // MIXED BAG (KayKit): gltfs en Assets/Cosmetics/mixed/ con caché compartida.
    // El loader se recibe por parámetro porque este módulo no crea su propio GLTFLoader.
    // -------------------------------------------------------------
    const mixedGltfCache = new Map();

    function loadMixedGltf(loader, fileName) {
      if (mixedGltfCache.has(fileName)) return Promise.resolve(mixedGltfCache.get(fileName));
      return new Promise((resolve) => {
        loader.load('Assets/Cosmetics/mixed/' + fileName, (gltf) => {
          gltf.scene.traverse((c) => {
            if (c.isMesh) c.castShadow = true;
          });
          mixedGltfCache.set(fileName, gltf.scene);
          resolve(gltf.scene);
        }, undefined, (err) => {
          console.warn('No se pudo cargar el cosmético:', fileName, err);
          resolve(null);
        });
      });
    }

    // Guitarra en diagonal sobre la espalda, girada 180° en Y (frente afuera, mástil arriba).
    function placeGuitar(scene, variant = 'A') {
      const g = scene.clone(true);
      g.name = 'guitar_' + variant;
      g.scale.setScalar(1.0);
      g.position.set(-0.40, 0.6, -0.32);
      g.rotation.set(0, Math.PI, -Math.PI / 5);
      return g;
    }

    // Dos flores como antenas inclinadas hacia afuera, con balanceo suave.
    function createFlowerAntennae(loader) {
      const group = new THREE.Group();
      group.name = 'flower_antennae';

      const files = ['flax_flower_A.gltf', 'flax_flower_B.gltf'];
      const spots = [
        { x: -0.3, tilt: 0.35 },
        { x: 0.3, tilt: -0.35 },
      ];
      group.userData.updateRGB = (time) => {
        group.rotation.z = Math.sin(time * 1.6) * 0.04;
      };

      files.forEach((file, i) => {
        loadMixedGltf(loader, file).then((scene) => {
          if (!scene || group.children.length >= files.length) return;
          const f = scene.clone(true);
          f.scale.setScalar(0.35);
          f.position.set(spots[i].x, 0.86, 0.12);
          f.rotation.z = spots[i].tilt;
          group.add(f);
        });
      });

      return group;
    }

    // Gallina terrestre: va parada en el piso colgada del playerGroup (lo sigue al caminar),
    // con saltito y giro hacia la dirección de movimiento.
    function createGroundChicken(playerRef, loader, variant = 'A') {
      const group = new THREE.Group();
      group.name = 'chicken_' + variant;
      group.userData.isGroundPet = true;
      group.userData.playerRef = playerRef;

      const file = variant === 'B' ? 'chicken_plushie_B.gltf' : 'chicken_plushie_A.gltf';
      loadMixedGltf(loader, file).then((scene3d) => {
        if (!scene3d || group.children.length) return;
        const c = scene3d.clone(true);
        c.scale.setScalar(0.2);
        group.add(c);
      });

      return group;
    }

    function createSaiyanScouter() {
      const group = new THREE.Group();
      group.name = 'saiyan_scouter';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.8 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const lensMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.95,
        transparent: true,
        opacity: 0.78,
        roughness: 0.1
      });

      // Auricular en la oreja derecha bajado a Y = 0.38
      const earpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), bodyMat);
      earpiece.rotation.z = Math.PI / 2;
      earpiece.position.set(0.54, 0.38, 0.04);
      group.add(earpiece);

      const earCore = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), darkMat);
      earCore.position.set(0.58, 0.38, 0.04);
      group.add(earCore);

      // Montura lateral
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.40), bodyMat);
      arm.position.set(0.52, 0.38, 0.24);
      group.add(arm);

      const joint = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), bodyMat);
      joint.position.set(0.40, 0.38, 0.44);
      group.add(joint);

      // Lente holográfica frente al ojo derecho (Y = 0.38, Z = 0.48)
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.02), lensMat);
      lens.rotation.y = -0.15;
      lens.position.set(0.22, 0.38, 0.48);
      group.add(lens);

      return group;
    }

    function createGamerGlasses() {
      const group = new THREE.Group();
      group.name = 'gamer_glasses';

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.6 });
      const lensMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.2
      });

      // Posición bajada a la altura real de los ojos (Y = 0.34, Z = 0.48)
      const eyeY = 0.34;
      const eyeZ = 0.48;

      // Marco y lente izquierda (más anchos para cubrir perfectamente los ojos)
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.03), frameMat);
      frameL.position.set(-0.21, eyeY, eyeZ);
      group.add(frameL);

      const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.02), lensMat);
      lensL.position.set(-0.21, eyeY, eyeZ + 0.006);
      group.add(lensL);

      // Marco y lente derecha
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.03), frameMat);
      frameR.position.set(0.21, eyeY, eyeZ);
      group.add(frameR);

      const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.02), lensMat);
      lensR.position.set(0.21, eyeY, eyeZ + 0.006);
      group.add(lensR);

      // Puente sobre la nariz
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), frameMat);
      bridge.position.set(0, eyeY + 0.04, eyeZ);
      group.add(bridge);

      // Patillas anatómicas curvadas que conectan el frente (Z=0.48) y calzan sobre y detrás de las orejas (X=+-0.51, Z=0.04)
      for (const side of [-1, 1]) {
        const templeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.34, eyeY + 0.035, eyeZ - 0.01),
          new THREE.Vector3(side * 0.46, eyeY + 0.04, 0.26),
          new THREE.Vector3(side * 0.51, eyeY + 0.035, 0.04),
          new THREE.Vector3(side * 0.51, eyeY - 0.035, -0.04)
        ]);
        const templeGeom = new THREE.TubeGeometry(templeCurve, 16, 0.016, 6, false);
        const temple = new THREE.Mesh(templeGeom, frameMat);
        group.add(temple);
      }

      return group;
    }

    // -------------------------------------------------------------
    // PROCEDURAL 3D MODELS: MANOS
    // -------------------------------------------------------------
    function createGamingMouse() {
      const group = new THREE.Group();
      group.name = 'mouse_gamer';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.4 });
      const rgbMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x06b6d4, emissiveIntensity: 0.85 });
      const cordMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.8 });

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
        new THREE.Vector3(0.01, -0.26, 0.12)
      ]);
      const cableGeom = new THREE.TubeGeometry(curve, 12, 0.008, 6, false);
      const cable = new THREE.Mesh(cableGeom, cordMat);
      group.add(cable);

      group.userData.updateRGB = (time) => {
        const hue = (time * 0.4) % 1;
        const c = new THREE.Color().setHSL(hue, 1, 0.5);
        rgbMat.color.copy(c);
        rgbMat.emissive.copy(c);
      };

      return group;
    }

    function createRubberDuck() {
      const group = new THREE.Group();
      group.name = 'rubber_duck';

      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
      const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
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

    function createMate() {
      const group = new THREE.Group();
      group.name = 'mate_argentino';

      const gourdMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
      const yerbaMat = new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.9 });

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 16), gourdMat);
      cup.position.set(0, 0.02, 0);
      cup.castShadow = true;
      group.add(cup);

      const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), gourdMat);
      bottom.position.set(0, -0.07, 0);
      group.add(bottom);

      const virola = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 16), metalMat);
      virola.position.set(0, 0.12, 0);
      group.add(virola);

      const yerba = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.02, 16), yerbaMat);
      yerba.position.set(0, 0.11, 0);
      group.add(yerba);

      const bombilla = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), metalMat);
      bombilla.rotation.x = -0.35;
      bombilla.rotation.z = 0.15;
      bombilla.position.set(-0.02, 0.20, 0.03);
      group.add(bombilla);

      const spout = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.012), metalMat);
      spout.rotation.x = -0.35;
      spout.rotation.z = 0.15;
      spout.position.set(-0.04, 0.33, 0.08);
      group.add(spout);

      return group;
    }

    function createRedBullCan() {
      const group = new THREE.Group();
      group.name = 'energy_can';

      const canMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.25 });
      const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
      const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.3 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 20), canMat);
      body.castShadow = true;
      group.add(body);

      const silverSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.14, 20, 1, false, 0, Math.PI), silverMat);
      silverSleeve.position.set(0, 0.05, 0);
      group.add(silverSleeve);

      const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.085, 12, 1, false, 0, Math.PI), yellowMat);
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

    function createPokeball() {
      const group = new THREE.Group();
      group.name = 'pokeball';

      const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.2 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
      const buttonRingMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3, metalness: 0.8 });
      const buttonCoreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.6,
        roughness: 0.1
      });

      const top = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.47), redMat);
      top.position.set(0, 0.005, 0);
      top.castShadow = true;
      group.add(top);

      const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, Math.PI * 0.53, Math.PI * 0.47), whiteMat);
      bottom.position.set(0, -0.005, 0);
      bottom.castShadow = true;
      group.add(bottom);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 20), bandMat);
      group.add(band);

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

    function createGamerKeyboard() {
      const keyboardGroup = new THREE.Group();
      keyboardGroup.name = 'keyboard_gamer';

      const baseGeom = new THREE.BoxGeometry(0.56, 0.25, 0.04);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.35,
        metalness: 0.7
      });
      const baseMesh = new THREE.Mesh(baseGeom, baseMat);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = false;
      keyboardGroup.add(baseMesh);

      const plateGeom = new THREE.BoxGeometry(0.53, 0.22, 0.012);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.1
      });
      const plateMesh = new THREE.Mesh(plateGeom, plateMat);
      plateMesh.position.z = 0.022;
      keyboardGroup.add(plateMesh);

      const keyMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.3 });
      const wasdMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.75,
        roughness: 0.3,
        metalness: 0.2
      });
      const spaceMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.4,
        metalness: 0.2
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
          const km = isWASD ? wasdMat : keyMat;
          const kMesh = new THREE.Mesh(keyGeom, km);
          kMesh.position.set(startX + c * (keyW + gap), startY - r * (keyH + gap), 0.032);
          kMesh.castShadow = true;
          keyboardGroup.add(kMesh);
        }
      }

      const spaceGeom = new THREE.BoxGeometry(4 * (keyW + gap) - gap, keyH, keyD);
      const spaceMesh = new THREE.Mesh(spaceGeom, spaceMat);
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

      const portGeom = new THREE.BoxGeometry(0.05, 0.018, 0.02);
      const portMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });
      const port = new THREE.Mesh(portGeom, portMat);
      port.position.set(0, 0.13, 0);
      keyboardGroup.add(port);

      keyboardGroup.userData.updateRGB = (time) => {
        const hue = (time * 0.35) % 1;
        const color = new THREE.Color().setHSL(hue, 1.0, 0.52);
        plateMat.emissive.copy(color);
        plateMat.color.copy(color);
      };

      return keyboardGroup;
    }

    // -------------------------------------------------------------
    // PROCEDURAL 3D MODELS: MASCOTAS VOLADORAS (Flying Pets)
    // -------------------------------------------------------------
    function createFlyingDrone() {
      const group = new THREE.Group();
      group.name = 'pet_drone';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.8 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.0 });
      const propMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true, opacity: 0.7 });
      const ledG = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const ledR = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      // Core pod
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), whiteMat);
      pod.scale.set(1.1, 0.7, 1.2);
      group.add(pod);

      // Front camera visor / glowing sensor eye
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), eyeMat);
      eye.position.set(0, 0.01, 0.08);
      group.add(eye);

      // 4 Rotors & spinning props
      const props = [];
      const armOffsets = [
        [-0.12, 0, 0.10],
        [0.12, 0, 0.10],
        [-0.12, 0, -0.10],
        [0.12, 0, -0.10]
      ];

      for (let i = 0; i < armOffsets.length; i++) {
        const [x, y, z] = armOffsets[i];
        // Carbon arm
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), bodyMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(x * 0.5, y, z * 0.5);
        group.add(arm);

        // Motor housing
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), bodyMat);
        motor.position.set(x, y + 0.01, z);
        group.add(motor);

        // Nav LED
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), i % 2 === 0 ? ledG : ledR);
        led.position.set(x, y - 0.015, z);
        group.add(led);

        // 2-blade Propeller
        const propBlade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.018), propMat);
        propBlade.position.set(x, y + 0.028, z);
        group.add(propBlade);
        props.push(propBlade);
      }

      group.userData.updateAnim = (time, delta) => {
        for (const p of props) {
          p.rotation.y += delta * 30;
        }
      };

      return group;
    }

    function createFlyingOwl() {
      const group = new THREE.Group();
      group.name = 'pet_owl';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.85 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
      const chestMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 });
      const featherMat = new THREE.MeshStandardMaterial({ color: 0xd6a35c, roughness: 0.9 });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.9, roughness: 0.25 });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x5b2d0e, roughness: 0.75, side: THREE.DoubleSide });
      const wingTipMat = new THREE.MeshStandardMaterial({ color: 0x2f1503, roughness: 0.8, side: THREE.DoubleSide });

      // Cuerpo compacto + cola en abanico
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 14), bodyMat);
      body.scale.set(0.92, 1.05, 0.9);
      group.add(body);

      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), chestMat);
      chest.position.set(0, -0.02, 0.045);
      chest.scale.set(0.85, 0.95, 0.65);
      group.add(chest);

      // Plumas del pecho: 3 vieiras que rompen la esfera lisa
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

      // Patas retraídas en vuelo
      for (const side of [-1, 1]) {
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), beakMat);
        foot.position.set(side * 0.035, -0.095, 0.01);
        foot.scale.set(1, 0.6, 1.3);
        group.add(foot);
      }

      // Cabeza: grupo propio para curiosidad sin mover el cuerpo
      const headG = new THREE.Group();
      headG.position.set(0, 0.075, 0.01);
      group.add(headG);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), bodyMat);
      headG.add(head);

      const eyes = [];
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

      // Alas emplumadas: forma con festones en vez de caja
      const makeWing = (side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.075, 0.03, 0);
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.045);
        shape.quadraticCurveTo(side * 0.13, 0.05, side * 0.19, 0.0);
        shape.quadraticCurveTo(side * 0.20, -0.02, side * 0.175, -0.035);
        shape.quadraticCurveTo(side * 0.185, -0.05, side * 0.155, -0.055);
        shape.quadraticCurveTo(side * 0.16, -0.07, side * 0.13, -0.065);
        shape.quadraticCurveTo(side * 0.07, -0.06, 0, -0.045);
        shape.closePath();
        const geo = new THREE.ShapeGeometry(shape, 6);
        const mesh = new THREE.Mesh(geo, wingMat);
        pivot.add(mesh);
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

      group.userData.updateAnim = (time, delta) => {
        // Ciclo aleteo-planeo: a veces planea para verse natural
        const glide = 0.55 + 0.45 * Math.sin(time * 0.6);
        const amp = 0.18 + 0.5 * Math.max(0, glide);
        const flap = Math.sin(time * 10) * amp + Math.sin(time * 23) * 0.06;
        wingL.rotation.z = 0.12 + flap;
        wingR.rotation.z = -0.12 - flap;
        wingL.rotation.y = Math.sin(time * 10) * 0.08;
        wingR.rotation.y = -Math.sin(time * 10) * 0.08;
        // Respiración + cabeceo suave
        const breathe = 1 + Math.sin(time * 3.1) * 0.018;
        body.scale.set(0.92, 1.05 * breathe, 0.9);
        group.rotation.x = Math.sin(time * 2.1) * 0.05;
        tail.rotation.x = -Math.PI * 0.35 + Math.sin(time * 10) * 0.08;
        // Curiosidad: la cabeza mira a los lados cada pocos segundos
        const ud = group.userData;
        if (ud.nextLook === undefined || time > ud.nextLook) {
          ud.lookTarget = (Math.random() - 0.5) * 0.9;
          ud.nextLook = time + 2.5 + Math.random() * 4;
        }
        headG.rotation.y += ((ud.lookTarget || 0) - headG.rotation.y) * Math.min(1, delta * 4);
        headG.rotation.z = Math.sin(time * 1.7) * 0.05;
        // Parpadeo: aplasta los ojos 0.12s
        if (ud.blinkUntil === undefined) ud.blinkUntil = time + 2 + Math.random() * 3;
        if (time > ud.blinkUntil - 0.12 && time < ud.blinkUntil) {
          for (const e of eyes) { e.eye.scale.y = 0.12; e.pupil.scale.y = 0.12; }
        } else {
          for (const e of eyes) { e.eye.scale.y = 1; e.pupil.scale.y = 1; }
          if (time >= ud.blinkUntil) ud.blinkUntil = time + 2.5 + Math.random() * 3.5;
        }
        // Pupilas hacia el centro (miran al jugador al orbitar)
        for (const e of eyes) e.pupil.position.x = e.side * 0.028 - 0.008;
      };

      return group;
    }

    function createFlyingBat() {
      const group = new THREE.Group();
      group.name = 'pet_bat';

      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.6 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8, side: THREE.DoubleSide });
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.0 });

      // Bat body
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), bodyMat);
      body.scale.set(0.85, 1.05, 0.85);
      group.add(body);

      // Pointed bat ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 6), bodyMat);
        ear.position.set(side * 0.045, 0.10, 0);
        ear.rotation.z = side * -0.25;
        ear.rotation.x = -0.15;
        group.add(ear);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), eyeMat);
        eye.position.set(side * 0.03, 0.03, 0.07);
        group.add(eye);
      }

      // Snout
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), bodyMat);
      snout.position.set(0, 0.01, 0.075);
      group.add(snout);

      // Wings (scalloped shape)
      const createBatWing = (side) => {
        const wingGroup = new THREE.Group();
        wingGroup.position.set(side * 0.07, 0.02, 0);

        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(side * 0.18, 0.06);
        shape.lineTo(side * 0.24, -0.04);
        shape.lineTo(side * 0.16, -0.10);
        shape.lineTo(side * 0.08, -0.06);
        shape.lineTo(0, -0.08);
        shape.closePath();

        const geom = new THREE.ShapeGeometry(shape);
        const mesh = new THREE.Mesh(geom, wingMat);
        wingGroup.add(mesh);
        return wingGroup;
      };

      const wingL = createBatWing(-1);
      const wingR = createBatWing(1);
      group.add(wingL);
      group.add(wingR);

      group.userData.updateAnim = (time, delta) => {
        const flap = Math.sin(time * 11) * 0.65;
        wingL.rotation.y = flap * 0.5;
        wingL.rotation.z = flap;
        wingR.rotation.y = -flap * 0.5;
        wingR.rotation.z = -flap;
      };

      return group;
    }

    function createFlyingGhost() {
      const group = new THREE.Group();
      group.name = 'pet_ghost';

      const ghostMat = new THREE.MeshStandardMaterial({
        color: 0xeaf6ff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.72,
        roughness: 0.15,
        metalness: 0,
        depthWrite: false
      });
      const rimMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc, transparent: true, opacity: 0.28,
        side: THREE.BackSide, depthWrite: false
      });
      const faceMat = new THREE.MeshBasicMaterial({ color: 0x0c4a6e });
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf9a8d4, transparent: true, opacity: 0.55, depthWrite: false });

      // Cabeza + halo exterior para borde luminoso suave
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), ghostMat);
      group.add(head);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.098, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), rimMat);
      halo.position.y = 0.002;
      group.add(halo);

      // Falda con segmentos para ondular los vértices
      const skirtGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.17, 18, 4, true);
      const skirt = new THREE.Mesh(skirtGeo, ghostMat);
      skirt.position.set(0, -0.085, 0);
      group.add(skirt);
      const skirtBase = skirtGeo.attributes.position.array.slice();

      // Borde inferior ondulado (picos de fantasma)
      const hemGeo = new THREE.TorusGeometry(0.068, 0.012, 8, 18);
      const hem = new THREE.Mesh(hemGeo, ghostMat);
      hem.rotation.x = Math.PI / 2;
      hem.position.y = -0.17;
      group.add(hem);

      // Cola-cinta ondulante en vez de cono rígido
      const tailGeo = new THREE.PlaneGeometry(0.07, 0.16, 4, 6);
      const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial({
        color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3
      }));
      tail.position.set(0, -0.16, -0.06);
      tail.rotation.x = 0.5;
      group.add(tail);
      const tailBase = tailGeo.attributes.position.array.slice();

      // Cara cartoon: ojos blancos + pupilas que miran al jugador
      const pupils = [];
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

        // Bracitos flotantes con manos
        const armG = new THREE.Group();
        armG.position.set(side * 0.085, -0.05, 0.01);
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.035, 4, 8), ghostMat);
        arm.rotation.z = side * 1.1;
        armG.add(arm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), ghostMat);
        hand.position.set(side * 0.035, -0.012, 0);
        armG.add(hand);
        group.add(armG);
        if (!group.userData.arms) group.userData.arms = [];
        group.userData.arms.push({ g: armG, side, phase: side * 1.3 });
      }

      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), faceMat);
      mouth.position.set(0, -0.048, 0.08);
      mouth.scale.set(0.9, 1.2, 0.5);
      group.add(mouth);

      group.userData.updateAnim = (time, delta) => {
        const floatY = Math.sin(time * 2.2) * 0.5 + Math.sin(time * 5.1) * 0.12;
        // Resplandor neón pulsante suave
        ghostMat.emissiveIntensity = 0.42 + Math.sin(time * 3.2) * 0.14 + Math.sin(time * 7.7) * 0.04;
        rimMat.opacity = 0.22 + Math.sin(time * 3.2) * 0.07;
        // Squash & stretch flotante
        group.scale.set(1 - floatY * 0.02, 1 + floatY * 0.035, 1 - floatY * 0.02);
        group.rotation.z = Math.sin(time * 1.8) * 0.06;
        group.rotation.x = Math.sin(time * 2.6) * 0.04;
        // Falda ondulante: mueve el anillo inferior con seno por ángulo
        const pos = skirtGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const bx = skirtBase[i * 3], by = skirtBase[i * 3 + 1], bz = skirtBase[i * 3 + 2];
          const lower = THREE.MathUtils.clamp((-by) / 0.17, 0, 1);
          const ang = Math.atan2(bz, bx);
          const w = Math.sin(ang * 3 + time * 5) * 0.012 * lower + Math.cos(ang * 2 - time * 4) * 0.008 * lower;
          pos.setXYZ(i, bx + Math.cos(ang) * w, by, bz + Math.sin(ang) * w);
        }
        pos.needsUpdate = true;
        skirtGeo.computeVertexNormals();
        hem.position.y = -0.17 + Math.sin(time * 5) * 0.006;
        hem.scale.set(1 + Math.sin(time * 5) * 0.03, 1 + Math.cos(time * 5) * 0.03, 1);
        // Cola serpenteante
        const tp = tailGeo.attributes.position;
        for (let i = 0; i < tp.count; i++) {
          const bx = tailBase[i * 3], by = tailBase[i * 3 + 1];
          const k = (0.08 - by) / 0.16;
          tp.setX(i, bx + Math.sin(time * 6 + k * 4) * 0.02 * k);
        }
        tp.needsUpdate = true;
        // Boca que se abre al subir y brazos nadando
        mouth.scale.y = 1.1 + Math.max(0, Math.sin(time * 2.2)) * 0.7;
        for (const a of group.userData.arms) {
          a.g.position.y = -0.05 + Math.sin(time * 3 + a.phase) * 0.015;
          a.g.rotation.z = a.side * (0.25 + Math.sin(time * 3 + a.phase) * 0.25);
        }
        // Pupilas miran al centro (al jugador)
        for (const p of pupils) p.pupil.position.x = p.side * 0.034 - 0.007;
      };

      return group;
    }

    let activePetObject = null;
    let petLoadToken = 0;

    const GLB_PETS = {
      dog: 'dog-pet.glb',
      dragonfly: 'Dragonfly-pet.glb',
      frog: 'Frog-pet.glb',
      salamander: 'Salamander-pet.glb',
    };
    const GROUND_PET_TUNING = {
      dog: { feetY: 0 },
      frog: { feetY: 0 },
      salamander: { feetY: 0 },
    };
    const PET_TARGET_SIZE = {
      dog: 0.5,
      frog: 0.35,
      salamander: 0.4,
      dragonfly: 0.35,
    };
    function fitPetToSize(obj, petType) {
      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);
      const target = PET_TARGET_SIZE[petType] || 0.35;
      const s = target / Math.max(size.x || 1, size.y || 1, size.z || 1);
      obj.scale.multiplyScalar(s);
      return s;
    }
    const glbPetCache = new Map();

    function applyPet(parentGroup, config) {
      const myToken = ++petLoadToken;
      if (activePetObject && activePetObject.parent) {
        activePetObject.parent.remove(activePetObject);
        activePetObject = null;
      }
      const petType = config.pet || 'none';
      if (petType === 'none') return;

      if (petType === 'drone') activePetObject = createFlyingDrone();
      else if (petType === 'owl') activePetObject = createFlyingOwl();
      else if (petType === 'bat') activePetObject = createFlyingBat();
      else if (petType === 'ghost') activePetObject = createFlyingGhost();
      else if (petType === 'chicken') {
        // En espacio de mundo: el host la cuelga de scene (no del playerGroup).
        activePetObject = createGroundChicken(parentGroup, loader, config.chickenVariant || 'A');
      } else if (GLB_PETS[petType]) {
        const file = GLB_PETS[petType];
        const groundTuning = GROUND_PET_TUNING[petType];
        const attach = (obj) => {
          if (myToken !== petLoadToken) return;
          fitPetToSize(obj, petType);
          obj.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = false;
            }
          });
          obj.userData.behavior = groundTuning ? 'ground' : 'fly';
          obj.userData.feetY = groundTuning ? groundTuning.feetY : 0;
          activePetObject = obj;
          if (parentGroup) parentGroup.add(activePetObject);
        };
        if (glbPetCache.has(file)) {
          attach(glbPetCache.get(file).clone(true));
          return;
        }
        loader.load(
          'Assets/Mascotas/' + file,
          (gltf) => {
            glbPetCache.set(file, gltf.scene);
            attach(gltf.scene.clone(true));
          },
          undefined,
          (err) => {
            console.warn('No se pudo cargar la mascota:', file, err);
          }
        );
        return;
      }

      if (activePetObject && parentGroup && !activePetObject.userData.isGroundPet) {
        parentGroup.add(activePetObject);
      }
    }

    // Mascota terrestre en ESPACIO DE MUNDO: pasea en un disco alrededor del jugador y
    // solo lo sigue (dando saltitos) si se aleja más allá de la correa. Arranca a caminar
    // 2s después de que el jugador empieza a moverse. Desacelera al llegar, evita paredes
    // (usa el sector con más espacio) y picotea cuando está quieta.
    function updateGroundPet(obj, time, delta) {
      const ud = obj.userData;
      const pr = ud.playerRef;
      const dt = Math.min(delta, 0.1);
      const ppx = pr ? pr.position.x : 0;
      const ppz = pr ? pr.position.z : 0;
      const yaw = pr ? pr.rotation.y : 0;
      // Atrás del jugador según hacia dónde mira.
      const anx = ppx - Math.sin(yaw) * 0.85;
      const anz = ppz - Math.cos(yaw) * 0.85;
      // Paredes solo donde hay sistema de colisiones (mundo, no preview).
      const blocked = (x, z) =>
        typeof checkBuildingCollision === 'function' && checkBuildingCollision(x, z, 0.15);
      // Ancla validada: si cae dentro de un edificio, el punto libre más cercano al jugador.
      let vax = anx;
      let vaz = anz;
      if (blocked(anx, anz)) {
        let bestD = 1e9;
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          for (const r of [0.4, 0.8, 1.2]) {
            const cx = ppx + Math.cos(a) * r;
            const cz = ppz + Math.sin(a) * r;
            if (!blocked(cx, cz)) {
              const d = Math.hypot(cx - ppx, cz - ppz);
              if (d < bestD) {
                bestD = d;
                vax = cx;
                vaz = cz;
              }
            }
          }
        }
      }
      if (ud.groundYaw === undefined) {
        ud.groundYaw = Math.PI;
        obj.rotation.y = Math.PI;
        obj.position.set(vax + 0.3, 0, vaz + 0.15);
        ud.groundHop = 0;
        ud.thinkAt = 0;
        ud.peckAt = time + 3 + Math.random() * 3;
        ud.peckUntil = 0;
      }

      // Anti-teletransporte: si quedó a más de 8, aparece al lado del jugador.
      if (Math.hypot(obj.position.x - ppx, obj.position.z - ppz) > 8) {
        obj.position.set(vax, 0, vaz);
        ud.tx = undefined;
      }

      const LEASH = 1.6;
      const WANDER_R = 0.9;
      const PERSONAL = 0.35;
      const distP = Math.hypot(obj.position.x - ppx, obj.position.z - ppz);

      // Candado de arranque: la gallina empieza a caminar 2s después de que el
      // jugador empieza a moverse, aunque siga en movimiento.
      if (ud.lastPpx === undefined) {
        ud.lastPpx = ppx;
        ud.lastPpz = ppz;
        ud.lastMoveAt = -10;
        ud.lockStart = undefined;
      }
      const playerMoved = Math.hypot(ppx - ud.lastPpx, ppz - ud.lastPpz) > 0.005;
      ud.lastPpx = ppx;
      ud.lastPpz = ppz;
      if (playerMoved) {
        if (ud.lockStart === undefined) ud.lockStart = time;
        ud.lastMoveAt = time;
      } else if (time - ud.lastMoveAt > 1.0) {
        ud.lockStart = undefined;
      }
      const mayWalk = ud.lockStart !== undefined && time - ud.lockStart >= 2;
      const fresh = ud.lockStart === undefined && ud.lastMoveAt === -10;

      // Pensar: muestrear puntos de paseo y quedarse con el primero libre.
      const hasTarget = ud.tx !== undefined;
      const arrived = hasTarget && Math.hypot(ud.tx - obj.position.x, ud.tz - obj.position.z) < 0.08;
      if ((!hasTarget || arrived) && time >= ud.thinkAt) {
        ud.tx = undefined;
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = PERSONAL + Math.random() * (WANDER_R - PERSONAL);
          const cx = ppx + Math.cos(a) * r;
          const cz = ppz + Math.sin(a) * r;
          if (!blocked(cx, cz)) {
            ud.tx = cx;
            ud.tz = cz;
            break;
          }
        }
        ud.thinkAt = time + 2 + Math.random() * 2;
      }

      // Destino: el punto de paseo, o el ancla validada si se pasó de la correa.
      let gx = ud.tx ?? vax;
      let gz = ud.tz ?? vaz;
      let maxSpeed = 0.5;
      if (distP > LEASH) {
        gx = vax;
        gz = vaz;
        maxSpeed = 4.5;
      }

      const dx = gx - obj.position.x;
      const dz = gz - obj.position.z;
      const dist = Math.hypot(dx, dz);
      const wantWalk = dist > 0.08;
      const hopping =
        wantWalk && (fresh || mayWalk || (ud.wasHopping && ud.lockStart === undefined));
      ud.wasHopping = hopping;
      // Velocidad proporcional a la distancia: desacelera al llegar.
      const speed = Math.min(maxSpeed, 0.15 + dist * (maxSpeed > 1 ? 2.5 : 1.5));
      const hopAmp = 0.02 + 0.04 * Math.min(1, speed / 1.5);
      let advanced = false;
      if (hopping) {
        const step = Math.min(dist, speed * dt);
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);
        const sx = obj.position.x + nx * step;
        const sz = obj.position.z + nz * step;
        // Solo frena al ENTRAR a una pared: si ya está adentro, la deja salir.
        if (!blocked(obj.position.x, obj.position.z) && blocked(sx, sz)) {
          // Pared en el camino: se detiene y repiensa.
          ud.tx = undefined;
          ud.thinkAt = time + 0.5;
        } else {
          obj.position.x = sx;
          obj.position.z = sz;
          advanced = true;
          const targetYaw = Math.atan2(nx, nz);
          let cur = ud.groundYaw;
          let d = targetYaw - cur;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          cur += d * (1 - Math.exp(-6 * dt));
          ud.groundYaw = cur;
          obj.rotation.y = cur;
          ud.groundHop += step * 22;
        }
      }
      obj.position.y = advanced ? Math.abs(Math.sin(ud.groundHop)) * hopAmp : Math.sin(time * 2) * 0.008;
      obj.rotation.z = 0;

      // Picoteo ocasional cuando está quieta.
      if (!advanced && time >= ud.peckAt) {
        ud.peckUntil = time + 0.6;
        ud.peckAt = time + 4 + Math.random() * 3;
      }
      const pecking = !advanced && time < ud.peckUntil;
      obj.rotation.x = pecking ? Math.sin(((time - (ud.peckUntil - 0.6)) / 0.6) * Math.PI) * 0.35 : 0;
    }

    const FLY_PROFILES = {
      owl: { speed: 1.05, radius: 0.68, height: 0.98, bob: 0.07, bobFreq: 2.4, wobble: 0.14, bank: 0.45 },
      ghost: { speed: 0.8, radius: 0.52, height: 0.78, bob: 0.09, bobFreq: 2.2, wobble: 0.18, bank: 0.3, erratic: true },
      bat: { speed: 1.5, radius: 0.6, height: 0.9, bob: 0.08, bobFreq: 3.4, wobble: 0.16, bank: 0.55 },
      drone: { speed: 1.35, radius: 0.58, height: 0.86, bob: 0.035, bobFreq: 4.2, wobble: 0.05, bank: 0.35 },
    };

    function updateFlyingPet(time, delta) {
      if (!activePetObject || !activePetObject.parent) return;
      if (activePetObject.userData.isGroundPet) {
        updateGroundPet(activePetObject, time, delta);
        return;
      }
      if (activePetObject.userData.behavior === 'ground') {
        const pet = activePetObject;
        const feetY = pet.userData.feetY || 0;
        const k = 0.12;
        pet.position.x += (0.65 - pet.position.x) * k;
        pet.position.z += (-0.9 - pet.position.z) * k;
        pet.position.y = feetY + Math.abs(Math.sin(time * 6)) * 0.03;
        pet.rotation.y += (0 - pet.rotation.y) * k;
        pet.rotation.z = 0;
        if (pet.userData && pet.userData.updateAnim) {
          pet.userData.updateAnim(time, 0);
        }
        return;
      }
      const dt = Math.min(Math.max(delta || 0.016, 0.001), 0.05);
      const kind = (activePetObject.name || '').replace('pet_', '') || 'drone';
      const p = FLY_PROFILES[kind] || FLY_PROFILES.drone;
      const ud = activePetObject.userData;
      let slow = 1;
      try {
        if (typeof window !== 'undefined' && window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) slow = 0.4;
      } catch (e) { /* noop */ }
      if (ud.orbitAngle === undefined) {
        ud.orbitAngle = Math.atan2(activePetObject.position.z || 0.1, activePetObject.position.x || 0.5);
        ud.prevX = activePetObject.position.x;
        ud.prevZ = activePetObject.position.z;
        ud.prevY = activePetObject.position.y;
        ud.smoothYaw = 0;
        ud.smoothRoll = 0;
        ud.smoothPitch = 0;
      }
      // Velocidad con deriva orgánica (no mecedora perfecta)
      const drift = 1 + Math.sin(time * 0.5) * 0.18 + Math.sin(time * 0.23 + 1.7) * 0.12;
      ud.orbitAngle += dt * p.speed * drift * slow;
      const angle = ud.orbitAngle;
      // Radio vivo: Lissajous + errático extra para el fantasma
      let r = p.radius + Math.sin(time * 0.7) * p.wobble * 0.5 + Math.sin(time * 1.3 + 0.8) * p.wobble * 0.3;
      if (p.erratic) r += Math.sin(time * 2.1) * 0.05 + Math.sin(time * 3.7 + 2) * 0.03;
      r = Math.max(0.45, r);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r * 0.92;
      const y = p.height + Math.sin(time * p.bobFreq) * p.bob + Math.sin(time * (p.bobFreq * 2.3) + 1) * p.bob * 0.25;
      activePetObject.position.set(x, y, z);
      // Velocidad real para orientar + bankear (pitch/roll naturales)
      const vx = (x - (ud.prevX ?? x)) / dt;
      const vz = (z - (ud.prevZ ?? z)) / dt;
      const vy = (y - (ud.prevY ?? y)) / dt;
      ud.prevX = x; ud.prevZ = z; ud.prevY = y;
      const targetYaw = Math.atan2(vx, vz);
      let dy = targetYaw - (ud.smoothYaw || targetYaw);
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const k = 1 - Math.exp(-6 * dt);
      ud.smoothYaw = (ud.smoothYaw ?? targetYaw) + dy * k;
      // Bank por giro + pitch por subida/bajada, suavizados
      const turnRate = THREE.MathUtils.clamp(dy / Math.max(dt, 0.001), -4, 4);
      const targetRoll = THREE.MathUtils.clamp(-turnRate * 0.18 * p.bank * 2.2, -0.5, 0.5) - 0.08;
      const targetPitch = THREE.MathUtils.clamp(-vy * 0.35, -0.3, 0.3);
      ud.smoothRoll += (targetRoll - (ud.smoothRoll || 0)) * k;
      ud.smoothPitch += (targetPitch - (ud.smoothPitch || 0)) * k;
      activePetObject.rotation.set(ud.smoothPitch, ud.smoothYaw, ud.smoothRoll, 'YXZ');
      if (ud.updateAnim) ud.updateAnim(time, dt);
    }

    function loadWeapon(fileName) {
      if (!fileName || fileName === 'none') return Promise.resolve(null);
      if (fileName === 'keyboard_gamer' || fileName.includes('spellbook')) {
        const kb = createGamerKeyboard();
        kb.position.set(0, 0.06, -0.10);
        kb.scale.set(1.15, 1.15, 1.15);
        activeRGBObjects.add(kb);
        return Promise.resolve(kb);
      }
      if (fileName === 'mouse_gamer') {
        const mouse = createGamingMouse();
        mouse.position.set(0, 0.08, -0.12);
        mouse.scale.set(1.25, 1.25, 1.25);
        activeRGBObjects.add(mouse);
        return Promise.resolve(mouse);
      }
      if (fileName === 'rubber_duck') {
        const duck = createRubberDuck();
        duck.position.set(0, 0.10, -0.12);
        duck.scale.set(1.25, 1.25, 1.25);
        return Promise.resolve(duck);
      }
      if (fileName === 'mate_argentino') {
        const mate = createMate();
        mate.position.set(0, 0.10, -0.12);
        mate.scale.set(1.25, 1.25, 1.25);
        return Promise.resolve(mate);
      }
      if (fileName === 'energy_can') {
        const can = createRedBullCan();
        can.position.set(0, 0.08, -0.12);
        can.scale.set(1.25, 1.25, 1.25);
        return Promise.resolve(can);
      }
      if (fileName === 'pokeball') {
        const poke = createPokeball();
        poke.position.set(0, 0.10, -0.12);
        poke.scale.set(1.25, 1.25, 1.25);
        return Promise.resolve(poke);
      }
      if (fileName === 'puzzlecube_complete.gltf') {
        return loadMixedGltf(loader, fileName).then((scene) => {
          if (!scene) return null;
          const r = scene.clone(true);
          r.scale.setScalar(0.6);
          r.position.set(0, 0.08, -0.05);
          return r;
        });
      }
      if (weaponCache.has(fileName)) {
        return Promise.resolve(weaponCache.get(fileName).clone(true));
      }
      return new Promise((resolve) => {
        loader.load(
          'Assets/CharacterV2/Assets/gltf/' + fileName,
          (gltf) => {
            const obj = gltf.scene;
            obj.traverse((c) => {
              if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = false;
              }
            });
            weaponCache.set(fileName, obj);
            resolve(obj.clone(true));
          },
          undefined,
          (err) => {
            console.warn('No se pudo cargar el arma:', fileName, err);
            resolve(null);
          }
        );
      });
    }

// -------------------------------------------------------------
// EXPOSICIÓN GLOBAL PARA COMPATIBILIDAD NAVEGADOR
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.Cosmetics = {
    COSMETICS_CATALOG,
    createBackpack,
    createKeyboardBack,
    createGiantUSB,
    createGamerHeadphones,
    createPropellerHat,
    createStarOrbit,
    loadMixedGltf,
    placeGuitar,
    createFlowerAntennae,
    createGroundChicken,
    updateGroundPet,
    updateFlyingPet,
    createSaiyanScouter,
    createGamerGlasses,
    createGamingMouse,
    createRubberDuck,
    createMate,
    createRedBullCan,
    createPokeball,
    createGamerKeyboard,
    createFlyingDrone,
    createFlyingOwl,
    createFlyingBat,
    createFlyingGhost
  };
}
