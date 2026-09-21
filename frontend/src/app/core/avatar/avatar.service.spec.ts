import { TestBed } from '@angular/core/testing';
import { defaultAvatar, sanitizeAvatar } from './avatar.models';
import { AvatarService } from './avatar.service';

describe('AvatarService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('with nothing saved it starts with the default for undefined', () => {
    expect(TestBed.inject(AvatarService).avatar()).toEqual(defaultAvatar('unspecified'));
  });

  it('migrates the avatar saved with the previous version without changing its look', () => {
    localStorage.setItem(
      'mock-avatar-v2',
      JSON.stringify({
        skin: 'light',
        hair: 'mohawk',
        hairColor: 'pink',
        suitColor: 'night',
        accessory: 'visor',
        accessoryColor: 'violet',
      }),
    );
    const a = TestBed.inject(AvatarService).avatar();
    expect(a.gender).toBe('unspecified');
    expect(a.garment).toBe('suit');
    expect(a.emblem).toBe('square');
    expect(a.clothesColor).toBe('night');
    expect(a.hair).toBe('mohawk');
  });

  it('RESET goes back to the suggested values but keeps the gender', () => {
    const srv = TestBed.inject(AvatarService);
    srv.set('gender', 'female');
    srv.set('hair', 'afro');
    srv.set('object', 'mate');
    srv.reset();
    expect(srv.avatar()).toEqual(defaultAvatar('female'));
  });

  it('RANDOM always produces a valid and complete config', () => {
    const srv = TestBed.inject(AvatarService);
    for (let i = 0; i < 50; i++) {
      srv.random();
      expect(sanitizeAvatar(srv.avatar())).toEqual(srv.avatar());
    }
  });
});
