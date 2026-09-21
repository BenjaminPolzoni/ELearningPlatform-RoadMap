import * as THREE from 'three';

export type CameraMode = 'follow' | 'reading' | 'returning';

/** Camera view: third (from behind), first (on the head) or free (orbital). */
export type View = 'tercera' | 'primera' | 'libre';

/**
 * Base movement yaw: in third it moves relative to the character's front
 * (the +π inverts the camera yaw convention, which looks toward the character);
 * in the rest, relative to the camera as always.
 */
export function yawMovement(view: View, camYaw: number, facingYaw: number): number {
  return view === 'tercera' ? facingYaw + Math.PI : camYaw;
}

// Close, fixed framing of the third (free uses the user's yaw/dist/height).
const THIRD_PERSON_DIST = 5.5;
const THIRD_PERSON_HEIGHT = 3.2;

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public yaw = -Math.PI / 2; // look east by default
  public dist = 10;
  public height = 6;
  public mode: CameraMode = 'follow';
  public view: View = 'libre';
  /** Eye height above the feet (set by the world according to the real scale). */
  public eyeHeight = 1.2;

  private returnT = 0;
  private fromPos = new THREE.Vector3();
  private savedCam = { yaw: -Math.PI / 2, dist: 10, height: 6 };
  private disposers: (() => void)[] = [];
  /** Smoothed facing for third: the camera stays behind without whiplash. */
  private smoothYaw: number | null = null;
  private tmp = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 300);
  }

  bindInput(canvas: HTMLCanvasElement, onResize?: (w: number, h: number) => void): void {
    let drag = false;
    let lx = 0;
    let ly = 0;

    // Camera with left button (or touch): the right one moves the character
    const pd = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const pm = (e: PointerEvent): void => {
      // Third is fixed at the shoulder: it does not move. First rotates the view (yaw);
      // free also raises/lowers the height.
      if (!drag || this.mode !== 'follow' || this.view === 'tercera') return;
      this.yaw -= (e.clientX - lx) * 0.005;
      if (this.view === 'libre') {
        this.height = Math.min(12, Math.max(2, this.height + (e.clientY - ly) * 0.02));
      }
      lx = e.clientX;
      ly = e.clientY;
    };

    const pu = (): void => {
      drag = false;
    };

    const wh = (e: WheelEvent): void => {
      if (this.mode !== 'follow' || this.view !== 'libre') return;
      e.preventDefault();
      this.dist = Math.min(16, Math.max(4, this.dist + (e.deltaY > 0 ? 1 : -1)));
    };

    const rs = (): void => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      onResize?.(w, h);
    };

    // No browser menu: the right button moves the character
    const cm = (e: MouseEvent): void => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    canvas.addEventListener('pointerup', pu);
    canvas.addEventListener('wheel', wh, { passive: false });
    canvas.addEventListener('contextmenu', cm);
    window.addEventListener('resize', rs);

    this.disposers.push(() => {
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      canvas.removeEventListener('pointerup', pu);
      canvas.removeEventListener('wheel', wh);
      canvas.removeEventListener('contextmenu', cm);
      window.removeEventListener('resize', rs);
    });
  }

  /** Toggles in order Free → Third → First; returns the active view. */
  toggleView(): View {
    this.view = this.view === 'libre' ? 'tercera' : this.view === 'tercera' ? 'primera' : 'libre';
    return this.view;
  }

  startReading(): void {    this.savedCam = { yaw: this.yaw, dist: this.dist, height: this.height };
    this.mode = 'reading';
  }

  finishReading(): void {
    this.mode = 'returning';
    this.returnT = 0;
    this.fromPos.copy(this.camera.position);
    this.yaw = this.savedCam.yaw;
    this.dist = this.savedCam.dist;
    this.height = this.savedCam.height;
  }

  update(dt: number, char: THREE.Object3D): void {
    const cam = this.camera;
    const charPos = char.position;

    if (this.mode === 'reading') {
      const ry = char.rotation.y;
      const fx = Math.sin(ry);
      const fz = Math.cos(ry);
      const k = 1 - Math.exp(-5 * dt);
      cam.position.x += (charPos.x + fx * 2.6 - cam.position.x) * k;
      cam.position.y += (charPos.y + 1.6 - cam.position.y) * k;
      cam.position.z += (charPos.z + fz * 2.6 - cam.position.z) * k;
      cam.lookAt(charPos.x, charPos.y + 1, charPos.z);
    } else if (this.mode === 'returning') {
      this.returnT = Math.min(1, this.returnT + dt / 0.9);
      const k = this.returnT * this.returnT * (3 - 2 * this.returnT); // smoothstep
      this.positionView(this.tmp, char, dt);
      cam.position.set(
        this.fromPos.x + (this.tmp.x - this.fromPos.x) * k,
        this.fromPos.y + (this.tmp.y - this.fromPos.y) * k,
        this.fromPos.z + (this.tmp.z - this.fromPos.z) * k,
      );
      cam.lookAt(charPos.x, charPos.y + 1, charPos.z);
      if (this.returnT >= 1) this.mode = 'follow';
    } else if (this.view === 'primera') {
      // First person: eyes on the head looking at the view (moving is
      // relative to the camera). The body is hidden from the
      // CharacterController; the pet stays visible.
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const ox = charPos.x + fx * 0.5;
      const oy = charPos.y + this.eyeHeight;
      const oz = charPos.z + fz * 0.5;
      cam.position.set(ox, oy, oz);
      cam.lookAt(ox + fx * 10, oy, oz + fz * 10);
    } else {
      // Third and free share tracking (position + gaze at the character):
      // the difference lives in positionView (close and fixed vs the user's orbital).
      this.positionView(this.tmp, char, dt);
      cam.position.copy(this.tmp);
      cam.lookAt(charPos.x, charPos.y + 1, charPos.z);
    }
  }

  /**
   * Tracking position (third and free look at the character +1).
   * Third: same as free but close and behind your facing with delay,
   * not responding to drag or zoom. Free: user's orbital.
   */
  private positionView(out: THREE.Vector3, char: THREE.Object3D, dt: number): THREE.Vector3 {
    const charPos = char.position;
    if (this.view === 'tercera') {
      const ry = char.rotation.y;
      if (this.smoothYaw === null) this.smoothYaw = ry;
      let d = ry - this.smoothYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.smoothYaw += d * (1 - Math.exp(-3 * dt));
      // Negated: the camera goes BEHIND (free goes at the user's angle).
      return out.set(
        charPos.x - Math.sin(this.smoothYaw) * THIRD_PERSON_DIST,
        charPos.y + THIRD_PERSON_HEIGHT,
        charPos.z - Math.cos(this.smoothYaw) * THIRD_PERSON_DIST,
      );
    }
    return out.set(
      charPos.x + Math.sin(this.yaw) * this.dist,
      charPos.y + this.height,
      charPos.z + Math.cos(this.yaw) * this.dist,
    );
  }

  dispose(): void {
    this.disposers.forEach((d) => d());
    this.disposers = [];
  }
}
