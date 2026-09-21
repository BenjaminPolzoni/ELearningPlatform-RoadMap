import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from './avatar-sprite';
import { Lives } from './lives';
import { Streak } from '../../features/student/streak';
import { XpBar } from './xp-bar';

/**
 * Student HUD (05-design-system.md §4, `ui-hud`): avatar + level + XP + lives + streak.
 * It floats over the 2.5D map and over the section board, in the same position in
 * both views — on entering a section the player should not have to look for it.
 */
@Component({
  selector: 'ui-hud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, XpBar, Lives, Streak, RouterLink],
  host: { class: 'block' },
  template: `
    <div
      class="chaflan flex items-center gap-3 border-2 border-secondary bg-base-200/85 px-3 py-2 backdrop-blur-sm"
    >
      <!-- the avatar bust crops the full-body sprite to head+torso -->
      <a
        routerLink="/alumno/avatar"
        class="grid h-14 w-14 shrink-0 place-items-start justify-center overflow-hidden border-2 border-primary bg-base-100 transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        [attr.aria-label]="'Personalizar avatar'"
        title="Personalizar avatar"
      >
        <ui-avatar-sprite [config]="avatar.avatar()" [height]="86" />
      </a>

      <div class="min-w-44">
        <ui-xp-bar [xp]="xp()" />
        <div class="mt-2 flex items-center gap-3">
          <ui-lives [lives]="lives()" />
          <!-- Streak (PR #1 badges): it used to be in the map's flat header, which the HUD replaced. -->
          <app-streak />
          <span class="ui-font text-[8px] tabular opacity-60">{{ xp() }} XP TOTAL</span>
        </div>
      </div>
    </div>
  `,
})
export class Hud {
  readonly xp = input.required<number>();
  readonly lives = input.required<number>();

  protected readonly avatar = inject(AvatarService);
}
