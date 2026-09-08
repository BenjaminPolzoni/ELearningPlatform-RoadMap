import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService, Rol } from '../../core/auth/auth-mock.service';

/** Login mock con selector de rol (Fase 0). Sin credenciales: se elige y se entra. */
@Component({
  selector: 'app-login',
  template: `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="card bg-base-200 border-2 border-primary w-full max-w-md">
        <div class="card-body items-center text-center gap-6">
          <h1 class="title-font text-primary text-sm leading-loose">ROADMAP<br />Y PROGRESO</h1>
          <p class="opacity-70">Elegí con qué rol entrar al mock</p>
          <div class="flex flex-col gap-3 w-full">
            @for (rol of roles; track rol) {
              <button class="btn btn-outline btn-primary ui-font" (click)="entrar(rol)">{{ rol }}</button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthMockService);
  private readonly router = inject(Router);

  protected readonly roles: Rol[] = ['PROFESOR', 'ALUMNO', 'ADMIN'];

  protected entrar(rol: Rol): void {
    this.auth.entrarComo(rol);
    this.router.navigate(['/']);
  }
}
