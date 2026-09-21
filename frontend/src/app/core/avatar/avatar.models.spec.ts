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

const GENDERS_IDS: GenderId[] = ['mujer', 'varon', 'indefinido'];

describe('defaultAvatar', () => {
  it.each(GENDERS_IDS)('el default de %s pasa por sanearAvatar sin cambios', (g) => {
    expect(sanitizeAvatar(defaultAvatar(g))).toEqual(defaultAvatar(g));
  });

  it('genders differ only in the suggested hairstyle', () => {
    expect(defaultAvatar('mujer').hair).toBe('largo');
    expect(defaultAvatar('varon').hair).toBe('corto');
    expect(defaultAvatar('indefinido').hair).toBe('despeinado');
    const withoutHair = (g: GenderId) => ({ ...defaultAvatar(g), gender: null, hair: null });
    expect(withoutHair('mujer')).toEqual(withoutHair('varon'));
    expect(withoutHair('varon')).toEqual(withoutHair('indefinido'));
  });
});

describe('sanitizeAvatar', () => {
  it('with nothing saved it returns the default for undefined', () => {
    expect(sanitizeAvatar(null)).toEqual(defaultAvatar('indefinido'));
    expect(sanitizeAvatar(undefined)).toEqual(defaultAvatar('indefinido'));
  });

  it('migrates an avatar from the previous version to the classic look', () => {
    const old = {
      skin: 'oscura',
      hair: 'afro',
      hairColor: 'noche',
      suitColor: 'violeta',
      accessory: 'gorra',
      accessoryColor: 'rosa',
    };
    expect(sanitizeAvatar(old)).toEqual({
      gender: 'indefinido',
      skin: 'oscura',
      hair: 'afro',
      hairColor: 'noche',
      beard: 'ninguna',
      garment: 'traje',
      clothesColor: 'violeta',
      emblem: 'cuadro',
      accessory: 'gorra',
      accessoryColor: 'rosa',
      glasses: 'ninguno',
      object: 'ninguno',
    });
  });

  it('an unknown id falls back to the default of its gender', () => {
    const a = sanitizeAvatar({
      ...defaultAvatar('mujer'),
      hair: 'mohicano',
      garment: 'smoking',
      emblem: '???',
      object: 'tostadora',
    });
    expect(a.gender).toBe('mujer');
    expect(a.hair).toBe('largo');
    expect(a.garment).toBe('hoodie');
    expect(a.emblem).toBe('tag');
    expect(a.object).toBe('ninguno');
  });

  it('an unknown gender falls back to undefined', () => {
    expect(sanitizeAvatar({ ...defaultAvatar('varon'), gender: 'robot' }).gender).toBe('indefinido');
  });

  it('discards a color that exists but does not belong to that part', () => {
    const a = sanitizeAvatar({
      ...defaultAvatar('varon'),
      hairColor: 'verde-terminal',
      clothesColor: 'rubio',
      accessoryColor: 'castaño',
    });
    expect(a.hairColor).toBe('castaño');
    expect(a.clothesColor).toBe('violeta');
    expect(a.accessoryColor).toBe('rosa');
  });

  it('clothesColor takes priority over the legacy suitColor', () => {
    const a = sanitizeAvatar({ ...defaultAvatar('varon'), clothesColor: 'grafito', suitColor: 'rosa' });
    expect(a.clothesColor).toBe('grafito');
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
    expect(HAIR_COLORS.find((c) => c.id === 'negro')).toBe(CLOTHES_COLORS.find((c) => c.id === 'negro'));
  });

  it('no catalog repeats ids', () => {
    for (const list of [GENDERS, SKINS, HAIRSTYLES, BEARDS, GARMENTS, EMBLEMS, ACCESSORIES, GLASSES, OBJECTS]) {
      const ids = list.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('emblemVisible', () => {
  const base = defaultAvatar('indefinido');

  it('it is visible over garments that leave the chest free', () => {
    expect(emblemVisible({ ...base, garment: 'hoodie' })).toBe(true);
    expect(emblemVisible({ ...base, garment: 'campera' })).toBe(true);
  });

  it('it is hidden without an emblem, with the shirt tie or with the laptop in front', () => {
    expect(emblemVisible({ ...base, emblem: 'ninguno' })).toBe(false);
    expect(emblemVisible({ ...base, garment: 'camisa' })).toBe(false);
    expect(emblemVisible({ ...base, object: 'laptop' })).toBe(false);
  });
});

describe('visibleGlasses', () => {
  const base = defaultAvatar('indefinido');

  it('they are visible with any accessory except the visor, which already covers the eyes', () => {
    expect(visibleGlasses({ ...base, glasses: 'codigo', accessory: 'beanie' })).toBe(true);
    expect(visibleGlasses({ ...base, glasses: 'codigo', accessory: 'visor' })).toBe(false);
  });

  it('without glasses there is nothing to see', () => {
    expect(visibleGlasses({ ...base, glasses: 'ninguno' })).toBe(false);
  });
});
