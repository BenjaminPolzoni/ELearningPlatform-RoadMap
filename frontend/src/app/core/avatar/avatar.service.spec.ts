import { TestBed } from '@angular/core/testing';
import { avatarPorDefecto, sanearAvatar } from './avatar.models';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('sin nada guardado arranca con el default de indefinido', () => {
    expect(TestBed.inject(AvatarService).avatar()).toEqual(avatarPorDefecto('indefinido'));
  });

  it('migra el avatar guardado con la versión anterior sin cambiarle el look', () => {
    localStorage.setItem(
      'mock-avatar',
      JSON.stringify({
        piel: 'clara',
        pelo: 'cresta',
        colorPelo: 'rosa',
        colorTraje: 'noche',
        accesorio: 'visor',
        colorAccesorio: 'violeta',
      }),
    );
    const a = TestBed.inject(AvatarService).avatar();
    expect(a.genero).toBe('indefinido');
    expect(a.prenda).toBe('traje');
    expect(a.emblema).toBe('cuadro');
    expect(a.colorRopa).toBe('noche');
    expect(a.pelo).toBe('cresta');
  });

  it('RESET vuelve a los valores sugeridos pero conserva el género', () => {
    const srv = TestBed.inject(AvatarService);
    srv.set('genero', 'mujer');
    srv.set('pelo', 'afro');
    srv.set('objeto', 'mate');
    srv.reiniciar();
    expect(srv.avatar()).toEqual(avatarPorDefecto('mujer'));
  });

  it('AL AZAR siempre produce una config válida y completa', () => {
    const srv = TestBed.inject(AvatarService);
    for (let i = 0; i < 50; i++) {
      srv.aleatorio();
      expect(sanearAvatar(srv.avatar())).toEqual(srv.avatar());
    }
  });
});
