import { describe, expect, it } from 'vitest';
import { leerConfigModular, MODULAR_CONFIG_KEY, sanearConfigModular } from './avatar-config';

describe('sanearConfigModular', () => {
  it('clase inválida cae a Knight', () => {
    expect(sanearConfigModular({ characterClass: 'Ninja' }).characterClass).toBe('Knight');
  });

  it('migra Rogue_Hooded a Rogue conservando el torso', () => {
    const c = sanearConfigModular({ characterClass: 'Rogue_Hooded', headStyle: 'Rogue_Hooded' });
    expect(c.characterClass).toBe('Rogue');
    expect(c.headStyle).toBe('Rogue');
    expect(c.topStyle).toBe('Rogue_Hooded');
  });

  it('barba ausente queda none; la explícita se conserva', () => {
    // Igual que la ciudad: el default 'none' es truthy y no se reemplaza por clase.
    expect(sanearConfigModular({ characterClass: 'Barbarian' }).beardStyle).toBe('none');
    expect(sanearConfigModular({ characterClass: 'Barbarian', beardStyle: 'long' }).beardStyle).toBe('long');
    expect(sanearConfigModular({ characterClass: 'Mage' }).beardStyle).toBe('none');
  });

  it('escudos en mano se sueltan y spellbook pasa a teclado', () => {
    const c = sanearConfigModular({ rightHandItem: 'shield_round.gltf', leftHandItem: 'spellbook_open' });
    expect(c.rightHandItem).toBe('none');
    expect(c.leftHandItem).toBe('keyboard_gamer');
  });

  it('órbita estelar legada migra a id + color', () => {
    const c = sanearConfigModular({ headItem: 'star_orbit_blue' });
    expect(c.headItem).toBe('star_orbit');
    expect(c.starOrbitColor).toBe('blue');
  });
});

describe('leerConfigModular', () => {
  it('null si el alumno aún no creó su personaje', () => {
    localStorage.removeItem(MODULAR_CONFIG_KEY);
    expect(leerConfigModular()).toBeNull();
  });

  it('sanea lo guardado por la ciudad', () => {
    localStorage.setItem(MODULAR_CONFIG_KEY, JSON.stringify({ characterClass: 'Mage', pet: 'owl' }));
    const c = leerConfigModular();
    expect(c?.characterClass).toBe('Mage');
    expect(c?.pet).toBe('owl');
    expect(c?.topStyle).toBe('Knight');
    localStorage.removeItem(MODULAR_CONFIG_KEY);
  });
});
