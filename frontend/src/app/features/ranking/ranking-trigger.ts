import { Component, signal } from '@angular/core';
import { RankingPanel } from './ranking-panel';

/**
 * Floating "HI-RANKING" button (E8). Single entry point to the ranking from any
 * screen with a session: it is mounted once in the shell and opens the `RankingPanel`. The
 * panel's content changes according to the role — this button is the same for everyone.
 *
 * The panel is loaded with `@defer` so as not to add the table, the detail or the fixture to the
 * initial bundle: it only downloads when the button is opened.
 */
@Component({
  selector: 'app-ranking-trigger',
  imports: [RankingPanel],
  template: `
    <button
      type="button"
      class="rk-hiscore"
      aria-label="Ver el ranking de la cohorte"
      (click)="isOpen.set(true)"
    >
      <span class="rk-hiscore__mark" aria-hidden="true">&#9656;</span>
      <span class="rk-hiscore__text">HI-RANKING</span>
    </button>

    @defer (when isOpen()) {
      @if (isOpen()) {
        <app-ranking-panel (close)="isOpen.set(false)" />
      }
    }
  `,
})
export class RankingTrigger {
  protected readonly isOpen = signal(false);
}
