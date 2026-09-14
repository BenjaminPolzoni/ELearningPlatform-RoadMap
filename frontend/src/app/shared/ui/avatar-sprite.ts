import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarConfig, colorPorId, pielPorId } from '../../core/avatar/avatar.models';

/**
 * Sprite pixel-art del alumno (05-design-system.md §4, `ui-avatar`).
 *
 * Es un SVG de grilla 16×22 con `shape-rendering: crispEdges`: escala a cualquier tamaño
 * sin perder el borde duro del pixel-art y sin necesitar un atlas de PNGs — el arte real
 * (04-engine §8) puede reemplazarlo después sin tocar a los consumidores, que solo pasan
 * `config` y `alto`.
 *
 * Se usa en tres lugares con el mismo componente: HUD (chico), isla actual del mapa 2.5D
 * y ficha del tablero de unidad (grande, animado).
 */
@Component({
  selector: 'ui-avatar-sprite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block leading-none' },
  styles: `
    /* Paso de caminata: el sprite entero pisa fuerte en lugar de animar las piernas por
       separado — a 16×22 px un ciclo de piernas real no se lee. */
    @keyframes paso {
      0%, 100% { transform: translateY(0) }
      25%      { transform: translateY(-8%) }
      50%      { transform: translateY(0) }
      75%      { transform: translateY(-4%) }
    }
    .caminando { animation: paso 0.42s steps(4, end) infinite }

    /* Salto de alegría (unidad completada): squash-stretch tipo arcade. Va en un wrapper
       aparte para no pelear con el scaleX(-1) que orienta el sprite sobre el propio <svg>. */
    @keyframes salto-alegria {
      0%   { transform: translateY(0) scaleY(1); }
      20%  { transform: translateY(2%) scaleY(0.82); }
      50%  { transform: translateY(-38%) scaleY(1.12); }
      75%  { transform: translateY(0) scaleY(0.88); }
      100% { transform: translateY(0) scaleY(1); }
    }
    .celebrando { display: inline-block; animation: salto-alegria 0.75s ease-in-out 4; transform-origin: 50% 100%; }

    @media (prefers-reduced-motion: reduce) {
      .caminando, .celebrando { animation: none }
    }
  `,
  template: `
    <span [class.celebrando]="celebrando()">
    <svg
      [attr.height]="alto()"
      viewBox="0 0 16 22"
      class="pixelado overflow-visible"
      [class.caminando]="caminando()"
      [style.width.px]="alto() * (16 / 22)"
      [style.transform]="mirando() === 'izquierda' ? 'scaleX(-1)' : null"
      role="img"
      [attr.aria-label]="etiqueta()"
    >
      <!-- sombra en el piso: ancla el sprite sobre la isla / el casillero -->
      @if (sombra()) {
        <ellipse cx="8" cy="22" rx="6" ry="1.4" fill="#0E0120" opacity="0.55" />
      }

      <!-- piernas y zapatos -->
      <rect x="4" y="17" width="3" height="4" [attr.fill]="traje().sombra" />
      <rect x="9" y="17" width="3" height="4" [attr.fill]="traje().sombra" />
      <rect x="3" y="21" width="4" height="1" [attr.fill]="zapatos()" />
      <rect x="9" y="21" width="4" height="1" [attr.fill]="zapatos()" />

      <!-- torso, brazos y manos -->
      <rect x="4" y="11" width="8" height="6" [attr.fill]="traje().base" />
      <rect x="2" y="11" width="2" height="5" [attr.fill]="traje().sombra" />
      <rect x="12" y="11" width="2" height="5" [attr.fill]="traje().sombra" />
      <rect x="2" y="16" width="2" height="1" [attr.fill]="piel().base" />
      <rect x="12" y="16" width="2" height="1" [attr.fill]="piel().base" />
      <!-- emblema del pecho: el rosa de marca, salvo que el traje ya sea rosa -->
      <rect x="7" y="13" width="2" height="2" [attr.fill]="emblema()" />

      <!-- cabeza -->
      <rect x="4" y="3" width="8" height="7" [attr.fill]="piel().base" />
      <rect x="4" y="9" width="8" height="1" [attr.fill]="piel().sombra" />
      <rect x="5" y="6" width="2" height="2" fill="#190236" />
      <rect x="9" y="6" width="2" height="2" fill="#190236" />
      <rect x="5" y="6" width="1" height="1" fill="#F3EAFF" />
      <rect x="9" y="6" width="1" height="1" fill="#F3EAFF" />
      <rect x="7" y="8" width="2" height="1" [attr.fill]="piel().sombra" />

      <!-- pelo -->
      @switch (config().pelo) {
        @case ('corto') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('largo') {
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().base" />
          <rect x="3" y="3" width="1" height="8" [attr.fill]="pelo().base" />
          <rect x="12" y="3" width="1" height="8" [attr.fill]="pelo().sombra" />
          <rect x="4" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="11" y="4" width="1" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('cresta') {
          <rect x="7" y="0" width="2" height="3" [attr.fill]="pelo().base" />
          <rect x="6" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="9" y="1" width="1" height="2" [attr.fill]="pelo().sombra" />
          <rect x="4" y="2" width="8" height="2" [attr.fill]="pelo().sombra" />
        }
        @case ('rapado') {
          <rect x="4" y="2" width="8" height="1" [attr.fill]="pelo().sombra" />
        }
        @case ('afro') {
          <rect x="3" y="1" width="10" height="3" [attr.fill]="pelo().base" />
          <rect x="2" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="13" y="2" width="1" height="4" [attr.fill]="pelo().sombra" />
          <rect x="4" y="0" width="8" height="1" [attr.fill]="pelo().base" />
        }
      }

      <!-- accesorio: siempre por encima del pelo -->
      @switch (config().accesorio) {
        @case ('visor') {
          <rect x="3" y="5" width="10" height="3" [attr.fill]="acc().base" opacity="0.85" />
          <rect x="3" y="5" width="10" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('gorra') {
          <rect x="3" y="1" width="10" height="2" [attr.fill]="acc().base" />
          <rect x="3" y="3" width="10" height="1" [attr.fill]="acc().sombra" />
          <rect x="0" y="3" width="4" height="1" [attr.fill]="acc().base" />
        }
        @case ('corona') {
          <rect x="4" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="7" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="10" y="0" width="2" height="2" [attr.fill]="acc().base" />
          <rect x="4" y="2" width="8" height="1" [attr.fill]="acc().sombra" />
        }
        @case ('auriculares') {
          <rect x="4" y="0" width="8" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="12" y="1" width="2" height="1" [attr.fill]="acc().base" />
          <rect x="2" y="2" width="2" height="5" [attr.fill]="acc().base" />
          <rect x="12" y="2" width="2" height="5" [attr.fill]="acc().sombra" />
        }
      }
    </svg>
    </span>
  `,
})
export class AvatarSprite {
  readonly config = input.required<AvatarConfig>();
  /** Alto en px del sprite; el ancho se deriva del aspect 16:22. */
  readonly alto = input(64);
  readonly caminando = input(false);
  /** Salto de alegría (ej. al completar una unidad). Independiente de `caminando`. */
  readonly celebrando = input(false);
  readonly mirando = input<'derecha' | 'izquierda'>('derecha');
  readonly sombra = input(false);
  readonly etiqueta = input('Tu avatar');

  protected readonly piel = computed(() => pielPorId(this.config().piel));
  protected readonly pelo = computed(() => colorPorId(this.config().colorPelo));
  protected readonly traje = computed(() => colorPorId(this.config().colorTraje));
  protected readonly acc = computed(() => colorPorId(this.config().colorAccesorio));

  /** El emblema tiene que contrastar contra el traje, si no desaparece. */
  protected readonly emblema = computed(() =>
    this.config().colorTraje === 'rosa' ? '#F3EAFF' : '#FF2758',
  );

  /**
   * Los zapatos son el punto de apoyo del sprite sobre la isla o el casillero: si se
   * pintan del tono oscuro del traje, con traje "noche" el personaje queda sin pies
   * contra el fondo. Van siempre en hueso, salvo que el traje ya sea hueso.
   */
  protected readonly zapatos = computed(() =>
    this.config().colorTraje === 'hueso' ? '#2D164A' : '#F3EAFF',
  );
}
