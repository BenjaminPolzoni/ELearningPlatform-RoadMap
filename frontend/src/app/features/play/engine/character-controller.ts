import * as THREE from 'three';
import { AssetCacheService } from './asset-cache.service';
import type { AvatarBuild } from './avatar-modular.service';
import type { Vista } from './camera-controller';
import type { Avatar } from '../world-gen';

export interface Collider {
  x: number;
  z: number;
  r: number;
}

export interface FogFrontier {
  x: number;
  z: number;
  dx: number;
  dz: number;
}

// Velocidad base (+20% sobre el 1.6 original) y multiplicador de carrera (Shift).
const VELOCIDAD_BASE = 1.92;
const MULT_CORRER = 1.75;
// Giro en tercera persona (rad/s): A/D giran, W/S avanzan (controles tanque).
const VEL_GIRO = 2.6;

export class CharacterController {
  public char: THREE.Group | null = null;
  public mixer: THREE.AnimationMixer | null = null;

  private walkClip: THREE.AnimationClip | null = null;
  private runClip: THREE.AnimationClip | null = null;
  private idleClip: THREE.AnimationClip | null = null;
  private curAction: THREE.AnimationAction | null = null;
  private keys = new Set<string>();
  private disposers: (() => void)[] = [];
  private wallToastAt = 0;
  private target: { x: number; z: number } | null = null;
  private stuckFrames = 0;
  /** Efectos del avatar modular (RGB + mascotas): los avanza el loop del mundo. */
  private fxTick: ((t: number, dt: number) => void) | null = null;
  private groundPet: THREE.Object3D | null = null;
  private avatarBuild: AvatarBuild | null = null;
  /** Cuerpo sin mascota (lo que se oculta en primera persona). */
  private cuerpo: THREE.Object3D | null = null;

  constructor(
    private assets: AssetCacheService,
    private sx: number,
    private sz: number,
  ) {}

  bindInput(): void {
    const kd = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.target = null; // el teclado toma el mando
      }
      this.keys.add(k);
    };
    const ku = (e: KeyboardEvent): void => {
      this.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    this.disposers.push(() => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    });
  }

  /** Destino click-to-move (click izquierdo / tap). */
  setTarget(x: number, z: number): void {
    this.target = { x, z };
  }

  clearTarget(): void {
    this.target = null;
  }

  hasTarget(): boolean {
    return this.target !== null;
  }

  async loadAnimations(): Promise<void> {
    try {
      const [mclips, gclips] = await Promise.all([
        this.assets.loadClips('/world/characters/Rig_Medium_MovementBasic.glb'),
        this.assets.loadClips('/world/characters/Rig_Medium_General.glb'),
      ]);
      this.walkClip =
        mclips.find((c) => /walk/i.test(c.name)) ?? mclips.find((c) => /run/i.test(c.name)) ?? null;
      // Correr con Shift: Running_A/B del mismo GLB; si faltara, corre con la de caminar.
      this.runClip = mclips.find((c) => /run/i.test(c.name)) ?? this.walkClip;
      this.idleClip = gclips.find((c) => /idle/i.test(c.name)) ?? null;
    } catch {
      this.walkClip = null;
      this.runClip = null;
      this.idleClip = null;
    }
  }

  async setAvatar(avatar: Avatar | AvatarBuild, scene: THREE.Scene): Promise<void> {
    const prevPos = this.char?.position ? this.char.position.clone() : null;
    const prevRot = this.char?.rotation.y ?? 0;

    if (this.char) {
      scene.remove(this.char);
      this.mixer?.stopAllAction();
      this.mixer = null;
      this.curAction = null;
    }
    if (this.groundPet) {
      this.groundPet.parent?.remove(this.groundPet);
      this.groundPet = null;
    }
    this.avatarBuild?.detach();
    this.avatarBuild = null;
    this.fxTick = null;

    let g: THREE.Group;
    let h: number;
    if (typeof avatar === 'string') {
      g = await this.assets.load(`/world/characters/${avatar}.glb`);
      this.cuerpo = g;
      h = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).y || 1;
    } else {
      // Personaje modular creado en la ciudad: ya viene ensamblado.
      this.avatarBuild = avatar;
      g = avatar.group;
      this.cuerpo = avatar.cuerpo;
      // Composición preview/ciudad (cuerpo a 0.32, mascota sin escalar): se
      // normaliza por el cuerpo para igualar esa proporción en vez de medir el
      // grupo entero (la órbita inflaría la altura y achicaría todo).
      h = avatar.baseHeight > 0
        ? avatar.baseHeight
        : new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).y || 1;
      if (avatar.groundPet) {
        this.groundPet = avatar.groundPet;
        scene.add(avatar.groundPet);
      }
      this.fxTick = (t, dt): void => avatar.tick(t, dt);
    }
    const escala = (this.sx / h) * 0.5625;
    g.scale.setScalar(escala);
    // La mascota terrestre vive a nivel de escena (igual que en preview/ciudad):
    // se escala aparte para acompañar la normalización del cuerpo.
    this.groundPet?.scale.multiplyScalar(escala);
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });

    if (prevPos) {
      g.position.copy(prevPos);
      g.rotation.y = prevRot;
    }

    this.char = g;
    scene.add(g);

    try {
      this.mixer = new THREE.AnimationMixer(g);
    } catch {
      this.mixer = null;
    }
  }

  play(clip: THREE.AnimationClip | null): void {
    if (!clip || !this.mixer) return;
    if (this.curAction?.getClip() === clip) return;
    const next = this.mixer.clipAction(clip);
    this.curAction?.fadeOut(0.15);
    next.reset().fadeIn(0.15).play();
    this.curAction = next;
  }

  hexAt(x: number, z: number): string {
    const rf = z / this.sz;
    const qf = x / this.sx - rf / 2;
    const yf = -qf - rf;
    let q = Math.round(qf);
    let y = Math.round(yf);
    let r = Math.round(rf);
    if (Math.abs(q - qf) > Math.abs(y - yf) && Math.abs(q - qf) > Math.abs(r - rf)) q = -y - r;
    else if (Math.abs(y - yf) > Math.abs(r - rf)) y = -q - r;
    else r = -q - y;
    return `${q},${r}`;
  }

  update(
    dt: number,
    t: number,
    camYaw: number,
    isLocked: boolean,
    colliders: Collider[],
    walkableHexes: Set<string>,
    maxRadius: number,
    frontier: FogFrontier | null,
    onHitBarrier?: () => void,
    vista: Vista = 'libre',
  ): void {
    const char = this.char;
    if (!char) return;

    const f = new THREE.Vector2(-Math.sin(camYaw), -Math.cos(camYaw));
    const r = new THREE.Vector2(-f.y, f.x);
    const mv = new THREE.Vector2(0, 0);
    let seekingTarget = false;

    if (!isLocked) {
      if (vista === 'tercera') {
        // Controles tanque: A/D giran en el lugar, W/S avanzan sobre el frente.
        // (Con strafe + giro instantáneo, A/D realimentaban el giro y el
        // personaje pirueteaba sin trasladarse.)
        const izq = this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0;
        const der = this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0;
        char.rotation.y += (izq - der) * VEL_GIRO * dt;
        const av =
          (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0) -
          (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0);
        if (av !== 0) {
          mv.set(Math.sin(char.rotation.y) * av, Math.cos(char.rotation.y) * av);
        }
      } else {
        if (this.keys.has('w') || this.keys.has('arrowup')) mv.add(f);
        if (this.keys.has('s') || this.keys.has('arrowdown')) mv.sub(f);
        if (this.keys.has('d') || this.keys.has('arrowright')) mv.add(r);
        if (this.keys.has('a') || this.keys.has('arrowleft')) mv.sub(r);
      }
      if (mv.lengthSq() === 0 && this.target && char) {
        const dx = this.target.x - char.position.x;
        const dz = this.target.z - char.position.z;
        if (Math.hypot(dx, dz) < 0.3) {
          this.target = null; // llegado
        } else {
          mv.set(dx, dz);
          seekingTarget = true;
        }
      }
    } else {
      this.target = null;
    }

    const moving = mv.lengthSq() > 0;
    const px0 = char.position.x;
    const pz0 = char.position.z;
    // Correr con Shift: 75% más rápido que caminar (que ya es 20% más que antes).
    const corriendo = moving && this.keys.has('shift');

    if (moving) {
      mv.normalize();
      const sp = this.sx * VELOCIDAD_BASE * (corriendo ? MULT_CORRER : 1) * dt;
      char.position.x += mv.x * sp;
      char.position.z += mv.y * sp;
      // En tanque el giro lo mandan A/D: auto-encarar voltearía al personaje en
      // S (flip-flop por frame, desplazamiento nulo). Solo se encara al seguir
      // un destino por click.
      if (vista !== 'tercera' || seekingTarget) char.rotation.y = Math.atan2(mv.x, mv.y);
      this.play(corriendo ? this.runClip : this.walkClip);
      if (!this.mixer) char.position.y = Math.abs(Math.sin(t * (corriendo ? 14 : 10))) * 0.08;
    } else {
      this.play(this.idleClip);
      if (!this.mixer) char.position.y = 0;
    }

    // Circular obstacle collisions
    for (const c of colliders) {
      const dx = char.position.x - c.x;
      const dz = char.position.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + this.sx * 0.25;
      if (d > 0.001 && d < min) {
        char.position.x = c.x + (dx / d) * min;
        char.position.z = c.z + (dz / d) * min;
      }
    }

    // Island boundary clamp
    const dc = Math.hypot(char.position.x, char.position.z);
    if (dc > maxRadius) {
      char.position.x *= maxRadius / dc;
      char.position.z *= maxRadius / dc;
    }

    // Water constraint
    if (moving && !walkableHexes.has(this.hexAt(char.position.x, char.position.z))) {
      char.position.x = px0;
      char.position.z = pz0;
    }

    // Fog barrier constraint
    if (frontier) {
      const along = (char.position.x - frontier.x) * frontier.dx + (char.position.z - frontier.z) * frontier.dz;
      if (along > 0) {
        char.position.x -= frontier.dx * along;
        char.position.z -= frontier.dz * along;
        const now = performance.now();
        if (now - this.wallToastAt > 5000) {
          this.wallToastAt = now;
          onHitBarrier?.();
        }
      }
    }

    // Destino inalcanzable (agua/muro): si no avanza, se cancela
    if (seekingTarget) {
      if (Math.hypot(char.position.x - px0, char.position.z - pz0) < 0.0005) {
        this.stuckFrames++;
        if (this.stuckFrames > 60) {
          this.target = null;
          this.stuckFrames = 0;
        }
      } else {
        this.stuckFrames = 0;
      }
    } else {
      this.stuckFrames = 0;
    }

    this.mixer?.update(dt);
  }

  /** Avanza RGB y mascotas del avatar modular (no-op con cuerpo legado). */
  tickFx(t: number, dt: number): void {
    this.fxTick?.(t, dt);
  }

  /** En primera persona el cuerpo se oculta; la mascota queda visible. */
  setVistaPrimera(primera: boolean): void {
    if (this.cuerpo) this.cuerpo.visible = !primera;
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
    this.disposers = [];
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.curAction = null;
    if (this.groundPet) {
      this.groundPet.parent?.remove(this.groundPet);
      this.groundPet = null;
    }
    this.avatarBuild?.detach();
    this.avatarBuild = null;
    this.fxTick = null;
  }
}
