import { TestBed } from '@angular/core/testing';
import {
  ACCESSORIES,
  GLASSES,
  AvatarConfig,
  defaultAvatar,
  BEARDS,
  EMBLEMS,
  GenderId,
  OBJECTS,
  HAIRSTYLES,
  GARMENTS,
} from '../../core/avatar/avatar.models';
import { AvatarSprite } from './avatar-sprite';

function draw(
  changes: Partial<AvatarConfig> = {},
  facing: 'derecha' | 'izquierda' = 'derecha',
): HTMLElement {
  const f = TestBed.createComponent(AvatarSprite);
  f.componentRef.setInput('config', { ...defaultAvatar('indefinido'), ...changes });
  f.componentRef.setInput('facing', facing);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const layer = (el: HTMLElement, name: string) =>
  el.querySelector<SVGGElement>(`[data-capa="${name}"]`);
const pixels = (el: HTMLElement, name: string) =>
  layer(el, name)?.querySelectorAll('rect').length ?? 0;
const fills = (el: HTMLElement, name: string) =>
  [...(layer(el, name)?.querySelectorAll('rect') ?? [])].map((r) => r.getAttribute('fill'));

const GENDERS_IDS: GenderId[] = ['mujer', 'varon', 'indefinido'];

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [AvatarSprite] }).compileComponents();
});

describe('AvatarSprite — silhouettes', () => {
  it.each(GENDERS_IDS)('marca la silueta %s', (gender) => {
    expect(layer(draw({ gender }), 'torso')?.getAttribute('data-silueta')).toBe(gender);
  });

  it('only the female has eyelashes and only the male eyebrows', () => {
    const mujer = draw({ gender: 'mujer' });
    const varon = draw({ gender: 'varon' });
    const indefinido = draw({ gender: 'indefinido' });
    expect(layer(mujer, 'pestanas')).not.toBeNull();
    expect(layer(mujer, 'cejas')).toBeNull();
    expect(layer(varon, 'cejas')).not.toBeNull();
    expect(layer(varon, 'pestanas')).toBeNull();
    expect(layer(indefinido, 'cejas')).toBeNull();
    expect(layer(indefinido, 'pestanas')).toBeNull();
  });

  it.each(GENDERS_IDS)('las manos de %s quedan donde se sostiene el objeto', (gender) => {
    const positions = [...layer(draw({ gender }), 'brazos')!.querySelectorAll('rect')].map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    expect(positions).toContain('2,16');
    expect(positions).toContain('12,16');
  });
});

describe('AvatarSprite — garments', () => {
  it.each(GARMENTS.filter((p) => p.id !== 'traje').map((p) => p.id))(
    'la prenda %s dibuja sus detalles',
    (garment) => {
      expect(pixels(draw({ garment }), 'prenda')).toBeGreaterThan(0);
    },
  );

  it('the suit is a jumpsuit: the legs are the color of the clothing', () => {
    expect(fills(draw({ garment: 'traje', clothesColor: 'rosa' }), 'piernas')[0]).toBe('#B3123A');
  });

  it('with the other garments the legs wear pants, which contrast with the clothing', () => {
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'rosa' }), 'piernas')[0]).toBe('#2D164A');
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'negro' }), 'piernas')[0]).toBe('#4B4A57');
  });

  it('the shoes are visible even if the clothing is bone-colored', () => {
    expect(fills(draw({ garment: 'traje', clothesColor: 'hueso' }), 'piernas')[2]).toBe('#2D164A');
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'hueso' }), 'piernas')[2]).toBe('#F3EAFF');
  });
});

describe('AvatarSprite — emblem', () => {
  it.each(EMBLEMS.filter((e) => e.id !== 'ninguno').map((e) => e.id))(
    'el emblema %s se dibuja',
    (emblem) => {
      expect(pixels(draw({ garment: 'hoodie', emblem }), 'emblema')).toBeGreaterThan(0);
    },
  );

  it('with no emblem, with a shirt or with a laptop there is no emblem layer', () => {
    expect(layer(draw({ emblem: 'ninguno' }), 'emblema')).toBeNull();
    expect(layer(draw({ garment: 'camisa', emblem: 'tag' }), 'emblema')).toBeNull();
    expect(layer(draw({ garment: 'hoodie', object: 'laptop', emblem: 'tag' }), 'emblema')).toBeNull();
  });

  it('contrasts with what is underneath (the t-shirt, if the jacket is open)', () => {
    const color = (c: Partial<AvatarConfig>) => layer(draw(c), 'emblema')!.getAttribute('fill');
    expect(color({ garment: 'hoodie', clothesColor: 'violeta' })).toBe('#FF2758');
    expect(color({ garment: 'hoodie', clothesColor: 'rosa' })).toBe('#F3EAFF');
    expect(color({ garment: 'hoodie', clothesColor: 'rosa-pastel' })).toBe('#F3EAFF');
    expect(color({ garment: 'campera', clothesColor: 'rosa' })).toBe('#FF2758');
  });

  it('when facing left it is counter-mirrored so the glyph stays legible', () => {
    expect(layer(draw({ emblem: 'lambda' }, 'izquierda'), 'emblema')!.getAttribute('transform')).toBe(
      'translate(16 0) scale(-1 1)',
    );
    expect(layer(draw({ emblem: 'lambda' }, 'derecha'), 'emblema')!.getAttribute('transform')).toBeNull();
  });
});

describe('AvatarSprite — head and gear', () => {
  const layersInOrder = (el: HTMLElement) =>
    [...el.querySelectorAll('svg > g[data-capa]')].map((g) => g.getAttribute('data-capa'));

  it.each(HAIRSTYLES.map((p) => p.id))('el pelo %s se dibuja', (hair) => {
    expect(pixels(draw({ hair }), 'pelo')).toBeGreaterThan(0);
  });

  it.each(BEARDS.filter((b) => b.id !== 'ninguna').map((b) => b.id))(
    'la barba %s se dibuja del color del pelo',
    (beard) => {
      const el = draw({ beard, hairColor: 'pelirrojo' });
      expect(pixels(el, 'barba')).toBeGreaterThan(0);
      expect(fills(el, 'barba').every((f) => f === '#C2502A' || f === '#853316')).toBe(true);
    },
  );

  it('with no beard there is no beard layer', () => {
    expect(layer(draw({ beard: 'ninguna' }), 'barba')).toBeNull();
  });

  it.each(ACCESSORIES.filter((a) => a.id !== 'ninguno').map((a) => a.id))(
    'el accesorio %s se dibuja',
    (accessory) => {
      expect(pixels(draw({ accessory }), 'accesorio')).toBeGreaterThan(0);
    },
  );

  it.each(['gorra', 'gorra-atras', 'beanie'] as const)(
    '%s tapa todo el casco (filas 0-3) para que ningún peinado lo atraviese',
    (accessory) => {
      const coveredRows = new Set<number>();
      for (const r of layer(draw({ accessory, hair: 'cresta' }), 'accesorio')!.querySelectorAll('rect')) {
        const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => Number(r.getAttribute(a)));
        // the crest occupies columns 6..9: the row is covered if a rect spans them all
        if (x <= 6 && x + w >= 10) for (let row = y; row < y + h; row++) coveredRows.add(row);
      }
      expect([0, 1, 2, 3].every((f) => coveredRows.has(f))).toBe(true);
    },
  );

  it.each(GLASSES.filter((a) => a.id !== 'ninguno').map((a) => a.id))(
    'los anteojos %s se dibujan',
    (glasses) => {
      expect(pixels(draw({ glasses }), 'anteojos')).toBeGreaterThan(0);
    },
  );

  it('with a visor the glasses are not drawn', () => {
    expect(layer(draw({ accessory: 'visor', glasses: 'sol' }), 'anteojos')).toBeNull();
    expect(layer(draw({ accessory: 'gorra', glasses: 'sol' }), 'anteojos')).not.toBeNull();
  });

  it.each(OBJECTS.filter((o) => o.id !== 'ninguno').map((o) => o.id))(
    'el objeto %s se dibuja por delante de todo',
    (object) => {
      const el = draw({ object });
      expect(pixels(el, 'objeto')).toBeGreaterThan(0);
      expect(layersInOrder(el).at(-1)).toBe('objeto');
    },
  );

  it('respects the layer order: beard < hair < glasses < accessory', () => {
    const el = draw({ garment: 'hoodie', beard: 'barba', glasses: 'redondos', accessory: 'gorra' });
    expect(layersInOrder(el)).toEqual([
      'piernas',
      'torso',
      'brazos',
      'prenda',
      'emblema',
      'cabeza',
      'barba',
      'pelo',
      'anteojos',
      'accesorio',
    ]);
  });
});
