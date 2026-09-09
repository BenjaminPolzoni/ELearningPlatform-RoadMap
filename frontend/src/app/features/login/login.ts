import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService, Rol } from '../../core/auth/auth-mock.service';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

/** Login mock con selector de rol (Fase 0). Sin credenciales: se elige y se entra. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite],
  template: `
    <div class="escena-neon fixed inset-0 grid place-items-center p-6">
      <div class="chaflan w-full max-w-md border-2 border-primary bg-base-200/90 p-8 backdrop-blur">
        <div class="flex flex-col items-center gap-5 text-center">
          <ui-avatar-sprite
            [config]="avatar.avatar()"
            [alto]="110"
            [sombra]="true"
            [caminando]="true"
            etiqueta="Personaje del roadmap"
          />
          <h1 class="title-font text-4xl leading-tight text-primary drop-shadow-[0_0_14px_#FF2758]">
            Roadmap
          </h1>
          <p class="ui-font -mt-3 text-[9px] tracking-widest text-accent">Y PROGRESO</p>
          <p class="text-sm opacity-70">Elegí con qué rol entrar al mock</p>

          <div class="flex w-full flex-col gap-3">
            @for (rol of roles; track rol) {
              <button class="btn btn-outline btn-primary ui-font text-[9px]" (click)="entrar(rol)">
                {{ rol }}
              </button>
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
  protected readonly avatar = inject(AvatarService);

  protected readonly roles: Rol[] = ['PROFESOR', 'ALUMNO', 'ADMIN'];

  protected entrar(rol: Rol): void {
    this.auth.entrarComo(rol);
    this.router.navigate(['/']);
  }
}
