import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  visibleGlasses,
  AvatarConfig,
  colorById,
  emblemVisible,
  AccessoryId,
  IdColor,
  skinById,
} from '../../core/avatar/avatar.models';

const BONE = '#F3EAFF';
const NIGHT = '#2D164A';
const PINK = '#FF2758';
const VIOLET_DEEP = '#6B21C9';
const GRAPHITE = '#4B4A57';

const isPink = (c: IdColor) => c === 'rosa' || c === 'rosa-pastel';

/** Accessories that cover the whole head (see `coversHead`). */
const COVER_HEAD: readonly AccessoryId[] = ['gorra', 'gorra-atras', 'beanie'];

/**
 * Student pixel-art sprite (05-design-system.md §4, `ui-avatar`).
 *
 * It is a 16×22 grid SVG with `shape-rendering: crispEdges`: it scales to any size
 * without losing the hard pixel-art edge and without needing a PNG atlas — the real art
 * (04-engine §8) can replace it later without touching the consumers, which only pass
 * `config` and `height`.
 *
 * It is used in four places with the same component: HUD (small), current island of the 2.5D map,
 * section board card (large, animated) and ranking.
 *
 * The template (`avatar-sprite.html`) paints one layer per `<g data-layer>`, in back-to-front
 * order. The rules for how parts coexist (what covers what, what contrasts with
 * what) are resolved here, in `computed`, so the template only draws.
 */
@Component({
  selector: 'ui-avatar-sprite',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block leading-none' },
  styles: `
    /* Walking step: the whole sprite stomps instead of animating the legs
       separately — at 16×22 px a real leg cycle is not legible. */
    @keyframes paso {
      0%, 100% { transform: translateY(0) }
      50%      { transform: translateY(-10%) }
    }
    .caminando { animation: paso 0.24s steps(2, end) infinite }

    /* Joy jump (section completed): arcade-style squash-stretch. It goes on a separate
       wrapper so as not to fight with the scaleX(-1) that orients the sprite on the <svg> itself. */
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
  /** Height in px of the sprite; the width is derived from the 16:22 aspect. */
  readonly height = input(64);
  readonly walking = input(false);
  /** Joy jump (e.g. on completing a section). Independent of `walking`. */
  readonly celebrating = input(false);
  readonly facing = input<'derecha' | 'izquierda'>('derecha');
  readonly shadow = input(false);
  readonly label = input('Tu avatar');

  protected readonly skin = computed(() => skinById(this.config().skin));
  protected readonly hair = computed(() => colorById(this.config().hairColor));
  protected readonly clothes = computed(() => colorById(this.config().clothesColor));
  protected readonly acc = computed(() => colorById(this.config().accessoryColor));

  /** The suit is a jumpsuit: legs the color of the clothing. With the other garments pants are worn. */
  protected readonly pants = computed(() => {
    const { garment, clothesColor } = this.config();
    if (garment === 'traje') return this.clothes().shadow;
    return clothesColor === 'noche' || clothesColor === 'negro' ? GRAPHITE : NIGHT;
  });

  /**
   * The shoes are the sprite's point of support on the island or the square: they are always
   * bone-colored, except with a bone suit (light legs), where a bone shoe disappears.
   */
  protected readonly shoes = computed(() => {
    const { garment, clothesColor } = this.config();
    return garment === 'traje' && clothesColor === 'hueso' ? NIGHT : BONE;
  });

  /** T-shirt peeking out under the open jacket: it must contrast with the jacket. */
  protected readonly tshirt = computed(() => (this.config().clothesColor === 'hueso' ? NIGHT : BONE));

  /** The tie comes in the brand pink, unless the shirt is already pink. */
  protected readonly tie = computed(() =>
    isPink(this.config().clothesColor) ? VIOLET_DEEP : PINK,
  );

  protected readonly showEmblem = computed(() => emblemVisible(this.config()));

  protected readonly showGlasses = computed(() => visibleGlasses(this.config()));

  /** Cap, backwards cap and beanie paint the whole helmet (rows 0-3) so that no
   *  hairstyle goes through them. */
  protected readonly coversHead = computed(() => COVER_HEAD.includes(this.config().accessory));

  /**
   * The emblem has to contrast against what is underneath, otherwise it disappears: the t-shirt
   * when the jacket is open, the clothing in the rest of the cases.
   */
  protected readonly emblemColor = computed(() => {
    const { garment, clothesColor } = this.config();
    // With the jacket open the emblem goes on the t-shirt, which is bone or night: never pink.
    if (garment === 'campera') return PINK;
    return isPink(clothesColor) ? BONE : PINK;
  });

  /**
   * When facing left the whole `<svg>` is mirrored with `scaleX(-1)`, and that would invert
   * glyphs like `λ` or `>_`. The emblem group is mirrored again to cancel it; since the
   * grid is symmetric about x=8, the emblem does not move from its place.
   */
  protected readonly counterMirror = computed(() =>
    this.facing() === 'izquierda' ? 'translate(16 0) scale(-1 1)' : null,
  );
}
