import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthMockService, Rol } from '../../core/auth/auth-mock.service';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

interface RoleOption {
  rol: Rol;
  label: string;
  icon: string;
  desc: string;
  btnClass: string;
}

/** Login mock con selector de rol (Fase 0). Sin credenciales: se elige y se entra. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite],
  template: `
    <div class="escena-neon fixed inset-0 grid place-items-center p-6">
      <div class="chaflan w-full max-w-lg border-2 border-primary bg-base-200/95 p-8 backdrop-blur shadow-[0_0_50px_rgba(139,92,246,0.3)]">
        <div class="flex flex-col items-center gap-5 text-center">
          <ui-avatar-sprite
            [config]="avatar.avatar()"
            [alto]="120"
            [sombra]="true"
            [caminando]="true"
            etiqueta="Personaje del roadmap"
          />
          <div>
            <h1 class="title-font text-4xl leading-tight text-primary drop-shadow-[0_0_14px_#FF2758]">
              EduQuest
            </h1>
            <p class="ui-font text-[10px] tracking-widest text-accent mt-1">ROADMAP Y PROGRESO GAMIFICADO</p>
          </div>
          <p class="text-sm opacity-80 -mt-2">Seleccioná qué vista querés abrir</p>

          <div class="flex w-full flex-col gap-3.5 mt-2">
            @for (opt of opciones; track opt.rol) {
              <button
                class="btn h-auto py-3 px-4 flex items-center justify-between border-2 transition-all hover:scale-[1.02]"
                [class]="opt.btnClass"
                (click)="entrar(opt.rol)"
              >
                <div class="flex items-center gap-3 text-left">
                  <span class="text-3xl">{{ opt.icon }}</span>
                  <div>
                    <div class="title-font text-xs">{{ opt.label }}</div>
                    <div class="text-[11px] opacity-70 normal-case font-normal">{{ opt.desc }}</div>
                  </div>
                </div>
                <span class="ui-font text-[9px] opacity-60">INGRESAR ➔</span>
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

  protected readonly opciones: RoleOption[] = [
    {
      rol: 'ALUMNO',
      label: 'VISTA ALUMNO',
      icon: '🎓',
      desc: 'Consola arcade interactiva, mapa 2.5D, joystick y ranking',
      btnClass: 'btn-outline btn-primary hover:bg-primary/20',
    },
    {
      rol: 'PROFESOR',
      label: 'VISTA PROFESOR',
      icon: '👨‍🏫',
      desc: 'Editor de unidades, contenidos y catálogo de insignias',
      btnClass: 'btn-outline btn-secondary hover:bg-secondary/20',
    },
    {
      rol: 'ADMIN',
      label: 'VISTA ADMIN',
      icon: '⚙️',
      desc: 'Gestión institucional y auditoría del sistema',
      btnClass: 'btn-outline btn-accent hover:bg-accent/20',
    },
  ];

  protected entrar(rol: Rol): void {
    this.auth.entrarComo(rol);
    if (rol === 'ALUMNO') {
      this.router.navigate(['/alumno']);
    } else if (rol === 'PROFESOR') {
      this.router.navigate(['/profesor']);
    } else {
      this.router.navigate(['/']);
    }
  }
}

