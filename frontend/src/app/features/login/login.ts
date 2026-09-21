import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthMockService, Role } from '../../core/auth/auth-mock.service';

interface RoleOption {
  role: Role;
  label: string;
  icon: string;
  desc: string;
  btnClass: string;
}

/** Mock login with a role selector (Phase 0). No credentials: you pick one and enter. */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="escena-neon fixed inset-0 grid place-items-center p-6">
      <div class="chaflan w-full max-w-lg border-2 border-primary bg-base-200/95 p-8 backdrop-blur shadow-[0_0_50px_rgba(139,92,246,0.3)]">
        <div class="flex flex-col items-center gap-5 text-center">
          <iframe
            title="Tu avatar"
            [src]="avatarPreviewUrl"
            class="h-[160px] w-[160px] border-0"
            style="background: transparent"
          ></iframe>
          <div>
            <h1 class="title-font text-4xl leading-tight text-primary drop-shadow-[0_0_14px_#FF2758]">
              EduQuest
            </h1>
            <p class="ui-font text-[10px] tracking-widest text-accent mt-1">ROADMAP Y PROGRESO GAMIFICADO</p>
          </div>
          <p class="text-sm opacity-80 -mt-2">Seleccioná qué vista querés abrir</p>

          <div class="flex w-full flex-col gap-3.5 mt-2">
            @for (opt of options; track opt.role) {
              <button
                class="btn h-auto py-3 px-4 flex items-center justify-between border-2 transition-all hover:scale-[1.02]"
                [class]="opt.btnClass"
                (click)="enter(opt.role)"
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
  private readonly sanitizer = inject(DomSanitizer);

  // ?v= prevents the browser from serving an old cached version of the static file.
  protected readonly avatarPreviewUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl('mundo-3d/avatar-preview.html?v=18');

  protected readonly options: RoleOption[] = [
    {
      role: 'ALUMNO',
      label: 'VISTA ALUMNO',
      icon: '🎓',
      desc: 'Mundo 3D explorable, biomas por unidad y mapa de desafíos',
      btnClass: 'btn-outline btn-primary hover:bg-primary/20',
    },
    {
      role: 'PROFESOR',
      label: 'VISTA PROFESOR',
      icon: '👨‍🏫',
      desc: 'Editor de unidades, contenidos y catálogo de insignias',
      btnClass: 'btn-outline btn-secondary hover:bg-secondary/20',
    },
    {
      role: 'ADMIN',
      label: 'VISTA ADMIN',
      icon: '⚙️',
      desc: 'Gestión institucional y auditoría del sistema',
      btnClass: 'btn-outline btn-accent hover:bg-accent/20',
    },
  ];

  protected enter(role: Role): void {
    this.auth.enterAs(role);
    if (role === 'ALUMNO') {
      this.router.navigate(['/alumno']);
    } else if (role === 'PROFESOR') {
      this.router.navigate(['/profesor']);
    } else {
      this.router.navigate(['/']);
    }
  }
}

