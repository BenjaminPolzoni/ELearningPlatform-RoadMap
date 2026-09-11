import {
  ACCESORIOS,
  ANTEOJOS,
  avatarPorDefecto,
  BARBAS,
  COLORES,
  COLORES_PELO,
  COLORES_ROPA,
  EMBLEMAS,
  GENEROS,
  IdGenero,
  OBJETOS,
  PELOS,
  PIELES,
  PRENDAS,
  sanearAvatar,
} from './avatar.models';

const GENEROS_IDS: IdGenero[] = ['mujer', 'varon', 'indefinido'];

describe('avatarPorDefecto', () => {
  it.each(GENEROS_IDS)('el default de %s pasa por sanearAvatar sin cambios', (g) => {
    expect(sanearAvatar(avatarPorDefecto(g))).toEqual(avatarPorDefecto(g));
  });

  it('los géneros solo difieren en el peinado sugerido', () => {
    expect(avatarPorDefecto('mujer').pelo).toBe('largo');
    expect(avatarPorDefecto('varon').pelo).toBe('corto');
    expect(avatarPorDefecto('indefinido').pelo).toBe('despeinado');
    const sinPelo = (g: IdGenero) => ({ ...avatarPorDefecto(g), genero: null, pelo: null });
    expect(sinPelo('mujer')).toEqual(sinPelo('varon'));
    expect(sinPelo('varon')).toEqual(sinPelo('indefinido'));
  });
});

describe('sanearAvatar', () => {
  it('sin nada guardado devuelve el default de indefinido', () => {
    expect(sanearAvatar(null)).toEqual(avatarPorDefecto('indefinido'));
    expect(sanearAvatar(undefined)).toEqual(avatarPorDefecto('indefinido'));
  });

  it('migra un avatar de la versión anterior al look clásico', () => {
    const viejo = {
      piel: 'oscura',
      pelo: 'afro',
      colorPelo: 'noche',
      colorTraje: 'violeta',
      accesorio: 'gorra',
      colorAccesorio: 'rosa',
    };
    expect(sanearAvatar(viejo)).toEqual({
      genero: 'indefinido',
      piel: 'oscura',
      pelo: 'afro',
      colorPelo: 'noche',
      barba: 'ninguna',
      prenda: 'traje',
      colorRopa: 'violeta',
      emblema: 'cuadro',
      accesorio: 'gorra',
      colorAccesorio: 'rosa',
      anteojos: 'ninguno',
      objeto: 'ninguno',
    });
  });

  it('un id desconocido vuelve al default de su género', () => {
    const a = sanearAvatar({
      ...avatarPorDefecto('mujer'),
      pelo: 'mohicano',
      prenda: 'smoking',
      emblema: '???',
      objeto: 'tostadora',
    });
    expect(a.genero).toBe('mujer');
    expect(a.pelo).toBe('largo');
    expect(a.prenda).toBe('hoodie');
    expect(a.emblema).toBe('tag');
    expect(a.objeto).toBe('ninguno');
  });

  it('un género desconocido cae en indefinido', () => {
    expect(sanearAvatar({ ...avatarPorDefecto('varon'), genero: 'robot' }).genero).toBe('indefinido');
  });

  it('descarta un color que existe pero no corresponde a esa parte', () => {
    const a = sanearAvatar({
      ...avatarPorDefecto('varon'),
      colorPelo: 'verde-terminal',
      colorRopa: 'rubio',
      colorAccesorio: 'castaño',
    });
    expect(a.colorPelo).toBe('castaño');
    expect(a.colorRopa).toBe('violeta');
    expect(a.colorAccesorio).toBe('rosa');
  });

  it('colorRopa tiene prioridad sobre el colorTraje legado', () => {
    const a = sanearAvatar({ ...avatarPorDefecto('varon'), colorRopa: 'grafito', colorTraje: 'rosa' });
    expect(a.colorRopa).toBe('grafito');
  });
});

describe('catálogo', () => {
  it('el registro de colores no repite ids', () => {
    const ids = COLORES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todo color de pelo y de ropa está en el registro', () => {
    for (const c of [...COLORES_PELO, ...COLORES_ROPA]) expect(COLORES).toContain(c);
  });

  it('pelo y ropa comparten el mismo negro', () => {
    expect(COLORES_PELO.find((c) => c.id === 'negro')).toBe(COLORES_ROPA.find((c) => c.id === 'negro'));
  });

  it('ningún catálogo repite ids', () => {
    for (const lista of [GENEROS, PIELES, PELOS, BARBAS, PRENDAS, EMBLEMAS, ACCESORIOS, ANTEOJOS, OBJETOS]) {
      const ids = lista.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
