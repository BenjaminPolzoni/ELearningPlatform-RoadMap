import {
  ACCESSORIES,
  GLASSES,
  visibleGlasses,
  defaultAvatar,
  BEARDS,
  COLORS,
  HAIR_COLORS,
  CLOTHES_COLORS,
  emblemVisible,
  EMBLEMS,
  GENDERS,
  GenderId,
  OBJECTS,
  HAIRSTYLES,
  SKINS,
  GARMENTS,
  sanitizeAvatar,
} from './avatar.models';

const GENDERS_IDS: GenderId[] = ['female', 'male', 'unspecified'];

describe('defaultAvatar', () => {
  it.each(GENDERS_IDS)('the default for %s goes through sanitizeAvatar unchanged', (g) => {
    expect(sanitizeAvatar(defaultAvatar(g))).toEqual(defaultAvatar(g));
  });

  it('genders differ only in the suggested hairstyle', () => {
    expect(defaultAvatar('female').hair).toBe('long');
    expect(defaultAvatar('male').hair).toBe('short');
    expect(defaultAvatar('unspecified').hair).toBe('messy');
    const withoutHair = (g: GenderId) => ({ ...defaultAvatar(g), gender: null, hair: null });
    expect(withoutHair('female')).toEqual(withoutHair('male'));
    expect(withoutHair('male')).toEqual(withoutHair('unspecified'));
  });
});

describe('sanitizeAvatar', () => {
  it('with nothing saved it returns the default for undefined', () => {
    expect(sanitizeAvatar(null)).toEqual(defaultAvatar('unspecified'));
    expect(sanitizeAvatar(undefined)).toEqual(defaultAvatar('unspecified'));
  });

  it('migrates an avatar from the previous version to the classic look', () => {
    const old = {
      skin: 'dark',
      hair: 'afro',
      hairColor: 'night',
      suitColor: 'violet',
      accessory: 'cap',
      accessoryColor: 'pink',
    };
    expect(sanitizeAvatar(old)).toEqual({
      gender: 'unspecified',
      skin: 'dark',
      hair: 'afro',
      hairColor: 'night',
      beard: 'none',
      garment: 'suit',
      clothesColor: 'violet',
      emblem: 'square',
      accessory: 'cap',
      accessoryColor: 'pink',
      glasses: 'none',
      object: 'none',
    });
  });

  it('an unknown id falls back to the default of its gender', () => {
    const a = sanitizeAvatar({
      ...defaultAvatar('female'),
      hair: 'mohicano',
      garment: 'smoking',
      emblem: '???',
      object: 'tostadora',
    });
    expect(a.gender).toBe('female');
    expect(a.hair).toBe('long');
    expect(a.garment).toBe('hoodie');
    expect(a.emblem).toBe('tag');
    expect(a.object).toBe('none');
  });

  it('an unknown gender falls back to undefined', () => {
    expect(sanitizeAvatar({ ...defaultAvatar('male'), gender: 'robot' }).gender).toBe('unspecified');
  });

  it('discards a color that exists but does not belong to that part', () => {
    const a = sanitizeAvatar({
      ...defaultAvatar('male'),
      hairColor: 'terminal-green',
      clothesColor: 'blond',
      accessoryColor: 'brown',
    });
    expect(a.hairColor).toBe('brown');
    expect(a.clothesColor).toBe('violet');
    expect(a.accessoryColor).toBe('pink');
  });

  it('clothesColor takes priority over the legacy suitColor', () => {
    const a = sanitizeAvatar({ ...defaultAvatar('male'), clothesColor: 'graphite', suitColor: 'pink' });
    expect(a.clothesColor).toBe('graphite');
  });
});

describe('catalog', () => {
  it('the color registry does not repeat ids', () => {
    const ids = COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every hair and clothes color is in the registry', () => {
    for (const c of [...HAIR_COLORS, ...CLOTHES_COLORS]) expect(COLORS).toContain(c);
  });

  it('hair and clothes share the same black', () => {
    expect(HAIR_COLORS.find((c) => c.id === 'black')).toBe(CLOTHES_COLORS.find((c) => c.id === 'black'));
  });

  it('no catalog repeats ids', () => {
    for (const list of [GENDERS, SKINS, HAIRSTYLES, BEARDS, GARMENTS, EMBLEMS, ACCESSORIES, GLASSES, OBJECTS]) {
      const ids = list.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('emblemVisible', () => {
  const base = defaultAvatar('unspecified');

  it('it is visible over garments that leave the chest free', () => {
    expect(emblemVisible({ ...base, garment: 'hoodie' })).toBe(true);
    expect(emblemVisible({ ...base, garment: 'jacket' })).toBe(true);
  });

  it('it is hidden without an emblem, with the shirt tie or with the laptop in front', () => {
    expect(emblemVisible({ ...base, emblem: 'none' })).toBe(false);
    expect(emblemVisible({ ...base, garment: 'shirt' })).toBe(false);
    expect(emblemVisible({ ...base, object: 'laptop' })).toBe(false);
  });
});

describe('visibleGlasses', () => {
  const base = defaultAvatar('unspecified');

  it('they are visible with any accessory except the visor, which already covers the eyes', () => {
    expect(visibleGlasses({ ...base, glasses: 'code', accessory: 'beanie' })).toBe(true);
    expect(visibleGlasses({ ...base, glasses: 'code', accessory: 'visor' })).toBe(false);
  });

  it('without glasses there is nothing to see', () => {
    expect(visibleGlasses({ ...base, glasses: 'none' })).toBe(false);
  });
});
