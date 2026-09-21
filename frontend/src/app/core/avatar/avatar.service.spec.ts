import { TestBed } from '@angular/core/testing';
import { defaultAvatar, sanitizeAvatar } from './avatar.models';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('with nothing saved it starts with the default for undefined', () => {
    expect(TestBed.inject(AvatarService).avatar()).toEqual(defaultAvatar('indefinido'));
  });

  it('migrates the avatar saved with the previous version without changing its look', () => {
    localStorage.setItem(
      'mock-avatar',
      JSON.stringify({
        skin: 'clara',
        hair: 'cresta',
        hairColor: 'rosa',
        suitColor: 'noche',
        accessory: 'visor',
        accessoryColor: 'violeta',
      }),
    );
    const a = TestBed.inject(AvatarService).avatar();
    expect(a.gender).toBe('indefinido');
    expect(a.garment).toBe('traje');
    expect(a.emblem).toBe('cuadro');
    expect(a.clothesColor).toBe('noche');
    expect(a.hair).toBe('cresta');
  });

  it('RESET goes back to the suggested values but keeps the gender', () => {
    const srv = TestBed.inject(AvatarService);
    srv.set('gender', 'mujer');
    srv.set('hair', 'afro');
    srv.set('object', 'mate');
    srv.reset();
    expect(srv.avatar()).toEqual(defaultAvatar('mujer'));
  });

  it('RANDOM always produces a valid and complete config', () => {
    const srv = TestBed.inject(AvatarService);
    for (let i = 0; i < 50; i++) {
      srv.random();
      expect(sanitizeAvatar(srv.avatar())).toEqual(srv.avatar());
    }
  });
});
