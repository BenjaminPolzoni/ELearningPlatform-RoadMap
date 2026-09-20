import * as THREE from 'three';

export type CameraMode = 'follow' | 'reading' | 'returning';

/** Vista de la cámara: tercera (desde atrás), primera (en la cabeza) o libre (orbital). */
export type Vista = 'tercera' | 'primera' | 'libre';

/**
 * Yaw base del movimiento: en tercera se mueve relativo al frente del personaje
 * (el +π invierte la convención del yaw de cámara, que mira hacia el personaje);
 * en el resto, relativo a la cámara como siempre.
 */
export function yawMovimiento(vista: Vista, camYaw: number, facingYaw: number): number {
  return vista === 'tercera' ? facingYaw + Math.PI : camYaw;
}

// Encuadre cercano y fijo de la tercera (la libre usa yaw/dist/height del usuario).
const TERCERA_DIST = 5.5;
const TERCERA_ALTURA = 3.2;

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public yaw = -Math.PI / 2; // mirar al este por defecto
  public dist = 10;
  public height = 6;
  public mode: CameraMode = 'follow';
  public vista: Vista = 'libre';
  /** Altura de los ojos sobre los pies (la fija el mundo según la escala real). */
  public alturaOjos = 1.2;

  private returnT = 0;
  private fromPos = new THREE.Vector3();
  private savedCam = { yaw: -Math.PI / 2, dist: 10, height: 6 };
  private disposers: (() => void)[] = [];
  /** Facing suavizado para la tercera: la cámara va detrás sin latigazo. */
  private suaveYaw: number | null = null;
  private tmp = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 300);
  }

  bindInput(canvas: HTMLCanvasElement, onResize?: (w: number, h: number) => void): void {
    let drag = false;
    let lx = 0;
    let ly = 0;

    // Cámara con botón izquierdo (o táctil): el derecho mueve al personaje
    const pd = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const pm = (e: PointerEvent): void => {
      // Tercera es fija al hombro: no se mueve. Primera gira la vista (yaw);
      // libre además sube/baja la altura.
      if (!drag || this.mode !== 'follow' || this.vista === 'tercera') return;
      this.yaw -= (e.clientX - lx) * 0.005;
      if (this.vista === 'libre') {
        this.height = Math.min(12, Math.max(2, this.height + (e.clientY - ly) * 0.02));
      }
      lx = e.clientX;
      ly = e.clientY;
    };

    const pu = (): void => {
      drag = false;
    };

    const wh = (e: WheelEvent): void => {
      if (this.mode !== 'follow' || this.vista !== 'libre') return;
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

    // Sin menú del navegador: el botón derecho mueve al personaje
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

  /** Conmuta en orden Libre → Tercera → Primera; devuelve la vista activa. */
  alternarVista(): Vista {
    this.vista = this.vista === 'libre' ? 'tercera' : this.vista === 'tercera' ? 'primera' : 'libre';
    return this.vista;
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
      this.posicionVista(this.tmp, char, dt);
      cam.position.set(
        this.fromPos.x + (this.tmp.x - this.fromPos.x) * k,
        this.fromPos.y + (this.tmp.y - this.fromPos.y) * k,
        this.fromPos.z + (this.tmp.z - this.fromPos.z) * k,
      );
      cam.lookAt(charPos.x, charPos.y + 1, charPos.z);
      if (this.returnT >= 1) this.mode = 'follow';
    } else if (this.vista === 'primera') {
      // Primera persona: ojos en la cabeza mirando a la vista (moverse es
      // relativo a la cámara). El cuerpo se oculta desde el
      // CharacterController; la mascota queda visible.
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const ox = charPos.x + fx * 0.5;
      const oy = charPos.y + this.alturaOjos;
      const oz = charPos.z + fz * 0.5;
      cam.position.set(ox, oy, oz);
      cam.lookAt(ox + fx * 10, oy, oz + fz * 10);
    } else {
      // Tercera y libre comparten seguimiento (posición + mirada al personaje):
      // la diferencia vive en posicionVista (cerca y fija vs orbital del usuario).
      this.posicionVista(this.tmp, char, dt);
      cam.position.copy(this.tmp);
      cam.lookAt(charPos.x, charPos.y + 1, charPos.z);
    }
  }

  /**
   * Posición de seguimiento (tercera y libre miran al personaje +1).
   * Tercera: igual que la libre pero cerca y detrás de tu facing con retardo,
   * sin responder a arrastre ni zoom. Libre: orbital del usuario.
   */
  private posicionVista(out: THREE.Vector3, char: THREE.Object3D, dt: number): THREE.Vector3 {
    const charPos = char.position;
    if (this.vista === 'tercera') {
      const ry = char.rotation.y;
      if (this.suaveYaw === null) this.suaveYaw = ry;
      let d = ry - this.suaveYaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.suaveYaw += d * (1 - Math.exp(-3 * dt));
      // Negado: la cámara va DETRÁS (la libre va al ángulo del usuario).
      return out.set(
        charPos.x - Math.sin(this.suaveYaw) * TERCERA_DIST,
        charPos.y + TERCERA_ALTURA,
        charPos.z - Math.cos(this.suaveYaw) * TERCERA_DIST,
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
