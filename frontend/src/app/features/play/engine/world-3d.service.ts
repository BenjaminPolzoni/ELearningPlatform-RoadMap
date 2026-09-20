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

interface VolcanoState {
  x: number;
  y: number;
  z: number;
  r: number;
  nextEruption: number;
  isErupting: boolean;
  burstTimer: number;
  burstDuration: number;
  light: THREE.PointLight;
  uniforms: {
    uTime: { value: number };
    uEruptionIntensity: { value: number };
  };
}

interface LavaBomb {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  rotVx: number;
  rotVy: number;
  rotVz: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

interface JumpingFish {
  mesh: THREE.Group;
  active: boolean;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  t: number;
  duration: number;
  peakHeight: number;
  waterY: number;
}

interface WaterCoastSpot {
  wx: number;
  wz: number;
  nx: number;
  nz: number;
  tx: number;
  tz: number;
}

interface WaterRipple {
  mesh: THREE.Mesh;
  active: boolean;
  t: number;
  maxT: number;
  maxScale: number;
}

interface FlockBirdMember {
  group: THREE.Group;
  wingLeft: THREE.Object3D;
  wingRight: THREE.Object3D;
  flapOffset: number;
}

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
  private volcanos: VolcanoState[] = [];
  private lavaBombs: LavaBomb[] = [];
  private bombGeo: THREE.BufferGeometry | null = null;
  private bombMat: THREE.Material | null = null;
  private eruptionSparks: THREE.Points | null = null;
  private sparkVel: Float32Array | null = null;
  private sparkLife: Float32Array | null = null;
  private praderaFish: JumpingFish[] = [];
  private praderaRipples: WaterRipple[] = [];
  private praderaBirds: FlockBirdMember[] = [];
  private birdFlockRoot: THREE.Group | null = null;
  private flockAngle = 0;
  private flockCenter = { x: 0, z: 0 };
  private rippleGeo: THREE.BufferGeometry | null = null;
  private rippleMat: THREE.Material | null = null;
  private nextFishJump = 0;
  private waterCoastData: WaterCoastSpot[] = [];
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

  /** Material dinámico para volcanes: corriente animada de lava en las grietas + ceniza en roca. */
  private applyVolcanoMaterial(
    g: THREE.Group,
    uniforms: { uTime: { value: number }; uEruptionIntensity: { value: number } },
  ): void {
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = ((mesh.material as THREE.MeshStandardMaterial).clone() as THREE.MeshStandardMaterial & {
        onBeforeCompile: (s: { fragmentShader: string; vertexShader: string; uniforms: Record<string, { value: unknown }> }) => void;
      });
      mat.onBeforeCompile = (s) => {
        s.uniforms['uTime'] = uniforms.uTime;
        s.uniforms['uEruptionIntensity'] = uniforms.uEruptionIntensity;

        s.vertexShader = s.vertexShader.replace(
          '#include <common>',
          `#include <common>
          varying vec3 vVolcanoNormal;
          varying vec3 vVolcanoLocalPos;`,
        );
        s.vertexShader = s.vertexShader.replace(
          '#include <defaultnormal_vertex>',
          `#include <defaultnormal_vertex>
          vVolcanoNormal = normalize(transformedNormal);
          vVolcanoLocalPos = position;`,
        );
        s.fragmentShader = s.fragmentShader.replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform float uEruptionIntensity;
          varying vec3 vVolcanoNormal;
          varying vec3 vVolcanoLocalPos;`,
        );
        s.fragmentShader = s.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            // Detección de la corriente de lava por saturación cálida frente al gris de la roca
            bool isLava = (diffuseColor.r - diffuseColor.b > 0.28) && (diffuseColor.r > 0.42);
            if (isLava) {
              // Corriente descendente continua hacia la base
              float flowPhase = vVolcanoLocalPos.y * 6.2 + uTime * 3.4 + sin(vVolcanoLocalPos.x * 8.0) * 1.2;
              float wave = sin(flowPhase) * 0.5 + 0.5;
              float waveSharp = pow(wave, 2.5);

              vec3 deepMagma = vec3(0.75, 0.10, 0.02);
              vec3 brightOrange = vec3(1.0, 0.42, 0.04);
              vec3 hotYellow = vec3(1.0, 0.92, 0.35);

              vec3 lavaC = mix(deepMagma, brightOrange, wave);
              lavaC = mix(lavaC, hotYellow, waveSharp * 0.9);

              float intensity = uEruptionIntensity;
              diffuseColor.rgb = lavaC * (1.1 + wave * 0.5) * intensity;
            } else {
              // Ceniza oscura en las caras rocosas superiores
              float ash = smoothstep(0.45, 0.70, normalize(vVolcanoNormal).y);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.24, 0.23), ash * 0.75);
            }
          }`,
        );
        s.fragmentShader = s.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            bool isLava = (diffuseColor.r - diffuseColor.b > 0.28) && (diffuseColor.r > 0.42);
            if (isLava) {
              totalEmissiveRadiance += diffuseColor.rgb * (0.8 + 0.5 * uEruptionIntensity);
            }
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

  /** Efectos del bioma (nevada / rodadoras / humo, volcanes, fauna y brasas): visibles o no. */
  setEffectsEnabled(on: boolean): void {
    this.effectsOn = on;
    if (this.snow) this.snow.visible = on;
    if (this.embers) this.embers.visible = on;
    if (this.eruptionSparks) this.eruptionSparks.visible = on;
    for (const tw of this.tumbleweeds) tw.visible = on;
    for (const p of this.volcanoSmoke) p.s.visible = on;
    for (const v of this.volcanos) v.light.visible = on;
    for (const b of this.lavaBombs) {
      if (!on) b.mesh.visible = false;
      else if (b.active) b.mesh.visible = true;
    }
    for (const f of this.praderaFish) {
      if (!on) f.mesh.visible = false;
      else if (f.active) f.mesh.visible = true;
    }
    if (this.birdFlockRoot) this.birdFlockRoot.visible = on;
    for (const r of this.praderaRipples) {
      if (!on) r.mesh.visible = false;
      else if (r.active) r.mesh.visible = true;
    }
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

    const volcanoTops: {
      x: number;
      y: number;
      z: number;
      r: number;
      uniforms: { uTime: { value: number }; uEruptionIntensity: { value: number } };
    }[] = [];
    for (const p of layout.ridge) {
      const [x, z] = this.ax(p.q, p.r, p.ox, p.oz);
      const m = await this.assets.load(p.model);
      m.position.set(x, 0, z);
      m.rotation.y = p.rotY;
      if (p.s) m.scale.setScalar(p.s);
      if (snow) this.snowcap(m);
      if (lava) {
        const isVolcano = (layout.volcanes ?? []).some((v) => v.q === p.q && v.r === p.r);
        if (isVolcano) {
          const uniforms = {
            uTime: { value: Math.random() * 10 },
            uEruptionIntensity: { value: 1.0 },
          };
          this.applyVolcanoMaterial(m, uniforms);
          const topY = new THREE.Box3().setFromObject(m).max.y;
          volcanoTops.push({
            x,
            y: Math.max(0.5, topY * 0.92),
            z,
            r: 0.35 * (p.s ?? 2),
            uniforms,
          });
        } else {
          this.snowcap(m, 0x4a4440); // ceniza en vez de nieve en rocas estándar
        }
      }
      this.scene.add(m);
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

    // Volcanes (solo lava): cráter incandescente + columna de humo + brasas + erupciones
    if (lava) {
      const smokeTex = this.fogTexture();
      this.initVolcanoSystem(volcanoTops, smokeTex);
      this.startEmbers((layout.boundR ?? 14) * this.sx);
    }

    // Fauna de Pradera: pececitos saltando en el agua y bandada de aves
    if (this.bioma === 'pradera') {
      this.initPraderaWildlife(layout);
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

  /** Conmuta cámara primera/tercera persona / libre (oculta el cuerpo en primera). */
  alternarVista(): Vista {
    const vista = this.camController?.alternarVista() ?? 'libre';
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
          const nearV = this.volcanos.find((v) => Math.hypot(v.x - p.bx, v.z - p.bz) < 1.2);
          const eruptBoost = nearV?.isErupting ? 1.4 : 1.0;
          const k = ((t * (0.25 * eruptBoost) + p.seed) % 1 + 1) % 1; // 0→1 ciclo de subida
          p.s.position.set(
            p.bx + Math.sin(t * 0.8 + p.seed * 5) * (0.5 + k * 1.5),
            p.by + k * (6 * eruptBoost),
            p.bz + Math.cos(t * 0.6 + p.seed * 5) * (0.5 + k * 1.5),
          );
          const sc = (1.5 + k * 3) * (nearV?.isErupting ? 1.25 : 1.0);
          p.s.scale.set(sc, sc * 0.8, 1);
          (p.s.material as THREE.SpriteMaterial).opacity = (nearV?.isErupting ? 0.7 : 0.55) * (1 - k);
        }
        if (this.volcanos.length) {
          this.updateVolcanoEruptions(t, dt);
        }
        if (this.praderaFish.length || this.praderaBirds.length) {
          this.updatePraderaWildlife(t, dt);
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

  private sparkTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, 'rgba(255, 255, 220, 1)');
    g.addColorStop(0.35, 'rgba(255, 170, 30, 0.9)');
    g.addColorStop(0.7, 'rgba(255, 60, 10, 0.4)');
    g.addColorStop(1, 'rgba(255, 40, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  /** Inicializa el sistema de volcanes: luces, humo, proyectiles piroclásticos y chispas. */
  private initVolcanoSystem(
    volcanoTops: {
      x: number;
      y: number;
      z: number;
      r: number;
      uniforms: { uTime: { value: number }; uEruptionIntensity: { value: number } };
    }[],
    smokeTex: THREE.Texture,
  ): void {
    // 1. Columnas de humo y luces puntuales en cada cráter
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

      const light = new THREE.PointLight(0xff4400, 0.6, 9.0, 1.8);
      light.position.set(v.x, v.y + 0.25, v.z);
      this.scene.add(light);

      this.volcanos.push({
        x: v.x,
        y: v.y,
        z: v.z,
        r: v.r,
        nextEruption: 2.0 + Math.random() * 2.5,
        isErupting: false,
        burstTimer: 0,
        burstDuration: 1.8,
        light,
        uniforms: v.uniforms,
      });
    }

    // 2. Pool de bombas de lava (fragmentos de roca low-poly balísticos)
    const BOMB_COUNT = 24;
    this.bombGeo = new THREE.DodecahedronGeometry(0.13, 0);
    this.bombMat = new THREE.MeshStandardMaterial({
      color: 0x1f0e08,
      emissive: 0xff3b00,
      emissiveIntensity: 2.4,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: true,
    });

    for (let i = 0; i < BOMB_COUNT; i++) {
      const mesh = new THREE.Mesh(this.bombGeo, this.bombMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.lavaBombs.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rotVx: 0,
        rotVy: 0,
        rotVz: 0,
        life: 0,
        maxLife: 2,
        baseScale: 1,
      });
    }

    // 3. Sistema de chispas incandescentes de erupción
    const SPARK_COUNT = 50;
    const sparkPos = new Float32Array(SPARK_COUNT * 3);
    this.sparkVel = new Float32Array(SPARK_COUNT * 3);
    this.sparkLife = new Float32Array(SPARK_COUNT * 2);

    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPos[i * 3 + 1] = -999;
      this.sparkLife[i * 2] = 1;
      this.sparkLife[i * 2 + 1] = 1;
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      map: this.sparkTexture(),
      size: 0.42,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.eruptionSparks = new THREE.Points(sparkGeo, sparkMat);
    this.eruptionSparks.frustumCulled = false;
    this.eruptionSparks.visible = false;
    this.scene.add(this.eruptionSparks);
  }

  /** Actualiza el ciclo de erupciones volcánicas, proyectiles balísticos y chispas. */
  private updateVolcanoEruptions(t: number, dt: number): void {
    const now = performance.now() / 1000;

    for (let vi = 0; vi < this.volcanos.length; vi++) {
      const v = this.volcanos[vi];
      v.uniforms.uTime.value = t;

      if (!this.effectsOn) {
        v.light.visible = false;
        v.uniforms.uEruptionIntensity.value = 1.0;
        continue;
      }
      v.light.visible = true;

      // Disparar erupción periódica
      if (!v.isErupting && now >= v.nextEruption) {
        v.isErupting = true;
        v.burstTimer = 0;
        v.burstDuration = 1.6 + Math.random() * 0.5;
        this.triggerEruptionBurst(v);
      }

      // Procesar erupción en curso
      if (v.isErupting) {
        v.burstTimer += dt;
        const progress = Math.min(1, v.burstTimer / v.burstDuration);
        const flare = Math.sin(progress * Math.PI);

        // Destello de iluminación en el cráter
        v.light.intensity = 0.6 + flare * 3.4;
        v.light.color.setHex(flare > 0.4 ? 0xff7711 : 0xff4400);

        // Pulso de brillo en el río de magma del shader
        v.uniforms.uEruptionIntensity.value = 1.0 + flare * 1.5;

        // Salva secundaria a un tercio de la duración
        if (progress > 0.28 && progress < 0.35 && v.burstTimer - dt <= 0.28 * v.burstDuration) {
          this.launchLavaBombs(v, 2 + Math.floor(Math.random() * 3));
        }

        if (progress >= 1) {
          v.isErupting = false;
          v.light.intensity = 0.6;
          v.light.color.setHex(0xff4400);
          v.uniforms.uEruptionIntensity.value = 1.0;
          v.nextEruption = now + 4.0 + Math.random() * 2.5; // Pausa acordada de 4 a 6.5s
        }
      } else {
        v.light.intensity = 0.5 + Math.sin(t * 2.2 + v.x) * 0.15;
        v.uniforms.uEruptionIntensity.value = 1.0;
      }
    }

    // Actualizar movimiento de las bombas de lava
    for (const b of this.lavaBombs) {
      if (!b.active) continue;
      b.life += dt;
      if (b.life >= b.maxLife || !this.effectsOn) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      // Parábola balística con gravedad
      b.vy -= 9.8 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;

      // Volteo 3D
      b.mesh.rotation.x += b.rotVx * dt;
      b.mesh.rotation.y += b.rotVy * dt;
      b.mesh.rotation.z += b.rotVz * dt;

      // Desvanecimiento suave al tocar el lago de lava
      if (b.mesh.position.y < 0.1) {
        const depth = (0.1 - b.mesh.position.y) / 0.3;
        const shrink = Math.max(0, 1 - depth);
        b.mesh.scale.setScalar(b.baseScale * shrink);
        if (b.mesh.position.y <= -0.2 || shrink <= 0.05) {
          b.active = false;
          b.mesh.visible = false;
        }
      }
    }

    // Actualizar chispas volcánicas
    if (this.eruptionSparks && this.sparkVel && this.sparkLife) {
      const posAttr = this.eruptionSparks.geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      let hasAlive = false;

      for (let i = 0; i < this.sparkLife.length / 2; i++) {
        const lifeIdx = i * 2;
        let life = this.sparkLife[lifeIdx];
        const maxLife = this.sparkLife[lifeIdx + 1];
        if (life >= maxLife) continue;

        life += dt;
        this.sparkLife[lifeIdx] = life;
        if (life >= maxLife) {
          posArr[i * 3 + 1] = -999;
          continue;
        }
        hasAlive = true;

        const pIdx = i * 3;
        this.sparkVel[pIdx + 1] -= 7.5 * dt;
        posArr[pIdx] += this.sparkVel[pIdx] * dt;
        posArr[pIdx + 1] += this.sparkVel[pIdx + 1] * dt;
        posArr[pIdx + 2] += this.sparkVel[pIdx + 2] * dt;
      }

      this.eruptionSparks.visible = this.effectsOn && hasAlive;
      posAttr.needsUpdate = true;
    }
  }

  private triggerEruptionBurst(v: VolcanoState): void {
    if (!this.effectsOn) return;
    this.launchLavaBombs(v, 4 + Math.floor(Math.random() * 3));
    this.launchSparks(v, 18 + Math.floor(Math.random() * 10));
  }

  private launchLavaBombs(v: VolcanoState, count: number): void {
    let launched = 0;
    for (const b of this.lavaBombs) {
      if (b.active) continue;
      b.active = true;
      b.mesh.visible = this.effectsOn;
      b.life = 0;
      b.maxLife = 1.8 + Math.random() * 0.7;

      const spawnR = v.r * 0.45 * Math.random();
      const spawnA = Math.random() * Math.PI * 2;
      b.mesh.position.set(v.x + Math.cos(spawnA) * spawnR, v.y + 0.12, v.z + Math.sin(spawnA) * spawnR);

      const angle = Math.random() * Math.PI * 2;
      const hSpeed = 0.9 + Math.random() * 1.5;
      b.vx = Math.cos(angle) * hSpeed;
      b.vy = 4.8 + Math.random() * 2.6;
      b.vz = Math.sin(angle) * hSpeed;

      b.rotVx = (Math.random() - 0.5) * 12;
      b.rotVy = (Math.random() - 0.5) * 12;
      b.rotVz = (Math.random() - 0.5) * 12;
      b.baseScale = 0.7 + Math.random() * 0.7;
      b.mesh.scale.setScalar(b.baseScale);

      launched++;
      if (launched >= count) break;
    }
  }

  private launchSparks(v: VolcanoState, count: number): void {
    if (!this.eruptionSparks || !this.sparkVel || !this.sparkLife) return;
    const posAttr = this.eruptionSparks.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    let launched = 0;
    const totalSparks = this.sparkLife.length / 2;
    for (let i = 0; i < totalSparks; i++) {
      const lifeIdx = i * 2;
      if (this.sparkLife[lifeIdx] < this.sparkLife[lifeIdx + 1]) continue;

      const pIdx = i * 3;
      posArr[pIdx] = v.x + (Math.random() - 0.5) * 0.3;
      posArr[pIdx + 1] = v.y + 0.15;
      posArr[pIdx + 2] = v.z + (Math.random() - 0.5) * 0.3;

      const angle = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 2.2;
      this.sparkVel[pIdx] = Math.cos(angle) * spd;
      this.sparkVel[pIdx + 1] = 5.5 + Math.random() * 3.8;
      this.sparkVel[pIdx + 2] = Math.sin(angle) * spd;

      this.sparkLife[lifeIdx] = 0;
      this.sparkLife[lifeIdx + 1] = 1.2 + Math.random() * 0.8;

      launched++;
      if (launched >= count) break;
    }
    posAttr.needsUpdate = true;
    this.eruptionSparks.visible = true;
  }

  /** Construye un pececito estilizado con cuerpo ahusado, ojos laterales, vientre claro y cola ahorquillada en V. */
  private buildProceduralFish(bodyHex: number, accentHex: number): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyHex,
      roughness: 0.2,
      metalness: 0.22,
      flatShading: true,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.35,
      metalness: 0.05,
      flatShading: true,
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

    // 1. Cuerpo principal alargado y aerodinámico
    const bodyGeo = new THREE.SphereGeometry(0.12, 10, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(0.42, 0.72, 1.45);
    g.add(body);

    // 2. Vientre claro inferior (dos tonos de color clásicos de pez)
    const bellyGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.025, 0.02);
    belly.scale.set(0.38, 0.45, 1.25);
    g.add(belly);

    // 3. Ojos laterales expresivos (esclerótica blanca + pupila negra)
    const eyeGeo = new THREE.SphereGeometry(0.022, 6, 5);
    const pupilGeo = new THREE.SphereGeometry(0.012, 5, 4);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.046, 0.025, 0.1);
    g.add(eyeL);
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.set(-0.052, 0.025, 0.108);
    g.add(pupilL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.046, 0.025, 0.1);
    g.add(eyeR);
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.set(0.052, 0.025, 0.108);
    g.add(pupilR);

    // 4. Cola ahorquillada en V (aleta caudal bipartita clásica)
    const tailUpper = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.14, 4), finMat);
    tailUpper.position.set(0, 0.045, -0.22);
    tailUpper.rotation.x = -Math.PI / 4;
    tailUpper.scale.set(0.25, 1.0, 1.0);
    g.add(tailUpper);

    const tailLower = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.14, 4), finMat);
    tailLower.position.set(0, -0.045, -0.22);
    tailLower.rotation.x = Math.PI / 4 + Math.PI;
    tailLower.scale.set(0.25, 1.0, 1.0);
    g.add(tailLower);

    // 5. Aleta dorsal arqueada
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.11, 4), finMat);
    dorsal.position.set(0, 0.085, -0.02);
    dorsal.rotation.x = -0.4;
    dorsal.scale.set(0.2, 1.0, 1.0);
    g.add(dorsal);

    // 6. Aletas pectorales laterales
    const pecGeo = new THREE.PlaneGeometry(0.05, 0.08);
    const pecL = new THREE.Mesh(pecGeo, finMat);
    pecL.position.set(-0.055, -0.02, 0.03);
    pecL.rotation.y = -0.5;
    pecL.rotation.z = 0.4;
    g.add(pecL);

    const pecR = new THREE.Mesh(pecGeo, finMat);
    pecR.position.set(0.055, -0.02, 0.03);
    pecR.rotation.y = 0.5;
    pecR.rotation.z = -0.4;
    g.add(pecR);

    // Escala equilibrada y estilizada: visible y proporcionada
    g.scale.setScalar(0.72);
    return g;
  }

  /** Construye un ave silvestre compacta low-poly con alas articuladas para aleteo y planeo. */
  private buildProceduralBird(bodyHex: number, wingHex: number): {
    group: THREE.Group;
    wingL: THREE.Object3D;
    wingR: THREE.Object3D;
  } {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyHex,
      roughness: 0.5,
      flatShading: true,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: wingHex,
      roughness: 0.5,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      flatShading: true,
    });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.28, 5), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.scale.set(0.8, 1.0, 0.75);
    g.add(body);

    // Cabeza
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), bodyMat);
    head.position.set(0, 0.035, 0.16);
    g.add(head);

    // Pico
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.065, 4), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.025, 0.235);
    g.add(beak);

    // Ala izquierda articulada
    const wingL = new THREE.Group();
    wingL.position.set(-0.05, 0.02, 0.03);
    const wingLMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.13), wingMat);
    wingLMesh.position.set(-0.16, 0, 0);
    wingLMesh.rotation.x = Math.PI / 2;
    wingL.add(wingLMesh);
    g.add(wingL);

    // Ala derecha articulada
    const wingR = new THREE.Group();
    wingR.position.set(0.05, 0.02, 0.03);
    const wingRMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.13), wingMat);
    wingRMesh.position.set(0.16, 0, 0);
    wingRMesh.rotation.x = Math.PI / 2;
    wingR.add(wingRMesh);
    g.add(wingR);

    // Cola estilizada
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), wingMat);
    tail.position.set(0, 0.02, -0.2);
    tail.rotation.x = Math.PI / 2;
    g.add(tail);

    // Escala pequeña (~33% del tamaño anterior)
    g.scale.setScalar(0.45);
    return { group: g, wingL, wingR };
  }

  /** Textura circular translúcida para los aros concéntricos de salpicadura en el agua. */
  private rippleTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200, 235, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 28, 0, Math.PI * 2);
    ctx.stroke();
    return new THREE.CanvasTexture(c);
  }

  /** Inicializa la fauna del bioma Pradera: pececitos costeros en agua azul y bandada en formación V. */
  private initPraderaWildlife(layout: WorldLayout): void {
    // 1. Variedad multicolor de pececitos (pool de 10 peces)
    const FISH_COLORS = [
      { body: 0xf59e0b, fin: 0xfef08a }, // Dorado / Goldfish
      { body: 0xea580c, fin: 0xffedd5 }, // Carpa Koi naranja
      { body: 0x06b6d4, fin: 0xa5f3fc }, // Pez turquesa
      { body: 0xef4444, fin: 0xfecaca }, // Pez coral rojizo
      { body: 0x3b82f6, fin: 0xbfdbfe }, // Azul lago
      { body: 0x8b5cf6, fin: 0xede9fe }, // Violeta amatista
      { body: 0x10b981, fin: 0xa7f3d0 }, // Verde esmeralda
      { body: 0xf97316, fin: 0xfef08a }, // Mandarina brillante
      { body: 0x0284c7, fin: 0xbae6fd }, // Azul cielo
      { body: 0xec4899, fin: 0xfbcfe8 }, // Rosa coral
    ];

    for (const col of FISH_COLORS) {
      const mesh = this.buildProceduralFish(col.body, col.fin);
      mesh.visible = false;
      this.scene.add(mesh);
      this.praderaFish.push({
        mesh,
        active: false,
        startX: 0,
        startZ: 0,
        targetX: 0,
        targetZ: 0,
        t: 0,
        duration: 1.1,
        peakHeight: 0.55,
        waterY: -0.15,
      });
    }

    // 2. Pool ampliado de aros de ondas concéntricas en el agua
    this.rippleGeo = new THREE.PlaneGeometry(1, 1);
    this.rippleMat = new THREE.MeshBasicMaterial({
      map: this.rippleTexture(),
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(this.rippleGeo, (this.rippleMat as THREE.Material).clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.scene.add(mesh);
      this.praderaRipples.push({
        mesh,
        active: false,
        t: 0,
        maxT: 1.2,
        maxScale: 1.6,
      });
    }

    // 3. Precalcula las coordenadas de costa con vectores normales hacia mar abierto
    // Filtro estricto: descarta casillas que coincidan con tierra/caminos/edificios,
    // casillas próximas al trazado de caminos (< 3.2u) y bolsillos cerrados de tierra.
    const landKeys = new Set<string>();
    const landPts: [number, number][] = [];

    for (const t of layout.tiles) {
      landKeys.add(`${t.q},${t.r}`);
      landPts.push(this.ax(t.q, t.r));
    }
    for (const r of layout.roads) {
      landKeys.add(`${r.q},${r.r}`);
      landPts.push(this.ax(r.q, r.r));
    }
    for (const i of layout.islets) {
      landKeys.add(`${i.q},${i.r}`);
      landPts.push(this.ax(i.q, i.r));
    }
    if (layout.castle) {
      landKeys.add(`${layout.castle.q},${layout.castle.r}`);
      landPts.push(this.ax(layout.castle.q, layout.castle.r));
    }
    for (const m of layout.modulos) {
      landKeys.add(`${m.q},${m.r}`);
      landPts.push(this.ax(m.q, m.r));
    }
    for (const a of layout.anexos) {
      landKeys.add(`${a.q},${a.r}`);
      landPts.push(this.ax(a.q, a.r));
    }
    for (const h of layout.hqs) {
      landKeys.add(`${h.q},${h.r}`);
      landPts.push(this.ax(h.q, h.r));
    }

    const roadPts: [number, number][] = [];
    for (const r of layout.roads) {
      roadPts.push(this.ax(r.q, r.r));
    }

    const NB_DIRS: ReadonlyArray<readonly [number, number]> = [
      [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
    ];

    this.waterCoastData = [];
    for (const w of layout.waters) {
      // 1. Excluir si la coordenada coincide con cualquier baldosa de tierra, camino o edificio
      if (landKeys.has(`${w.q},${w.r}`)) continue;

      const [wx, wz] = this.ax(w.q, w.r);

      // 2. Distancia al camino más cercano: debe estar a más de 3.2u (lejos de la calzada jugable)
      let minDistToRoadSq = Infinity;
      for (const [rx, rz] of roadPts) {
        const dSq = (wx - rx) * (wx - rx) + (wz - rz) * (wz - rz);
        if (dSq < minDistToRoadSq) minDistToRoadSq = dSq;
      }
      if (minDistToRoadSq < 3.2 * 3.2) continue;

      // 3. Solo agua costera abierta: descartar huecos interiores con más de 2 vecinos de tierra
      let landNeighbors = 0;
      for (const [dq, dr] of NB_DIRS) {
        if (landKeys.has(`${w.q + dq},${w.r + dr}`)) landNeighbors++;
      }
      if (landNeighbors > 2) continue;

      let minDistSq = Infinity;
      let closestLx = wx;
      let closestLz = wz;
      for (const [lx, lz] of landPts) {
        const dSq = (wx - lx) * (wx - lx) + (wz - lz) * (wz - lz);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closestLx = lx;
          closestLz = lz;
        }
      }
      const distToLand = Math.sqrt(minDistSq);
      // Debe estar separado del centro de la tierra adyacente (mínimo 1.7u)
      if (distToLand < 1.7) continue;

      const dx = wx - closestLx;
      const dz = wz - closestLz;
      const len = Math.hypot(dx, dz);
      const nx = len > 0.001 ? dx / len : 1;
      const nz = len > 0.001 ? dz / len : 0;
      const tx = -nz;
      const tz = nx;
      this.waterCoastData.push({ wx, wz, nx, nz, tx, tz });
    }

    // 4. Bandada de aves en formación V ("la típica formación en V")
    const BIRD_PALETTES = [
      { body: 0x1e3a8a, wing: 0x2563eb }, // Líder: Azul marino real
      { body: 0x0284c7, wing: 0x38bdf8 }, // Ala izq 1: Celeste cielo
      { body: 0x991b1b, wing: 0xef4444 }, // Ala izq 2: Bermellón
      { body: 0x0f766e, wing: 0x14b8a6 }, // Ala der 1: Esmeralda
      { body: 0x78350f, wing: 0xb45309 }, // Ala der 2: Ámbar silvestre
    ];

    const FLOCK_SLOTS = [
      { x: 0, y: 0, z: 0, flap: 0 },             // Punta de la V (líder)
      { x: -0.65, y: 0.02, z: -0.75, flap: 0.2 }, // Ala izquierda 1
      { x: -1.3, y: -0.01, z: -1.5, flap: 0.4 },   // Ala izquierda 2
      { x: 0.65, y: -0.02, z: -0.75, flap: 0.2 },  // Ala derecha 1
      { x: 1.3, y: 0.01, z: -1.5, flap: 0.4 },    // Ala derecha 2
    ];

    let avgX = 0;
    let avgZ = 0;
    const pts = layout.roads.length ? layout.roads : layout.tiles;
    for (const p of pts) {
      const [x, z] = this.ax(p.q, p.r);
      avgX += x;
      avgZ += z;
    }
    this.flockCenter = {
      x: pts.length ? avgX / pts.length : 0,
      z: pts.length ? avgZ / pts.length : 0,
    };
    this.flockAngle = 0;

    this.birdFlockRoot = new THREE.Group();
    this.birdFlockRoot.position.set(this.flockCenter.x + 22, 7.2, this.flockCenter.z);
    this.scene.add(this.birdFlockRoot);

    for (let i = 0; i < BIRD_PALETTES.length; i++) {
      const pal = BIRD_PALETTES[i];
      const slot = FLOCK_SLOTS[i];
      const bird = this.buildProceduralBird(pal.body, pal.wing);
      bird.group.position.set(slot.x, slot.y, slot.z);
      this.birdFlockRoot.add(bird.group);

      this.praderaBirds.push({
        group: bird.group,
        wingLeft: bird.wingL,
        wingRight: bird.wingR,
        flapOffset: slot.flap,
      });
    }

    this.nextFishJump = 0.8;
  }

  /** Lanza un aro concéntrico de agua expandiéndose y desvaneciéndose. */
  private spawnWaterRipple(x: number, z: number): void {
    if (!this.effectsOn) return;
    const r = this.praderaRipples.find((item) => !item.active);
    if (!r) return;
    r.active = true;
    r.t = 0;
    r.mesh.position.set(x, -0.14, z);
    r.mesh.scale.setScalar(0.25);
    (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
    r.mesh.visible = true;
  }

  /** Activa un salto parabólico de pez estrictamente en agua azul marina, lejos de caminos y tierra. */
  private triggerFishJump(fish: JumpingFish): void {
    if (!this.waterCoastData.length || !this.effectsOn) return;

    // Priorizar casillas de agua en el campo de visión del personaje (entre 6u y 26u de distancia)
    let spot = this.waterCoastData[Math.floor(Math.random() * this.waterCoastData.length)];
    const charPos = this.charController?.char?.position;
    if (charPos && Math.random() < 0.78) {
      const nearSpots = this.waterCoastData.filter((s) => {
        const dSq = (s.wx - charPos.x) * (s.wx - charPos.x) + (s.wz - charPos.z) * (s.wz - charPos.z);
        return dSq >= 6 * 6 && dSq <= 26 * 26;
      });
      if (nearSpots.length) {
        spot = nearSpots[Math.floor(Math.random() * nearSpots.length)];
      }
    }

    const dir = Math.random() < 0.5 ? 1 : -1;
    const halfSpan = 0.25 + Math.random() * 0.1;
    const outBias = 0.35 + Math.random() * 0.15; // Claramente desplazado hacia el mar exterior

    // Desplaza el centro del salto hacia mar abierto, alejándose de toda tierra y camino
    const cx = spot.wx + spot.nx * outBias;
    const cz = spot.wz + spot.nz * outBias;

    fish.startX = cx - spot.tx * halfSpan * dir;
    fish.startZ = cz - spot.tz * halfSpan * dir;
    fish.targetX = cx + spot.tx * halfSpan * dir;
    fish.targetZ = cz + spot.tz * halfSpan * dir;
    fish.t = 0;
    fish.duration = 1.05 + Math.random() * 0.25;
    fish.peakHeight = 0.52 + Math.random() * 0.16; // Arco visible y elegante sobre el nivel del agua
    fish.active = true;
    fish.mesh.position.set(fish.startX, fish.waterY, fish.startZ);
    fish.mesh.visible = true;

    // Onda en el agua al emerger
    this.spawnWaterRipple(fish.startX, fish.startZ);
  }

  /** Actualiza la animación de los pececitos saltarines y la bandada en V en Pradera. */
  private updatePraderaWildlife(t: number, dt: number): void {
    // 1. Peces saltarines (ritmo continuo y activo: un salto cada 0.35s a 0.80s)
    if (this.effectsOn && this.waterCoastData.length) {
      this.nextFishJump -= dt;
      if (this.nextFishJump <= 0) {
        const inactiveFish = this.praderaFish.find((f) => !f.active);
        if (inactiveFish) {
          this.triggerFishJump(inactiveFish);
        }
        this.nextFishJump = 0.35 + Math.random() * 0.45;
      }
    }

    for (const f of this.praderaFish) {
      if (!f.active) continue;
      f.t += dt;
      const p = Math.min(1, f.t / f.duration);

      const curX = f.startX + (f.targetX - f.startX) * p;
      const curZ = f.startZ + (f.targetZ - f.startZ) * p;
      const arc = Math.sin(p * Math.PI);
      const curY = f.waterY + arc * f.peakHeight;

      f.mesh.position.set(curX, curY, curZ);

      // Orientación siguiendo la tangente del salto balístico (la cabeza lidera el salto)
      const dx = f.targetX - f.startX;
      const dz = f.targetZ - f.startZ;
      const dy = Math.cos(p * Math.PI) * Math.PI * f.peakHeight;
      f.mesh.lookAt(curX + dx, curY + dy, curZ + dz);

      // Coletazo lateral y arqueo dinámico en el aire
      f.mesh.rotateY(Math.sin(p * 20) * 0.18);

      if (p >= 1) {
        f.active = false;
        f.mesh.visible = false;
        // Onda en el agua al zambullirse
        this.spawnWaterRipple(f.targetX, f.targetZ);
      }
    }

    // 2. Ondas de agua
    for (const r of this.praderaRipples) {
      if (!r.active) continue;
      r.t += dt;
      const progress = r.t / r.maxT;
      if (progress >= 1 || !this.effectsOn) {
        r.active = false;
        r.mesh.visible = false;
      } else {
        const sc = 0.25 + progress * r.maxScale;
        r.mesh.scale.setScalar(sc);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - progress);
      }
    }

    // 3. Bandada de aves en formación en V sobrevolando el mapa
    if (this.birdFlockRoot) {
      this.flockAngle += 0.16 * dt; // Vuelo pausado y majestuoso

      const rx = 22.0;
      const rz = 14.0;
      const bx = this.flockCenter.x + Math.cos(this.flockAngle) * rx;
      const bz = this.flockCenter.z + Math.sin(this.flockAngle) * rz;
      const by = 7.2 + Math.sin(this.flockAngle * 2.0) * 0.35;
      this.birdFlockRoot.position.set(bx, by, bz);

      // Orientación en dirección de avance del vuelo
      const fwdX = -Math.sin(this.flockAngle) * rx;
      const fwdZ = Math.cos(this.flockAngle) * rz;
      this.birdFlockRoot.rotation.y = Math.atan2(fwdX, fwdZ);
      // Alabeo suave en las curvas
      this.birdFlockRoot.rotation.z = -Math.sin(this.flockAngle) * 0.12;

      // Ciclo de aleteo coordinado (1.6s) y planeo majestuoso (2.4s)
      const flapCycle = t % 4.0;
      const isFlapping = flapCycle < 1.6;

      for (const b of this.praderaBirds) {
        if (isFlapping) {
          const wingAng = Math.sin(t * 14 + b.flapOffset) * 0.42;
          b.wingLeft.rotation.z = wingAng;
          b.wingRight.rotation.z = -wingAng;
        } else {
          b.wingLeft.rotation.z = 0.05;
          b.wingRight.rotation.z = -0.05;
        }
      }
    }
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

    // Disponer sistema de volcanes
    for (const v of this.volcanos) {
      this.scene.remove(v.light);
      v.light.dispose();
    }
    this.volcanos = [];
    for (const b of this.lavaBombs) {
      this.scene.remove(b.mesh);
    }
    this.lavaBombs = [];
    this.bombGeo?.dispose();
    this.bombGeo = null;
    if (this.bombMat) {
      if (Array.isArray(this.bombMat)) this.bombMat.forEach((m) => m.dispose());
      else this.bombMat.dispose();
      this.bombMat = null;
    }
    if (this.eruptionSparks) {
      this.scene.remove(this.eruptionSparks);
      this.eruptionSparks.geometry.dispose();
      const sMat = this.eruptionSparks.material as THREE.PointsMaterial;
      sMat.map?.dispose();
      sMat.dispose();
      this.eruptionSparks = null;
      this.sparkVel = null;
      this.sparkLife = null;
    }

    // Disponer fauna de pradera
    for (const f of this.praderaFish) {
      this.scene.remove(f.mesh);
    }
    this.praderaFish = [];
    if (this.birdFlockRoot) {
      this.scene.remove(this.birdFlockRoot);
      this.birdFlockRoot = null;
    }
    this.praderaBirds = [];
    for (const r of this.praderaRipples) {
      this.scene.remove(r.mesh);
    }
    this.praderaRipples = [];
    this.rippleGeo?.dispose();
    this.rippleGeo = null;
    if (this.rippleMat) {
      if (Array.isArray(this.rippleMat)) this.rippleMat.forEach((m) => m.dispose());
      else this.rippleMat.dispose();
      this.rippleMat = null;
    }
    this.waterCoastData = [];

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
