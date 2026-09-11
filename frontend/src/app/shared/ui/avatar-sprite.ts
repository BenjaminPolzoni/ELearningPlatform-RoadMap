import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  anteojosVisibles,
  AvatarConfig,
  colorPorId,
  emblemaVisible,
  IdColor,
  pielPorId,
} from '../../core/avatar/avatar.models';

const HUESO = '#F3EAFF';
const NOCHE = '#2D164A';
const ROSA = '#FF2758';
const VIOLETA_PROFUNDO = '#6B21C9';
const GRAFITO = '#4B4A57';

const esRosa = (c: IdColor) => c === 'rosa' || c === 'rosa-pastel';

/**
 * Sprite pixel-art del alumno (05-design-system.md §4, `ui-avatar`).
 *
 * Es un SVG de grilla 16×22 con `shape-rendering: crispEdges`: escala a cualquier tamaño
 * sin perder el borde duro del pixel-art y sin necesitar un atlas de PNGs — el arte real
 * (04-engine §8) puede reemplazarlo después sin tocar a los consumidores, que solo pasan
 * `config` y `alto`.
 *
 * Se usa en cuatro lugares con el mismo componente: HUD (chico), isla actual del mapa 2.5D,
 * ficha del tablero de unidad (grande, animado) y ranking.
 *
 * El template (`avatar-sprite.html`) pinta una capa por `<g data-capa>`, en orden de atrás
 * hacia adelante. Las reglas de convivencia entre partes (qué tapa a qué, qué contrasta con
 * qué) se resuelven acá, en `computed`, para que el template solo dibuje.
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
  templateUrl: './avatar-sprite.html',
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
  protected readonly ropa = computed(() => colorPorId(this.config().colorRopa));
  protected readonly acc = computed(() => colorPorId(this.config().colorAccesorio));

  /** El traje es un mono: piernas del color de la ropa. Con las demás prendas va pantalón. */
  protected readonly pantalon = computed(() => {
    const { prenda, colorRopa } = this.config();
    if (prenda === 'traje') return this.ropa().sombra;
    return colorRopa === 'noche' || colorRopa === 'negro' ? GRAFITO : NOCHE;
  });

  /**
   * Los zapatos son el punto de apoyo del sprite sobre la isla o el casillero: van siempre
   * en hueso, salvo con un traje hueso (piernas claras), donde un zapato hueso desaparece.
   */
  protected readonly zapatos = computed(() => {
    const { prenda, colorRopa } = this.config();
    return prenda === 'traje' && colorRopa === 'hueso' ? NOCHE : HUESO;
  });

  /** Remera que asoma debajo de la campera abierta: tiene que contrastar con la campera. */
  protected readonly remera = computed(() => (this.config().colorRopa === 'hueso' ? NOCHE : HUESO));

  /** La corbata va en el rosa de marca, salvo que la camisa ya sea rosa. */
  protected readonly corbata = computed(() =>
    esRosa(this.config().colorRopa) ? VIOLETA_PROFUNDO : ROSA,
  );

  protected readonly mostrarEmblema = computed(() => emblemaVisible(this.config()));

  protected readonly mostrarAnteojos = computed(() => anteojosVisibles(this.config()));

  /**
   * El emblema tiene que contrastar contra lo que tiene debajo, si no desaparece: la remera
   * cuando la campera está abierta, la ropa en el resto de los casos.
   */
  protected readonly colorEmblema = computed(() => {
    const { prenda, colorRopa } = this.config();
    const fondo: IdColor =
      prenda === 'campera' ? (colorRopa === 'hueso' ? 'noche' : 'hueso') : colorRopa;
    return esRosa(fondo) ? HUESO : ROSA;
  });

  /**
   * Mirando a la izquierda el `<svg>` entero se espeja con `scaleX(-1)`, y eso invertiría
   * glifos como `λ` o `>_`. El grupo del emblema se vuelve a espejar para anularlo; como la
   * grilla es simétrica respecto de x=8, el emblema no se mueve de lugar.
   */
  protected readonly contraEspejo = computed(() =>
    this.mirando() === 'izquierda' ? 'translate(16 0) scale(-1 1)' : null,
  );
}
