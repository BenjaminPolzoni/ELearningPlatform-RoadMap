import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AvatarModularService } from './avatar-modular.service';
import { MODULAR_CONFIG_KEY, sanearConfigModular } from './avatar-config';

describe('AvatarModularService.guardar', () => {
  afterEach(() => localStorage.removeItem(MODULAR_CONFIG_KEY));

  it('persiste la config con la misma clave que escribe la ciudad', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const guardada = srv.guardar(sanearConfigModular({ characterClass: 'Mage', pet: 'owl' }));
    expect(guardada.characterClass).toBe('Mage');
    const crudo = JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!);
    expect(crudo.characterClass).toBe('Mage');
    expect(crudo.pet).toBe('owl');
    // Roundtrip: leer devuelve lo guardado.
    expect(srv.leer()?.characterClass).toBe('Mage');
  });

  it('sanea antes de persistir (clase inválida cae a Knight)', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const guardada = srv.guardar(sanearConfigModular({ characterClass: 'Ninja' }));
    expect(guardada.characterClass).toBe('Knight');
    expect(JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!).characterClass).toBe('Knight');
  });
});

describe('AvatarModularService.aplicarArquetipo', () => {
  it('propaga la clase a cabeza, torso, pantalón, zapatos, pelo y barba', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanearConfigModular({ characterClass: 'Knight' });
    const next = srv.aplicarArquetipo(base, 'Mage');
    expect(next.characterClass).toBe('Mage');
    expect(next.headStyle).toBe('Mage');
    expect(next.topStyle).toBe('Mage');
    expect(next.pantsStyle).toBe('Mage');
    expect(next.shoesStyle).toBe('Mage');
    expect(next.hairStyle).toBe('default');
    expect(next.beardStyle).toBe('none');
  });

  it('barba según clase y tapaboca conservado', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanearConfigModular({});
    expect(srv.aplicarArquetipo(base, 'Barbarian').beardStyle).toBe('long');
    expect(srv.aplicarArquetipo(base, 'Ranger').beardStyle).toBe('short');
    const conMascara = sanearConfigModular({ beardStyle: 'mask' });
    expect(srv.aplicarArquetipo(conMascara, 'Barbarian').beardStyle).toBe('mask');
  });

  it('conserva accesorios, mascota, manos y colores al cambiar de arquetipo', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const cargado = sanearConfigModular({
      characterClass: 'Knight',
      hairColor: '#1E1726',
      backItem: 'guitar',
      guitarColor: 'B',
      headItem: 'headphones',
      pet: 'owl',
      rightHandItem: 'mouse_gamer',
      leftHandItem: 'mate_argentino',
    });
    const next = srv.aplicarArquetipo(cargado, 'Mage');
    expect(next.characterClass).toBe('Mage');
    expect(next.headStyle).toBe('Mage');
    expect(next.hairColor).toBe('#1E1726');
    expect(next.backItem).toBe('guitar');
    expect(next.guitarColor).toBe('B');
    expect(next.headItem).toBe('headphones');
    expect(next.pet).toBe('owl');
    expect(next.rightHandItem).toBe('mouse_gamer');
    expect(next.leftHandItem).toBe('mate_argentino');
  });
});

describe('AvatarModularService.aplicarCabeza', () => {
  it('resetea pelo y ajusta barba según cabeza', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanearConfigModular({ hairStyle: 'mage', beardStyle: 'short' });
    const next = srv.aplicarCabeza(base, 'Barbarian');
    expect(next.headStyle).toBe('Barbarian');
    expect(next.hairStyle).toBe('default');
    expect(next.beardStyle).toBe('long');
  });
});
