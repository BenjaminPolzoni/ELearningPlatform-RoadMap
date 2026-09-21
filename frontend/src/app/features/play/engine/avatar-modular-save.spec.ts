import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AvatarModularService } from './avatar-modular.service';
import { MODULAR_CONFIG_KEY, sanitizeConfigModular } from './avatar-config';

describe('AvatarModularService.save', () => {
  afterEach(() => localStorage.removeItem(MODULAR_CONFIG_KEY));

  it('persists the config with the same key the city writes', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const saved = srv.save(sanitizeConfigModular({ characterClass: 'Mage', pet: 'owl' }));
    expect(saved.characterClass).toBe('Mage');
    const raw = JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!);
    expect(raw.characterClass).toBe('Mage');
    expect(raw.pet).toBe('owl');
    // Roundtrip: read returns what was saved.
    expect(srv.read()?.characterClass).toBe('Mage');
  });

  it('sanitizes before persisting (invalid class falls back to Knight)', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const saved = srv.save(sanitizeConfigModular({ characterClass: 'Ninja' }));
    expect(saved.characterClass).toBe('Knight');
    expect(JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!).characterClass).toBe('Knight');
  });
});

describe('AvatarModularService.applyArchetype', () => {
  it('propagates the class to head, torso, pants, shoes, hair and beard', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanitizeConfigModular({ characterClass: 'Knight' });
    const next = srv.applyArchetype(base, 'Mage');
    expect(next.characterClass).toBe('Mage');
    expect(next.headStyle).toBe('Mage');
    expect(next.topStyle).toBe('Mage');
    expect(next.pantsStyle).toBe('Mage');
    expect(next.shoesStyle).toBe('Mage');
    expect(next.hairStyle).toBe('default');
    expect(next.beardStyle).toBe('none');
  });

  it('beard according to class and face covering kept', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanitizeConfigModular({});
    expect(srv.applyArchetype(base, 'Barbarian').beardStyle).toBe('long');
    expect(srv.applyArchetype(base, 'Ranger').beardStyle).toBe('short');
    const withMask = sanitizeConfigModular({ beardStyle: 'mask' });
    expect(srv.applyArchetype(withMask, 'Barbarian').beardStyle).toBe('mask');
  });

  it('keeps accessories, pet, hands and colors when changing archetype', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const loaded = sanitizeConfigModular({
      characterClass: 'Knight',
      hairColor: '#1E1726',
      backItem: 'guitar',
      guitarColor: 'B',
      headItem: 'headphones',
      pet: 'owl',
      rightHandItem: 'mouse_gamer',
      leftHandItem: 'mate_argentino',
    });
    const next = srv.applyArchetype(loaded, 'Mage');
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

describe('AvatarModularService.applyHead', () => {
  it('resets hair and adjusts beard according to head', () => {
    TestBed.configureTestingModule({});
    const srv = TestBed.inject(AvatarModularService);
    const base = sanitizeConfigModular({ hairStyle: 'mage', beardStyle: 'short' });
    const next = srv.applyHead(base, 'Barbarian');
    expect(next.headStyle).toBe('Barbarian');
    expect(next.hairStyle).toBe('default');
    expect(next.beardStyle).toBe('long');
  });
});
