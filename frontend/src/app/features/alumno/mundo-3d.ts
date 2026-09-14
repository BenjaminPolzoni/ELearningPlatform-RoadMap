import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { XP_POR_DIFICULTAD } from '../../core/data/roadmap.models';

/**
 * Contrato de mensajes que manda la escena Three.js al host vía
 * `window.parent.postMessage` cuando el jugador entra a una unidad.
 */
interface MensajeMundo3d {
  type: 'enterUnit';
  unitId: string;
}

function esMensajeMundo3d(data: unknown): data is MensajeMundo3d {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { type?: unknown }).type === 'enterUnit' &&
    typeof (data as { unitId?: unknown }).unitId === 'string'
  );
}

@Component({
  selector: 'app-mundo-3d',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mundo-3d">
      <div class="acciones-rol">
        @if (auth.rol() === 'PROFESOR') {
          <a routerLink="/profesor" class="btn-volver" title="Volver al editor del curso">← Editor</a>
        }
        <a class="cambiar-rol" (click)="cambiarRol()">⏻ Cambiar rol</a>
      </div>
      <iframe
        #frame
        title="Mundo 3D"
        [src]="mundo3dUrl"
        allow="autoplay; fullscreen; gamepad; pointer-lock"
        allowfullscreen
        (load)="onFrameLoad()"
      ></iframe>
    </div>
  `,
  styles: `
    .mundo-3d {
      position: fixed;
      inset: 0;
      background: #000;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .acciones-rol {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 20;
      display: flex;
      gap: 0.4rem;
    }
    .cambiar-rol,
    .btn-volver {
      padding: 0.3rem 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0.4rem;
      background: rgba(20, 20, 30, 0.65);
      color: #fff;
      font-size: 0.7rem;
      cursor: pointer;
      backdrop-filter: blur(4px);
      text-decoration: none;
    }
    .cambiar-rol:hover,
    .btn-volver:hover {
      background: rgba(20, 20, 30, 0.85);
    }
  `,
})
export class Mundo3d implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthMockService);
  private readonly store = inject(RoadmapStore);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  // Herramienta de exploración 3D (Three.js) que trajo el equipo de 3D — ver 3D/city_generator.html.
  // Se sirve como asset estático en frontend/public/mundo-3d/ (copia manual por ahora).
  protected readonly mundo3dUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('mundo-3d/index.html');

  private readonly onMensaje = (evento: MessageEvent): void => {
    if (esMensajeMundo3d(evento.data)) {
      this.router.navigate(['/alumno/unidad', evento.data.unitId]);
    }
  };

  ngOnInit(): void {
    window.addEventListener('message', this.onMensaje);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMensaje);
  }

  protected cambiarRol(): void {
    this.auth.salir();
    this.router.navigate(['/login']);
  }

  // Contador, no boolean: un iframe sin `src` todavía dispara un `load` "fantasma"
  // sobre `about:blank` ANTES de que Angular termine de aplicar el binding `[src]`
  // (que navega recién en el próximo ciclo de detección de cambios). Con un boolean,
  // ese primer load ponía `cargado=true` y el `effect` mandaba el mensaje a esa
  // ventana fantasma que estaba por descartarse; cuando el iframe real terminaba de
  // cargar y disparaba SU propio `load`, `cargado` ya era `true` → la señal no
  // cambiaba de valor → el `effect` nunca se volvía a ejecutar → el mundo 3D real
  // jamás recibía las unidades/XP/vidas (se quedaba con los valores por defecto).
  private readonly cargas = signal(0);

  protected onFrameLoad(): void {
    this.cargas.update((n) => n + 1);
  }

  /**
   * Le manda al visor las unidades reales del curso (id, nombre, orden, bioma, si ya
   * está resuelta) más el xp/vidas vigentes del alumno — reemplaza al mapa de biomas
   * hardcodeado/local que traía el prototipo 3D y alimenta la ficha del explorador
   * (vidas, XP, contador de unidades resueltas). Un `effect` en vez de un solo envío
   * al `load` del iframe: así la ficha se actualiza sola si el alumno vuelve al mundo
   * 3D después de sumar XP o resolver una unidad en otra pantalla.
   */
  private readonly sincronizarEstado = effect(() => {
    if (this.cargas() === 0) return;
    const contentWindow = this.frame()?.nativeElement.contentWindow;
    if (!contentWindow) return;

    const progreso = this.store.progreso();
    const completados = new Set(
      (progreso?.nodos ?? []).filter((n) => n.estado === 'completado').map((n) => n.nodoId),
    );
    // Misma definición de "unidad resuelta" que el mapa 2D (mapa.ts `islas`): solo mira
    // las actividades obligatorias, así una "Práctica libre" opcional sin hacer no la traba.
    const unidades = this.store.unidades().map((u) => {
      const obligatorias = u.actividades.filter((a) => a.esObligatorio);
      const resuelta = obligatorias.length > 0 && obligatorias.every((a) => completados.has(a.id));
      // Actividades viejas (de antes de que el editor pidiera dificultad al crearlas)
      // pueden no tenerla guardada — tratarlas como BASICO en vez de 0 XP, así no
      // quedan invisibles para el cálculo de progreso de la unidad.
      const xpDe = (a: (typeof u.actividades)[number]) => XP_POR_DIFICULTAD[a.dificultad ?? 'BASICO'];
      // XP de ESTA unidad (no el total del alumno): cuánto ganó de sus desafíos vs. cuánto
      // ganaría completando todos — es lo que muestra la ficha para la unidad en curso.
      const xpUnidad = u.actividades.filter((a) => completados.has(a.id)).reduce((sum, a) => sum + xpDe(a), 0);
      const xpUnidadMax = u.actividades.reduce((sum, a) => sum + xpDe(a), 0);
      return {
        id: u.id,
        nombre: u.nombre,
        orden: u.orden,
        bioma: u.bioma,
        resuelta,
        umbralXpDesbloqueo: u.umbralXpDesbloqueo,
        xpUnidad,
        xpUnidadMax,
      };
    });

    contentWindow.postMessage(
      {
        type: 'setUnidades',
        unidades,
        xpTotal: progreso?.xpTotal ?? 0,
        vidasVigentes: progreso?.vidasVigentes ?? 3,
      },
      '*',
    );
  });
}
