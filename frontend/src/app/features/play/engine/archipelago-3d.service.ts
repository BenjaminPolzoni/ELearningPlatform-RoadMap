import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Biome } from '../world-gen';
import { TabletopBuilder } from './tabletop-props';

export interface ArchipelagoSection {
  id: string;
  title: string;
  biome?: Biome;
  attachments: number;
  visited: number;
  complete: boolean;
}

export interface Island3dNode {
  id: string;
  title: string;
  biome: Biome;
  x: number;
  z: number;
  radius: number;
  dockX: number;
  dockZ: number;
  dockHeading: number;
  group: THREE.Group;
  complete: boolean;
}

export interface ArchipelagoCallbacks {
  onSelect: (sectionId: string) => void;
  onDock: (sectionId: string) => void;
  onHover?: (sectionId: string | null, screenX: number, screenY: number) => void;
}

interface HexTileDef {
  q: number;
  r: number;
  h: number;
  role: 'core' | 'peak' | 'nature' | 'camp' | 'road' | 'dock';
}

interface IslandCollider {
  x: number;
  z: number;
  r: number;
}

interface Seagull {
  group: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  orbitCenter: THREE.Vector2;
  orbitRadius: number;
  speed: number;
  altitude: number;
  angle: number;
  phase: number;
}

interface Dolphin {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  timer: number;
  cycleDuration: number;
  jumpDuration: number;
  submergedDuration: number;
  isLead: boolean;
  mixer?: THREE.AnimationMixer;
}

interface SplashRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

interface Whale {
  group: THREE.Group;
  spoutGroup: THREE.Group;
  spoutParticles: THREE.Mesh[];
  baseX: number;
  baseZ: number;
  heading: number;
  cycleTimer: number;
  mixer?: THREE.AnimationMixer;
}

@Injectable({ providedIn: 'root' })
export class Archipelago3dService {
  private canvas!: HTMLCanvasElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId = 0;
  private running = false;
  private callbacks?: ArchipelagoCallbacks;

  // Environment: Table and Board of the Nautical Map
  private tableMesh!: THREE.Mesh;
  private mapBoardGroup!: THREE.Group;
  private oceanMesh!: THREE.Mesh;
  private oceanGeom!: THREE.PlaneGeometry;
  private oceanOrigPositions: Float32Array | null = null;
  private oceanBaseColors: Float32Array | null = null;
  private windmills: { blades: THREE.Group }[] = [];
  private volcanoLights: { light: THREE.PointLight; baseIntensity: number }[] = [];

  // Fog of war / haze on the board's edges (hexagon map style)
  private fogPuffs: {
    sprite: THREE.Sprite;
    baseX: number;
    baseY: number;
    baseZ: number;
    phase: number;
    rotSpeed: number;
    baseScale: number;
  }[] = [];

  // Cached textures and shapes
  private static parchmentTex: THREE.CanvasTexture | null = null;
  private static cachedFogTex: THREE.Texture | null = null;
  private static hexShapeCache = new Map<number, THREE.Shape>();

  // Wide ocean circuits for dolphins patrolling the 4 corners of the map
  private static dolphinCurve1 = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, -28),    // North pass
      new THREE.Vector3(26, 0, -28),   // Toward the northeast
      new THREE.Vector3(42, 0, -25),   // Corner 1: Northeast (top right)
      new THREE.Vector3(44, 0, 0),     // East coast
      new THREE.Vector3(42, 0, 25),    // Corner 2: Southeast (bottom right)
      new THREE.Vector3(24, 0, 28),    // Southeast bay
      new THREE.Vector3(0, 0, 28),     // South pass
      new THREE.Vector3(0, 0, 6),      // Entrance to the central south trench
      new THREE.Vector3(-3, 0, -8),    // Central north trench
    ],
    true,
    'centripetal',
  );

  private static dolphinCurve2 = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0, 28),     // South pass
      new THREE.Vector3(-26, 0, 28),   // Toward the southwest
      new THREE.Vector3(-42, 0, 25),   // Corner 3: Southwest (bottom left)
      new THREE.Vector3(-44, 0, 0),    // West coast
      new THREE.Vector3(-42, 0, -25),  // Corner 4: Northwest (top left)
      new THREE.Vector3(-24, 0, -28),  // Northwest bay
      new THREE.Vector3(0, 0, -28),    // North pass
      new THREE.Vector3(3, 0, -8),     // Central north trench
      new THREE.Vector3(0, 0, 6),      // Central south trench
    ],
    true,
    'centripetal',
  );

  // Volcanoes (volcano.glb asset from the hexagonal map)
  private volcanoTemplate: THREE.Group | null = null;
  private volcanoHolders: { holder: THREE.Group; placeholder: THREE.Object3D }[] = [];

  // Islands (Hexagon mini-archipelagos)
  private islands: Island3dNode[] = [];
  private islandGroups: THREE.Group[] = [];
  private routesGroup!: THREE.Group;
  private currentHoveredId: string | null = null;

  // Physical island colliders (prevent the boat from crossing land)
  private islandColliders: IslandCollider[] = [];

  // Marine and Aerial Fauna (Seagulls, Dolphins and a Whale with a water spout)
  private wildlifeGroup!: THREE.Group;
  private seagulls: Seagull[] = [];
  private dolphins: Dolphin[] = [];
  private splashRings: SplashRing[] = [];
  private whale: Whale | null = null;
  private wildlifeMixers: THREE.AnimationMixer[] = [];
  private gltfLoader = new GLTFLoader();

  // Navigable 3D boat and Docking State
  private boatGroup!: THREE.Group;
  private boatModel: THREE.Object3D | null = null;
  private boatPlaceholder: THREE.Group | null = null;
  private boatHeading = 0; // radians
  private boatSpeed = 0;
  private boatPos = new THREE.Vector3(0, 0, 0);
  private autoPilotTarget: Island3dNode | null = null;
  private autoPilotPath: THREE.Vector3[] = [];
  private autoPilotIndex = 0;
  private currentDockedId: string | null = null;
  private onDockCallback: (() => void) | null = null;
  private isSailing = false;

  // Nautical destination marker (golden beacon pin with crystal, no circles)
  private mouseTarget: THREE.Vector3 | null = null;
  private targetMarker!: THREE.Group;
  private isPointerDown = false;

  // Stylized V-shaped water wake (linear foam)
  private wakeParticles: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
  private wakeGroup!: THREE.Group;
  private lastWakeTime = 0;

  // Optional keyboard controls
  private keys = { forward: false, backward: false, left: false, right: false };

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(private ngZone: NgZone) {}

  init(
    canvas: HTMLCanvasElement,
    sections: ArchipelagoSection[],
    callbacks: ArchipelagoCallbacks,
    initialUnitId?: string,
  ): void {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.islands = [];
    this.islandGroups = [];
    this.islandColliders = [];
    this.windmills = [];
    this.volcanoLights = [];
    this.volcanoHolders = [];
    this.fogPuffs = [];
    this.wakeParticles = [];
    this.seagulls = [];
    this.dolphins = [];
    this.splashRings = [];
    this.whale = null;
    for (const mixer of this.wildlifeMixers) {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    }
    this.wildlifeMixers = [];
    this.autoPilotTarget = null;
    this.autoPilotPath = [];
    this.mouseTarget = null;
    this.boatModel = null;
    this.boatPlaceholder = null;
    this.boatSpeed = 0;
    this.isSailing = false;
    this.onDockCallback = null;

    // Scene with a warm tavern tone
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a120b);
    this.scene.fog = new THREE.FogExp2(0x1a120b, 0.005);

    // Isometric Diorama Camera focusing on the open book on the table (Tilt-Shift)
    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.5, 600);
    this.camera.position.set(0, 68, 62);
    this.camera.lookAt(0, 0, 0);

    // Renderer with AAA render pipeline: sRGB + ACESFilmicToneMapping + soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 1. Warm explorer lighting
    this.setupLighting();

    // 2. Dark oak table (noble wood Tabletop)
    this.setupTable();

    // 3. Board of the Great Nautical Map on the table (continuous and without a central division)
    this.setupMapBoard();

    // 4. Continuous ocean basin covering the whole interior of the map
    this.setupPapercraftOcean();

    // 5. Volumetric fluffy haze on the board's edges (as in the hexagon map)
    this.setupPerimeterFog();

    // 6. Nautical destination visual marker (golden beacon pin with crystal)
    this.setupTargetMarker();

    // 7. Construction of mini-islands formed by clusters of HEXAGONS (with a pier)
    this.buildHexClusterIslands(sections);

    // 7.1 Compute the crystalline coastal gradient of the sea basin according to the islands
    this.updateOceanBaseCoastalColors();

    // 8. Dotted nautical treasure route
    this.routesGroup = new THREE.Group();
    this.scene.add(this.routesGroup);
    this.setupTreasureRoutes();

    // 9. Navigable 3D boat (ship-large.glb)
    this.setupBoat();

    // 10. Marine and aerial fauna (Seagulls, Dolphins and a Whale with a water spout)
    this.setupWildlife();

    // 11. Load the hexagon map's volcano.glb asset for volcanic islands
    this.loadVolcanoModel();

    // Listeners
    this.setupEvents();

    // Position the little docked boat on the starting island
    const targetIsland =
      this.islands.find((isl) => isl.id === initialUnitId) ?? this.islands[0];

    if (targetIsland) {
      this.currentDockedId = targetIsland.id;
      this.boatPos.set(targetIsland.dockX, 0.44, targetIsland.dockZ);
      this.boatGroup.position.copy(this.boatPos);
      this.boatHeading = targetIsland.dockHeading;
      this.boatGroup.rotation.y = this.boatHeading;
      this.isSailing = false;
    }

    this.running = true;
    this.ngZone.runOutsideAngular(() => this.loop(0));
  }

  // -------------------------------------------------------------
  // State Queries for the UI
  // -------------------------------------------------------------
  isDockedIn(sectionId: string): boolean {
    return this.currentDockedId === sectionId && !this.isSailing;
  }

  getIsNavigating(): boolean {
    return this.isSailing;
  }

  /**
   * Dynamically updates, live, the archipelago's islands and routes
   * without destroying the boat, the water, the table, the fauna or the camera.
   */
  updateSections(newSections: ArchipelagoSection[]): void {
    if (!this.running || !this.scene) return;

    // 1. Clear existing island groups and free GPU resources
    for (const group of this.islandGroups) {
      group.traverse((obj) => {
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
      this.scene.remove(group);
    }

    this.islandGroups = [];
    this.islands = [];
    this.islandColliders = [];
    this.windmills = [];
    this.volcanoLights = [];
    this.volcanoHolders = [];

    // 2. Clear previous treasure routes
    if (this.routesGroup) {
      while (this.routesGroup.children.length > 0) {
        const obj = this.routesGroup.children[0] as THREE.Line;
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
        this.routesGroup.remove(obj);
      }
    }

    // 3. Rebuild the mini-islands with the new list of sections
    this.buildHexClusterIslands(newSections);

    // 4. Update the crystalline coastal gradient of the sea basin
    this.updateOceanBaseCoastalColors();

    // 5. Rebuild nautical routes between islands
    this.setupTreasureRoutes();

    // 6. If the boat was docked at an island that still exists, keep it there;
    // if it was removed while docked, smoothly transfer it to the first available one.
    if (this.currentDockedId) {
      const dockedIsland = this.islands.find((isl) => isl.id === this.currentDockedId);
      if (dockedIsland) {
        if (!this.isSailing) {
          this.boatPos.set(dockedIsland.dockX, 0.44, dockedIsland.dockZ);
          this.boatGroup?.position.copy(this.boatPos);
          this.boatHeading = dockedIsland.dockHeading;
          if (this.boatGroup) this.boatGroup.rotation.y = this.boatHeading;
        }
      } else {
        const fallback = this.islands[0];
        if (fallback) {
          this.currentDockedId = fallback.id;
          this.boatPos.set(fallback.dockX, 0.44, fallback.dockZ);
          this.boatGroup?.position.copy(this.boatPos);
          this.boatHeading = fallback.dockHeading;
          if (this.boatGroup) this.boatGroup.rotation.y = this.boatHeading;
          this.callbacks?.onSelect?.(fallback.id);
        } else {
          this.currentDockedId = null;
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Realistic and Crystalline Sea Wave Dynamics
  // -------------------------------------------------------------
  private getWaveCoastalFactor(x: number, z: number): number {
    if (!this.islands || this.islands.length === 0) return 1.0;
    let minIslandDist = 999;
    for (const isl of this.islands) {
      const d = Math.hypot(x - isl.x, z - isl.z);
      if (d < minIslandDist) minIslandDist = d;
    }
    // Near islands and piers (d < 4.8), completely calm waters (factor 0.08)
    // In open sea (d > 9.0), full natural undulation
    const tDist = Math.max(0, Math.min(1, (minIslandDist - 4.8) / 4.2));
    return 0.08 + 0.92 * (tDist * tDist * (3 - 2 * tDist));
  }

  private getWaveHeight(x: number, z: number, t: number): number {
    const coastalFactor = this.getWaveCoastalFactor(x, z);

    // 4 crossed multidirectional wave trains (organic and fluid surface)
    const psi1 = (-0.7 * x - 0.7 * z) * 0.72 - t * 1.25;
    const w1 = Math.sin(psi1);

    const psi2 = (0.8 * x - 0.6 * z) * 1.15 - t * 1.65;
    const w2 = Math.sin(psi2);

    const psi3 = (-0.3 * x + 0.95 * z) * 1.85 - t * 2.40;
    const w3 = Math.sin(psi3);

    const psi4 = (0.6 * x + 0.8 * z) * 2.90 - t * 3.20;
    const w4 = Math.sin(psi4);

    return (0.045 * w1 + 0.030 * w2 + 0.018 * w3 + 0.010 * w4) * coastalFactor;
  }

  private getGerstnerWave(
    origX: number,
    origZ: number,
    t: number,
  ): { x: number; y: number; z: number; normHeight: number } {
    const coastalFactor = this.getWaveCoastalFactor(origX, origZ);

    // Fine and natural swell components without monstrous crests
    const d1x = -0.7, d1z = -0.7, k1 = 0.72, w1 = 1.25, a1 = 0.045 * coastalFactor;
    const d2x = 0.8,  d2z = -0.6, k2 = 1.15, w2 = 1.65, a2 = 0.030 * coastalFactor;
    const d3x = -0.3, d3z = 0.95, k3 = 1.85, w3 = 2.40, a3 = 0.018 * coastalFactor;
    const d4x = 0.6,  d4z = 0.8,  k4 = 2.90, w4 = 3.20, a4 = 0.010 * coastalFactor;

    const psi1 = (d1x * origX + d1z * origZ) * k1 - t * w1;
    const psi2 = (d2x * origX + d2z * origZ) * k2 - t * w2;
    const psi3 = (d3x * origX + d3z * origZ) * k3 - t * w3;
    const psi4 = (d4x * origX + d4z * origZ) * k4 - t * w4;

    const without1 = Math.sin(psi1), cos1 = Math.cos(psi1);
    const without2 = Math.sin(psi2), cos2 = Math.cos(psi2);
    const without3 = Math.sin(psi3), cos3 = Math.cos(psi3);
    const without4 = Math.sin(psi4), cos4 = Math.cos(psi4);

    // Subtle horizontal displacement that avoids abrupt folds
    const q = 0.12;
    const dispX = -q * (d1x * a1 * cos1 + d2x * a2 * cos2 + d3x * a3 * cos3 + d4x * a4 * cos4);
    const dispZ = -q * (d1z * a1 * cos1 + d2z * a2 * cos2 + d3z * a3 * cos3 + d4z * a4 * cos4);

    const height = a1 * without1 + a2 * without2 + a3 * without3 + a4 * without4;

    // Normalized height (0 in deep troughs, 1 at crests)
    const normHeight = Math.max(0, Math.min(1, (height + 0.08) / 0.16));

    return {
      x: origX + dispX,
      y: height,
      z: origZ + dispZ,
      normHeight,
    };
  }

  // -------------------------------------------------------------
  // Lighting
  // -------------------------------------------------------------
  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xfff1e6, 0.82);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffedd5, 0x0c4a6e, 0.55);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    keyLight.position.set(45, 80, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 250;
    keyLight.shadow.camera.left = -75;
    keyLight.shadow.camera.right = 75;
    keyLight.shadow.camera.top = 75;
    keyLight.shadow.camera.bottom = -75;
    keyLight.shadow.bias = 0.00015;
    keyLight.shadow.radius = 2.5;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.5);
    fillLight.position.set(-50, 55, -40);
    this.scene.add(fillLight);
  }

  // -------------------------------------------------------------
  // Wooden Table (Tabletop)
  // -------------------------------------------------------------
  private setupTable(): void {
    const tableGeom = new THREE.PlaneGeometry(400, 400);
    tableGeom.rotateX(-Math.PI / 2);

    const woodTexture = TabletopBuilder.getWoodTexture();
    const tableMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.65,
      metalness: 0.05,
    });

    this.tableMesh = new THREE.Mesh(tableGeom, tableMat);
    this.tableMesh.position.y = -1.6;
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);
  }

  // -------------------------------------------------------------
  // Procedural Cartographic Parchment Texture
  // -------------------------------------------------------------
  private static getParchmentTexture(): THREE.CanvasTexture {
    if (this.parchmentTex) return this.parchmentTex;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const grad = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
    grad.addColorStop(0, '#fef6e4');
    grad.addColorStop(0.7, '#f7e6c4');
    grad.addColorStop(1, '#e9cca0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = 'rgba(146, 64, 14, 0.12)';
    ctx.lineWidth = 1.5;
    for (let x = 64; x < 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 64; y < 1024; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, 960, 960);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(44, 44, 936, 936);

    const tex = new THREE.CanvasTexture(canvas);
    this.parchmentTex = tex;
    return tex;
  }

  // -------------------------------------------------------------
  // Procedural Fluffy Organic Haze Texture
  // -------------------------------------------------------------
  private static getFogTexture(): THREE.Texture {
    if (this.cachedFogTex) return this.cachedFogTex;

    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;

    const lobes = [
      { x: 128, y: 128, r: 85, a: 0.52 },
      { x: 95, y: 110, r: 65, a: 0.38 },
      { x: 160, y: 115, r: 68, a: 0.40 },
      { x: 115, y: 150, r: 64, a: 0.36 },
      { x: 148, y: 144, r: 62, a: 0.35 },
      { x: 88, y: 140, r: 52, a: 0.30 },
      { x: 168, y: 135, r: 54, a: 0.30 },
      { x: 130, y: 92, r: 58, a: 0.32 },
    ];

    for (const l of lobes) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(242, 247, 255, ${l.a})`);
      g.addColorStop(0.4, `rgba(232, 242, 252, ${l.a * 0.7})`);
      g.addColorStop(0.75, `rgba(215, 230, 248, ${l.a * 0.22})`);
      g.addColorStop(1, 'rgba(215, 230, 248, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    this.cachedFogTex = tex;
    return tex;
  }

  // -------------------------------------------------------------
  // Extended Great Nautical Map Board over the Table
  // -------------------------------------------------------------
  private setupMapBoard(): void {
    this.mapBoardGroup = new THREE.Group();

    const mapW = 114;
    const mapD = 82;

    // Noble wood frame / base of the map on the table
    const frameGeom = new THREE.BoxGeometry(mapW + 3, 0.8, mapD + 3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2e180d,
      roughness: 0.8,
      metalness: 0.08,
    });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.y = -0.4;
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.mapBoardGroup.add(frame);

    // Golden brass corner protectors on the 4 corners of the map
    const cornerMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.8,
    });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cornerGeom = new THREE.BoxGeometry(6.5, 0.6, 6.5);
        const corner = new THREE.Mesh(cornerGeom, cornerMat);
        corner.position.set(sx * (mapW / 2 + 0.8), -0.05, sz * (mapD / 2 + 0.8));
        corner.castShadow = true;
        this.mapBoardGroup.add(corner);
      }
    }

    // Continuous perimeter molding of antique cartographic parchment (no central seam)
    const marginMat = new THREE.MeshStandardMaterial({
      map: Archipelago3dService.getParchmentTexture(),
      roughness: 0.85,
      flatShading: true,
    });
    for (const sz of [-1, 1]) {
      const mbGeom = new THREE.BoxGeometry(mapW - 1, 0.3, 5);
      const mb = new THREE.Mesh(mbGeom, marginMat);
      mb.position.set(0, 0.05, sz * (mapD / 2 - 2.5));
      mb.receiveShadow = true;
      this.mapBoardGroup.add(mb);
    }
    for (const sx of [-1, 1]) {
      const msGeom = new THREE.BoxGeometry(5, 0.3, mapD - 1);
      const ms = new THREE.Mesh(msGeom, marginMat);
      ms.position.set(sx * (mapW / 2 - 2.5), 0.05, 0);
      ms.receiveShadow = true;
      this.mapBoardGroup.add(ms);
    }

    // No central spine or split into two pages! The water and the map extend in a continuous tapestry.

    this.scene.add(this.mapBoardGroup);
  }

  // -------------------------------------------------------------
  // Water Basin covering the whole interior sector of the book
  // -------------------------------------------------------------
  private setupPapercraftOcean(): void {
    const basinW = 104;
    const basinD = 72;

    // Seabed base at Y = 0.02 (well below the water and without intermediate planes that clip)
    const seabedGeom = new THREE.PlaneGeometry(basinW, basinD);
    seabedGeom.rotateX(-Math.PI / 2);
    const seabedMat = new THREE.MeshStandardMaterial({
      color: 0x01243a,
      roughness: 0.8,
      metalness: 0.05,
    });
    const seabedMesh = new THREE.Mesh(seabedGeom, seabedMat);
    seabedMesh.position.y = 0.02;
    seabedMesh.receiveShadow = false;
    this.scene.add(seabedMesh);

    this.oceanGeom = new THREE.PlaneGeometry(basinW, basinD, 90, 68);
    this.oceanGeom.rotateX(-Math.PI / 2);
    this.oceanOrigPositions = new Float32Array(this.oceanGeom.attributes['position'].array);

    // Initialize clean, radiant base colors (tropical cerulean blue)
    const posCount = this.oceanGeom.attributes['position'].count;
    this.oceanBaseColors = new Float32Array(posCount * 3);
    const initialColors = new Float32Array(posCount * 3);
    for (let i = 0; i < posCount; i++) {
      initialColors[i * 3] = 0.02;     // R
      initialColors[i * 3 + 1] = 0.52; // G
      initialColors[i * 3 + 2] = 0.80; // B
    }
    this.oceanBaseColors.set(initialColors);
    this.oceanGeom.setAttribute('color', new THREE.BufferAttribute(initialColors, 3));

    const oceanMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.20,
      metalness: 0.04,
      flatShading: false, // Soft, liquid shading
      transparent: false, // Sharp, crystalline and clean surface without murky transparencies
    });

    this.oceanMesh = new THREE.Mesh(this.oceanGeom, oceanMat);
    this.oceanMesh.position.y = 0.26;
    this.oceanMesh.receiveShadow = true;
    this.oceanMesh.name = 'ocean';
    this.scene.add(this.oceanMesh);

    const halfW = basinW / 2;
    const halfD = basinD / 2;
    const foamLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW, 0.29, -halfD),
      new THREE.Vector3(halfW, 0.29, -halfD),
      new THREE.Vector3(halfW, 0.29, halfD),
      new THREE.Vector3(-halfW, 0.29, halfD),
      new THREE.Vector3(-halfW, 0.29, -halfD),
    ]);
    const foamLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const foamBorder = new THREE.Line(foamLineGeom, foamLineMat);
    this.scene.add(foamBorder);

    this.wakeGroup = new THREE.Group();
    this.scene.add(this.wakeGroup);
  }

  // -------------------------------------------------------------
  // Crystalline Coastal Gradient (Turquoise Lagoons and Clean Surf)
  // -------------------------------------------------------------
  private updateOceanBaseCoastalColors(): void {
    if (!this.oceanOrigPositions || !this.oceanBaseColors || !this.oceanGeom) return;
    const posCount = this.oceanOrigPositions.length / 3;

    for (let i = 0; i < posCount; i++) {
      const ox = this.oceanOrigPositions[i * 3];
      const oz = this.oceanOrigPositions[i * 3 + 2];

      let minDist = 999;
      if (this.islands && this.islands.length > 0) {
        for (const isl of this.islands) {
          const d = Math.hypot(ox - isl.x, oz - isl.z) - (isl.radius || 4.2);
          if (d < minDist) minDist = d;
        }
      } else {
        minDist = 999;
      }

      let r: number, g: number, b: number;
      if (minDist < 0.7) {
        // Bright, clean coastal breaker around the islands (#cffafe)
        const k = Math.max(0, Math.min(1, minDist / 0.7));
        r = 0.65 - k * 0.45;
        g = 0.92 - k * 0.16;
        b = 0.98 - k * 0.03;
      } else if (minDist < 5.2) {
        // Crystalline tropical lagoon (radiant Caribbean turquoise #22d3ee to #38bdf8)
        const k = (minDist - 0.7) / 4.5;
        r = 0.20 - k * 0.18;
        g = 0.76 - k * 0.24;
        b = 0.95 - k * 0.15;
      } else {
        // Open sea: pure Mediterranean cerulean blue, crystalline and vibrant (#0284c7)
        r = 0.02;
        g = 0.52;
        b = 0.80;
      }

      const idx = i * 3;
      this.oceanBaseColors[idx] = r;
      this.oceanBaseColors[idx + 1] = g;
      this.oceanBaseColors[idx + 2] = b;
    }

    const colAttr = this.oceanGeom.attributes['color'] as THREE.BufferAttribute;
    if (colAttr) {
      (colAttr.array as Float32Array).set(this.oceanBaseColors);
      colAttr.needsUpdate = true;
    }
  }

  // -------------------------------------------------------------
  // Fluffy and Volumetric Haze on the Board's Edges
  // -------------------------------------------------------------
  private setupPerimeterFog(): void {
    const tex = Archipelago3dService.getFogTexture();
    const perimeterPoints: { x: number; z: number }[] = [];

    for (let i = 0; i < 11; i++) {
      const x = -55 + (i / 10) * 110;
      perimeterPoints.push({ x, z: -41 });
    }
    for (let i = 0; i < 11; i++) {
      const x = -55 + (i / 10) * 110;
      perimeterPoints.push({ x, z: 41 });
    }
    for (let i = 0; i < 8; i++) {
      const z = -36 + (i / 7) * 72;
      perimeterPoints.push({ x: -56, z });
    }
    for (let i = 0; i < 8; i++) {
      const z = -36 + (i / 7) * 72;
      perimeterPoints.push({ x: 56, z });
    }

    perimeterPoints.forEach((pt, idx) => {
      const sMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        rotation: (idx * 1.618 * Math.PI) % (Math.PI * 2),
      });
      const sprite = new THREE.Sprite(sMat);

      const baseScale = 9.5 + (idx % 5) * 1.5;
      const sw = baseScale * 1.35;
      const sh = baseScale * 0.85;
      sprite.scale.set(sw, sh, 1);

      const ox = pt.x + Math.sin(idx * 2.3) * 3.2;
      const oz = pt.z + Math.cos(idx * 2.3) * 3.2;
      const oy = 1.3 + ((idx * 3) % 4) * 0.35;

      sprite.position.set(ox, oy, oz);
      this.scene.add(sprite);

      this.fogPuffs.push({
        sprite,
        baseX: ox,
        baseY: oy,
        baseZ: oz,
        phase: idx * 0.7,
        rotSpeed: (0.012 + ((idx * 2) % 4) * 0.008) * (idx % 2 === 0 ? 1 : -1),
        baseScale,
      });
    });
  }

  // -------------------------------------------------------------
  // Nautical destination marker (golden beacon pin with crystal)
  // -------------------------------------------------------------
  private setupTargetMarker(): void {
    const markerGroup = new THREE.Group();

    const needle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 }),
    );
    needle.position.y = 0.7;
    markerGroup.add(needle);

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    );
    diamond.position.y = 1.6;
    markerGroup.add(diamond);

    markerGroup.position.set(0, 0.28, 0);
    markerGroup.visible = false;
    this.targetMarker = markerGroup;
    this.scene.add(markerGroup);
  }

  // -------------------------------------------------------------
  // Pointy-Topped Hexagon Shape Generator (hex-grid style)
  // -------------------------------------------------------------
  private static getHexShape(r: number): THREE.Shape {
    const key = Math.round(r * 100);
    let shape = this.hexShapeCache.get(key);
    if (shape) return shape;

    shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6; // 30° = Pointy-topped
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    this.hexShapeCache.set(key, shape);
    return shape;
  }

  // -------------------------------------------------------------
  // Construction of Mini-Islands formed by clusters of HEXAGONS
  // -------------------------------------------------------------
  private buildHexClusterIslands(sections: ArchipelagoSection[]): void {
    const n = Math.max(1, sections.length);
    const defaultPositions: THREE.Vector3[] = [];

    if (n === 1) {
      defaultPositions.push(new THREE.Vector3(0, 0, 0));
    } else if (n === 2) {
      defaultPositions.push(new THREE.Vector3(-24, 0, 0), new THREE.Vector3(24, 0, 0));
    } else if (n === 3) {
      defaultPositions.push(
        new THREE.Vector3(-26, 0, 12),
        new THREE.Vector3(-20, 0, -14),
        new THREE.Vector3(24, 0, 0),
      );
    } else if (n === 4) {
      defaultPositions.push(
        new THREE.Vector3(-28, 0, 14),
        new THREE.Vector3(-22, 0, -14),
        new THREE.Vector3(22, 0, -14),
        new THREE.Vector3(28, 0, 14),
      );
    } else if (n === 5) {
      defaultPositions.push(
        new THREE.Vector3(-28, 0, 16),
        new THREE.Vector3(-32, 0, -4),
        new THREE.Vector3(-18, 0, -16),
        new THREE.Vector3(20, 0, -14),
        new THREE.Vector3(28, 0, 14),
      );
    } else {
      const half = Math.ceil(n / 2);
      for (let i = 0; i < half; i++) {
        const frac = i / (half - 1 || 1);
        const z = 18 - frac * 36;
        const x = -24 + Math.sin(frac * Math.PI) * -8;
        defaultPositions.push(new THREE.Vector3(x, 0, z));
      }
      const remaining = n - half;
      for (let j = 0; j < remaining; j++) {
        const frac = j / (remaining - 1 || 1);
        const z = -18 + frac * 36;
        const x = 24 + Math.sin(frac * Math.PI) * 8;
        defaultPositions.push(new THREE.Vector3(x, 0, z));
      }
    }

    // Separation by physical relaxation between islands
    const islandRadius = 4.8;
    for (let iter = 0; iter < 16; iter++) {
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const dx = defaultPositions[b].x - defaultPositions[a].x;
          const dz = defaultPositions[b].z - defaultPositions[a].z;
          const dist = Math.hypot(dx, dz);
          const minRequired = islandRadius * 2 + 5.5; // Wide sea channel
          if (dist < minRequired && dist > 0.001) {
            const push = (minRequired - dist) * 0.5;
            const nx = dx / dist;
            const nz = dz / dist;
            defaultPositions[a].x -= nx * push;
            defaultPositions[a].z -= nz * push;
            defaultPositions[b].x += nx * push;
            defaultPositions[b].z += nz * push;
          }
        }
      }
      for (let k = 0; k < n; k++) {
        const p = defaultPositions[k];
        if (p.x < 0) {
          p.x = Math.max(-42, Math.min(-10, p.x));
        } else {
          p.x = Math.max(10, Math.min(42, p.x));
        }
        p.z = Math.max(-26, Math.min(26, p.z));
      }
    }

    // Build each mini-island made of hexagons
    sections.forEach((u, i) => {
      const pos = defaultPositions[i];
      const biome: Biome =
        u.biome || (i % 4 === 0 ? 'meadow' : i % 4 === 1 ? 'desert' : i % 4 === 2 ? 'snow' : 'lava');

      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);
      group.userData = { sectionId: u.id, index: i };

      // Construction of the hexagon cluster and pier
      const dockInfo = this.buildHexCluster(group, biome, i, u.complete, pos);

      this.scene.add(group);
      this.islandGroups.push(group);

      this.islands.push({
        id: u.id,
        title: u.title,
        biome,
        x: pos.x,
        z: pos.z,
        radius: islandRadius,
        dockX: dockInfo.dockWorldX,
        dockZ: dockInfo.dockWorldZ,
        dockHeading: dockInfo.dockHeading,
        group,
        complete: u.complete,
      });
    });
  }

  // -------------------------------------------------------------
  // Generation of a Hexagon Cluster per Island
  // -------------------------------------------------------------
  private buildHexCluster(
    group: THREE.Group,
    biome: Biome,
    index: number,
    complete: boolean,
    islandPos: THREE.Vector3,
  ): { dockWorldX: number; dockWorldZ: number; dockHeading: number } {
    const hexR = 1.95; // Circumscribed radius of each individual hexagon

    // Organic hexagonal cluster patterns
    const patterns: HexTileDef[][] = [
      // Pattern 0 (Marine Bay with Harbor)
      [
        { q: 0, r: 0, h: 0.45, role: 'core' },
        { q: 1, r: 0, h: 0.25, role: 'nature' },
        { q: 0, r: 1, h: 0.05, role: 'dock' },
        { q: -1, r: 1, h: 0.20, role: 'road' },
        { q: -1, r: 0, h: 0.85, role: 'peak' },
        { q: 0, r: -1, h: 0.35, role: 'nature' },
      ],
      // Pattern 1 (Elongated Spur)
      [
        { q: 0, r: 0, h: 0.50, role: 'core' },
        { q: 1, r: -1, h: 0.90, role: 'peak' },
        { q: 0, r: -1, h: 0.40, role: 'nature' },
        { q: 1, r: 0, h: 0.30, role: 'camp' },
        { q: 0, r: 1, h: 0.20, role: 'road' },
        { q: -1, r: 1, h: 0.05, role: 'dock' },
      ],
      // Pattern 2 (Raised Central Citadel)
      [
        { q: 0, r: 0, h: 0.95, role: 'peak' },
        { q: 1, r: 0, h: 0.30, role: 'nature' },
        { q: 1, r: -1, h: 0.35, role: 'camp' },
        { q: 0, r: -1, h: 0.40, role: 'nature' },
        { q: -1, r: 0, h: 0.25, role: 'road' },
        { q: -1, r: 1, h: 0.05, role: 'dock' },
        { q: 0, r: 1, h: 0.20, role: 'nature' },
      ],
      // Pattern 3 (Caldera / Volcanic Massif)
      [
        { q: 0, r: 0, h: 0.45, role: 'core' },
        { q: -1, r: 0, h: 1.10, role: 'peak' },
        { q: 0, r: -1, h: 0.80, role: 'peak' },
        { q: 1, r: -1, h: 0.35, role: 'nature' },
        { q: 1, r: 0, h: 0.20, role: 'road' },
        { q: 0, r: 1, h: 0.05, role: 'dock' },
      ],
    ];

    const cluster = patterns[index % patterns.length];

    // Colors according to the hexagon map biome
    const beachColor =
      biome === 'lava'
        ? 0x2e2a27
        : biome === 'snow'
          ? 0xcfe6f6
          : biome === 'desert'
            ? 0xfde68a
            : 0xfae8b0;

    const cliffColor =
      biome === 'meadow'
        ? 0xca6f3b // Warm terracotta / clay identical to the Kenney model
        : biome === 'desert'
          ? 0xba7032 // Canyon sandstone
          : biome === 'snow'
            ? 0x64748b // Frosted slate
            : 0x1c1917; // Volcanic basalt

    const plateColor =
      biome === 'meadow'
        ? 0x10b981 // Vibrant emerald green
        : biome === 'desert'
          ? 0xf59e0b // Golden sand
          : biome === 'snow'
            ? 0xf8fafc // White snow
            : 0x18181b; // Dark volcanic soil

    const beachMat = new THREE.MeshStandardMaterial({ color: beachColor, roughness: 0.9, flatShading: true });
    const cliffMat = new THREE.MeshStandardMaterial({ color: cliffColor, roughness: 0.85, flatShading: true });
    const plateMat = new THREE.MeshStandardMaterial({ color: plateColor, roughness: 0.75, flatShading: true });

    let dockTile = cluster.find((t) => t.role === 'dock') ?? cluster[0];

    // Central collider of the island mass
    this.islandColliders.push({
      x: islandPos.x,
      z: islandPos.z,
      r: 2.2,
    });

    // 1. Instantiate each hexagonal column of the cluster
    cluster.forEach((t) => {
      // Axial coordinates to local Cartesian coordinates (pointy-topped)
      const lx = hexR * (Math.sqrt(3) * t.q + (Math.sqrt(3) / 2) * t.r);
      const lz = hexR * (1.5 * t.r);
      const colH = 0.85 + t.h;

      // Individual collider per physical hexagon (blocks the boat's passage over land)
      if (t.role !== 'dock') {
        this.islandColliders.push({
          x: islandPos.x + lx,
          z: islandPos.z + lz,
          r: hexR * 0.95,
        });
      }

      // Sand base / Reef under the hexagon
      const baseShape = Archipelago3dService.getHexShape(hexR * 1.12);
      const baseGeom = new THREE.ExtrudeGeometry(baseShape, {
        depth: 0.35,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.1,
        bevelSegments: 1,
      });
      baseGeom.rotateX(-Math.PI / 2);
      const baseMesh = new THREE.Mesh(baseGeom, beachMat);
      baseMesh.position.set(lx, 0.27, lz);
      baseMesh.receiveShadow = true;
      group.add(baseMesh);

      // Faceted rock cliff column
      const colShape = Archipelago3dService.getHexShape(hexR * 1.0);
      const colGeom = new THREE.ExtrudeGeometry(colShape, {
        depth: colH,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.08,
        bevelSegments: 1,
      });
      colGeom.rotateX(-Math.PI / 2);
      const colMesh = new THREE.Mesh(colGeom, cliffMat);
      colMesh.position.set(lx, 0.50, lz);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      group.add(colMesh);

      // Top cap of the biome (grass / sand / snow / lava)
      const capShape = Archipelago3dService.getHexShape(hexR * 0.96);
      const capGeom = new THREE.ExtrudeGeometry(capShape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 1,
      });
      capGeom.rotateX(-Math.PI / 2);
      const capMesh = new THREE.Mesh(capGeom, plateMat);
      capMesh.position.set(lx, 0.50 + colH, lz);
      capMesh.castShadow = true;
      capMesh.receiveShadow = true;
      group.add(capMesh);

      // 2. Place thematic assets and decorations on the hexagons
      const topY = 0.50 + colH + 0.22;
      this.populateHexTile(group, biome, t, lx, topY, lz, complete);
    });

    // 3. Foolproof selection of the coastal hexagon and direction toward the open sea (without colliding with other hexagons)
    const hexDirs: { dq: number; dr: number; edx: number; edz: number }[] = [
      { dq: 1, dr: 0, edx: Math.sqrt(3), edz: 0 },
      { dq: 0, dr: 1, edx: Math.sqrt(3) / 2, edz: 1.5 },
      { dq: -1, dr: 1, edx: -Math.sqrt(3) / 2, edz: 1.5 },
      { dq: -1, dr: 0, edx: -Math.sqrt(3), edz: 0 },
      { dq: 0, dr: -1, edx: -Math.sqrt(3) / 2, edz: -1.5 },
      { dq: 1, dr: -1, edx: Math.sqrt(3) / 2, edz: -1.5 },
    ];

    // Desired vector toward the central navigation channel
    const channelTargetX = islandPos.x < 0 ? 1 : -1;
    const channelTargetZ = -islandPos.z * 0.4;
    const channelDist = Math.hypot(channelTargetX, channelTargetZ) || 1;
    const ncdX = channelTargetX / channelDist;
    const ncdZ = channelTargetZ / channelDist;

    interface DockCandidate {
      tile: HexTileDef;
      lx: number;
      lz: number;
      normX: number;
      normZ: number;
      angle: number;
      score: number;
    }

    const candidates: DockCandidate[] = [];

    cluster.forEach((tile) => {
      const lx = hexR * (Math.sqrt(3) * tile.q + (Math.sqrt(3) / 2) * tile.r);
      const lz = hexR * (1.5 * tile.r);

      hexDirs.forEach((dir) => {
        const neighborExists = cluster.some((other) => other.q === tile.q + dir.dq && other.r === tile.r + dir.dr);
        if (neighborExists) return;

        const dirLen = Math.hypot(dir.edx, dir.edz);
        const normX = dir.edx / dirLen;
        const normZ = dir.edz / dirLen;

        // Check that the pier's trajectory is completely free of any other hexagon
        let clear = true;
        for (const dist of [1.5, 2.8, 4.0]) {
          const testX = lx + normX * (hexR * 0.95 + dist);
          const testZ = lz + normZ * (hexR * 0.95 + dist);
          for (const other of cluster) {
            const olx = hexR * (Math.sqrt(3) * other.q + (Math.sqrt(3) / 2) * other.r);
            const olz = hexR * (1.5 * other.r);
            if (Math.hypot(testX - olx, testZ - olz) < hexR * 1.05) {
              clear = false;
              break;
            }
          }
          if (!clear) break;
        }

        if (clear) {
          // Score: alignment with the central channel + preference for low-elevation hexagons
          const alignment = normX * ncdX + normZ * ncdZ;
          const heightPenalty = tile.h * 0.4;
          const score = alignment - heightPenalty;
          candidates.push({
            tile,
            lx,
            lz,
            normX,
            normZ,
            angle: Math.atan2(normX, normZ),
            score,
          });
        }
      });
    });

    candidates.sort((a, b) => b.score - a.score);

    const bestDock = candidates[0] ?? {
      tile: dockTile,
      lx: hexR * (Math.sqrt(3) * dockTile.q + (Math.sqrt(3) / 2) * dockTile.r),
      lz: hexR * (1.5 * dockTile.r),
      normX: ncdX,
      normZ: ncdZ,
      angle: Math.atan2(ncdX, ncdZ),
      score: 0,
    };

    const pierLength = 2.8;
    const pierStartX = bestDock.lx + bestDock.normX * (hexR * 0.92);
    const pierStartZ = bestDock.lz + bestDock.normZ * (hexR * 0.92);
    const dockAngle = bestDock.angle;

    this.buildRusticDockAt(group, pierStartX, pierStartZ, dockAngle);

    // Absolute docking coordinates of the little boat in front of the pier
    const dockWorldX = islandPos.x + pierStartX + Math.sin(dockAngle) * (pierLength + 1.2);
    const dockWorldZ = islandPos.z + pierStartZ + Math.cos(dockAngle) * (pierLength + 1.2);

    return {
      dockWorldX,
      dockWorldZ,
      dockHeading: dockAngle + Math.PI,
    };
  }

  // -------------------------------------------------------------
  // Decoration of each Hexagon according to its Role and Biome
  // -------------------------------------------------------------
  private populateHexTile(
    group: THREE.Group,
    biome: Biome,
    tile: HexTileDef,
    x: number,
    y: number,
    z: number,
    complete: boolean,
  ): void {
    if (tile.role === 'peak') {
      if (biome === 'meadow') {
        // Medieval stone watchtower with battlements and a flag
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.85, 2.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8, flatShading: true }),
        );
        tower.position.set(x, y + 1.1, z);
        tower.castShadow = true;
        group.add(tower);

        // Battlements
        const battlement = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.9, 0.4, 6),
          new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true }),
        );
        battlement.position.set(x, y + 2.3, z);
        battlement.castShadow = true;
        group.add(battlement);

        // Pole and blue / green flag
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x78350f }),
        );
        pole.position.set(x, y + 2.9, z);
        group.add(pole);

        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.35, 0.04),
          new THREE.MeshStandardMaterial({ color: complete ? 0x10b981 : 0x2563eb, flatShading: true }),
        );
        flag.position.set(x + 0.25, y + 3.2, z);
        group.add(flag);
      } else if (biome === 'desert') {
        // Stepped sandstone pyramid
        const pyrMat = new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true, roughness: 0.85 });
        for (let s = 0; s < 3; s++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(2.1 - s * 0.6, 0.45, 2.1 - s * 0.6), pyrMat);
          step.position.set(x, y + 0.22 + s * 0.42, z);
          step.castShadow = true;
          group.add(step);
        }
      } else if (biome === 'snow') {
        // Crystalline glacier peak
        const iceMat = new THREE.MeshStandardMaterial({
          color: 0xbae6fd,
          roughness: 0.2,
          metalness: 0.3,
          flatShading: true,
        });
        const peak = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), iceMat);
        peak.position.set(x, y + 1.2, z);
        peak.castShadow = true;
        group.add(peak);
      } else {
        // Lava island volcano with the hexagon map's volcano.glb asset
        const volHolder = new THREE.Group();
        volHolder.position.set(x, y, z);
        group.add(volHolder);

        // Burning magma in the upper crater
        const magma = new THREE.Mesh(
          new THREE.CircleGeometry(0.5, 6),
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xea580c,
            emissiveIntensity: 1.5,
            roughness: 0.25,
          }),
        );
        magma.rotateX(-Math.PI / 2);
        magma.position.set(0, 1.72, 0);
        volHolder.add(magma);

        // Pulsing magma point light
        const vl = new THREE.PointLight(0xf97316, 1.6, 16);
        vl.position.set(0, 1.88, 0);
        volHolder.add(vl);
        this.volcanoLights.push({ light: vl, baseIntensity: 1.6 });

        if (this.volcanoTemplate) {
          const vol = SkeletonUtils.clone(this.volcanoTemplate) as THREE.Group;
          vol.position.set(0, 0.614, 0);
          vol.scale.setScalar(2.0);
          vol.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          volHolder.add(vol);
        } else {
          // Temporary placeholder while the volcano.glb asset loads
          const placeholder = new THREE.Mesh(
            new THREE.ConeGeometry(1.6, 2.2, 7),
            new THREE.MeshStandardMaterial({ color: 0x1c1917, flatShading: true, roughness: 0.9 }),
          );
          placeholder.position.set(0, 1.1, 0);
          placeholder.castShadow = true;
          volHolder.add(placeholder);
          this.volcanoHolders.push({ holder: volHolder, placeholder });
        }
      }
    } else if (tile.role === 'nature') {
      if (biome === 'meadow') {
        this.addKenneyPine(group, x - 0.4, y, z - 0.3, 1.2);
        this.addKenneyRoundTree(group, x + 0.4, y, z + 0.2, 1.0);
      } else if (biome === 'desert') {
        this.addKenneyPalm(group, x, y, z, 1.15);
      } else if (biome === 'snow') {
        this.addKenneyPine(group, x - 0.3, y, z - 0.2, 1.2, true);
        this.addKenneyPine(group, x + 0.4, y, z + 0.3, 0.9, true);
      } else {
        // Basalt rocks
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.55, 0),
          new THREE.MeshStandardMaterial({ color: 0x27272a, flatShading: true }),
        );
        rock.position.set(x, y + 0.4, z);
        rock.castShadow = true;
        group.add(rock);
      }
    } else if (tile.role === 'camp') {
      this.addCampTent(group, x, y, z);
    } else if (tile.role === 'road') {
      // Dirt path / cobblestones connecting the hexagon
      const pathMat = new THREE.MeshStandardMaterial({
        color: biome === 'snow' ? 0x94a3b8 : 0x78350f,
        roughness: 0.9,
        flatShading: true,
      });
      const path = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 1.6), pathMat);
      path.position.set(x, y + 0.04, z);
      path.rotation.y = 0.4;
      group.add(path);
    } else if (tile.role === 'core' && biome === 'meadow') {
      // Windmill on the secondary hexagon
      const millBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 1.8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
      );
      millBase.position.set(x, y + 0.9, z);
      millBase.castShadow = true;
      group.add(millBase);

      const millRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 0.75, 6),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, flatShading: true }),
      );
      millRoof.position.set(x, y + 2.15, z);
      millRoof.castShadow = true;
      group.add(millRoof);

      const bladesGroup = new THREE.Group();
      bladesGroup.position.set(x, y + 1.6, z + 0.58);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, flatShading: true });
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.04), bladeMat);
        blade.position.y = 0.65;
        blade.rotation.z = (i * Math.PI) / 2;
        bladesGroup.add(blade);
      }
      group.add(bladesGroup);
      this.windmills.push({ blades: bladesGroup });
    }
  }

  // -------------------------------------------------------------
  // Rustic Wooden Pier attached to the edge of a Hexagon (No X)
  // -------------------------------------------------------------
  private buildRusticDockAt(group: THREE.Group, startX: number, startZ: number, dockAngle: number): void {
    const dockGroup = new THREE.Group();
    dockGroup.position.set(startX, 0.62, startZ);
    dockGroup.rotation.y = dockAngle;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.85,
      flatShading: true,
    });

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
      flatShading: true,
    });

    // Ramp / connection plank toward the hexagon's terrain
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.2), woodMat);
    ramp.position.set(0, -0.04, -0.4);
    ramp.rotation.x = -0.12;
    ramp.receiveShadow = true;
    dockGroup.add(ramp);

    // Lower main support beams
    for (const bx of [-0.55, 0.55]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 2.9), darkWoodMat);
      beam.position.set(bx, -0.12, 1.45);
      dockGroup.add(beam);
    }

    // Main deck of wooden planks
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 2.8), woodMat);
    deck.position.set(0, 0, 1.4);
    deck.castShadow = true;
    deck.receiveShadow = true;
    dockGroup.add(deck);

    // Wooden piles sinking into the seabed under the water
    for (const sx of [-0.62, 0.62]) {
      for (const sz of [0.4, 1.5, 2.6]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.5, 6), darkWoodMat);
        post.position.set(sx, -0.55, sz);
        post.castShadow = true;
        dockGroup.add(post);

        // Pile head protruding above the pier
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 6), darkWoodMat);
        cap.position.set(sx, 0.18, sz);
        dockGroup.add(cap);
      }
    }

    // Nautical wooden mooring bollards with rope at the tip of the pier (without the X cross)
    for (const bx of [-0.48, 0.48]) {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.42, 6),
        darkWoodMat,
      );
      bollard.position.set(bx, 0.28, 2.45);
      bollard.castShadow = true;
      dockGroup.add(bollard);

      // Hemp rope coiled on the bollard
      const rope = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.035, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.95 }),
      );
      rope.rotation.x = Math.PI / 2;
      rope.position.set(bx, 0.20, 2.45);
      dockGroup.add(rope);
    }

    // Post with a nautical lantern on the outer corner
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6), darkWoodMat);
    pole.position.set(-0.62, 0.70, 2.6);
    dockGroup.add(pole);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.36, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.95,
        flatShading: true,
      }),
    );
    lantern.position.set(-0.62, 1.35, 2.6);
    dockGroup.add(lantern);

    group.add(dockGroup);
  }

  // -------------------------------------------------------------
  // Kenney-style Prop Helpers (Trees, Palms, Tents)
  // -------------------------------------------------------------
  private addCampTent(group: THREE.Group, x: number, y: number, z: number): void {
    const tentGeom = new THREE.ConeGeometry(0.85, 1.1, 4);
    tentGeom.rotateY(Math.PI / 4);
    const tentMat = new THREE.MeshStandardMaterial({ color: 0xef4444, flatShading: true });
    const tent = new THREE.Mesh(tentGeom, tentMat);
    tent.position.set(x, y + 0.55, z);
    tent.castShadow = true;
    group.add(tent);
  }

  private addKenneyPine(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    scale = 1.0,
    snow = false,
  ): void {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, y, z);
    pGroup.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.65, 5),
      new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true }),
    );
    trunk.position.y = 0.32;
    trunk.castShadow = true;
    pGroup.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({
      color: snow ? 0xe2e8f0 : 0x059669,
      flatShading: true,
    });
    for (let c = 0; c < 3; c++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.65 - c * 0.15, 0.65, 6), leafMat);
      cone.position.y = 0.6 + c * 0.42;
      cone.castShadow = true;
      pGroup.add(cone);
    }
    group.add(pGroup);
  }

  private addKenneyRoundTree(group: THREE.Group, x: number, y: number, z: number, scale = 1.0): void {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, y, z);
    tGroup.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.75, 5),
      new THREE.MeshStandardMaterial({ color: 0x78350f, flatShading: true }),
    );
    trunk.position.y = 0.38;
    tGroup.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({ color: 0x10b981, flatShading: true }),
    );
    foliage.position.y = 0.95;
    foliage.castShadow = true;
    tGroup.add(foliage);

    group.add(tGroup);
  }

  private addKenneyPalm(group: THREE.Group, x: number, y: number, z: number, scale = 1.0): void {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, y, z);
    pGroup.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xa16207, flatShading: true });
    for (let s = 0; s < 4; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.11 - s * 0.015, 0.13 - s * 0.015, 0.42, 5), trunkMat);
      seg.position.set(Math.sin(s * 0.3) * 0.07, 0.21 + s * 0.38, 0);
      seg.rotation.z = -0.07;
      pGroup.add(seg);
    }

    const frondMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, flatShading: true, side: THREE.DoubleSide });
    for (let f = 0; f < 5; f++) {
      const angle = (f / 5) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 3), frondMat);
      frond.position.set(Math.cos(angle) * 0.38, 1.7, Math.sin(angle) * 0.38);
      frond.rotation.z = Math.cos(angle) * 0.8;
      frond.rotation.x = Math.sin(angle) * 0.8;
      pGroup.add(frond);
    }
    group.add(pGroup);
  }

  // -------------------------------------------------------------
  // Dotted Nautical Treasure Routes (Pure line without spheres or buoys)
  // -------------------------------------------------------------
  private setupTreasureRoutes(): void {
    if (this.islands.length < 2) return;

    for (let i = 0; i < this.islands.length - 1; i++) {
      const a = this.islands[i];
      const b = this.islands[i + 1];

      const start = new THREE.Vector3(a.dockX, 0.32, a.dockZ);
      const end = new THREE.Vector3(b.dockX, 0.32, b.dockZ);
      const mid = new THREE.Vector3((start.x + end.x) / 2, 0.32, (start.z + end.z) / 2);

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const pts = curve.getPoints(20);

      const routeGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const routeMat = new THREE.LineDashedMaterial({
        color: 0xc2410c,
        dashSize: 1.2,
        gapSize: 0.8,
      });
      const routeLine = new THREE.Line(routeGeom, routeMat);
      routeLine.computeLineDistances();
      this.routesGroup.add(routeLine);
    }
  }

  // -------------------------------------------------------------
  // 3D Boat (ship-large.glb) and Navigation
  // -------------------------------------------------------------
  private setupBoat(): void {
    this.boatGroup = new THREE.Group();
    this.scene.add(this.boatGroup);

    // Procedural placeholder while the 3D GLB model finishes loading
    this.boatPlaceholder = this.createBoatPlaceholder();
    this.boatGroup.add(this.boatPlaceholder);

    // Load 3D model ship-large.glb (frontend/public/world-3d/Assets/Vehicles/ship-large.glb)
    this.loadShipModel();
  }

  private createBoatPlaceholder(): THREE.Group {
    const holder = new THREE.Group();

    // Faceted noble wood hull
    const hullGeom = new THREE.BufferGeometry();
    const hullVertices = new Float32Array([
      0, -0.3, 1.9,
      0.75, 0.45, 0.4,
      -0.75, 0.45, 0.4,
      0, -0.3, 1.9,
      -0.75, 0.45, 0.4,
      0, 0.5, 2.0,
      0, -0.3, 1.9,
      0, 0.5, 2.0,
      0.75, 0.45, 0.4,
      0.65, 0.45, -1.5,
      -0.65, 0.45, -1.5,
      0, -0.25, -1.4,
      0, -0.25, -1.4,
      0.65, 0.45, -1.5,
      0.75, 0.45, 0.4,
      0, -0.25, -1.4,
      -0.75, 0.45, 0.4,
      -0.65, 0.45, -1.5,
    ]);
    hullGeom.setAttribute('position', new THREE.BufferAttribute(hullVertices, 3));
    hullGeom.computeVertexNormals();

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.75,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const hull = new THREE.Mesh(hullGeom, hullMat);
    hull.castShadow = true;
    holder.add(hull);

    // Noble wood inner deck
    const deckGeom = new THREE.BufferGeometry();
    const deckVertices = new Float32Array([
      0, 0.44, 2.0,
      -0.75, 0.44, 0.4,
      0.75, 0.44, 0.4,
      -0.75, 0.44, 0.4,
      -0.65, 0.44, -1.5,
      0.75, 0.44, 0.4,
      0.75, 0.44, 0.4,
      -0.65, 0.44, -1.5,
      0.65, 0.44, -1.5,
    ]);
    deckGeom.setAttribute('position', new THREE.BufferAttribute(deckVertices, 3));
    deckGeom.computeVertexNormals();
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x6b3b14,
      roughness: 0.8,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const boatDeck = new THREE.Mesh(deckGeom, deckMat);
    boatDeck.receiveShadow = true;
    holder.add(boatDeck);

    // Mast
    const mastGeom = new THREE.CylinderGeometry(0.08, 0.11, 4.4, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const mast = new THREE.Mesh(mastGeom, mastMat);
    mast.position.set(0, 2.1, 0.15);
    mast.castShadow = true;
    holder.add(mast);

    // Main sail
    const sailMainGeom = new THREE.BufferGeometry();
    const sailVertices = new Float32Array([
      0, 4.2, 0.15,
      0, 1.2, 0.15,
      1.8, 1.4, 0.1,
      0, 4.2, 0.15,
      1.8, 1.4, 0.1,
      0, 1.2, 0.15,
    ]);
    sailMainGeom.setAttribute('position', new THREE.BufferAttribute(sailVertices, 3));
    sailMainGeom.computeVertexNormals();

    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const sailMain = new THREE.Mesh(sailMainGeom, sailMat);
    sailMain.castShadow = true;
    holder.add(sailMain);

    // Jib / Bow sail
    const jibGeom = new THREE.BufferGeometry();
    const jibVertices = new Float32Array([
      0, 3.6, 0.2,
      0, 1.1, 1.5,
      0, 1.2, 0.2,
      0, 3.6, 0.2,
      0, 1.2, 0.2,
      0, 1.1, 1.5,
    ]);
    jibGeom.setAttribute('position', new THREE.BufferAttribute(jibVertices, 3));
    jibGeom.computeVertexNormals();
    const jib = new THREE.Mesh(jibGeom, sailMat);
    jib.castShadow = true;
    holder.add(jib);

    // Pennant
    const pennant = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.75, 3),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, flatShading: true }),
    );
    pennant.rotateZ(-Math.PI / 2);
    pennant.position.set(0.38, 4.3, 0.15);
    holder.add(pennant);

    return holder;
  }

  private async loadShipModel(): Promise<void> {
    try {
      // Load the pirate fleet's specific colormap texture (Kenney pirate kit)
      const textureLoader = new THREE.TextureLoader();
      const colormapTex = await new Promise<THREE.Texture | null>((resolve) => {
        textureLoader.load(
          '/world-3d/Assets/Vehicles/Textures/colormap.png',
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            resolve(tex);
          },
          undefined,
          () => resolve(null),
        );
      });

      const gltf = await this.loadGltfSafe(
        '/world-3d/Assets/Vehicles/ship-large.glb',
        'world-3d/Assets/Vehicles/ship-large.glb',
      );
      if (!this.running || !this.scene) return;

      const shipScene = gltf.scene;
      if (!shipScene) return;

      // Scale and position to align the waterline with the ocean
      shipScene.scale.setScalar(0.28);
      shipScene.position.set(0, -0.32, 0);

      shipScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;

          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                if (colormapTex) {
                  m.map = colormapTex;
                } else if (m.map) {
                  m.map.colorSpace = THREE.SRGBColorSpace;
                  m.map.flipY = false;
                }
                m.side = THREE.DoubleSide;
                m.roughness = 0.85;
                m.metalness = 0.05;
                m.needsUpdate = true;
              }
            });
          }
        }
      });

      // Remove and free the procedural placeholder
      if (this.boatPlaceholder) {
        this.boatGroup.remove(this.boatPlaceholder);
        this.boatPlaceholder.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            (c as THREE.Mesh).geometry?.dispose();
            const mat = (c as THREE.Mesh).material;
            if (Array.isArray(mat)) {
              mat.forEach((m) => m.dispose());
            } else {
              mat?.dispose();
            }
          }
        });
        this.boatPlaceholder = null;
      }

      this.boatModel = shipScene;
      this.boatGroup.add(shipScene);
    } catch (err) {
      console.warn('[Archipelago3D] Could not load ship-large.glb, keeping the procedural boat:', err);
    }
  }

  // -------------------------------------------------------------
  // Render and Animation Loop
  // -------------------------------------------------------------
  private loop = (time: number): void => {
    if (!this.running) return;

    const t = time * 0.001;
    const dt = 0.016;

    // 1. Crystalline Sea Wave Dynamics (Fluid physical movement and sun glints on crests)
    const pos = this.oceanGeom.attributes['position'] as THREE.BufferAttribute;
    const colAttr = this.oceanGeom.attributes['color'] as THREE.BufferAttribute;
    const colors = colAttr.array as Float32Array;

    if (this.oceanOrigPositions && this.oceanBaseColors) {
      for (let i = 0; i < pos.count; i++) {
        const ox = this.oceanOrigPositions[i * 3];
        const oz = this.oceanOrigPositions[i * 3 + 2];
        const { x, y, z, normHeight } = this.getGerstnerWave(ox, oz, t);
        pos.setXYZ(i, x, y, z);

        const idx = i * 3;
        const baseR = this.oceanBaseColors[idx];
        const baseG = this.oceanBaseColors[idx + 1];
        const baseB = this.oceanBaseColors[idx + 2];

        // Clean sun glint on the crests (never darkening the water troughs)
        if (normHeight > 0.80) {
          const glint = ((normHeight - 0.80) / 0.20) * 0.18;
          colors[idx] = Math.min(1.0, baseR + glint * 1.1);
          colors[idx + 1] = Math.min(1.0, baseG + glint * 0.9);
          colors[idx + 2] = Math.min(1.0, baseB + glint * 0.6);
        } else {
          colors[idx] = baseR;
          colors[idx + 1] = baseG;
          colors[idx + 2] = baseB;
        }
      }
      pos.needsUpdate = true;
      colAttr.needsUpdate = true;
      this.oceanGeom.computeVertexNormals();
    }

    // 2. Fluffy Haze on the Edges (Floating, oscillating mist)
    for (const f of this.fogPuffs) {
      f.sprite.position.x = f.baseX + Math.sin(t * 0.3 + f.phase) * 0.8;
      f.sprite.position.y = f.baseY + Math.cos(t * 0.45 + f.phase) * 0.2;
      f.sprite.position.z = f.baseZ + Math.sin(t * 0.25 + f.phase) * 0.5;
      const s = f.baseScale * (1 + Math.sin(t * 0.5 + f.phase) * 0.05);
      f.sprite.scale.set(s * 1.35, s * 0.85, 1);
      (f.sprite.material as THREE.SpriteMaterial).rotation += f.rotSpeed * dt;
    }

    // 3. Windmill blades
    for (const wm of this.windmills) {
      wm.blades.rotation.z += 0.007;
    }

    // 4. Magma pulse on volcanoes
    for (const vl of this.volcanoLights) {
      vl.light.intensity = vl.baseIntensity + Math.sin(t * 1.5) * 0.5;
    }

    // 5. Smooth elevation and scale on hover over an island
    for (const group of this.islandGroups) {
      const isHovered = group.userData['sectionId'] === this.currentHoveredId;
      const targetScale = isHovered ? 1.06 : 1.0;
      const targetY = isHovered ? 0.45 : 0.0;
      group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);
      group.position.y += (targetY - group.position.y) * 0.14;
    }

    // 6. Marine and aerial fauna (Seagulls, Dolphins and a Whale with a water spout)
    this.updateWildlife(t, dt);

    // 7. Nautical destination marker
    if (this.targetMarker.visible) {
      this.targetMarker.rotation.y += 0.025;
      this.targetMarker.position.y = 0.35 + this.getWaveHeight(this.targetMarker.position.x, this.targetMarker.position.z, t);
    }

    // 8. Physical navigation of the little boat over the swell
    this.updateBoatNavigation(t);

    // 9. V-shaped water wake
    this.updateWake(t);

    this.renderer.render(this.scene, this.camera);
    this.animId = requestAnimationFrame(this.loop);
  };

  // -------------------------------------------------------------
  // Little Boat Movement with Physical Tilt from Waves
  // -------------------------------------------------------------
  private updateBoatNavigation(t: number): void {
    const dt = 0.016;

    if (this.mouseTarget) {
      this.isSailing = true;
      const dx = this.mouseTarget.x - this.boatPos.x;
      const dz = this.mouseTarget.z - this.boatPos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 1.2) {
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - this.boatHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.boatHeading += diff * 0.12;

        const targetSpeed = Math.min(10.5, Math.max(2.0, dist * 0.85));
        this.boatSpeed += (targetSpeed - this.boatSpeed) * 0.08;

        this.boatPos.x += Math.sin(this.boatHeading) * this.boatSpeed * dt;
        this.boatPos.z += Math.cos(this.boatHeading) * this.boatSpeed * dt;

        for (const isl of this.islands) {
          const distDock = Math.hypot(this.boatPos.x - isl.dockX, this.boatPos.z - isl.dockZ);
          if (distDock < 3.8 && this.currentDockedId !== isl.id) {
            this.currentDockedId = isl.id;
            this.callbacks?.onDock(isl.id);
          }
        }
      } else {
        this.boatSpeed *= 0.85;
        if (this.boatSpeed < 0.1) {
          this.boatSpeed = 0;
          this.mouseTarget = null;
          this.targetMarker.visible = false;
          this.isSailing = false;
        }
      }
    } else if (this.autoPilotTarget && this.autoPilotPath.length > 0) {
      this.isSailing = true;
      const targetWp = this.autoPilotPath[this.autoPilotIndex];

      if (targetWp) {
        const dx = targetWp.x - this.boatPos.x;
        const dz = targetWp.z - this.boatPos.z;
        const distReal = Math.hypot(dx, dz);

        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - this.boatHeading;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.boatHeading += diff * 0.12;

        const remainingToFinal = Math.hypot(
          this.autoPilotTarget.dockX - this.boatPos.x,
          this.autoPilotTarget.dockZ - this.boatPos.z,
        );
        const desiredSpeed = Math.min(10.0, Math.max(2.0, remainingToFinal * 0.85));
        this.boatSpeed += (desiredSpeed - this.boatSpeed) * 0.08;

        this.boatPos.x += Math.sin(this.boatHeading) * this.boatSpeed * dt;
        this.boatPos.z += Math.cos(this.boatHeading) * this.boatSpeed * dt;

        if (distReal < 2.5) {
          this.autoPilotIndex++;
          if (this.autoPilotIndex >= this.autoPilotPath.length) {
            this.currentDockedId = this.autoPilotTarget.id;
            this.boatPos.set(this.autoPilotTarget.dockX, 0.44, this.autoPilotTarget.dockZ);
            this.boatHeading = this.autoPilotTarget.dockHeading;
            this.boatSpeed = 0;
            this.isSailing = false;
            const dockedIslandId = this.autoPilotTarget.id;
            this.autoPilotTarget = null;
            this.autoPilotPath = [];

            this.callbacks?.onDock(dockedIslandId);
            if (this.onDockCallback) {
              const cb = this.onDockCallback;
              this.onDockCallback = null;
              this.ngZone.run(() => cb());
            }
          }
        }
      }
    } else if (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right) {
      this.isSailing = true;
      if (this.keys.left) this.boatHeading += 2.0 * dt;
      if (this.keys.right) this.boatHeading -= 2.0 * dt;

      if (this.keys.forward) {
        this.boatSpeed = Math.min(10.5, this.boatSpeed + 14 * dt);
      } else if (this.keys.backward) {
        this.boatSpeed = Math.max(-4, this.boatSpeed - 10 * dt);
      } else {
        this.boatSpeed *= 0.94;
      }

      this.boatPos.x += Math.sin(this.boatHeading) * this.boatSpeed * dt;
      this.boatPos.z += Math.cos(this.boatHeading) * this.boatSpeed * dt;
    } else {
      this.boatSpeed = 0;
      this.isSailing = false;
    }

    this.boatPos.x = Math.max(-48, Math.min(48, this.boatPos.x));
    this.boatPos.z = Math.max(-33, Math.min(33, this.boatPos.z));

    // Physical collision resolution against islands (prevents the boat from penetrating or crossing land)
    this.resolveBoatCollisions();

    const waveH = this.getWaveHeight(this.boatPos.x, this.boatPos.z, t);
    const delta = 1.0;
    const waveHX = this.getWaveHeight(this.boatPos.x + delta, this.boatPos.z, t);
    const waveHZ = this.getWaveHeight(this.boatPos.x, this.boatPos.z + delta, t);
    const slopeX = (waveHX - waveH) / delta;
    const slopeZ = (waveHZ - waveH) / delta;

    const pitch = Math.max(-0.16, Math.min(0.16, -slopeZ * 0.35 + (this.boatSpeed > 0 ? -0.03 : 0)));
    const roll = Math.max(-0.14, Math.min(0.14, -slopeX * 0.35));

    this.boatGroup.position.set(this.boatPos.x, 0.44 + waveH, this.boatPos.z);
    this.boatGroup.rotation.y = this.boatHeading;
    this.boatGroup.rotation.x = pitch;
    this.boatGroup.rotation.z = roll;

    const camTargetX = this.boatPos.x * 0.2;
    const camTargetZ = this.boatPos.z * 0.2;
    this.camera.position.x += (camTargetX - this.camera.position.x) * 0.04;
    this.camera.position.z += (62 + camTargetZ - this.camera.position.z) * 0.04;
    this.camera.lookAt(camTargetX, 0, camTargetZ);
  }

  // -------------------------------------------------------------
  // V-shaped Water Wake
  // -------------------------------------------------------------
  private updateWake(t: number): void {
    if (Math.abs(this.boatSpeed) > 1.2 && t - this.lastWakeTime > 0.08) {
      this.lastWakeTime = t;

      for (const side of [-1, 1]) {
        const streakGeom = new THREE.PlaneGeometry(0.25, 1.1);
        streakGeom.rotateX(-Math.PI / 2);
        const streakMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        });
        const streak = new THREE.Mesh(streakGeom, streakMat);
        const heading = this.boatHeading;
        const angle = heading + (side * Math.PI) / 6;
        streak.rotation.y = angle;

        const waveH = this.getWaveHeight(this.boatPos.x, this.boatPos.z, t);
        streak.position.set(
          this.boatPos.x - Math.sin(heading) * 1.5 + side * Math.cos(heading) * 0.55,
          0.29 + waveH,
          this.boatPos.z - Math.cos(heading) * 1.5 - side * Math.sin(heading) * 0.55,
        );

        this.wakeGroup.add(streak);
        this.wakeParticles.push({ mesh: streak, life: 0, maxLife: 0.85 });
      }
    }

    for (let i = this.wakeParticles.length - 1; i >= 0; i--) {
      const wp = this.wakeParticles[i];
      wp.life += 0.016;
      const progress = wp.life / wp.maxLife;

      if (progress >= 1.0) {
        this.wakeGroup.remove(wp.mesh);
        wp.mesh.geometry.dispose();
        (wp.mesh.material as THREE.Material).dispose();
        this.wakeParticles.splice(i, 1);
      } else {
        const scale = 1.0 + progress * 1.5;
        wp.mesh.scale.set(scale, 1, scale);
        (wp.mesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.55;
      }
    }
  }

  // -------------------------------------------------------------
  // Physical Collision Resolution of the Little Boat with the Islands
  // -------------------------------------------------------------
  private resolveBoatCollisions(): void {
    const boatRadius = 1.25;
    for (const col of this.islandColliders) {
      const dx = this.boatPos.x - col.x;
      const dz = this.boatPos.z - col.z;
      const minDist = col.r + boatRadius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        // Gently push the boat out of the land
        this.boatPos.x += nx * overlap;
        this.boatPos.z += nz * overlap;

        // Tangential sliding: if it advanced head-on into the rock, dampen speed
        const hx = Math.sin(this.boatHeading);
        const hz = Math.cos(this.boatHeading);
        const forwardDotObstacle = hx * (-nx) + hz * (-nz);
        if (forwardDotObstacle > 0) {
          this.boatSpeed *= Math.max(0, 1 - forwardDotObstacle * 0.75);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Creation of Low-Poly Fauna Models (Seagulls, Dolphins and Whale)
  // -------------------------------------------------------------
  private createSeagullMesh(): { group: THREE.Group; wingL: THREE.Group; wingR: THREE.Group } {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.7,
      flatShading: true,
    });
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6,
      flatShading: true,
    });
    const wingTipMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      flatShading: true,
    });

    // Fuselage
    const bodyGeom = new THREE.ConeGeometry(0.18, 0.95, 4);
    bodyGeom.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Yellow beak
    const beakGeom = new THREE.ConeGeometry(0.07, 0.32, 4);
    beakGeom.rotateX(-Math.PI / 2);
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(0, 0.02, 0.58);
    group.add(beak);

    // Tail
    const tailGeom = new THREE.BoxGeometry(0.25, 0.02, 0.35);
    const tail = new THREE.Mesh(tailGeom, wingTipMat);
    tail.position.set(0, 0.03, -0.48);
    group.add(tail);

    // Left wing with pivot at the root
    const wingL = new THREE.Group();
    wingL.position.set(-0.12, 0.06, 0.05);

    const wingBladeGeomL = new THREE.BoxGeometry(0.85, 0.025, 0.3);
    const wingBladeL = new THREE.Mesh(wingBladeGeomL, bodyMat);
    wingBladeL.position.set(-0.42, 0, 0);
    wingBladeL.castShadow = true;
    wingL.add(wingBladeL);

    const tipGeomL = new THREE.BoxGeometry(0.24, 0.026, 0.22);
    const tipL = new THREE.Mesh(tipGeomL, wingTipMat);
    tipL.position.set(-0.84, 0, -0.04);
    wingL.add(tipL);

    group.add(wingL);

    // Right wing with pivot at the root
    const wingR = new THREE.Group();
    wingR.position.set(0.12, 0.06, 0.05);

    const wingBladeGeomR = new THREE.BoxGeometry(0.85, 0.025, 0.3);
    const wingBladeR = new THREE.Mesh(wingBladeGeomR, bodyMat);
    wingBladeR.position.set(0.42, 0, 0);
    wingBladeR.castShadow = true;
    wingR.add(wingBladeR);

    const tipGeomR = new THREE.BoxGeometry(0.24, 0.026, 0.22);
    const tipR = new THREE.Mesh(tipGeomR, wingTipMat);
    tipR.position.set(0.84, 0, -0.04);
    wingR.add(tipR);

    group.add(wingR);

    return { group, wingL, wingR };
  }

  private async loadGltfSafe(primaryUrl: string, fallbackUrl?: string): Promise<any> {
    try {
      return await this.gltfLoader.loadAsync(primaryUrl);
    } catch (err) {
      if (fallbackUrl) {
        return await this.gltfLoader.loadAsync(fallbackUrl);
      }
      throw err;
    }
  }

  private async loadWildlifeModels(): Promise<void> {
    // 1. Load Dolphins (Dolphin.glb)
    try {
      const dolphinGltf = await this.loadGltfSafe('/world-3d/Dolphin.glb', '/world-3d/dolphin.glb');
      const dolphinClip =
        THREE.AnimationClip.findByName(dolphinGltf.animations, 'Armature|Swim') ||
        dolphinGltf.animations[0];

      // Lead Dolphin
      const d1Root = SkeletonUtils.clone(dolphinGltf.scene) as THREE.Group;
      d1Root.scale.setScalar(0.26);
      d1Root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          (obj as THREE.Mesh).frustumCulled = false;
        }
      });
      const d1Mixer = new THREE.AnimationMixer(d1Root);
      if (dolphinClip) {
        const action = d1Mixer.clipAction(dolphinClip);
        action.play();
      }
      this.wildlifeMixers.push(d1Mixer);
      this.wildlifeGroup.add(d1Root);

      // Companion Dolphin
      const d2Root = SkeletonUtils.clone(dolphinGltf.scene) as THREE.Group;
      d2Root.scale.setScalar(0.24);
      d2Root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          (obj as THREE.Mesh).frustumCulled = false;
        }
      });
      const d2Mixer = new THREE.AnimationMixer(d2Root);
      if (dolphinClip) {
        const action = d2Mixer.clipAction(dolphinClip);
        action.time = 0.5; // Natural rhythmic offset between the pair of dolphins
        action.play();
      }
      this.wildlifeMixers.push(d2Mixer);
      this.wildlifeGroup.add(d2Root);

      this.dolphins = [
        {
          group: d1Root,
          curve: Archipelago3dService.dolphinCurve1,
          progress: 0.05,
          speed: 6.8 / 197.0,
          timer: 2.0,
          cycleDuration: 11.5,
          jumpDuration: 2.2,
          submergedDuration: 9.3,
          isLead: true,
          mixer: d1Mixer,
        },
        {
          group: d2Root,
          curve: Archipelago3dService.dolphinCurve2,
          progress: 0.55,
          speed: 6.4 / 197.0,
          timer: 8.5,
          cycleDuration: 13.8,
          jumpDuration: 2.2,
          submergedDuration: 11.6,
          isLead: false,
          mixer: d2Mixer,
        },
      ];
    } catch (err) {
      console.warn('[Archipelago3D] Could not load Dolphin.glb:', err);
    }

    // 2. Load Whale (Whale.glb)
    try {
      const whaleGltf = await this.loadGltfSafe('/world-3d/Whale.glb', '/world-3d/whale.glb');
      const whaleClip =
        THREE.AnimationClip.findByName(whaleGltf.animations, 'Armature|Swim') ||
        whaleGltf.animations[0];

      const whaleRoot = SkeletonUtils.clone(whaleGltf.scene) as THREE.Group;
      whaleRoot.scale.setScalar(0.68);
      whaleRoot.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          (obj as THREE.Mesh).frustumCulled = false;
        }
      });

      const whaleMixer = new THREE.AnimationMixer(whaleRoot);
      if (whaleClip) {
        const action = whaleMixer.clipAction(whaleClip);
        action.play();
      }
      this.wildlifeMixers.push(whaleMixer);

      // Blowhole steam spout integrated into the whale's back
      const spoutGroup = new THREE.Group();
      spoutGroup.position.set(0, 0.92, 0.85);
      spoutGroup.visible = false;

      const spoutParticles: THREE.Mesh[] = [];
      const spoutPartGeom = new THREE.TetrahedronGeometry(0.18);
      const spoutPartMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.88,
      });

      for (let i = 0; i < 20; i++) {
        const pMesh = new THREE.Mesh(spoutPartGeom, spoutPartMat.clone());
        spoutGroup.add(pMesh);
        spoutParticles.push(pMesh);
      }
      whaleRoot.add(spoutGroup);

      this.wildlifeGroup.add(whaleRoot);

      this.whale = {
        group: whaleRoot,
        spoutGroup,
        spoutParticles,
        baseX: 0,
        baseZ: -2,
        heading: 0,
        cycleTimer: 0,
        mixer: whaleMixer,
      };
    } catch (err) {
      console.warn('[Archipelago3D] Could not load Whale.glb:', err);
    }
  }

  private async loadVolcanoModel(): Promise<void> {
    try {
      const gltf = await this.loadGltfSafe('/world/Hexagon/Assets/gltf/decoration/nature/volcano.glb');
      this.volcanoTemplate = gltf.scene;
      if (!this.volcanoTemplate) return;

      // Update all volcanoes on the islands that were waiting with a placeholder
      for (const item of this.volcanoHolders) {
        item.holder.remove(item.placeholder);
        if ((item.placeholder as THREE.Mesh).geometry) {
          (item.placeholder as THREE.Mesh).geometry.dispose();
        }
        const vol = SkeletonUtils.clone(this.volcanoTemplate) as THREE.Group;
        vol.position.set(0, 0.614, 0);
        vol.scale.setScalar(2.0);
        vol.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
        item.holder.add(vol);
      }
      this.volcanoHolders = [];
    } catch (err) {
      console.warn('[Archipelago3D] Could not load volcano.glb:', err);
    }
  }

  private spawnSplashRing(x: number, z: number, maxScale = 2.0): void {
    const ringGeom = new THREE.RingGeometry(0.25, 0.45, 16);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeom, ringMat);
    mesh.position.set(x, 0.28, z);
    this.wildlifeGroup.add(mesh);
    this.splashRings.push({ mesh, life: 0, maxLife: 0.95, maxScale });
  }

  private setupWildlife(): void {
    this.wildlifeGroup = new THREE.Group();
    this.wildlifeGroup.name = 'wildlife';
    this.scene.add(this.wildlifeGroup);

    // 1. Seagulls (4 birds in slow, serene and majestic orbital flight)
    const seagullConfigs = [
      { cx: -10, cz: -8, r: 14, alt: 11.2, speed: 0.18, angle: 0.0, phase: 0.0 },
      { cx: -6, cz: -14, r: 17, alt: 12.5, speed: 0.16, angle: 2.2, phase: 1.3 },
      { cx: 8, cz: 10, r: 15, alt: 11.8, speed: 0.19, angle: 1.1, phase: 2.5 },
      { cx: 12, cz: 6, r: 18, alt: 13.2, speed: 0.15, angle: 4.0, phase: 3.8 },
    ];

    this.seagulls = seagullConfigs.map((cfg) => {
      const g = this.createSeagullMesh();
      this.wildlifeGroup.add(g.group);
      return {
        group: g.group,
        wingL: g.wingL,
        wingR: g.wingR,
        orbitCenter: new THREE.Vector2(cfg.cx, cfg.cz),
        orbitRadius: cfg.r,
        speed: cfg.speed,
        altitude: cfg.alt,
        angle: cfg.angle,
        phase: cfg.phase,
      };
    });

    // 2. Dolphins and Whale with 3D models and skeletal animations (Dolphin.glb and Whale.glb)
    this.loadWildlifeModels();
  }

  private updateWildlife(t: number, dt: number): void {
    // 0. Update skeletal animation mixers (Dolphin and whale Swim)
    for (const mixer of this.wildlifeMixers) {
      mixer.update(dt);
    }

    // A. Seagulls: Slow and serene flight with 75% smooth gliding
    for (const g of this.seagulls) {
      g.angle += g.speed * dt;
      const x = g.orbitCenter.x + Math.cos(g.angle) * g.orbitRadius;
      const z = g.orbitCenter.y + Math.sin(g.angle) * g.orbitRadius;
      const y = g.altitude + Math.sin(t * 0.6 + g.phase) * 0.35;

      g.group.position.set(x, y, z);
      const tangentX = -Math.sin(g.angle);
      const tangentZ = Math.cos(g.angle);
      g.group.rotation.y = Math.atan2(tangentX, tangentZ);
      g.group.rotation.z = -0.12;

      // Glide most of the time, soft and slow flapping
      const glideSignal = Math.sin(t * 0.6 + g.phase);
      if (glideSignal > 0.05) {
        g.wingL.rotation.z = 0.08;
        g.wingR.rotation.z = -0.08;
      } else {
        const flap = Math.sin(t * 2.8 + g.phase) * 0.32;
        g.wingL.rotation.z = flap;
        g.wingR.rotation.z = -flap;
      }
    }

    // B. Dolphins: Wide navigation across the 4 corners and desynchronized fluid arc jumps
    for (const d of this.dolphins) {
      d.progress = (d.progress + d.speed * dt) % 1.0;
      const pt = d.curve.getPointAt(d.progress);
      const tangent = d.curve.getTangentAt(d.progress);
      const heading = Math.atan2(tangent.x, tangent.z);

      const waveH = this.getWaveHeight(pt.x, pt.z, t);

      d.timer = (d.timer + dt) % d.cycleDuration;

      if (d.timer >= d.submergedDuration) {
        // In the air: majestic arched parabolic jump with a long range
        const p = (d.timer - d.submergedDuration) / d.jumpDuration;
        const jumpH = Math.sin(p * Math.PI) * 2.85;
        const y = 0.20 + waveH + jumpH;

        d.group.position.set(pt.x, y, pt.z);
        d.group.rotation.y = heading;

        // Arched pitch that faithfully follows the parabolic trajectory:
        // - Takeoff: rises with the head tilted toward the sky (~ -41°)
        // - Zenith (p = 0.5): body perfectly horizontal
        // - Re-entry (p = 1.0): enters cleanly head-first in a dive (~ +41°)
        const pitch = -Math.cos(p * Math.PI) * 0.72;
        d.group.rotation.x = pitch;

        if (p > 0.03 && p < 0.07) {
          this.spawnSplashRing(pt.x, pt.z, 2.2);
        } else if (p > 0.93 && p < 0.97) {
          this.spawnSplashRing(pt.x, pt.z, 2.2);
        }
      } else {
        // Fluid submerged navigation under the water
        d.group.position.set(pt.x, -0.65 + waveH * 0.4, pt.z);
        d.group.rotation.y = heading;
        d.group.rotation.x = 0;
      }
    }

    // C. Whale: Majestic dive, double spout and giant tail fin toward the sky
    if (this.whale) {
      this.whale.cycleTimer = (this.whale.cycleTimer + dt) % 24;
      const c = this.whale.cycleTimer;

      const wx = this.whale.baseX + Math.sin(t * 0.12) * 3.5;
      const wz = this.whale.baseZ + Math.cos(t * 0.12) * 6.5;
      this.whale.group.position.x = wx;
      this.whale.group.position.z = wz;

      const velX = Math.cos(t * 0.12) * 3.5;
      const velZ = -Math.sin(t * 0.12) * 6.5;
      this.whale.group.rotation.y = Math.atan2(velX, velZ);

      const waveH = this.getWaveHeight(wx, wz, t);

      if (c < 9.0) {
        // Submerged in the abyss
        this.whale.group.position.y = -2.8;
        this.whale.group.rotation.x = 0;
        this.whale.spoutGroup.visible = false;
      } else if (c < 12.0) {
        // Gentle emergence cutting through the waves
        const progress = (c - 9.0) / 3.0;
        this.whale.group.position.y = -2.8 + progress * (0.36 + waveH - -2.8);
        this.whale.group.rotation.x = -(1 - progress) * 0.16;
        this.whale.spoutGroup.visible = false;
      } else if (c < 15.5) {
        // Blowhole steam jet
        const spoutProg = (c - 12.0) / 3.5;
        this.whale.group.position.y = 0.36 + waveH;
        this.whale.group.rotation.x = 0.0;

        this.whale.spoutGroup.visible = true;
        for (let i = 0; i < this.whale.spoutParticles.length; i++) {
          const p = this.whale.spoutParticles[i];
          const partOffset = i / this.whale.spoutParticles.length;
          const pLife = (spoutProg * 4.0 + partOffset) % 1.0;
          const py = pLife * 4.6;
          // Double V-shaped spout
          const side = i % 2 === 0 ? -1 : 1;
          const spreadX = side * (0.12 + pLife * 0.6) + Math.sin(i * 1.4) * 0.12;
          const spreadZ = (pLife * 0.3) * Math.cos(i);
          p.position.set(spreadX, py, spreadZ);
          const s = (1.0 - pLife * 0.35) * (0.9 + 0.4 * Math.sin(i));
          p.scale.set(s, s * 1.4, s);
          (p.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.88 * (1.0 - pLife * pLife));
        }

        if (spoutProg < 0.05) {
          this.spawnSplashRing(wx, wz, 3.8);
        }
      } else if (c < 19.5) {
        // Dive: head down and tail rises when submerging
        this.whale.spoutGroup.visible = false;
        const diveProg = (c - 15.5) / 4.0;
        this.whale.group.position.y = (0.36 + waveH) - diveProg * 3.2;
        // Head points downward
        this.whale.group.rotation.x = 0.32 * Math.sin(diveProg * Math.PI);

        if (diveProg > 0.48 && diveProg < 0.54) {
          this.spawnSplashRing(wx, wz - 1.8, 3.2);
        }
      } else {
        this.whale.group.position.y = -2.8;
        this.whale.group.rotation.x = 0;
        this.whale.spoutGroup.visible = false;
      }
    }

    // D. Foam rings
    for (let i = this.splashRings.length - 1; i >= 0; i--) {
      const ring = this.splashRings[i];
      ring.life += dt;
      const prog = ring.life / ring.maxLife;

      if (prog >= 1.0) {
        this.wildlifeGroup.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.splashRings.splice(i, 1);
      } else {
        const scale = 1.0 + prog * ring.maxScale;
        ring.mesh.scale.set(scale, scale, scale);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - prog) * 0.82;
      }
    }
  }

  // -------------------------------------------------------------
  // Sail toward an Island and Execute Callback on Docking
  // -------------------------------------------------------------
  sailToward(sectionId: string): void {
    this.sailYDock(sectionId);
  }

  sailYDock(sectionId: string, onDock?: () => void): void {
    const target = this.islands.find((isl) => isl.id === sectionId);
    if (!target) {
      onDock?.();
      return;
    }

    if (this.currentDockedId === sectionId && !this.isSailing) {
      onDock?.();
      return;
    }

    this.mouseTarget = null;
    this.targetMarker.visible = false;
    this.autoPilotTarget = target;
    this.onDockCallback = onDock ?? null;
    this.isSailing = true;

    const start = new THREE.Vector3(this.boatPos.x, 0.44, this.boatPos.z);
    const end = new THREE.Vector3(target.dockX, 0.44, target.dockZ);

    // Exit vector toward open sea moving away from the origin pier
    const startExit = new THREE.Vector3(
      start.x + Math.sin(this.boatHeading) * 4.2,
      0.44,
      start.z + Math.cos(this.boatHeading) * 4.2,
    );

    // Approach vector toward the destination pier from open sea
    const endApproach = new THREE.Vector3(
      end.x + Math.sin(target.dockHeading - Math.PI) * 4.2,
      0.44,
      end.z + Math.cos(target.dockHeading - Math.PI) * 4.2,
    );

    // Central sea channel clear of islands (X around the center)
    const midZ = (startExit.z + endApproach.z) * 0.5;
    const canalWaypoint = new THREE.Vector3(
      (startExit.x + endApproach.x) * 0.18,
      0.44,
      midZ,
    );

    const waypoints = [start, startExit, canalWaypoint, endApproach, end];
    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.25);
    this.autoPilotPath = curve.getPoints(32);
    this.autoPilotIndex = 1;
  }

  // -------------------------------------------------------------
  // Mouse and Keyboard Event Handling
  // -------------------------------------------------------------
  private setupEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.forward = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.backward = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.keys.right = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.keys.forward = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.keys.backward = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.keys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.keys.right = false;
  };

  private updateMouseCoords(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true;
    this.updateMouseCoords(e);

    const islandHits = this.raycaster.intersectObjects(this.islandGroups, true);
    if (islandHits.length > 0) {
      let obj: THREE.Object3D | null = islandHits[0].object;
      while (obj && !obj.userData['sectionId'] && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData['sectionId']) {
        const id = obj.userData['sectionId'] as string;
        this.ngZone.run(() => {
          this.callbacks?.onSelect(id);
          this.sailToward(id);
        });
        return;
      }
    }

    const oceanHits = this.raycaster.intersectObject(this.oceanMesh, false);
    if (oceanHits.length > 0) {
      const hit = oceanHits[0].point;
      this.mouseTarget = new THREE.Vector3(hit.x, 0.44, hit.z);
      this.autoPilotTarget = null;
      this.autoPilotPath = [];

      this.targetMarker.position.set(hit.x, 0.35, hit.z);
      this.targetMarker.visible = true;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.updateMouseCoords(e);

    if (this.isPointerDown) {
      const oceanHits = this.raycaster.intersectObject(this.oceanMesh, false);
      if (oceanHits.length > 0) {
        const hit = oceanHits[0].point;
        this.mouseTarget = new THREE.Vector3(hit.x, 0.44, hit.z);
        this.targetMarker.position.set(hit.x, 0.35, hit.z);
        this.targetMarker.visible = true;
      }
    } else {
      const hits = this.raycaster.intersectObjects(this.islandGroups, true);
      let hoveredId: string | null = null;
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData['sectionId'] && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData['sectionId']) {
          hoveredId = obj.userData['sectionId'] as string;
        }
      }

      this.canvas.style.cursor = hoveredId ? 'pointer' : 'crosshair';

      if (hoveredId !== this.currentHoveredId) {
        this.currentHoveredId = hoveredId;
        this.ngZone.run(() => {
          this.callbacks?.onHover?.(hoveredId, e.clientX, e.clientY);
        });
      } else if (hoveredId) {
        this.ngZone.run(() => {
          this.callbacks?.onHover?.(hoveredId, e.clientX, e.clientY);
        });
      }
    }
  };

  private onPointerLeave = (): void => {
    if (this.currentHoveredId !== null) {
      this.currentHoveredId = null;
      this.ngZone.run(() => {
        this.callbacks?.onHover?.(null, 0, 0);
      });
    }
  };

  private onPointerUp = (): void => {
    this.isPointerDown = false;
  };

  resize(w: number, h: number): void {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = w / (h || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.animId);

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerup', this.onPointerUp);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    }

    if (this.wildlifeGroup) {
      this.wildlifeGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      this.wildlifeGroup.clear();
      this.scene.remove(this.wildlifeGroup);
    }

    for (const mixer of this.wildlifeMixers) {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    }
    this.wildlifeMixers = [];
    this.seagulls = [];
    this.dolphins = [];
    this.whale = null;
    this.volcanoHolders = [];
    this.volcanoLights = [];
    this.splashRings = [];
    this.islandColliders = [];
    this.oceanOrigPositions = null;
    this.oceanBaseColors = null;
    if (this.boatGroup) {
      this.boatGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      this.boatGroup.clear();
      this.scene?.remove(this.boatGroup);
    }
    this.boatModel = null;
    this.boatPlaceholder = null;

    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.scene) {
      this.scene.clear();
    }
  }
}
