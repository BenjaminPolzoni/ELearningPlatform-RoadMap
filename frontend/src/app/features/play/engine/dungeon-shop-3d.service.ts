import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AvatarBuild } from './avatar-modular.service';
import type { Avatar } from '../world-gen';

export interface DungeonShopCallbacks {
  onVendorClick?: () => void;
  onItemSelect?: (itemId: string) => void;
  onNearCounter?: (near: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class DungeonShop3dService {
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animId = 0;
  private running = false;
  private callbacks?: DungeonShopCallbacks;

  private gltfLoader = new GLTFLoader();

  // Main containers
  private dioramaGroup!: THREE.Group;
  private roomGroup!: THREE.Group;
  private propsGroup!: THREE.Group;
  private vendorGroup!: THREE.Group;
  private playerGroup!: THREE.Group;
  private itemsDisplayGroup!: THREE.Group;

  // Torch lights with soft flicker
  private torchLights: { light: THREE.PointLight; baseIntensity: number; phase: number }[] = [];

  // Seller
  private vendorMesh: THREE.Object3D | null = null;
  private vendorMixer: THREE.AnimationMixer | null = null;
  private vendorIdleAction: THREE.AnimationAction | null = null;
  private vendorInteractAction: THREE.AnimationAction | null = null;

  // Player and WASD movement
  private playerMesh: THREE.Object3D | null = null;
  private playerMixer: THREE.AnimationMixer | null = null;
  private playerWalkAction: THREE.AnimationAction | null = null;
  private playerIdleAction: THREE.AnimationAction | null = null;
  private customAvatarBuild: AvatarBuild | null = null;
  private groundPet: THREE.Group | null = null;
  private playerPos = new THREE.Vector3(0, 0, 1.8);
  private playerRotY = 0;
  private isPlayerMoving = false;
  private keysPressed = new Set<string>();
  private lastNearCounter = false;

  // Mouse parallax
  private mouseX = 0;
  private mouseY = 0;
  private baseCamPos = new THREE.Vector3(0, 10.6, 14.8);
  private targetCamPos = new THREE.Vector3(0, 10.6, 14.8);
  private camLookTarget = new THREE.Vector3(0, 1.35, -0.6);

  // Three.js clock for constant delta-time
  private clock = new THREE.Clock();

  // Clean shared materials
  private stoneWallMat!: THREE.MeshStandardMaterial;
  private stoneFloorMat!: THREE.MeshStandardMaterial;
  private stoneCapMat!: THREE.MeshStandardMaterial;
  private woodBeamMat!: THREE.MeshStandardMaterial;
  private woodPlankMat!: THREE.MeshStandardMaterial;
  private woodCounterMat!: THREE.MeshStandardMaterial;
  private bannerMat!: THREE.MeshStandardMaterial;
  private bannerGoldMat!: THREE.MeshStandardMaterial;

  constructor(private ngZone: NgZone) {}

  async init(
    canvas: HTMLCanvasElement,
    callbacks?: DungeonShopCallbacks,
    avatarSpec?: Avatar | AvatarBuild,
  ): Promise<void> {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.torchLights = [];
    this.keysPressed.clear();
    this.lastNearCounter = false;
    this.playerPos.set(0, 0, 1.8);
    this.playerRotY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.customAvatarBuild = null;
    this.groundPet = null;

    // 1. Scene with a deep purple/indigo background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x130a21);
    this.scene.fog = new THREE.FogExp2(0x130a21, 0.009);

    // 2. Isometric Diorama Camera
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(32, aspect, 0.5, 100);
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.camLookTarget);

    // 3. Renderer with logarithmicDepthBuffer for depth precision
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      logarithmicDepthBuffer: true,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Stylized flat-shaded materials
    this.initMaterials();

    // 5. Cozy dungeon / medieval bazaar lighting
    this.setupLighting();

    // 6. Scene groups
    this.dioramaGroup = new THREE.Group();
    this.roomGroup = new THREE.Group();
    this.propsGroup = new THREE.Group();
    this.vendorGroup = new THREE.Group();
    this.playerGroup = new THREE.Group();
    this.itemsDisplayGroup = new THREE.Group();

    this.dioramaGroup.add(this.roomGroup);
    this.dioramaGroup.add(this.propsGroup);
    this.dioramaGroup.add(this.vendorGroup);
    this.dioramaGroup.add(this.playerGroup);
    this.dioramaGroup.add(this.itemsDisplayGroup);
    this.scene.add(this.dioramaGroup);

    // 7. Construction of the diorama room (full floor with hexagons without overlapping wood)
    this.buildRoomStructure();

    // 8. Furniture: Counter moved to the right outside the wooden floor
    this.buildMerchantCounterAndGoods();

    // 9. Load decorations (scaled door, shield with swords IN FRONT above the door)
    await this.loadDecorations();

    // 10. Load the merchant at +20% size (2.80m)
    await this.loadVendor();

    // 11. Load the player's character at +20% size (2.80m)
    await this.loadPlayer(avatarSpec);

    // 12. Keyboard and mouse listeners
    this.setupEvents();

    this.running = true;
    this.clock.start();
    this.ngZone.runOutsideAngular(() => this.loop());
  }

  // -------------------------------------------------------------
  // Initialization of Clean Materials
  // -------------------------------------------------------------
  private initMaterials(): void {
    this.stoneWallMat = new THREE.MeshStandardMaterial({
      color: 0x6e7482,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    this.stoneFloorMat = new THREE.MeshStandardMaterial({
      color: 0x888e9b,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.stoneCapMat = new THREE.MeshStandardMaterial({
      color: 0x4f5460,
      roughness: 0.8,
      metalness: 0.08,
      flatShading: true,
    });

    this.woodBeamMat = new THREE.MeshStandardMaterial({
      color: 0x543621,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: true,
    });

    this.woodPlankMat = new THREE.MeshStandardMaterial({
      color: 0x764b2d,
      roughness: 0.8,
      metalness: 0.04,
      flatShading: true,
    });

    this.woodCounterMat = new THREE.MeshStandardMaterial({
      color: 0x7b5133,
      roughness: 0.75,
      metalness: 0.05,
      flatShading: true,
    });

    this.bannerMat = new THREE.MeshStandardMaterial({
      color: 0xb53026,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    });

    this.bannerGoldMat = new THREE.MeshStandardMaterial({
      color: 0xdfa633,
      roughness: 0.6,
      metalness: 0.25,
      flatShading: true,
    });
  }

  // -------------------------------------------------------------
  // Warm Dungeon Lighting
  // -------------------------------------------------------------
  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffeedd, 0.78);
    this.scene.add(ambient);

    const mainSun = new THREE.DirectionalLight(0xfff1e0, 1.4);
    mainSun.position.set(5.0, 12.0, 7.5);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 30;
    mainSun.shadow.camera.left = -8;
    mainSun.shadow.camera.right = 8;
    mainSun.shadow.camera.top = 8;
    mainSun.shadow.camera.bottom = -8;
    mainSun.shadow.bias = -0.0004;
    this.scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight(0x6b5c92, 0.55);
    fillLight.position.set(-8.0, 6.0, -2.0);
    this.scene.add(fillLight);

    // Torches on the back wall
    this.addTorchLight(-3.5, 3.6, -3.85, 0xff9933, 2.6);
    this.addTorchLight(3.5, 3.6, -3.85, 0xffaa44, 2.8);

    // Spotlight over the counter
    const counterSpot = new THREE.PointLight(0xffe2b8, 2.2, 8.0, 1.6);
    counterSpot.position.set(3.5, 3.3, -0.6);
    counterSpot.castShadow = true;
    counterSpot.shadow.bias = -0.001;
    this.scene.add(counterSpot);
    this.torchLights.push({ light: counterSpot, baseIntensity: 2.2, phase: 1.2 });
  }

  private addTorchLight(x: number, y: number, z: number, color: number, intensity: number): void {
    const pl = new THREE.PointLight(color, intensity, 9.0, 1.8);
    pl.position.set(x, y, z);
    pl.castShadow = true;
    pl.shadow.bias = -0.001;
    this.scene.add(pl);
    this.torchLights.push({
      light: pl,
      baseIntensity: intensity,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // -------------------------------------------------------------
  // Diorama Architecture (Complete stone mesh and planks up to the end)
  // -------------------------------------------------------------
  private buildRoomStructure(): void {
    // 1. Diorama polygon with the correct front chamfer (in 2D, negative Y maps to positive Z with rotateX(-90deg))
    const roomShape = new THREE.Shape();
    roomShape.moveTo(-6.4, 4.3);  // Back left corner (z = -4.3)
    roomShape.lineTo(-6.4, -2.0); // Left side wall (z = +2.0)
    roomShape.lineTo(-4.2, -4.4); // Front left chamfer (z = +4.4)
    roomShape.lineTo(4.2, -4.4);  // Central front edge (z = +4.4)
    roomShape.lineTo(6.4, -2.0);  // Front right chamfer (z = +2.0)
    roomShape.lineTo(6.4, 4.3);   // Right side wall (z = -4.3)
    roomShape.closePath();

    // 2. Lower pedestal of the diorama
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.5,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };
    const baseGeom = new THREE.ExtrudeGeometry(roomShape, extrudeSettings);
    baseGeom.rotateX(-Math.PI / 2);
    const dioramaBaseMesh = new THREE.Mesh(baseGeom, this.stoneCapMat);
    dioramaBaseMesh.position.y = -0.58;
    dioramaBaseMesh.receiveShadow = true;
    this.roomGroup.add(dioramaBaseMesh);

    // 3. Stone floor using THE SAME polygon
    const floorGeom = new THREE.ExtrudeGeometry(roomShape, {
      depth: 0.08,
      bevelEnabled: false,
    });
    floorGeom.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeom, this.stoneFloorMat);
    floorMesh.position.set(0, -0.04, 0);
    floorMesh.receiveShadow = true;
    this.roomGroup.add(floorMesh);

    // 4. Complete, dense and symmetric mesh of hexagonal tiles (NEVER stepping on the wood)
    const flagstoneMat1 = new THREE.MeshStandardMaterial({
      color: 0x9fa5b4,
      roughness: 0.78,
      metalness: 0.05,
      flatShading: true,
    });
    const flagstoneMat2 = new THREE.MeshStandardMaterial({
      color: 0x868c9a,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: true,
    });

    const tileH = 0.07;
    const tileY = tileH / 2;
    const stoneRadius = 0.48;
    const stonePolyGeom = new THREE.CylinderGeometry(stoneRadius * 0.92, stoneRadius, tileH, 6);

    const isInsideRightSector = (px: number, pz: number): boolean => {
      // Outside the central wooden walkway (right edge at x = +1.39m + clearance)
      if (px < 1.45 + stoneRadius) return false;
      // Inside the right wall
      if (px > 6.25 - stoneRadius) return false;
      // Z limits
      if (pz < -4.15 + stoneRadius) return false;
      if (pz > 4.35 - stoneRadius) return false;
      // Front right chamfer
      if (px > 4.0 && pz > 1.8 && pz + 1.09 * px > 8.95) return false;
      return true;
    };

    // Generate a symmetric interlocking hexagonal network on both sides (covers all sectors)
    for (let z = -3.85; z <= 3.86; z += 0.77) {
      const rowIdx = Math.round((z + 3.85) / 0.77);
      const rowOffset = (rowIdx % 2 === 0) ? 0 : 0.45;
      for (let x = 1.98; x <= 5.8; x += 0.90) {
        const px = x + rowOffset;
        if (isInsideRightSector(px, z)) {
          // Right side
          const matR = (Math.sin(px * 2.8 + z * 3.4) > 0) ? flagstoneMat1 : flagstoneMat2;
          const sMeshR = new THREE.Mesh(stonePolyGeom, matR);
          sMeshR.position.set(px, tileY, z);
          sMeshR.rotation.y = (px * z) % Math.PI;
          sMeshR.castShadow = true;
          sMeshR.receiveShadow = true;
          this.roomGroup.add(sMeshR);

          // Symmetric left side (-px)
          const matL = (Math.cos(px * 2.8 - z * 3.4) > 0) ? flagstoneMat1 : flagstoneMat2;
          const sMeshL = new THREE.Mesh(stonePolyGeom, matL);
          sMeshL.position.set(-px, tileY, z);
          sMeshL.rotation.y = (-px * z) % Math.PI;
          sMeshL.castShadow = true;
          sMeshL.receiveShadow = true;
          this.roomGroup.add(sMeshL);
        }
      }
    }

    // 5. Central wooden walkway THAT REACHES THE EXACT END (z: 4.4)
    const walkwayWidth = 2.5;
    const plankH = 0.08;
    const zStart = -4.2;
    const zEnd = 4.4;
    const totalWalkwayLen = zEnd - zStart;
    const plankCount = Math.round(totalWalkwayLen / 0.38); // 23 uniform boards
    const plankStep = totalWalkwayLen / plankCount;
    const plankD = plankStep * 0.92;

    for (let i = 0; i < plankCount; i++) {
      const pz = zStart + (i + 0.5) * plankStep;
      const plankGeom = new THREE.BoxGeometry(walkwayWidth, plankH, plankD);
      const pMesh = new THREE.Mesh(plankGeom, this.woodPlankMat);
      pMesh.position.set(0, plankH / 2, pz);
      pMesh.receiveShadow = true;
      pMesh.castShadow = true;
      this.roomGroup.add(pMesh);
    }

    // Wooden side edges for the walkway that reach exactly from zStart to zEnd
    const borderGeom = new THREE.BoxGeometry(0.14, 0.12, totalWalkwayLen);
    const borderL = new THREE.Mesh(borderGeom, this.woodBeamMat);
    borderL.position.set(-walkwayWidth / 2 - 0.07, 0.06, (zStart + zEnd) / 2);
    borderL.castShadow = true;
    this.roomGroup.add(borderL);

    const borderR = new THREE.Mesh(borderGeom, this.woodBeamMat);
    borderR.position.set(walkwayWidth / 2 + 0.07, 0.06, (zStart + zEnd) / 2);
    borderR.castShadow = true;
    this.roomGroup.add(borderR);

    // 6. Back Wall
    const wallH = 5.4;
    const wallThick = 0.55;
    const wallZ = -4.2;

    const backWallGeom = new THREE.BoxGeometry(13.0, wallH, wallThick);
    const backWall = new THREE.Mesh(backWallGeom, this.stoneWallMat);
    backWall.position.set(0, wallH / 2, wallZ);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // 7. Side Walls
    const sideWallLen = 6.4;
    const sideWallGeom = new THREE.BoxGeometry(wallThick, wallH, sideWallLen);

    const leftWall = new THREE.Mesh(sideWallGeom, this.stoneWallMat);
    leftWall.position.set(-6.2, wallH / 2, -1.0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeom, this.stoneWallMat);
    rightWall.position.set(6.2, wallH / 2, -1.0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    // 8. Stone top molding and battlements
    const capBackGeom = new THREE.BoxGeometry(13.2, 0.42, 0.85);
    const capBack = new THREE.Mesh(capBackGeom, this.stoneCapMat);
    capBack.position.set(0, wallH + 0.2, wallZ);
    capBack.castShadow = true;
    this.roomGroup.add(capBack);

    const capSideGeom = new THREE.BoxGeometry(0.85, 0.42, 6.8);
    const capSideL = new THREE.Mesh(capSideGeom, this.stoneCapMat);
    capSideL.position.set(-6.2, wallH + 0.2, -0.8);
    this.roomGroup.add(capSideL);

    const capSideR = new THREE.Mesh(capSideGeom, this.stoneCapMat);
    capSideR.position.set(6.2, wallH + 0.2, -0.8);
    this.roomGroup.add(capSideR);

    for (let bx = -5.6; bx <= 5.6; bx += 1.4) {
      const merlonGeom = new THREE.BoxGeometry(0.85, 0.35, 0.7);
      const mMesh = new THREE.Mesh(merlonGeom, this.stoneCapMat);
      mMesh.position.set(bx, wallH + 0.58, wallZ);
      mMesh.castShadow = true;
      this.roomGroup.add(mMesh);
    }

    // 9. Beam framework
    this.buildTimberFraming(wallH, wallZ, wallThick);
  }

  // -------------------------------------------------------------
  // Wooden Beam Framework
  // -------------------------------------------------------------
  private buildTimberFraming(wallH: number, wallZ: number, wallThick: number): void {
    const postThick = 0.26;
    const frontZ = wallZ + wallThick / 2 + postThick / 2;

    for (const px of [-5.9, -1.8, 1.8, 5.9]) {
      const postGeom = new THREE.BoxGeometry(postThick, wallH, postThick);
      const post = new THREE.Mesh(postGeom, this.woodBeamMat);
      post.position.set(px, wallH / 2, frontZ);
      post.castShadow = true;
      this.roomGroup.add(post);
    }

    const braceGeom = new THREE.BoxGeometry(0.2, 2.4, 0.2);

    const braceL = new THREE.Mesh(braceGeom, this.woodBeamMat);
    braceL.position.set(-2.8, 3.6, frontZ);
    braceL.rotation.z = Math.PI / 4.5;
    this.roomGroup.add(braceL);

    const braceR = new THREE.Mesh(braceGeom, this.woodBeamMat);
    braceR.position.set(2.8, 3.6, frontZ);
    braceR.rotation.z = -Math.PI / 4.5;
    this.roomGroup.add(braceR);
  }

  // -------------------------------------------------------------
  // Merchant's Counter (At x = 3.5, completely outside the wood)
  // -------------------------------------------------------------
  private buildMerchantCounterAndGoods(): void {
    const counterGroup = new THREE.Group();
    // Centered at x = 3.5 (left edge at x = 2.0, walkway ends at x = 1.39)
    counterGroup.position.set(3.5, 0, -0.6);

    const counterW = 3.0;
    const counterH = 1.25; // Ergonomic height for 3.36m characters
    const counterD = 1.2;

    // 1. Main body of the counter
    const baseGeom = new THREE.BoxGeometry(counterW, counterH, counterD);
    const base = new THREE.Mesh(baseGeom, this.woodCounterMat);
    base.position.y = counterH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    counterGroup.add(base);

    // Top molding of the counter
    const topGeom = new THREE.BoxGeometry(counterW + 0.24, 0.12, counterD + 0.24);
    const top = new THREE.Mesh(topGeom, this.woodBeamMat);
    top.position.y = counterH + 0.06;
    top.castShadow = true;
    top.receiveShadow = true;
    counterGroup.add(top);

    // Decorative front slats
    const slatMat = new THREE.MeshStandardMaterial({
      color: 0x623f26,
      roughness: 0.8,
      metalness: 0.04,
      flatShading: true,
    });
    for (let sx = -counterW / 2 + 0.35; sx <= counterW / 2 - 0.35; sx += 0.5) {
      const slatGeom = new THREE.BoxGeometry(0.1, counterH * 0.85, 0.05);
      const slat = new THREE.Mesh(slatGeom, slatMat);
      slat.position.set(sx, counterH / 2, counterD / 2 + 0.02);
      counterGroup.add(slat);
    }

    // 2. Shiny objects on the counter
    const itemsY = counterH + 0.12;

    this.createPotionBottle(counterGroup, -1.0, itemsY, 0.2, 0xff2a55, 0.45);
    this.createPotionBottle(counterGroup, -0.65, itemsY, 0.32, 0x00e6aa, 0.5);
    this.createPotionBottle(counterGroup, -0.3, itemsY, 0.16, 0xbb44ff, 0.55);

    // Open Spellbook
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0.35, itemsY, 0.18);
    bookGroup.rotation.y = -0.15;

    const bookCoverMat = new THREE.MeshStandardMaterial({
      color: 0x8a4522,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    });
    const bookPagesMat = new THREE.MeshStandardMaterial({
      color: 0xf5eed8,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    });

    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.9), bookCoverMat);
    bookGroup.add(cover);

    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.82), bookPagesMat);
    pages.position.y = 0.04;
    bookGroup.add(pages);

    counterGroup.add(bookGroup);

    // Blue Mystic Tome with a shining gem
    const tomeGroup = new THREE.Group();
    tomeGroup.position.set(1.05, itemsY, 0.14);
    tomeGroup.rotation.y = 0.25;

    const tomeMat = new THREE.MeshStandardMaterial({
      color: 0x3b429f,
      roughness: 0.6,
      metalness: 0.15,
      flatShading: true,
    });
    const tomeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.8), tomeMat);
    tomeMesh.position.y = 0.06;
    tomeMesh.castShadow = true;
    tomeGroup.add(tomeMesh);

    const gemMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08),
      new THREE.MeshStandardMaterial({
        color: 0xff66cc,
        emissive: 0xcc2299,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
    );
    gemMesh.position.set(0, 0.14, 0);
    tomeGroup.add(gemMesh);

    counterGroup.add(tomeGroup);

    this.propsGroup.add(counterGroup);
  }

  private createPotionBottle(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    colorHex: number,
    emissiveIntensity: number,
  ): void {
    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(x, y, z);

    const bodyGeom = new THREE.SphereGeometry(0.18, 12, 10);
    bodyGeom.scale(1, 1.25, 1);
    const fluidMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity,
      roughness: 0.25,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeom, fluidMat);
    body.position.y = 0.2;
    body.castShadow = true;
    bottleGroup.add(body);

    const neckGeom = new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10);
    const neckMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const neck = new THREE.Mesh(neckGeom, neckMat);
    neck.position.y = 0.38;
    bottleGroup.add(neck);

    const corkGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.07, 8);
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x9b6b43, roughness: 0.9 });
    const cork = new THREE.Mesh(corkGeom, corkMat);
    cork.position.y = 0.46;
    bottleGroup.add(cork);

    const glow = new THREE.PointLight(colorHex, 0.5, 1.8);
    glow.position.set(0, 0.26, 0);
    bottleGroup.add(glow);

    parent.add(bottleGroup);
  }

  // -------------------------------------------------------------
  // Decorations: Door, Shield with swords IN FRONT (raised on the wall)
  // -------------------------------------------------------------
  private async loadDecorations(): Promise<void> {
    const wallZ = -4.2;
    const wallThick = 0.55;

    // 1. Torches on the back wall
    for (const tx of [-3.5, 3.5]) {
      this.createWallTorch(tx, 3.6, wallZ + wallThick / 2 + 0.08);
    }

    // 2. Red and Gold Banners
    this.createBanner(-3.5, 2.9, wallZ + wallThick / 2 + 0.04);
    this.createBanner(3.8, 2.9, wallZ + wallThick / 2 + 0.04);

    // 3. Wooden door proportional to 3.36m characters (height 3.65m)
    this.buildCharacterScaledDoor(0, 0, wallZ + wallThick / 2);

    // 4. Heraldic Shield with Crossed Swords IN FRONT raised above the door at y = 4.35
    await this.loadHeraldicWallEmblem(0, 4.35, wallZ + wallThick / 2 + 0.06);

    // 5. Windows on the side walls
    this.createSideWindow(-5.9, 2.6, -0.6, Math.PI / 2);
    this.createSideWindow(5.9, 2.6, -0.6, -Math.PI / 2);

    // 6. Decorative crates on the left
    this.createLeftProps();
  }

  // -------------------------------------------------------------
  // Wooden Door at the Exact Scale of the Characters (3.65m)
  // -------------------------------------------------------------
  private buildCharacterScaledDoor(x: number, y: number, z: number): void {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, y, z);

    const doorW = 2.0;
    const doorH = 3.65; // Proportional for 3.36m characters

    const doorWoodMat = new THREE.MeshStandardMaterial({
      color: 0x6e4528,
      roughness: 0.8,
      metalness: 0.04,
      flatShading: true,
    });
    const stoneArchMat = new THREE.MeshStandardMaterial({
      color: 0x515662,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.65,
      metalness: 0.6,
      flatShading: true,
    });

    // Outer frame of carved stone
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, doorH, 0.22), stoneArchMat);
    frameLeft.position.set(-doorW / 2 - 0.11, doorH / 2, 0.04);
    frameLeft.castShadow = true;
    doorGroup.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, doorH, 0.22), stoneArchMat);
    frameRight.position.set(doorW / 2 + 0.11, doorH / 2, 0.04);
    frameRight.castShadow = true;
    doorGroup.add(frameRight);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.44, 0.26, 0.24), stoneArchMat);
    frameTop.position.set(0, doorH + 0.13, 0.04);
    frameTop.castShadow = true;
    doorGroup.add(frameTop);

    // Wooden leaf of the door
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.09), doorWoodMat);
    doorPanel.position.set(0, doorH / 2, 0.02);
    doorPanel.castShadow = true;
    doorGroup.add(doorPanel);

    // Vertical planks (board grooves)
    for (const sx of [-0.42, 0, 0.42]) {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, doorH, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x482b17, roughness: 0.9 }),
      );
      groove.position.set(sx, doorH / 2, 0.025);
      doorGroup.add(groove);
    }

    // Horizontal iron fittings
    for (const hy of [0.65, 2.35]) {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.1, 0.09, 0.11), ironMat);
      hinge.position.set(0, hy, 0.03);
      doorGroup.add(hinge);
    }

    // Iron latch / Ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 16), ironMat);
    ring.position.set(0.45, 1.45, 0.09);
    doorGroup.add(ring);

    this.propsGroup.add(doorGroup);
  }

  // -------------------------------------------------------------
  // Heraldic Shield with Swords IN FRONT (raised to y = 4.1)
  // -------------------------------------------------------------
  private async loadHeraldicWallEmblem(x: number, y: number, z: number): Promise<void> {
    try {
      const [shieldGltf, swordGltf] = await Promise.all([
        this.gltfLoader.loadAsync('/world-3d/Assets/CharacterV2/Assets/gltf/shield_badge_color.gltf'),
        this.gltfLoader.loadAsync('/world-3d/Assets/CharacterV2/Assets/gltf/sword_1handed.gltf'),
      ]);

      const emblemGroup = new THREE.Group();
      emblemGroup.position.set(x, y, z);

      // 1. Heraldic shield in the background
      const shield = SkeletonUtils.clone(shieldGltf.scene) as THREE.Group;
      shield.scale.setScalar(1.35);
      shield.position.set(0, 0, 0);
      shield.rotation.y = 0;
      shield.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      emblemGroup.add(shield);

      // 2. Crossed swords IN FRONT of the shield (+Z toward the camera)
      const sw1 = SkeletonUtils.clone(swordGltf.scene) as THREE.Group;
      sw1.scale.setScalar(1.05);
      sw1.position.set(0, 0, 0.15); // Visibly in front of the shield
      sw1.rotation.z = Math.PI / 4;
      sw1.rotation.y = 0;
      sw1.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      emblemGroup.add(sw1);

      const sw2 = SkeletonUtils.clone(swordGltf.scene) as THREE.Group;
      sw2.scale.setScalar(1.05);
      sw2.position.set(0, 0, 0.17); // Visibly in front of the shield
      sw2.rotation.z = -Math.PI / 4;
      sw2.rotation.y = 0;
      sw2.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.castShadow = true;
      });
      emblemGroup.add(sw2);

      this.propsGroup.add(emblemGroup);
    } catch (e) {
      console.warn('[DungeonShop] Error loading heraldic shield and swords:', e);
    }
  }

  private createWallTorch(x: number, y: number, z: number): void {
    const torchGroup = new THREE.Group();
    torchGroup.position.set(x, y, z);

    const mountMat = new THREE.MeshStandardMaterial({ color: 0x222225, roughness: 0.7, metalness: 0.6 });
    const mountGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    mountGeom.rotateX(Math.PI / 4);
    const mount = new THREE.Mesh(mountGeom, mountMat);
    torchGroup.add(mount);

    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5a3418, roughness: 0.85 });
    const handleGeom = new THREE.CylinderGeometry(0.05, 0.04, 0.45, 8);
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.set(0, 0.1, 0.15);
    torchGroup.add(handle);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
    const flameGeom = new THREE.ConeGeometry(0.09, 0.28, 8);
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.set(0, 0.38, 0.15);
    torchGroup.add(flame);

    this.propsGroup.add(torchGroup);
  }

  private createBanner(x: number, y: number, z: number): void {
    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(x, y, z);

    const barGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8);
    barGeom.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeom, this.woodBeamMat);
    bannerGroup.add(bar);

    const clothGeom = new THREE.BoxGeometry(1.05, 2.2, 0.02);
    const cloth = new THREE.Mesh(clothGeom, this.bannerMat);
    cloth.position.set(0, -1.1, 0);
    cloth.castShadow = true;
    bannerGroup.add(cloth);

    const stripeGeom = new THREE.BoxGeometry(0.14, 2.2, 0.025);
    const stripeL = new THREE.Mesh(stripeGeom, this.bannerGoldMat);
    stripeL.position.set(-0.35, -1.1, 0.005);
    bannerGroup.add(stripeL);

    const stripeR = new THREE.Mesh(stripeGeom, this.bannerGoldMat);
    stripeR.position.set(0.35, -1.1, 0.005);
    bannerGroup.add(stripeR);

    this.propsGroup.add(bannerGroup);
  }

  private createSideWindow(x: number, y: number, z: number, rotY: number): void {
    const winGroup = new THREE.Group();
    winGroup.position.set(x, y, z);
    winGroup.rotation.y = rotY;

    const frameGeom = new THREE.BoxGeometry(1.6, 2.2, 0.25);
    const frame = new THREE.Mesh(frameGeom, this.woodBeamMat);
    frame.castShadow = true;
    winGroup.add(frame);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1f1938,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0x2d1f4d,
      emissiveIntensity: 0.35,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.05), glassMat);
    glass.position.z = 0.05;
    winGroup.add(glass);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.5 });
    for (const rx of [-0.3, 0, 0.3]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), ironMat);
      bar.position.set(rx, 0, 0.1);
      winGroup.add(bar);
    }

    this.propsGroup.add(winGroup);
  }

  private createLeftProps(): void {
    const propsGroup = new THREE.Group();
    propsGroup.position.set(-4.2, 0, 0.4);

    const crateMat = new THREE.MeshStandardMaterial({ color: 0x764e32, roughness: 0.85, flatShading: true });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), crateMat);
    crate.position.set(0, 0.55, 0);
    crate.rotation.y = 0.2;
    crate.castShadow = true;
    propsGroup.add(crate);

    const crateSmall = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.95), crateMat);
    crateSmall.position.set(0.1, 1.48, 0.05);
    crateSmall.rotation.y = -0.15;
    crateSmall.castShadow = true;
    propsGroup.add(crateSmall);

    const chestGroup = new THREE.Group();
    chestGroup.position.set(-3.8, 0, -3.2);
    chestGroup.rotation.y = 0.15;

    const chestBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 0.95), crateMat);
    chestBase.position.y = 0.325;
    chestBase.castShadow = true;
    chestGroup.add(chestBase);

    const lidGeom = new THREE.CylinderGeometry(0.48, 0.48, 1.4, 12, 1, false, 0, Math.PI);
    lidGeom.rotateZ(Math.PI / 2);
    const lid = new THREE.Mesh(lidGeom, crateMat);
    lid.position.set(0, 0.65, 0);
    lid.castShadow = true;
    chestGroup.add(lid);

    this.propsGroup.add(propsGroup);
    this.propsGroup.add(chestGroup);
  }

  // -------------------------------------------------------------
  // Seller / Merchant (Size increased another 20% -> 3.36m)
  // -------------------------------------------------------------
  private async loadVendor(): Promise<void> {
    try {
      const [vendorGltf, animsGltf] = await Promise.all([
        this.gltfLoader.loadAsync('/world/characters/Rogue_Hooded.glb'),
        this.gltfLoader.loadAsync('/world/characters/Rig_Medium_General.glb'),
      ]);

      const vendor = vendorGltf.scene;

      // Normalize the seller's height to 3.36m (+20% compared to before)
      const vendorBbox = new THREE.Box3().setFromObject(vendor);
      const vendorH = vendorBbox.getSize(new THREE.Vector3()).y || 1.8;
      const targetH = 3.36;
      vendor.scale.setScalar(targetH / vendorH);

      // Comfortably positioned behind the counter moved to x: 3.5
      vendor.position.set(3.5, 0, -1.65);
      vendor.rotation.y = -0.22;
      this.ensureModelLighting(vendor);

      this.vendorMesh = vendor;
      this.vendorMixer = new THREE.AnimationMixer(vendor);

      const idleClip =
        THREE.AnimationClip.findByName(animsGltf.animations, 'Idle_A') ?? animsGltf.animations[0];
      if (idleClip) {
        this.vendorIdleAction = this.vendorMixer.clipAction(idleClip);
        this.vendorIdleAction.play();
      }

      const interactClip = THREE.AnimationClip.findByName(animsGltf.animations, 'Interact');
      if (interactClip) {
        this.vendorInteractAction = this.vendorMixer.clipAction(interactClip);
        this.vendorInteractAction.setLoop(THREE.LoopOnce, 1);
        this.vendorInteractAction.clampWhenFinished = true;
      }

      this.vendorGroup.add(vendor);
    } catch (err) {
      console.warn('[DungeonShop] Failed to load the seller model:', err);
    }
  }

  // -------------------------------------------------------------
  // Player Avatar (Same height as the seller: 3.36m)
  // -------------------------------------------------------------
  private async loadPlayer(avatarSpec?: Avatar | AvatarBuild): Promise<void> {
    try {
      const [movementAnims, generalAnims] = await Promise.all([
        this.gltfLoader.loadAsync('/world/characters/Rig_Medium_MovementBasic.glb'),
        this.gltfLoader.loadAsync('/world/characters/Rig_Medium_General.glb'),
      ]);

      let playerObj: THREE.Group;

      if (avatarSpec && typeof avatarSpec !== 'string') {
        this.customAvatarBuild = avatarSpec;
        playerObj = avatarSpec.group;
        if (avatarSpec.groundPet) {
          this.groundPet = avatarSpec.groundPet;
          this.scene.add(avatarSpec.groundPet);
        }
      } else {
        const charName = typeof avatarSpec === 'string' && avatarSpec ? avatarSpec : 'Knight';
        const gltf = await this.gltfLoader.loadAsync(`/world/characters/${charName}.glb`);
        playerObj = gltf.scene;
      }

      // Normalize the player's height to 3.36m (exact same proportion as the seller)
      const bbox = new THREE.Box3().setFromObject(playerObj);
      const size = bbox.getSize(new THREE.Vector3());
      const h = size.y || 1.8;
      const targetH = 3.36;
      const scaleFactor = targetH / h;
      playerObj.scale.setScalar(scaleFactor);
      if (this.groundPet) this.groundPet.scale.setScalar(scaleFactor);

      playerObj.position.copy(this.playerPos);
      playerObj.rotation.y = this.playerRotY;
      this.ensureModelLighting(playerObj);

      this.playerMesh = playerObj;
      this.playerMixer = new THREE.AnimationMixer(playerObj);

      const walkClip =
        THREE.AnimationClip.findByName(movementAnims.animations, 'Walking_A') ??
        movementAnims.animations.find((a) => /walk/i.test(a.name)) ??
        movementAnims.animations[0];
      if (walkClip) {
        this.playerWalkAction = this.playerMixer.clipAction(walkClip);
      }

      const idleClip =
        THREE.AnimationClip.findByName(generalAnims.animations, 'Idle_A') ?? generalAnims.animations[0];
      if (idleClip) {
        this.playerIdleAction = this.playerMixer.clipAction(idleClip);
        this.playerIdleAction.play();
      }

      this.playerGroup.add(playerObj);
    } catch (err) {
      console.warn('[DungeonShop] Failed to load the player avatar:', err);
    }
  }

  private ensureModelLighting(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.roughness = 0.75;
              m.metalness = 0.1;
              m.needsUpdate = true;
            }
          });
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Seller Animation when interacting or buying
  // -------------------------------------------------------------
  triggerVendorReaction(): void {
    if (this.vendorInteractAction && this.vendorMixer) {
      this.vendorInteractAction.reset().fadeIn(0.12).play();
      setTimeout(() => {
        this.vendorInteractAction?.fadeOut(0.25);
        this.vendorIdleAction?.reset().fadeIn(0.25).play();
      }, 1500);
    }
  }

  // -------------------------------------------------------------
  // Event Configuration (WASD Keyboard and Mouse Parallax)
  // -------------------------------------------------------------
  private setupEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('click', this.onCanvasClick);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(k)) {
      this.keysPressed.add(k);
    }
    // Space or E to talk to the merchant if nearby
    if ((k === 'e' || k === ' ') && this.lastNearCounter) {
      e.preventDefault();
      this.triggerVendorReaction();
      this.callbacks?.onVendorClick?.();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    this.keysPressed.delete(k);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.mouseX = (e.clientX / w - 0.5) * 2;
    this.mouseY = (e.clientY / h - 0.5) * 2;
  };

  private onCanvasClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);

    const hits = raycaster.intersectObjects([this.vendorGroup, this.propsGroup], true);
    if (hits.length > 0) {
      this.triggerVendorReaction();
      this.callbacks?.onVendorClick?.();
    }
  };

  // -------------------------------------------------------------
  // Render Loop
  // -------------------------------------------------------------
  private loop = (): void => {
    if (!this.running) return;
    this.animId = requestAnimationFrame(this.loop);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Update player movement with WASD
    this.updatePlayerMovement(dt, time);

    // 2. Update animation mixers and modular avatar
    this.vendorMixer?.update(dt);
    this.playerMixer?.update(dt);

    if (this.customAvatarBuild) {
      this.customAvatarBuild.tick(time, dt);
      if (this.groundPet) {
        this.groundPet.position.set(
          this.playerPos.x - 0.85,
          this.playerPos.y,
          this.playerPos.z + 0.45,
        );
      }
    }

    // 3. Soft flickering of torches
    for (const t of this.torchLights) {
      const flicker = Math.sin(time * 7.5 + t.phase) * 0.12 + Math.cos(time * 12.0 + t.phase * 2) * 0.08;
      t.light.intensity = THREE.MathUtils.clamp(t.baseIntensity + flicker, 0.5, 4.0);
    }

    // 4. Subtle camera parallax with the mouse
    const parallaxX = this.mouseX * 0.65;
    const parallaxY = -this.mouseY * 0.35;
    this.targetCamPos.set(this.baseCamPos.x + parallaxX, this.baseCamPos.y + parallaxY, this.baseCamPos.z);
    this.camera.position.lerp(this.targetCamPos, 0.06);
    this.camera.lookAt(this.camLookTarget);

    // 5. Render
    this.renderer.render(this.scene, this.camera);
  };

  // -------------------------------------------------------------
  // Player Movement Logic and Collisions
  // -------------------------------------------------------------
  private updatePlayerMovement(dt: number, time: number): void {
    if (!this.playerMesh) return;

    let moveX = 0;
    let moveZ = 0;

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) moveZ -= 1;
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) moveZ += 1;
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) moveX -= 1;
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;

    if (isMoving) {
      const len = Math.hypot(moveX, moveZ);
      const dirX = moveX / len;
      const dirZ = moveZ / len;

      const speed = 3.8;
      let nextX = this.playerPos.x + dirX * speed * dt;
      let nextZ = this.playerPos.z + dirZ * speed * dt;

      // Limits of the diorama room
      nextX = THREE.MathUtils.clamp(nextX, -4.9, 4.9);
      nextZ = THREE.MathUtils.clamp(nextZ, -2.4, 3.7);

      // Collision with the counter (at x: [1.8, 5.2], z: [-2.1, 0.25])
      if (nextX >= 1.8 && nextX <= 5.2 && nextZ >= -2.1 && nextZ <= 0.25) {
        if (this.playerPos.x < 1.8) nextX = 1.78;
        else if (this.playerPos.z > 0.25) nextZ = 0.27;
        else if (this.playerPos.z < -2.1) nextZ = -2.12;
      }

      // Collision with crates of the left sector
      if (nextX <= -2.6 && nextX >= -5.2 && nextZ >= -0.6 && nextZ <= 1.8) {
        if (this.playerPos.x > -2.6) nextX = -2.58;
        else if (this.playerPos.z > 1.8) nextZ = 1.82;
        else if (this.playerPos.z < -0.6) nextZ = -0.62;
      }

      this.playerPos.x = nextX;
      this.playerPos.z = nextZ;

      const targetAngle = Math.atan2(dirX, dirZ);
      let diff = targetAngle - this.playerRotY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.playerRotY += diff * Math.min(1, 14 * dt);

      this.playerMesh.position.copy(this.playerPos);
      this.playerMesh.rotation.y = this.playerRotY;

      if (!this.isPlayerMoving) {
        this.isPlayerMoving = true;
        this.playerIdleAction?.fadeOut(0.15);
        this.playerWalkAction?.reset().fadeIn(0.15).play();
      }
    } else {
      if (this.isPlayerMoving) {
        this.isPlayerMoving = false;
        this.playerWalkAction?.fadeOut(0.2);
        this.playerIdleAction?.reset().fadeIn(0.2).play();
      }
    }

    // Proximity detection to the merchant's counter (at x: 3.5, z: -0.6)
    const distToCounter = Math.hypot(this.playerPos.x - 3.5, this.playerPos.z - (-0.6));
    const isNear = distToCounter < 3.0;

    if (isNear !== this.lastNearCounter) {
      this.lastNearCounter = isNear;
      this.ngZone.run(() => {
        this.callbacks?.onNearCounter?.(isNear);
      });
    }
  }

  // -------------------------------------------------------------
  // Viewport Resizing
  // -------------------------------------------------------------
  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  // -------------------------------------------------------------
  // Clean Destruction
  // -------------------------------------------------------------
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.animId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.canvas?.removeEventListener('click', this.onCanvasClick);

    this.scene?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.renderer?.dispose();
  }
}
