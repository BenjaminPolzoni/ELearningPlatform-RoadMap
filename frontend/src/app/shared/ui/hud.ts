import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from './avatar-sprite';
import { Lives } from './lives';
import { Racha } from '../../features/alumno/racha';
import { XpBar } from './xp-bar';

/**
 * HUD del alumno (05-design-system.md §4, `ui-hud`): avatar + nivel + XP + vidas + racha.
 * Va flotando sobre el mapa 2.5D y sobre el tablero de unidad, en la misma posición en
 * ambas vistas — al entrar a una unidad el jugador no debería tener que buscarlo.
 */
@Component({
  selector: 'ui-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, XpBar, Lives, Racha, RouterLink],
  host: { class: 'block' },
  template: `
    <div
      class="chaflan flex items-center gap-3 border-2 border-secondary bg-base-200/85 px-3 py-2 backdrop-blur-sm"
    >
      <!-- el busto del avatar recorta el sprite de cuerpo entero a cabeza+torso -->
      <a
        routerLink="/alumno/avatar"
        class="grid h-14 w-14 shrink-0 place-items-start justify-center overflow-hidden border-2 border-primary bg-base-100 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        [attr.aria-label]="'Personalizar avatar'"
        title="Personalizar avatar"
      >
        <ui-avatar-sprite [config]="avatar.avatar()" [alto]="86" />
      </a>

      <div class="min-w-44">
        <ui-xp-bar [xp]="xp()" />
        <div class="mt-2 flex items-center gap-3">
          <ui-lives [vidas]="vidas()" />
          <!-- Racha (PR #1 insignias): venía en el header plano del mapa, que el HUD reemplazó. -->
          <app-racha />
          <span class="ui-font text-[8px] tabular opacity-60">{{ xp() }} XP TOTAL</span>
        </div>
      </div>
    </div>
  `,
})
export class Hud {
  readonly xp = input.required<number>();
  readonly vidas = input.required<number>();

  protected readonly avatar = inject(AvatarService);
}
