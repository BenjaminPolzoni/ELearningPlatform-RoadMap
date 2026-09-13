import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthMockService } from '../../core/auth/auth-mock.service';

/**
 * Contrato de mensajes que manda el build Web de Godot (3D/door_trigger.gd,
 * _notify_enter_unit) al host vía `window.parent.postMessage`.
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mundo-3d">
      <a class="cambiar-rol" (click)="cambiarRol()">⏻ Cambiar rol</a>
      <iframe
        title="Mundo 3D"
        [src]="godotBuildUrl"
        allow="autoplay; fullscreen; gamepad; pointer-lock"
        allowfullscreen
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
    .cambiar-rol {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 20;
      padding: 0.3rem 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 0.4rem;
      background: rgba(20, 20, 30, 0.65);
      color: #fff;
      font-size: 0.7rem;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }
    .cambiar-rol:hover {
      background: rgba(20, 20, 30, 0.85);
    }
  `,
})
export class Mundo3d implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly auth = inject(AuthMockService);

  // Herramienta de exploración 3D (Three.js) que trajo el equipo de 3D — ver 3D/city_generator.html.
  // Se sirve como asset estático en frontend/public/mundo-3d/ (copia manual por ahora).
  protected readonly godotBuildUrl: SafeResourceUrl =
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
}
