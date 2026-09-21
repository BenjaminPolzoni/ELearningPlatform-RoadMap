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
  facing: 'right' | 'left' = 'right',
): HTMLElement {
  const f = TestBed.createComponent(AvatarSprite);
  f.componentRef.setInput('config', { ...defaultAvatar('unspecified'), ...changes });
  f.componentRef.setInput('facing', facing);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const layer = (el: HTMLElement, name: string) =>
  el.querySelector<SVGGElement>(`[data-layer="${name}"]`);
const pixels = (el: HTMLElement, name: string) =>
  layer(el, name)?.querySelectorAll('rect').length ?? 0;
const fills = (el: HTMLElement, name: string) =>
  [...(layer(el, name)?.querySelectorAll('rect') ?? [])].map((r) => r.getAttribute('fill'));

const GENDERS_IDS: GenderId[] = ['female', 'male', 'unspecified'];

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [AvatarSprite] }).compileComponents();
});

describe('AvatarSprite — silhouettes', () => {
  it.each(GENDERS_IDS)('marks the %s silhouette', (gender) => {
    expect(layer(draw({ gender }), 'torso')?.getAttribute('data-silhouette')).toBe(gender);
  });

  it('only the female has eyelashes and only the male eyebrows', () => {
    const female = draw({ gender: 'female' });
    const male = draw({ gender: 'male' });
    const unspecified = draw({ gender: 'unspecified' });
    expect(layer(female, 'eyelashes')).not.toBeNull();
    expect(layer(female, 'eyebrows')).toBeNull();
    expect(layer(male, 'eyebrows')).not.toBeNull();
    expect(layer(male, 'eyelashes')).toBeNull();
    expect(layer(unspecified, 'eyebrows')).toBeNull();
    expect(layer(unspecified, 'eyelashes')).toBeNull();
  });

  it.each(GENDERS_IDS)('the hands of %s stay where the object is held', (gender) => {
    const positions = [...layer(draw({ gender }), 'arms')!.querySelectorAll('rect')].map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    expect(positions).toContain('2,16');
    expect(positions).toContain('12,16');
  });
});

describe('AvatarSprite — garments', () => {
  it.each(GARMENTS.filter((p) => p.id !== 'suit').map((p) => p.id))(
    'la prenda %s dibuja sus detalles',
    (garment) => {
      expect(pixels(draw({ garment }), 'garment')).toBeGreaterThan(0);
    },
  );

  it('the suit is a jumpsuit: the legs are the color of the clothing', () => {
    expect(fills(draw({ garment: 'suit', clothesColor: 'pink' }), 'legs')[0]).toBe('#B3123A');
  });

  it('with the other garments the legs wear pants, which contrast with the clothing', () => {
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'pink' }), 'legs')[0]).toBe('#2D164A');
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'black' }), 'legs')[0]).toBe('#4B4A57');
  });

  it('the shoes are visible even if the clothing is bone-colored', () => {
    expect(fills(draw({ garment: 'suit', clothesColor: 'bone' }), 'legs')[2]).toBe('#2D164A');
    expect(fills(draw({ garment: 'hoodie', clothesColor: 'bone' }), 'legs')[2]).toBe('#F3EAFF');
  });
});

describe('AvatarSprite — emblem', () => {
  it.each(EMBLEMS.filter((e) => e.id !== 'none').map((e) => e.id))(
    'el emblema %s se dibuja',
    (emblem) => {
      expect(pixels(draw({ garment: 'hoodie', emblem }), 'emblem')).toBeGreaterThan(0);
    },
  );

  it('with no emblem, with a shirt or with a laptop there is no emblem layer', () => {
    expect(layer(draw({ emblem: 'none' }), 'emblem')).toBeNull();
    expect(layer(draw({ garment: 'shirt', emblem: 'tag' }), 'emblem')).toBeNull();
    expect(layer(draw({ garment: 'hoodie', object: 'laptop', emblem: 'tag' }), 'emblem')).toBeNull();
  });

  it('contrasts with what is underneath (the t-shirt, if the jacket is open)', () => {
    const color = (c: Partial<AvatarConfig>) => layer(draw(c), 'emblem')!.getAttribute('fill');
    expect(color({ garment: 'hoodie', clothesColor: 'violet' })).toBe('#FF2758');
    expect(color({ garment: 'hoodie', clothesColor: 'pink' })).toBe('#F3EAFF');
    expect(color({ garment: 'hoodie', clothesColor: 'pastel-pink' })).toBe('#F3EAFF');
    expect(color({ garment: 'jacket', clothesColor: 'pink' })).toBe('#FF2758');
  });

  it('when facing left it is counter-mirrored so the glyph stays legible', () => {
    expect(layer(draw({ emblem: 'lambda' }, 'left'), 'emblem')!.getAttribute('transform')).toBe(
      'translate(16 0) scale(-1 1)',
    );
    expect(layer(draw({ emblem: 'lambda' }, 'right'), 'emblem')!.getAttribute('transform')).toBeNull();
  });
});

describe('AvatarSprite — head and gear', () => {
  const layersInOrder = (el: HTMLElement) =>
    [...el.querySelectorAll('svg > g[data-layer]')].map((g) => g.getAttribute('data-layer'));

  it.each(HAIRSTYLES.map((p) => p.id))('el pelo %s se dibuja', (hair) => {
    expect(pixels(draw({ hair }), 'hair')).toBeGreaterThan(0);
  });

  it.each(BEARDS.filter((b) => b.id !== 'none').map((b) => b.id))(
    'la barba %s se dibuja del color del pelo',
    (beard) => {
      const el = draw({ beard, hairColor: 'redhead' });
      expect(pixels(el, 'beard')).toBeGreaterThan(0);
      expect(fills(el, 'beard').every((f) => f === '#C2502A' || f === '#853316')).toBe(true);
    },
  );

  it('with no beard there is no beard layer', () => {
    expect(layer(draw({ beard: 'none' }), 'beard')).toBeNull();
  });

  it.each(ACCESSORIES.filter((a) => a.id !== 'none').map((a) => a.id))(
    'el accesorio %s se dibuja',
    (accessory) => {
      expect(pixels(draw({ accessory }), 'accessory')).toBeGreaterThan(0);
    },
  );

  it.each(['cap', 'backwards-cap', 'beanie'] as const)(
    '%s covers the whole helmet (rows 0-3) so no hairstyle goes through it',
    (accessory) => {
      const coveredRows = new Set<number>();
      for (const r of layer(draw({ accessory, hair: 'mohawk' }), 'accessory')!.querySelectorAll('rect')) {
        const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((a) => Number(r.getAttribute(a)));
        // the crest occupies columns 6..9: the row is covered if a rect spans them all
        if (x <= 6 && x + w >= 10) for (let row = y; row < y + h; row++) coveredRows.add(row);
      }
      expect([0, 1, 2, 3].every((f) => coveredRows.has(f))).toBe(true);
    },
  );

  it.each(GLASSES.filter((a) => a.id !== 'none').map((a) => a.id))(
    'los anteojos %s se dibujan',
    (glasses) => {
      expect(pixels(draw({ glasses }), 'glasses')).toBeGreaterThan(0);
    },
  );

  it('with a visor the glasses are not drawn', () => {
    expect(layer(draw({ accessory: 'visor', glasses: 'sunglasses' }), 'glasses')).toBeNull();
    expect(layer(draw({ accessory: 'cap', glasses: 'sunglasses' }), 'glasses')).not.toBeNull();
  });

  it.each(OBJECTS.filter((o) => o.id !== 'none').map((o) => o.id))(
    'el objeto %s se dibuja por delante de todo',
    (object) => {
      const el = draw({ object });
      expect(pixels(el, 'object')).toBeGreaterThan(0);
      expect(layersInOrder(el).at(-1)).toBe('object');
    },
  );

  it('respects the layer order: beard < hair < glasses < accessory', () => {
    const el = draw({ garment: 'hoodie', beard: 'beard', glasses: 'round', accessory: 'cap' });
    expect(layersInOrder(el)).toEqual([
      'legs',
      'torso',
      'arms',
      'garment',
      'emblem',
      'head',
      'beard',
      'hair',
      'glasses',
      'accessory',
    ]);
  });
});
