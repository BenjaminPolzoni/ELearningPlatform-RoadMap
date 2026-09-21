import { describe, expect, it } from 'vitest';
import { readConfigModular, MODULAR_CONFIG_KEY, sanitizeConfigModular } from './avatar-config';

describe('sanitizeConfigModular', () => {
  it('invalid class falls back to Knight', () => {
    expect(sanitizeConfigModular({ characterClass: 'Ninja' }).characterClass).toBe('Knight');
  });

  it('migrates Rogue_Hooded to Rogue keeping the torso', () => {
    const c = sanitizeConfigModular({ characterClass: 'Rogue_Hooded', headStyle: 'Rogue_Hooded' });
    expect(c.characterClass).toBe('Rogue');
    expect(c.headStyle).toBe('Rogue');
    expect(c.topStyle).toBe('Rogue_Hooded');
  });

  it('missing beard stays none; the explicit one is kept', () => {
    // Same as the city: the 'none' default is truthy and is not replaced by class.
    expect(sanitizeConfigModular({ characterClass: 'Barbarian' }).beardStyle).toBe('none');
    expect(sanitizeConfigModular({ characterClass: 'Barbarian', beardStyle: 'long' }).beardStyle).toBe('long');
    expect(sanitizeConfigModular({ characterClass: 'Mage' }).beardStyle).toBe('none');
  });

  it('shields in hand are dropped and spellbook moves to keyboard', () => {
    const c = sanitizeConfigModular({ rightHandItem: 'shield_round.gltf', leftHandItem: 'spellbook_open' });
    expect(c.rightHandItem).toBe('none');
    expect(c.leftHandItem).toBe('keyboard_gamer');
  });

  it('legacy stellar orbit migrates to id + color', () => {
    const c = sanitizeConfigModular({ headItem: 'star_orbit_blue' });
    expect(c.headItem).toBe('star_orbit');
    expect(c.starOrbitColor).toBe('blue');
  });
});

describe('readConfigModular', () => {
  it('null if the student has not created their character yet', () => {
    localStorage.removeItem(MODULAR_CONFIG_KEY);
    expect(readConfigModular()).toBeNull();
  });

  it('sanitizes what was saved by the city', () => {
    localStorage.setItem(MODULAR_CONFIG_KEY, JSON.stringify({ characterClass: 'Mage', pet: 'owl' }));
    const c = readConfigModular();
    expect(c?.characterClass).toBe('Mage');
    expect(c?.pet).toBe('owl');
    expect(c?.topStyle).toBe('Knight');
    localStorage.removeItem(MODULAR_CONFIG_KEY);
  });
});
