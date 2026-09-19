import { Injectable, NgZone, inject } from '@angular/core';
import * as THREE from 'three';
import { AssetCacheService } from './asset-cache.service';
import { CameraController } from './camera-controller';
import { CharacterController, type Collider, type FogFrontier } from './character-controller';
import type { AvatarBuild } from './avatar-modular.service';
import { yawMovimiento, type Vista } from './camera-controller';
import { TabletopBuilder, ArcadeBuilder } from './tabletop-props';
import type { EnvironmentTheme } from '../../../core/theme.service';
import {
  ANEXO_EMOJI,
  type AnexoMarker,
  type Avatar,
  type Biome,
  type ModuloPlaced,
  type WorldLayout,
} from '../world-gen';

const G = '/world/Hexagon/Assets/gltf';
const TILE_GRASS = `${G}/tiles/base/hex_grass.gltf`;
const TILE_WATER = `${G}/tiles/base/hex_water.gltf`;
const TUMBLEWEED = `${G}/decoration/nature/tumbleweed_lowpoly.glb`;
const TUMBLEWEED_SCALE = 0.2;
// Escalas normalizadas a igual altura (~1.2u = 60% de la proporción anterior)
const CACTUS_SCALE: Record<string, number> = {
  [`${G}/decoration/nature/cactus_1.glb`]: 0.06,
  [`${G}/decoration/nature/cactus_2.glb`]: 0.06,
  [`${G}/decoration/nature/cactus_3.glb`]: 0.2316,
  [`${G}/decoration/nature/cactus_4.glb`]: 1.939,
};
// cactus_4 trae la base bajo el origen (min y = -0.464): hay que levantarlo
const CACTUS_LIFT: Record<string, number> = {
  [`${G}/decoration/nature/cactus_4.glb`]: 0.464,
};
const isCactus = (m: string): boolean => m.includes('/cactus_');
// Escalas de nieve (los 3 hunden la base bajo el origen: hay que levantarlos)
const SNOW_SCALE: Record<string, number> = {
  [`${G}/decoration/nature/snowman.glb`]: 1.0,
  [`${G}/decoration/nature/pine_snow.glb`]: 1.85,
  [`${G}/decoration/nature/tree_snow.glb`]: 1.79,
};
const SNOW_LIFT: Record<string, number> = {
  [`${G}/decoration/nature/snowman.glb`]: 0.585,
  [`${G}/decoration/nature/pine_snow.glb`]: 0.454,
  [`${G}/decoration/nature/tree_snow.glb`]: 0.402,
};
const isSnowProp = (m: string): boolean => m.includes('/snowman') || m.includes('/pine_snow') || m.includes('/tree_snow');

const BIOME_STYLE: Record<Biome, { sky: number; hemiGround: number; sand: number; road: number; water: number }> = {
  pradera: { sky: 0x87ceeb, hemiGround: 0x668866, sand: 0, road: 0, water: 0 },
  desierto: { sky: 0xf2d8a0, hemiGround: 0xc2a06b, sand: 0xd3ac72, road: 0x8a5a2b, water: 0x6b4423 },
  nieve: { sky: 0xdcecf5, hemiGround: 0xb9c8d4, sand: 0xeef3f6, road: 0x6b7280, water: 0xa8cdea },
  lava: { sky: 0x2b0f0a, hemiGround: 0x7a2d12, sand: 0x2e2a28, road: 0x5a514d, water: 0xff5a1a },
};

const SNOW_COUNT = 500;
const SNOW_HEIGHT = 14;
const EMBER_COUNT = 300;
const EMBER_HEIGHT = 12;

export interface WorldCallbacks {
  onProgress: (pct: number) => void;
  onNearAnexo: (anexo: AnexoMarker | null) => void;
  onNearTower: (tower: ModuloPlaced | null) => void;
  onNearMarket: (market: ModuloPlaced | null) => void;
  onAtCastle: (atCastle: boolean) => void;
  onHitFogBarrier: () => void;
  isOpenGroup: (group: string) => boolean;
  unlockedCount: () => number;
  towerIds: () => string[];
}

@Injectable()
export class World3dService {
  private ngZone = inject(NgZone);
  private assets = inject(AssetCacheService);

  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camController: CameraController | null = null;
  private charController: CharacterController | null = null;

  private currentTheme: EnvironmentTheme = 'tabletop';
  private tabletopBg: THREE.Texture | null = null;
  private arcadeBg: THREE.Texture | null = null;

  private hemiLight: THREE.HemisphereLight | null = null;
  private dirLight: THREE.DirectionalLight | null = null;
  private accentLight1: THREE.PointLight | null = null;
  private accentLight2: THREE.PointLight | null = null;
  private environmentGroup: THREE.Group | null = null;

  private sx = 2;
  private sz = 1.73;
  private colliders: Collider[] = [];
  private walk = new Set<string>();
  private castleXZ = { x: 0, z: 0 };
  private groups = new Map<string, THREE.Object3D[]>();
  private fogWall: THREE.Sprite[] = [];
  private frontier: FogFrontier | null = null;
  private floaters: { s: THREE.Sprite; y: number; p: number }[] = [];
  private spinners: THREE.Object3D[] = [];
  private clouds: THREE.Group[] = [];
  private tumbleweeds: THREE.Group[] = [];
  private snow: THREE.Points | null = null;
  private snowVel: Float32Array | null = null;
  private embers: THREE.Points | null = null;
  private emberVel: Float32Array | null = null;
  private magmaMats: THREE.MeshStandardMaterial[] = [];
  private volcanoSmoke: { s: THREE.Sprite; seed: number; bx: number; by: number; bz: number }[] = [];
  private effectsOn = true;
  private bioma: Biome = 'pradera';
  private clickCleanups: (() => void)[] = [];
  private grow: { o: THREE.Object3D; base: THREE.Vector3; t0: number }[] = [];
  private booted = false;
  private clock = new THREE.Clock();
  private raf = 0;
  private isDestroyed = false;

  private party: { s: THREE.Sprite; vx: number; vy: number; vz: number }[] = [];
  private partying = false;
  private partyT = 0;

  private layout: WorldLayout | null = null;
  private callbacks: WorldCallbacks | null = null;

  // Track last dispatched proximity states to avoid redundant NgZone.run invocations
  private lastNearAnexoId: string | null = null;
  private lastNearTowerId: string | null = null;
  private lastNearMarketId: string | null = null;
  private lastAtCastle = false;

  ax(q: number, r: number, ox = 0, oz = 0): [number, number] {
    return [this.sx * (q + r / 2 + ox), this.sz * (r + oz)];
  }

  groupKey(id: string): string {
    return id.startsWith('__') ? '__start' : id;
  }

  private groupAdd(key: string, o: THREE.Object3D): void {
    const arr = this.groups.get(key) ?? [];
    arr.push(o);
    this.groups.set(key, arr);
  }

  /** Tiñe un tile clonando materiales (SkeletonUtils.clone comparte materiales). */
  private sand(g: THREE.Group, hex: number, flat: boolean): void {
    if (!hex) return;
    const tint = new THREE.Color(hex);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      if (flat) {
        mat.map = null;
        mat.color.setHex(hex);
      } else {
        mat.color.multiply(tint);
      }
      mat.needsUpdate = true;
      mesh.material = mat;
    });
  }

  /** Senda angosta sobre base plana: remapea por luminancia (oscuros→senda, claros→base). */
  private trailRoad(g: THREE.Group, baseHex: number, darkHex: number): void {
    const toVec = (h: number): string =>
      `vec3(${((h >> 16) & 255) / 255}, ${((h >> 8) & 255) / 255}, ${(h & 255) / 255})`;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = ((mesh.material as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial & {
        onBeforeCompile: (s: { fragmentShader: string }) => void;
      });
      mat.onBeforeCompile = (s) => {
        s.fragmentShader = s.fragmentShader.replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          {
            vec3 baseC = ${toVec(baseHex)};
            vec3 darkC = ${toVec(darkHex)};
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float k = smoothstep(0.32, 0.42, lum);
            diffuseColor.rgb = mix(darkC, baseC, k);
          }`,
        );
      };
      mat.needsUpdate = true;
      mesh.material = mat;
    });
  }

  /** Ríos de magma: base oscura + emissive naranja pulsante (ver loop). */
  private magma(g: THREE.Group, hex = 0xff5a1a): void {
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.map = null;
      mat.color.setHex(0x3a0d02);
      mat.emissive = new THREE.Color(hex);
      mat.emissiveIntensity = 1;
      mat.needsUpdate = true;
      mesh.material = mat;
      this.magmaMats.push(mat);
    });
  }

  /** Capa de nieve: mezcla blanco en caras que miran arriba (montañas y rocas). */
  private snowcap(g: THREE.Group, snowHex = 0xeef3f6): void {
    const w = ((snowHex >> 16) & 255) / 255;
    const v = ((snowHex >> 8) & 255) / 255;
    const b = (snowHex & 255) / 255;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = ((mesh.material as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial & {
        onBeforeCompile: (s: { fragmentShader: string; vertexShader: string }) => void;
      });
      mat.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vSnowNormal;`,
        );
        s.vertexShader = s.vertexShader.replace(
          '#include <defaultnormal_vertex>',
          `#include <defaultnormal_vertex>
          vSnowNormal = normalize(transformedNormal);`,
        );
        s.fragmentShader = s.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vSnowNormal;`,
        );
        s.fragmentShader = s.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            float k = smoothstep(0.45, 0.65, normalize(vSnowNormal).y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${w}, ${v}, ${b}), k);
          }`,
        );
      };
      mat.needsUpdate = true;
      mesh.material = mat;
    });
  }

  /** Vegetación procedural (modelos `proc:` — sin assets). */
  private buildProcedural(model: string): THREE.Group {
    const g = new THREE.Group();
    if (model === 'proc:palmera') {
      // palmera: tronco segmentado con curva + copa de hojas planas
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a34, flatShading: true, roughness: 1 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3e7d3a, roughness: 0.9, side: THREE.DoubleSide });
      let px = 0;
      let py = 0;
      for (let i = 0; i < 3; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - i * 0.012, 0.09 - i * 0.012, 0.4, 6), trunkMat);
        px += 0.05;
        py += 0.36;
        seg.position.set(px, py, 0);
        seg.rotation.z = -0.14;
        g.add(seg);
      }
      const topY = py + 0.2;
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.24), leafMat);
        const a = (i / 7) * Math.PI * 2;
        leaf.position.set(px + Math.cos(a) * 0.36, topY - 0.08, Math.sin(a) * 0.36);
        leaf.rotation.order = 'YXZ';
        leaf.rotation.y = -a + Math.PI / 2;
        leaf.rotation.x = -0.45;
        g.add(leaf);
      }
    } else if (model === 'proc:huesos') {
      // osamenta: calavera marfil + costillas, perfil bajo sobre la arena
      const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, flatShading: true, roughness: 0.95 });
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), boneMat);
      skull.scale.set(1, 0.85, 1.15);
      skull.position.y = 0.14;
      g.add(skull);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.14), boneMat);
      jaw.position.set(0, 0.045, 0.14);
      g.add(jaw);
      for (let i = 0; i < 3; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.16 + i * 0.05, 0.028, 6, 12, Math.PI), boneMat);
        rib.position.set(-0.3 - i * 0.14, 0.03, 0);
        rib.rotation.y = Math.PI / 2;
        g.add(rib);
      }
    }
    return g;
  }

  private twMinX = 0;
  private twMinZ = 0;
  private twMaxZ = 0;

  /** Límites de la isla jugable para el corredor de entrada de las rodadoras. */
  private computeTumbleweedBounds(): void {
    const pts = [...(this.layout?.tiles ?? []), ...(this.layout?.roads ?? [])];
    if (!pts.length) {
      this.twMinX = 0;
      this.twMinZ = -5;
      this.twMaxZ = 5;
      return;
    }
    let minX = Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const t of pts) {
      const [x, z] = this.ax(t.q, t.r);
      if (x < minX) minX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    this.twMinX = minX;
    this.twMinZ = minZ;
    this.twMaxZ = maxZ;
  }

  private twCount = 4;

  /** Carril propio por rodadora + velocidad distinta: nunca se amontonan. */
  private placeTumbleweed(g: THREE.Group, initial: boolean): void {
    const lane = (g.userData['lane'] as number) ?? 0;
    const range = Math.max(1, this.twMaxZ - this.twMinZ);
    const z = this.twMinZ + ((lane + 0.5) / this.twCount) * range + (Math.random() - 0.5) * 1.5;
    const x = initial
      ? this.twMinX - (5 + lane * 7 + Math.random() * 3)
      : this.twMinX - (4 + Math.random() * 4);
    g.position.set(x, 0, z);
  }

  /** Click izquierdo / tap → destino del personaje (raycast al plano y=0). */
  private moveToScreenPoint(cx: number, cy: number, canvas: HTMLCanvasElement): void {
    const cam = this.camController?.camera;
    const ch = this.charController;
    if (!cam || !ch || !this.layout) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const ndc = new THREE.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, cam);
    const dy = ray.ray.direction.y;
    if (Math.abs(dy) < 1e-6) return;
    const t = -ray.ray.origin.y / dy;
    if (!isFinite(t) || t < 0) return;
    const p = ray.ray.origin.clone().add(ray.ray.direction.clone().multiplyScalar(t));
    ch.setTarget(p.x, p.z);
  }

  /** Efectos del bioma (nevada / rodadoras / humo y brasas): visibles o no. */
  setEffectsEnabled(on: boolean): void {
    this.effectsOn = on;
    if (this.snow) this.snow.visible = on;
    if (this.embers) this.embers.visible = on;
    for (const tw of this.tumbleweeds) tw.visible = on;
    for (const p of this.volcanoSmoke) p.s.visible = on;
  }

  /** Aplica atmósfera del bioma sin pisar el fondo (la imagen de tienda se conserva). */
  private applyBiome(): void {
    const style = BIOME_STYLE[this.bioma];
    if (!style || this.bioma === 'pradera') return;
    if (this.bioma === 'desierto' || this.bioma === 'nieve' || this.bioma === 'lava') {
      const fog = this.scene.fog as THREE.Fog | null;
      if (fog) fog.color.setHex(style.sky);
      else this.scene.fog = new THREE.Fog(style.sky, 50, 130);
      this.hemiLight?.groundColor.setHex(style.hemiGround);
    }
  }

  async init(
    canvas: HTMLCanvasElement,
    layout: WorldLayout,
    avatar: Avatar | AvatarBuild,
    callbacks: WorldCallbacks,
    initialTheme: EnvironmentTheme = 'tabletop',
  ): Promise<void> {
    this.layout = layout;
    this.callbacks = callbacks;
    this.isDestroyed = false;
    this.currentTheme = initialTheme;
    this.bioma = layout.bioma ?? 'pradera';
    this.tumbleweeds = [];
    this.magmaMats = [];
    this.volcanoSmoke = [];

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camController = new CameraController(w / h);
    this.camController.bindInput(canvas, (nw, nh) => {
      this.renderer?.setSize(nw, nh);
    });

    // Configurar luces base
    this.hemiLight = new THREE.HemisphereLight(0xfff1e0, 0x3d271d, 1.1);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    this.dirLight.position.set(15, 35, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.left = -35;
    this.dirLight.shadow.camera.right = 35;
    this.dirLight.shadow.camera.top = 35;
    this.dirLight.shadow.camera.bottom = -35;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.accentLight1 = new THREE.PointLight(0xf59e0b, 0.6, 70);
    this.accentLight1.position.set(0, 15, 0);
    this.scene.add(this.accentLight1);

    this.accentLight2 = new THREE.PointLight(0xec4899, 0, 70);
    this.accentLight2.position.set(15, 12, 10);
    this.accentLight2.visible = false;
    this.scene.add(this.accentLight2);

    // Precargar ambas texturas de fondo (tienda de juegos y salón arcade)
    const texLoader = new THREE.TextureLoader();
    texLoader.load('/world/game_store_bg.jpg', (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.tabletopBg = tex;
      if (this.currentTheme === 'tabletop') this.scene.background = tex;
    });

    texLoader.load('/world/arcade_bg.jpg', (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.arcadeBg = tex;
      if (this.currentTheme === 'arcade') this.scene.background = tex;
    });

    // Medir dimensiones reales del tile
    const probe = await this.assets.load(TILE_GRASS);
    const box = new THREE.Box3().setFromObject(probe);
    const size = box.getSize(new THREE.Vector3());
    this.sx = size.x;
    this.sz = size.z * 0.75;

    // Aplicar el tema inicial (mesa, iluminación y accesorios)
    this.applyTheme(initialTheme);
    this.applyBiome();

    this.charController = new CharacterController(this.assets, this.sx, this.sz);
    this.charController.bindInput();

    // Click-to-move: click derecho o tap (arrastrar no mueve)
    {
      let downX = 0;
      let downY = 0;
      let downBtn = -1;
      const clickDown = (e: PointerEvent): void => {
        downX = e.clientX;
        downY = e.clientY;
        downBtn = e.button;
      };
      const clickUp = (e: PointerEvent): void => {
        const isTap = e.pointerType !== 'mouse';
        const isRight = e.pointerType === 'mouse' && e.button === 2;
        if (!isTap && !isRight) return;
        if (!isTap && downBtn !== e.button) return;
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
        this.moveToScreenPoint(e.clientX, e.clientY, canvas);
      };
      canvas.addEventListener('pointerdown', clickDown);
      canvas.addEventListener('pointerup', clickUp);
      this.clickCleanups.push(() => {
        canvas.removeEventListener('pointerdown', clickDown);
        canvas.removeEventListener('pointerup', clickUp);
      });
    }

    const total =
      layout.tiles.length +
      layout.waters.length +
      layout.roads.length +
      layout.hqs.length +
      layout.modulos.length +
      layout.islets.length +
      layout.ridge.length +
      3;
    let done = 0;
    const tick = (): void => {
      done++;
      callbacks.onProgress(Math.round((done / total) * 100));
    };

    const shadowed = (g: THREE.Group): void => {
      g.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
    };

    const snow = this.bioma === 'nieve';
    const lava = this.bioma === 'lava';
    const tinted = this.bioma === 'desierto' || snow || lava;
    const style = BIOME_STYLE[this.bioma];

    for (const t of layout.tiles) {
      const [x, z] = this.ax(t.q, t.r);
      const m = await this.assets.load(TILE_GRASS);
      m.position.set(x, 0, z);
      if (tinted) this.sand(m, style.sand, true);
      shadowed(m);
      this.scene.add(m);
      tick();
    }

    for (const t of layout.waters) {
      const [x, z] = this.ax(t.q, t.r);
      const m = await this.assets.load(TILE_WATER);
      m.position.set(x, -0.15, z);
      if (lava) this.magma(m);
      else if (tinted) this.sand(m, style.water, true);
      shadowed(m);
      this.scene.add(m);
      tick();
    }

    for (const t of layout.islets) {
      const [x, z] = this.ax(t.q, t.r);
      const m = await this.assets.load(TILE_GRASS);
      m.position.set(x, 0, z);
      if (tinted) this.sand(m, style.sand, true);
      this.scene.add(m);
      tick();
    }

    const volcanoTops: { x: number; y: number; z: number; r: number }[] = [];
    for (const p of layout.ridge) {
      const [x, z] = this.ax(p.q, p.r, p.ox, p.oz);
      const m = await this.assets.load(p.model);
      m.position.set(x, 0, z);
      m.rotation.y = p.rotY;
      if (p.s) m.scale.setScalar(p.s);
      if (snow) this.snowcap(m);
      if (lava) this.snowcap(m, 0x4a4440); // ceniza en vez de nieve
      this.scene.add(m);
      if (lava && (layout.volcanes ?? []).some((v) => v.q === p.q && v.r === p.r)) {
        const topY = new THREE.Box3().setFromObject(m).max.y;
        volcanoTops.push({ x, y: Math.max(0.5, topY * 0.92), z, r: 0.35 * (p.s ?? 2) });
      }
      tick();
    }

    for (const t of layout.roads) {
      const [x, z] = this.ax(t.q, t.r);
      const m = await this.assets.load(t.model);
      m.position.set(x, tinted ? 0.02 : 0, z);
      m.rotation.y = t.rotY;
      if (tinted) this.trailRoad(m, style.sand, style.road);
      shadowed(m);
      this.scene.add(m);
      this.groupAdd(this.groupKey(t.group ?? '__start'), m);
      tick();
    }

    const solid = async (
      q: number,
      r: number,
      ox: number,
      oz: number,
      model: string,
      rot: number,
      rad = this.sx * 0.42,
      scale = 1,
    ): Promise<void> => {
      const [x, z] = this.ax(q, r, ox, oz);
      const m = await this.assets.load(model);
      m.position.set(x, 0, z);
      m.rotation.y = rot;
      if (scale !== 1) m.scale.setScalar(scale);
      shadowed(m);
      this.scene.add(m);
      this.colliders.push({ x, z, r: rad });
    };

    const castleScale = layout.castle.s ?? 1.3;
    await solid(
      layout.castle.q,
      layout.castle.r,
      layout.castle.ox,
      layout.castle.oz,
      layout.castle.model,
      layout.castle.rotY,
      this.sx * 1.1 * castleScale,
      castleScale,
    );
    const [ccx, ccz] = this.ax(layout.castle.q, layout.castle.r);
    this.castleXZ = { x: ccx, z: ccz };
    tick();

    for (const u of layout.hqs) {
      await solid(u.q, u.r, u.ox, u.oz, u.model, u.rotY);
      tick();
    }

    for (const m of layout.modulos) {
      const [x, z] = this.ax(m.q, m.r, m.ox, m.oz);
      const g = await this.assets.load(m.model);
      g.position.set(x, 0, z);
      g.rotation.y = m.rotY;
      shadowed(g);
      this.scene.add(g);
      if (!m.moduloId.startsWith('__flag')) {
        this.colliders.push({ x, z, r: this.sx * 0.42 });
        if (!m.moduloId.startsWith('__market')) this.groupAdd(m.moduloId, g);
      }
      if (m.moduloId.startsWith('__market')) {
        const topY = new THREE.Box3().setFromObject(g).max.y;
        const my = topY + 0.35;
        const spr = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: this.emojiTexture('🏪'), depthTest: false }),
        );
        spr.scale.set(0.6, 0.6, 1);
        spr.position.set(x, my, z);
        this.scene.add(spr);
        this.floaters.push({ s: spr, y: my, p: Math.random() * 6 });
      }
      tick();
    }

    for (const x of layout.anexos) {
      const [px, pz] = this.ax(x.q, x.r, x.ox, x.oz);
      const g = await this.assets.load(x.model);
      g.position.set(px, 0, pz);
      g.rotation.y = x.rotY;
      shadowed(g);
      this.scene.add(g);
      g.traverse((o) => {
        if (o.name.toLowerCase().includes('fan')) this.spinners.push(o);
      });
      this.colliders.push({ x: px, z: pz, r: this.sx * 0.42 });
      this.groupAdd(x.moduloId, g);

      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.emojiTexture(ANEXO_EMOJI[x.tipo]), depthTest: false }),
      );
      spr.scale.set(0.55, 0.55, 1);
      spr.position.set(px, 1.6, pz);
      this.scene.add(spr);
      this.groupAdd(x.moduloId, spr);
      this.floaters.push({ s: spr, y: 1.6, p: Math.random() * 6 });
    }

    for (const d of layout.decor) {
      const [x, z] = this.ax(d.q, d.r, d.ox, d.oz);
      const g = d.model.startsWith('proc:') ? this.buildProcedural(d.model) : await this.assets.load(d.model);
      g.position.set(x, 0, z);
      g.rotation.y = d.rotY;
      if (d.s) g.scale.setScalar(d.s);
      if (d.model === TUMBLEWEED) g.scale.multiplyScalar(TUMBLEWEED_SCALE);
      else if (isCactus(d.model)) {
        g.scale.multiplyScalar(CACTUS_SCALE[d.model] ?? 0.06);
        g.position.y += (CACTUS_LIFT[d.model] ?? 0) * g.scale.x;
      } else if (isSnowProp(d.model)) {
        g.scale.multiplyScalar(SNOW_SCALE[d.model] ?? 1);
        g.position.y += (SNOW_LIFT[d.model] ?? 0) * g.scale.x;
      } else if (snow && d.model.includes('rock_single_')) {
        this.snowcap(g);
      } else if (lava && d.model.includes('rock_single_')) {
        this.snowcap(g, 0x4a4440);
      }
      shadowed(g);
      this.scene.add(g);
    }

    // En la estética de tablero de rol sobre mesa de tienda, se omiten las nubes de cielo exterior
    for (const _c of layout.clouds) {
      // noop para mantener despejada la vista de la mesa y la tienda
    }

    // Rodadoras con viento (solo desierto, ambiente: sin colisión, sin seed)
    // Entran por detrás del borde izquierdo; 4 unidades escalonadas.
    if (this.bioma === 'desierto') {
      this.computeTumbleweedBounds();
      for (let i = 0; i < this.twCount; i++) {
        const g = await this.assets.load(TUMBLEWEED);
        g.scale.setScalar(TUMBLEWEED_SCALE);
        g.userData['lane'] = i;
        g.userData['speed'] = 0.85 + (i % 3) * 0.15;
        this.placeTumbleweed(g, true);
        g.userData['ph'] = i * 2.1;
        this.scene.add(g);
        this.tumbleweeds.push(g);
      }
    }

    // Nevada (solo nieve): 1 draw call siguiendo al personaje
    if (this.bioma === 'nieve') {
      this.startSnowfall((layout.boundR ?? 14) * this.sx);
    }

    // Volcanes (solo lava): cráter incandescente + columna de humo + brasas
    if (lava) {
      const smokeTex = this.fogTexture();
      for (const v of volcanoTops) {
        for (let i = 0; i < 12; i++) {
          const s = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: smokeTex,
              color: i < 4 ? 0x3a3a3a : 0x5a5a5a,
              transparent: true,
              opacity: 0.65 - i * 0.02,
              depthWrite: false,
            }),
          );
const sc = 1.8 + (i % 4) * 0.9;
           s.scale.set(sc, sc * 0.9, 1);
           s.position.set(v.x + (Math.random() - 0.5) * 0.3, v.y, v.z + (Math.random() - 0.5) * 0.3);
          this.scene.add(s);
          this.volcanoSmoke.push({ s, seed: i * 1.3 + v.x, bx: v.x, by: v.y, bz: v.z });
        }
      }
      this.startEmbers((layout.boundR ?? 14) * this.sx);
    }

    // Neblina de guerra esponjosa, volumétrica y orgánica (confinada estrictamente a la calzada jugable)
    {
      const tex = this.fogTexture();
      const PUFF_COUNT = 32;
      for (let i = 0; i < PUFF_COUNT; i++) {
        const s = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: 0.62,
            depthWrite: false,
            rotation: (i * 1.618 * Math.PI) % (Math.PI * 2),
          }),
        );
        // Tamaños variados y redondeados (entre 4.6 y 6.8 de ancho, 2.8 y 4.2 de alto)
        const sw = 4.6 + (i % 5) * 0.55;
        const sh = 2.8 + (i % 4) * 0.45;
        s.scale.set(sw, sh, 1);
        s.visible = false;

        // Distribución orgánica tridimensional extendida a lo largo de toda la calzada jugable:
        // - oz: desde -3.2 (lado izquierdo) hasta +10.0 (arropando completamente la curva hacia la derecha)
        const tZ = i / (PUFF_COUNT - 1);
        const oz = -3.2 + tZ * 13.2 + (((i * 7) % 5) - 2) * 0.35;
        // - ox: profundidad a lo largo del tramo (0.3 a 5.6), acompañando el recorrido de la calzada
        const ox = 0.3 + ((i % 4) * 1.1) + tZ * 1.6;
        // - oy: altura rasante multicapa entre 0.48 y 1.18 unidades
        const oy = 0.5 + ((i * 5) % 4) * 0.22;
        s.userData = {
          ox,
          oz,
          oy,
          bx: 0,
          bz: 0,
          by: oy,
          ph: i * 0.85,
          rotSpeed: (0.015 + ((i * 3) % 4) * 0.01) * (i % 2 === 0 ? 1 : -1),
        };
        this.scene.add(s);
        this.fogWall.push(s);
      }
    }

    this.refreshVisibility();
    this.walk = new Set([...layout.tiles, ...layout.roads].map((t) => `${t.q},${t.r}`));

    await this.charController.loadAnimations();
    await this.charController.setAvatar(avatar, this.scene);

    // Spawn seguro fuera de colisionadores
    const free = (wx: number, wz: number): boolean =>
      this.colliders.every((c) => Math.hypot(wx - c.x, wz - c.z) > c.r + this.sx * 0.6);
    let [sx0, sz0] = this.ax(layout.spawn.q, layout.spawn.r);
    outer: for (let ring = 0; ring < 4; ring++) {
      for (let dq = -ring; dq <= ring; dq++) {
        for (let dr = -ring; dr <= ring; dr++) {
          const [wx, wz] = this.ax(layout.spawn.q + dq, layout.spawn.r + dr);
          if (free(wx, wz)) {
            sx0 = wx;
            sz0 = wz;
            break outer;
          }
        }
      }
    }
    this.charController.char?.position.set(sx0, 0, sz0);
    // Ojos para primera persona: 90% de la altura normalizada del personaje.
    if (this.camController) this.camController.alturaOjos = this.sx * 0.5625 * 0.9;

    // Ejecutar el bucle de render fuera de NgZone para máxima eficiencia
    this.ngZone.runOutsideAngular(() => {
      this.startLoop();
    });
  }

  applyTheme(theme: EnvironmentTheme): void {
    this.currentTheme = theme;
    const islandRadius = (this.layout?.boundR ?? 14) * this.sx;

    // 1. Remover y disponer entorno previo
    if (this.environmentGroup) {
      this.scene.remove(this.environmentGroup);
      this.environmentGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      this.environmentGroup = null;
    }

    // 2. Instanciar nuevo entorno según el tema
    if (theme === 'arcade') {
      this.environmentGroup = ArcadeBuilder.buildArcadeEnvironment(islandRadius);
      this.scene.add(this.environmentGroup);

      if (this.arcadeBg) {
        this.scene.background = this.arcadeBg;
      } else {
        this.scene.background = new THREE.Color(0x0f0b1a);
      }
      this.scene.fog = new THREE.Fog(0x0f0b1a, 40, 120);

      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xd8b4fe);
        this.hemiLight.groundColor.setHex(0x1e1b4b);
        this.hemiLight.intensity = 0.9;
      }
      if (this.dirLight) {
        this.dirLight.color.setHex(0xf8fafc);
        this.dirLight.intensity = 1.4;
      }
      if (this.accentLight1) {
        this.accentLight1.position.set(-15, 12, 10);
        this.accentLight1.color.setHex(0x06b6d4); // Cian
        this.accentLight1.intensity = 2.2;
        this.accentLight1.visible = true;
      }
      if (this.accentLight2) {
        this.accentLight2.position.set(15, 12, 10);
        this.accentLight2.color.setHex(0xec4899); // Magenta
        this.accentLight2.intensity = 2.2;
        this.accentLight2.visible = true;
      }
    } else {
      this.environmentGroup = TabletopBuilder.buildTabletopEnvironment(islandRadius);
      this.scene.add(this.environmentGroup);

      if (this.tabletopBg) {
        this.scene.background = this.tabletopBg;
      } else {
        this.scene.background = new THREE.Color(0x231610);
      }
      this.scene.fog = new THREE.Fog(0x231610, 50, 130);

      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xfff1e0);
        this.hemiLight.groundColor.setHex(0x3d271d);
        this.hemiLight.intensity = 1.1;
      }
      if (this.dirLight) {
        this.dirLight.color.setHex(0xffedd5);
        this.dirLight.intensity = 1.8;
      }
      if (this.accentLight1) {
        this.accentLight1.position.set(0, 15, 0);
        this.accentLight1.color.setHex(0xf59e0b); // Ámbar cálido
        this.accentLight1.intensity = 0.6;
        this.accentLight1.visible = true;
      }
      if (this.accentLight2) {
        this.accentLight2.visible = false;
      }
    }
    this.applyBiome();
  }

  /** Conmuta cámara primera/tercera persona (oculta el cuerpo en primera). */
  alternarVista(): Vista {
    const vista = this.camController?.alternarVista() ?? 'tercera';
    this.charController?.setVistaPrimera(vista === 'primera');
    return vista;
  }

  startReading(): void {
    this.camController?.startReading();
  }
  finishReading(): void {
    this.camController?.finishReading();
    this.refreshVisibility();
  }

  refreshVisibility(): void {
    if (!this.callbacks || !this.layout) return;

    for (const [k, objs] of this.groups) {
      const v = this.callbacks.isOpenGroup(k);
      for (const o of objs) {
        if (v && !o.visible && this.booted && !this.grow.some((g) => g.o === o)) {
          o.visible = true;
          const base = o.scale.clone();
          o.scale.setScalar(0.01);
          this.grow.push({ o, base, t0: performance.now() / 1000 });
        } else {
          o.visible = v;
        }
      }
    }
    this.booted = true;

    const ids = this.callbacks.towerIds();
    const n = this.callbacks.unlockedCount();
    if (n < ids.length && this.fogWall.length) {
      const towers = this.layout.modulos.filter((m) => !m.moduloId.startsWith('__'));
      const lockedRoads = this.layout.roads.filter((r) => r.group === ids[n]);
      let minX = Infinity;
      let targetRoad = lockedRoads[0];
      for (const r of lockedRoads) {
        const [rx] = this.ax(r.q, r.r);
        if (rx < minX) {
          minX = rx;
          targetRoad = r;
        }
      }
      const t = towers[n];
      const [cutX, roadZ] = targetRoad
        ? this.ax(targetRoad.q, targetRoad.r)
        : this.ax(t.q, t.r);

      // Barrera física invisible a la entrada del tramo
      this.frontier = { x: cutX - this.sx * 0.3, z: roadZ, dx: 1, dz: 0 };

      // Posicionamiento de los copos esponjosos en volumen sobre la calzada bloqueada
      this.fogWall.forEach((s) => {
        const ox = (s.userData['ox'] as number) || 0;
        const oz = (s.userData['oz'] as number) || 0;
        const oy = (s.userData['oy'] as number) || 0.8;
        const bx = cutX + ox;
        const bz = roadZ + oz;
        s.userData['bx'] = bx;
        s.userData['bz'] = bz;
        s.userData['by'] = oy;
        s.position.set(bx, oy, bz);
        s.visible = true;
      });
    } else {
      this.fogWall.forEach((s) => (s.visible = false));
      this.frontier = null;
    }
  }

  startCelebration(): void {
    if (this.partying) return;
    this.partying = true;
    this.partyT = 0;
    const texs = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899'].map((c) => this.confettiTexture(c));
    for (let i = 0; i < 80; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texs[i % texs.length], transparent: true, depthWrite: false }),
      );
      s.position.set(
        this.castleXZ.x + (Math.random() - 0.5) * 4,
        6 + Math.random() * 3,
        this.castleXZ.z + (Math.random() - 0.5) * 4,
      );
      s.scale.set(0.35, 0.35, 1);
      this.scene.add(s);
      this.party.push({ s, vx: (Math.random() - 0.5) * 2, vy: -0.5, vz: (Math.random() - 0.5) * 2 });
    }
  }

  private startLoop(): void {
    const loop = (): void => {
      if (this.isDestroyed) return;
      this.raf = requestAnimationFrame(loop);

      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;

      const char = this.charController?.char;
      const cam = this.camController?.camera;
      const layout = this.layout;
      if (!char || !cam || !layout || !this.camController || !this.charController) return;

      const isLocked = this.camController.mode !== 'follow';
      this.charController.update(
        dt,
        t,
        yawMovimiento(this.camController.vista, this.camController.yaw, char.rotation.y),
        isLocked,
        this.colliders,
        this.walk,
        layout.boundR * this.sx,
        this.frontier,
        () => {
          this.ngZone.run(() => this.callbacks?.onHitFogBarrier());
        },
        this.camController.vista,
      );

      this.camController.update(dt, char);
      this.charController.tickFx(t, dt);

      // Elementos ambientales
      const maxR = layout.boundR * this.sx;
      for (const c of this.clouds) {
        c.position.x += dt * 0.4;
        if (c.position.x > maxR + 10) c.position.x = -maxR - 10;
      }
      for (const tw of this.tumbleweeds) {
        if (!this.effectsOn) break;
        const ph = (tw.userData['ph'] as number) ?? 0;
        const sp = (tw.userData['speed'] as number) ?? 1;
        // Ráfagas de viento: avance a saltos (rebote) con balanceo, sin giros que hundan la bola
        tw.position.x += dt * (1.5 + Math.sin(t * 0.7 + ph) * 0.6) * sp;
        tw.position.z += Math.sin(t * 1.1 + ph) * dt * 0.8;
        tw.position.y = Math.abs(Math.sin(t * 2.2 + ph)) * 0.45;
        tw.rotation.y += dt * 2.5;
        tw.rotation.z = Math.sin(t * 2.2 + ph) * 0.2;
        tw.rotation.x = Math.cos(t * 1.7 + ph) * 0.15;
        if (tw.position.x > maxR + 10) this.placeTumbleweed(tw, true);
      }
      // Nevada: cae con deriva de viento y sigue al personaje (wrap en la caja)
      if (this.effectsOn && this.snow && this.snowVel) {
        const attr = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const cx = char.position.x;
        const cz = char.position.z;
        for (let i = 0; i < SNOW_COUNT; i++) {
          const j = i * 3;
          arr[j] += Math.sin(t * 0.9 + i * 1.7) * dt * 0.7;
          arr[j + 1] -= this.snowVel[i] * dt;
          arr[j + 2] += Math.cos(t * 0.7 + i * 2.3) * dt * 0.5;
          // wrap relativo al personaje
          if (arr[j] < cx - maxR) arr[j] += maxR * 2;
          else if (arr[j] > cx + maxR) arr[j] -= maxR * 2;
          if (arr[j + 2] < cz - maxR) arr[j + 2] += maxR * 2;
          else if (arr[j + 2] > cz + maxR) arr[j + 2] -= maxR * 2;
          if (arr[j + 1] < 0) arr[j + 1] += SNOW_HEIGHT;
        }
        attr.needsUpdate = true;
      }
      // Magma: pulso incandescente + humo de volcanes + brasas ascendentes
      for (const m of this.magmaMats) m.emissiveIntensity = 1 + Math.sin(t * 2.2) * 0.3;
      if (this.effectsOn) {
        for (const p of this.volcanoSmoke) {
          const k = ((t * 0.25 + p.seed) % 1 + 1) % 1; // 0→1 ciclo de subida
          p.s.position.set(
            p.bx + Math.sin(t * 0.8 + p.seed * 5) * (0.5 + k * 1.5),
            p.by + k * 6,
            p.bz + Math.cos(t * 0.6 + p.seed * 5) * (0.5 + k * 1.5),
          );
          const sc = 1.5 + k * 3;
          p.s.scale.set(sc, sc * 0.8, 1);
          (p.s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - k);
        }
        if (this.embers && this.emberVel) {
          const attr = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
          const arr = attr.array as Float32Array;
          const cx = char.position.x;
          const cz = char.position.z;
          for (let i = 0; i < EMBER_COUNT; i++) {
            const j = i * 3;
            arr[j] += Math.sin(t * 1.1 + i * 1.9) * dt * 0.6;
            arr[j + 1] += this.emberVel[i] * dt;
            arr[j + 2] += Math.cos(t * 0.9 + i * 2.1) * dt * 0.4;
            if (arr[j] < cx - maxR) arr[j] += maxR * 2;
            else if (arr[j] > cx + maxR) arr[j] -= maxR * 2;
            if (arr[j + 2] < cz - maxR) arr[j + 2] += maxR * 2;
            else if (arr[j + 2] > cz + maxR) arr[j + 2] -= maxR * 2;
            if (arr[j + 1] > EMBER_HEIGHT) arr[j + 1] -= EMBER_HEIGHT;
          }
          attr.needsUpdate = true;
        }
      }
      for (const fl of this.floaters) {
        fl.s.position.y = fl.y + Math.sin(t * 2 + fl.p) * 0.15;
      }
      for (const f of this.spinners) {
        f.rotation.z += dt * 0.8;
      }

      // Confeti
      if (this.partying) {
        this.partyT += dt;
        for (const c of this.party) {
          c.vy = Math.max(c.vy - dt * 2, -2.5);
          c.s.position.x += (c.vx + Math.sin(t * 4 + c.vz * 7) * 0.8) * dt;
          c.s.position.y += c.vy * dt;
          c.s.position.z += c.vz * dt;
          (c.s.material as THREE.SpriteMaterial).rotation += dt * 4;
          if (c.s.position.y < 0.15 && this.partyT < 6) {
            c.s.position.set(
              this.castleXZ.x + (Math.random() - 0.5) * 4,
              6 + Math.random() * 3,
              this.castleXZ.z + (Math.random() - 0.5) * 4,
            );
            c.vy = -0.5;
          }
        }
        if (this.partyT >= 8) {
          for (const c of this.party) {
            this.scene.remove(c.s);
            (c.s.material as THREE.Material).dispose();
          }
          this.party = [];
          this.partying = false;
        }
      }

      // Animación de la niebla: oleaje suave y giro lento de los copos esponjosos
      for (const s of this.fogWall) {
        if (!s.visible) continue;
        const ph = s.userData['ph'] as number;
        const rotSpd = (s.userData['rotSpeed'] as number) || 0.02;
        const k = 1 - Math.exp(-3 * dt);
        const tx = (s.userData['bx'] as number) + Math.sin(t * 0.35 + ph) * 0.25;
        const ty = (s.userData['by'] as number) + Math.sin(t * 0.45 + ph * 1.5) * 0.08;
        const tz = (s.userData['bz'] as number) + Math.cos(t * 0.3 + ph) * 0.2;

        (s.material as THREE.SpriteMaterial).rotation += rotSpd * dt;

        if (s.position.lengthSq() === 0) s.position.set(tx, ty, tz);
        else {
          s.position.x += (tx - s.position.x) * k;
          s.position.y += (ty - s.position.y) * k;
          s.position.z += (tz - s.position.z) * k;
        }
      }

      // Aparición suave de tramos
      if (this.grow.length) {
        const now = performance.now() / 1000;
        this.grow = this.grow.filter((g) => {
          const k = Math.min(1, (now - g.t0) / 0.9);
          const e = 1 - Math.pow(1 - k, 3);
          g.o.scale.copy(g.base).multiplyScalar(Math.max(e, 0.01));
          if (k >= 1) {
            g.o.scale.copy(g.base);
            return false;
          }
          return true;
        });
      }

      // Proximidad a anexos
      let bestAnexo: AnexoMarker | null = null;
      let bd = 1.7 * this.sx * 0.6;
      for (const x of layout.anexos) {
        if (!this.callbacks?.isOpenGroup(x.moduloId)) continue;
        const [px, pz] = this.ax(x.q, x.r, x.ox, x.oz);
        const d = Math.hypot(char.position.x - px, char.position.z - pz);
        if (d < bd) {
          bd = d;
          bestAnexo = x;
        }
      }
      const anexoId = bestAnexo?.anexoId ?? null;
      if (anexoId !== this.lastNearAnexoId) {
        this.lastNearAnexoId = anexoId;
        this.ngZone.run(() => this.callbacks?.onNearAnexo(bestAnexo));
      }

      // Proximidad a torres
      let bestTower: ModuloPlaced | null = null;
      let td = 2.2;
      for (const m of layout.modulos) {
        if (m.moduloId.startsWith('__') || !this.callbacks?.isOpenGroup(m.moduloId)) continue;
        const [px, pz] = this.ax(m.q, m.r, m.ox, m.oz);
        const d = Math.hypot(char.position.x - px, char.position.z - pz);
        if (d < td) {
          td = d;
          bestTower = m;
        }
      }
      const towerId = bestTower?.moduloId ?? null;
      if (towerId !== this.lastNearTowerId) {
        this.lastNearTowerId = towerId;
        this.ngZone.run(() => this.callbacks?.onNearTower(bestTower));
      }

      // Proximidad al mercado
      let bestMarket: ModuloPlaced | null = null;
      let md = 3.5;
      for (const m of layout.modulos) {
        if (!m.moduloId.startsWith('__market')) continue;
        const [px, pz] = this.ax(m.q, m.r, m.ox, m.oz);
        const d = Math.hypot(char.position.x - px, char.position.z - pz);
        if (d < md) {
          md = d;
          bestMarket = m;
        }
      }
      const marketId = bestMarket?.moduloId ?? null;
      if (marketId !== this.lastNearMarketId) {
        this.lastNearMarketId = marketId;
        this.ngZone.run(() => this.callbacks?.onNearMarket(bestMarket));
      }

      // Castillo final
      const dc2 = Math.hypot(char.position.x - this.castleXZ.x, char.position.z - this.castleXZ.z);
      const isAtCastle = dc2 < 4.4;
      if (isAtCastle !== this.lastAtCastle) {
        this.lastAtCastle = isAtCastle;
        this.ngZone.run(() => this.callbacks?.onAtCastle(isAtCastle));
      }

      this.renderer?.render(this.scene, cam);
    };

    loop();
  }

  private confettiTexture(color: string): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = color;
    ctx.fillRect(9, 3, 14, 26);
    return new THREE.CanvasTexture(c);
  }

  private fogTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;

    // Lóbulos múltiples que crean una forma esponjosa y orgánica (aspecto de bruma/nube real)
    const lobes = [
      { x: 128, y: 128, r: 85, a: 0.45 },
      { x: 95, y: 110, r: 65, a: 0.35 },
      { x: 160, y: 115, r: 68, a: 0.38 },
      { x: 115, y: 150, r: 64, a: 0.34 },
      { x: 148, y: 144, r: 62, a: 0.32 },
      { x: 88, y: 140, r: 52, a: 0.28 },
      { x: 168, y: 135, r: 54, a: 0.28 },
      { x: 130, y: 92, r: 58, a: 0.30 },
    ];

    for (const l of lobes) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(240, 244, 250, ${l.a})`);
      g.addColorStop(0.4, `rgba(230, 238, 246, ${l.a * 0.7})`);
      g.addColorStop(0.75, `rgba(215, 226, 238, ${l.a * 0.22})`);
      g.addColorStop(1, 'rgba(215, 226, 238, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  private emojiTexture(e: string): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.font = '96px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, 64, 70);
    return new THREE.CanvasTexture(c);
  }

  private snowTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  /** Nevada: nube de copos en caja centrada al origen (el loop la sigue al personaje). */
  private startSnowfall(half: number): void {
    this.stopSnowfall();
    const pos = new Float32Array(SNOW_COUNT * 3);
    this.snowVel = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * half * 2;
      pos[i * 3 + 1] = Math.random() * SNOW_HEIGHT;
      pos[i * 3 + 2] = (Math.random() - 0.5) * half * 2;
      this.snowVel[i] = 1 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.snowTexture(),
      size: 0.28,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.snow = new THREE.Points(geo, mat);
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);
  }

  private stopSnowfall(): void {
    if (!this.snow) return;
    this.scene.remove(this.snow);
    this.snow.geometry.dispose();
    const mat = this.snow.material as THREE.Material;
    (mat as THREE.PointsMaterial).map?.dispose();
    mat.dispose();
    this.snow = null;
    this.snowVel = null;
  }

  /** Brasas (solo lava): como la nevada pero subiendo. */
  private startEmbers(half: number): void {
    this.stopEmbers();
    const pos = new Float32Array(EMBER_COUNT * 3);
    this.emberVel = new Float32Array(EMBER_COUNT);
    for (let i = 0; i < EMBER_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * half * 2;
      pos[i * 3 + 1] = Math.random() * EMBER_HEIGHT;
      pos[i * 3 + 2] = (Math.random() - 0.5) * half * 2;
      this.emberVel[i] = 0.8 + Math.random() * 1.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.snowTexture(),
      color: 0xffa040,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.embers = new THREE.Points(geo, mat);
    this.embers.frustumCulled = false;
    this.scene.add(this.embers);
  }

  private stopEmbers(): void {
    if (!this.embers) return;
    this.scene.remove(this.embers);
    this.embers.geometry.dispose();
    const mat = this.embers.material as THREE.Material;
    (mat as THREE.PointsMaterial).map?.dispose();
    mat.dispose();
    this.embers = null;
    this.emberVel = null;
  }

  destroy(): void {
    this.isDestroyed = true;
    cancelAnimationFrame(this.raf);

    this.charController?.dispose();
    this.charController = null;

    this.camController?.dispose();
    this.camController = null;

    // Disponer de todos los recursos de la escena Three.js
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      } else if ((obj as THREE.Sprite).isSprite) {
        const sprite = obj as THREE.Sprite;
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    });

    this.scene.clear();
    this.tabletopBg?.dispose();
    this.tabletopBg = null;
    this.arcadeBg?.dispose();
    this.arcadeBg = null;
    this.environmentGroup = null;
    this.assets.dispose();
    this.renderer?.dispose();
    this.renderer = null;
    this.party = [];
    this.grow = [];
    this.clouds = [];
    this.tumbleweeds = [];
    this.stopSnowfall();
    this.stopEmbers();
    this.volcanoSmoke = [];
    this.magmaMats = [];
    this.clickCleanups.forEach((d) => d());
    this.clickCleanups = [];
    this.spinners = [];
    this.floaters = [];
    this.fogWall = [];
    this.groups.clear();
    this.colliders = [];
    this.walk.clear();
  }
}
