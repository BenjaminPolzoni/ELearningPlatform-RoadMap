import { Component, signal } from '@angular/core';
import { RankingPanel } from './ranking-panel';

/**
 * Botón flotante "HI-RANKING" (E8). Único punto de entrada al ranking desde cualquier
 * pantalla con sesión: se monta una vez en el shell y abre el `RankingPanel`. El
 * contenido del panel cambia según el rol — este botón es igual para todos.
 *
 * El panel se carga con `@defer` para no sumar la tabla, el detalle ni el fixture al
 * bundle inicial: recién baja al abrir el botón.
 */
@Component({
  selector: 'app-ranking-trigger',
  imports: [RankingPanel],
  template: `
    <button
      type="button"
      class="rk-hiscore"
      aria-label="Ver el ranking de la cohorte"
      (click)="abierto.set(true)"
    >
      <span class="rk-hiscore__mark" aria-hidden="true">&#9656;</span>
      <span class="rk-hiscore__text">HI-RANKING</span>
    </button>

    @defer (when abierto()) {
      @if (abierto()) {
        <app-ranking-panel (cerrar)="abierto.set(false)" />
      }
    }
  `,
})
export class RankingTrigger {
  protected readonly abierto = signal(false);
}
