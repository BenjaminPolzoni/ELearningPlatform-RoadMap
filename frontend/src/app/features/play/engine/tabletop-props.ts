import * as THREE from 'three';

export class TabletopBuilder {
  private static woodTextureCache: THREE.CanvasTexture | null = null;
  private static sheetTextureCache: THREE.CanvasTexture | null = null;

  static getWoodTexture(): THREE.CanvasTexture {
    if (this.woodTextureCache) return this.woodTextureCache;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Dark oak wood base background
    ctx.fillStyle = '#3a2315';
    ctx.fillRect(0, 0, 1024, 1024);

    // Horizontal planks
    const plankHeight = 128;
    for (let y = 0; y < 1024; y += plankHeight) {
      // Subtle color variation between planks
      const shade = (Math.random() - 0.5) * 15;
      const r = Math.min(255, Math.max(0, 58 + shade));
      const g = Math.min(255, Math.max(0, 35 + shade * 0.7));
      const b = Math.min(255, Math.max(0, 21 + shade * 0.5));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, 1024, plankHeight);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(25, 14, 7, 0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const vy = y + Math.random() * plankHeight;
        ctx.beginPath();
        ctx.moveTo(0, vy);
        ctx.bezierCurveTo(
          300,
          vy + (Math.random() - 0.5) * 8,
          700,
          vy + (Math.random() - 0.5) * 8,
          1024,
          vy + (Math.random() - 0.5) * 6,
        );
        ctx.stroke();
      }

      // Dark groove between planks
      ctx.fillStyle = '#180e07';
      ctx.fillRect(0, y + plankHeight - 3, 1024, 3);
      // Lit bevel on the top edge of the plank
      ctx.fillStyle = 'rgba(255, 235, 205, 0.08)';
      ctx.fillRect(0, y, 1024, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this.woodTextureCache = tex;
    return tex;
  }

  static getCharacterSheetTexture(): THREE.CanvasTexture {
    if (this.sheetTextureCache) return this.sheetTextureCache;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 700;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    // Aged parchment
    ctx.fillStyle = '#f5ebd7';
    ctx.fillRect(0, 0, 512, 700);

    // Parchment border
    ctx.strokeStyle = '#c4ab82';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 480, 668);
    ctx.strokeStyle = '#8c6d48';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, 22, 468, 656);

    // RPG character sheet header
    ctx.fillStyle = '#3e2c1c';
    ctx.font = 'bold 26px serif';
    ctx.fillText('CHARACTER SHEET', 40, 60);

    // Attribute boxes (STR, DEX, CON, INT, WIS, CHA)
    const stats = ['STR 16', 'DEX 14', 'CON 15', 'INT 18', 'WIS 12', 'CHA 10'];
    ctx.font = 'bold 15px sans-serif';
    stats.forEach((s, idx) => {
      const sy = 100 + idx * 45;
      ctx.fillStyle = '#eae0cb';
      ctx.fillRect(40, sy, 85, 36);
      ctx.strokeRect(40, sy, 85, 36);
      ctx.fillStyle = '#2d1e12';
      ctx.fillText(s, 48, sy + 24);
    });

    // Central diagram / map
    ctx.fillStyle = '#ebdcc2';
    ctx.fillRect(145, 100, 325, 240);
    ctx.strokeStyle = '#a88c65';
    ctx.strokeRect(145, 100, 325, 240);
    ctx.fillStyle = '#5c432d';
    ctx.font = 'italic 16px serif';
    ctx.fillText('Quest Log & World Notes', 160, 130);

    // Simulated text lines
    ctx.strokeStyle = '#b8a280';
    ctx.lineWidth = 1;
    for (let ly = 160; ly <= 310; ly += 24) {
      ctx.beginPath();
      ctx.moveTo(160, ly);
      ctx.lineTo(450, ly);
      ctx.stroke();
    }

    // Dragon / shield sketch
    ctx.fillStyle = '#6b4f35';
    ctx.beginPath();
    ctx.arc(307, 480, 70, 0, Math.PI * 2);
    ctx.strokeStyle = '#8c6d48';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚔️ 🛡️', 307, 492);
    ctx.textAlign = 'start';

    const tex = new THREE.CanvasTexture(canvas);
    this.sheetTextureCache = tex;
    return tex;
  }

  static createTable(width: number, depth: number, yPos = -1.02): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, 1.0, depth);
    const mat = new THREE.MeshStandardMaterial({
      map: this.getWoodTexture(),
      roughness: 0.75,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, yPos - 0.5, 0);
    mesh.receiveShadow = true;
    return mesh;
  }

  static createDice(type: 'd20' | 'd12' | 'd8' | 'd6', size: number, colorHex: number): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    if (type === 'd20') {
      geo = new THREE.IcosahedronGeometry(size, 0);
    } else if (type === 'd12') {
      geo = new THREE.DodecahedronGeometry(size, 0);
    } else if (type === 'd8') {
      geo = new THREE.OctahedronGeometry(size, 0);
    } else {
      geo = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.22,
      metalness: 0.15,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  static createCharacterSheet(w = 4.2, h = 5.8): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({
      map: this.getCharacterSheetTexture(),
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }

  static createTokenStack(count: number, radius = 0.55, isGold = false): THREE.Group {
    const group = new THREE.Group();
    const height = 0.08;
    const geo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xd4af37 : 0x7c5030,
      roughness: isGold ? 0.35 : 0.8,
      metalness: isGold ? 0.75 : 0.05,
    });

    for (let i = 0; i < count; i++) {
      const coin = new THREE.Mesh(geo, mat);
      coin.position.y = i * (height + 0.01) + height / 2;
      coin.rotation.y = Math.random() * Math.PI;
      coin.position.x = (Math.random() - 0.5) * 0.06;
      coin.position.z = (Math.random() - 0.5) * 0.06;
      coin.castShadow = true;
      coin.receiveShadow = true;
      group.add(coin);
    }
    return group;
  }

  static createCoffeeMug(): THREE.Group {
    const group = new THREE.Group();

    // Cup body
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.62, 1.4, 18);
    const mugMat = new THREE.MeshStandardMaterial({
      color: 0xf5f0ea,
      roughness: 0.3,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, mugMat);
    body.position.y = 0.7;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Inner coffee
    const coffeeGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.1, 16);
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x3d2011,
      roughness: 0.1,
    });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.position.y = 1.32;
    group.add(coffee);

    // Cup handle
    const handleGeo = new THREE.TorusGeometry(0.4, 0.1, 8, 16, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mugMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.7, 0.7, 0);
    handle.castShadow = true;
    group.add(handle);

    return group;
  }

  static buildTabletopEnvironment(islandRadius: number): THREE.Group {
    const group = new THREE.Group();
    const tableY = -1.02;

    // Great Wooden Table placed under the lower base of all the hexagons
    const tableSpan = Math.max(140, islandRadius * 2.8);
    const table = this.createTable(tableSpan, tableSpan, tableY);
    group.add(table);

    return group;
  }
}

export class ArcadeBuilder {
  static createArcadeTable(width: number, depth: number, yPos = -1.02): THREE.Group {
    const group = new THREE.Group();

    // Dark surface arcade table / cocktail cabinet style
    const geo = new THREE.BoxGeometry(width, 1.0, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x121318,
      roughness: 0.28,
      metalness: 0.55,
    });
    const table = new THREE.Mesh(geo, mat);
    table.position.set(0, yPos - 0.5, 0);
    table.receiveShadow = true;
    group.add(table);

    // Neon bevels on the table's edges (neon cyan)
    const rimGeo = new THREE.BoxGeometry(width + 0.2, 0.08, depth + 0.2);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(0, yPos - 0.02, 0);
    group.add(rim);

    return group;
  }

  static createJoystick(): THREE.Group {
    const group = new THREE.Group();

    // Base box of the arcade controller
    const baseGeo = new THREE.BoxGeometry(3.6, 0.8, 2.6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      roughness: 0.35,
      metalness: 0.4,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.4;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Glowing edge at the base (neon magenta)
    const edgeGeo = new THREE.BoxGeometry(3.65, 0.08, 2.65);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.78;
    group.add(edge);

    // Metallic joystick shaft
    const shaftGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.3, 16);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.1,
      metalness: 0.95,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(-0.8, 1.25, 0);
    shaft.castShadow = true;
    group.add(shaft);

    // Classic red top ball (Sanwa style ball-top)
    const ballGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.15,
      metalness: 0.2,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(-0.8, 1.85, 0);
    ball.castShadow = true;
    group.add(ball);

    // Arcade buttons (Blue, Yellow, Green)
    const buttonColors = [0x3b82f6, 0xfacc15, 0x10b981];
    const buttonGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
    buttonColors.forEach((color, i) => {
      const btnMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.2,
        metalness: 0.25,
      });
      const btn = new THREE.Mesh(buttonGeo, btnMat);
      btn.position.set(0.4 + (i % 2) * 0.7, 0.85, -0.4 + Math.floor(i / 2) * 0.7);
      btn.castShadow = true;
      group.add(btn);
    });

    return group;
  }

  static createArcadeTokenStack(count: number, isGold = false): THREE.Group {
    const group = new THREE.Group();
    const height = 0.07;
    const geo = new THREE.CylinderGeometry(0.55, 0.55, height, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: isGold ? 0xf59e0b : 0xd1d5db,
      roughness: 0.25,
      metalness: 0.9,
    });

    for (let i = 0; i < count; i++) {
      const coin = new THREE.Mesh(geo, mat);
      coin.position.y = i * (height + 0.008) + height / 2;
      coin.rotation.y = Math.random() * Math.PI;
      coin.position.x = (Math.random() - 0.5) * 0.05;
      coin.position.z = (Math.random() - 0.5) * 0.05;
      coin.castShadow = true;
      coin.receiveShadow = true;
      group.add(coin);
    }
    return group;
  }

  static createNeonDrink(): THREE.Group {
    const group = new THREE.Group();

    // Translucent glass
    const cupGeo = new THREE.CylinderGeometry(0.65, 0.5, 1.8, 16);
    const cupMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.y = 0.9;
    cup.castShadow = true;
    group.add(cup);

    // Neon straw / bombilla
    const strawGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12);
    const strawMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const straw = new THREE.Mesh(strawGeo, strawMat);
    straw.position.set(0.15, 1.3, 0);
    straw.rotation.z = 0.2;
    group.add(straw);

    return group;
  }

  static buildArcadeEnvironment(islandRadius: number): THREE.Group {
    const group = new THREE.Group();
    const tableY = -1.02;

    // Clean Cocktail Arcade style table
    const tableSpan = Math.max(140, islandRadius * 2.8);
    const table = this.createArcadeTable(tableSpan, tableSpan, tableY);
    group.add(table);

    return group;
  }
}
