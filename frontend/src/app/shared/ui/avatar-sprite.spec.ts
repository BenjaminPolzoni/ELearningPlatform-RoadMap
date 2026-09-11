import { TestBed } from '@angular/core/testing';
import {
  AvatarConfig,
  avatarPorDefecto,
  EMBLEMAS,
  IdGenero,
  PRENDAS,
} from '../../core/avatar/avatar.models';
import { AvatarSprite } from './avatar-sprite';

function dibujar(
  cambios: Partial<AvatarConfig> = {},
  mirando: 'derecha' | 'izquierda' = 'derecha',
): HTMLElement {
  const f = TestBed.createComponent(AvatarSprite);
  f.componentRef.setInput('config', { ...avatarPorDefecto('indefinido'), ...cambios });
  f.componentRef.setInput('mirando', mirando);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const capa = (el: HTMLElement, nombre: string) =>
  el.querySelector<SVGGElement>(`[data-capa="${nombre}"]`);
const pixeles = (el: HTMLElement, nombre: string) =>
  capa(el, nombre)?.querySelectorAll('rect').length ?? 0;
const fills = (el: HTMLElement, nombre: string) =>
  [...(capa(el, nombre)?.querySelectorAll('rect') ?? [])].map((r) => r.getAttribute('fill'));

const GENEROS_IDS: IdGenero[] = ['mujer', 'varon', 'indefinido'];

beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [AvatarSprite] }).compileComponents();
});

describe('AvatarSprite — siluetas', () => {
  it.each(GENEROS_IDS)('marca la silueta %s', (genero) => {
    expect(capa(dibujar({ genero }), 'torso')?.getAttribute('data-silueta')).toBe(genero);
  });

  it('solo la mujer tiene pestañas y solo el varón cejas', () => {
    const mujer = dibujar({ genero: 'mujer' });
    const varon = dibujar({ genero: 'varon' });
    const indefinido = dibujar({ genero: 'indefinido' });
    expect(capa(mujer, 'pestanas')).not.toBeNull();
    expect(capa(mujer, 'cejas')).toBeNull();
    expect(capa(varon, 'cejas')).not.toBeNull();
    expect(capa(varon, 'pestanas')).toBeNull();
    expect(capa(indefinido, 'cejas')).toBeNull();
    expect(capa(indefinido, 'pestanas')).toBeNull();
  });

  it.each(GENEROS_IDS)('las manos de %s quedan donde se sostiene el objeto', (genero) => {
    const posiciones = [...capa(dibujar({ genero }), 'brazos')!.querySelectorAll('rect')].map(
      (r) => `${r.getAttribute('x')},${r.getAttribute('y')}`,
    );
    expect(posiciones).toContain('2,16');
    expect(posiciones).toContain('12,16');
  });
});

describe('AvatarSprite — prendas', () => {
  it.each(PRENDAS.filter((p) => p.id !== 'traje').map((p) => p.id))(
    'la prenda %s dibuja sus detalles',
    (prenda) => {
      expect(pixeles(dibujar({ prenda }), 'prenda')).toBeGreaterThan(0);
    },
  );

  it('el traje es un mono: las piernas van del color de la ropa', () => {
    expect(fills(dibujar({ prenda: 'traje', colorRopa: 'rosa' }), 'piernas')[0]).toBe('#B3123A');
  });

  it('con las demás prendas las piernas llevan pantalón, que contrasta con la ropa', () => {
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'rosa' }), 'piernas')[0]).toBe('#2D164A');
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'negro' }), 'piernas')[0]).toBe('#4B4A57');
  });

  it('los zapatos se ven aunque la ropa sea hueso', () => {
    expect(fills(dibujar({ prenda: 'traje', colorRopa: 'hueso' }), 'piernas')[2]).toBe('#2D164A');
    expect(fills(dibujar({ prenda: 'hoodie', colorRopa: 'hueso' }), 'piernas')[2]).toBe('#F3EAFF');
  });
});

describe('AvatarSprite — emblema', () => {
  it.each(EMBLEMAS.filter((e) => e.id !== 'ninguno').map((e) => e.id))(
    'el emblema %s se dibuja',
    (emblema) => {
      expect(pixeles(dibujar({ prenda: 'hoodie', emblema }), 'emblema')).toBeGreaterThan(0);
    },
  );

  it('sin emblema, con camisa o con laptop no hay capa de emblema', () => {
    expect(capa(dibujar({ emblema: 'ninguno' }), 'emblema')).toBeNull();
    expect(capa(dibujar({ prenda: 'camisa', emblema: 'tag' }), 'emblema')).toBeNull();
    expect(capa(dibujar({ prenda: 'hoodie', objeto: 'laptop', emblema: 'tag' }), 'emblema')).toBeNull();
  });

  it('contrasta con lo que tiene debajo (la remera, si la campera está abierta)', () => {
    const color = (c: Partial<AvatarConfig>) => capa(dibujar(c), 'emblema')!.getAttribute('fill');
    expect(color({ prenda: 'hoodie', colorRopa: 'violeta' })).toBe('#FF2758');
    expect(color({ prenda: 'hoodie', colorRopa: 'rosa' })).toBe('#F3EAFF');
    expect(color({ prenda: 'hoodie', colorRopa: 'rosa-pastel' })).toBe('#F3EAFF');
    expect(color({ prenda: 'campera', colorRopa: 'rosa' })).toBe('#FF2758');
  });

  it('mirando a la izquierda se contra-espeja para que el glifo siga legible', () => {
    expect(capa(dibujar({ emblema: 'lambda' }, 'izquierda'), 'emblema')!.getAttribute('transform')).toBe(
      'translate(16 0) scale(-1 1)',
    );
    expect(capa(dibujar({ emblema: 'lambda' }, 'derecha'), 'emblema')!.getAttribute('transform')).toBeNull();
  });
});
