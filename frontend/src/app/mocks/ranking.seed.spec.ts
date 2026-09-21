import { sanitizeAvatar } from '../core/avatar/avatar.models';
import { avatarConfigMock } from './ranking.seed';
import { studentsSeed } from './seed';

describe('avatarConfigMock', () => {
  it('is deterministic: the same seed always gives the same avatar', () => {
    expect(avatarConfigMock('alu-05')).toEqual(avatarConfigMock('alu-05'));
  });

  it('gives a valid and complete config for every student in the seed', () => {
    for (const a of studentsSeed()) {
      const c = avatarConfigMock(a.id);
      expect(sanitizeAvatar(c)).toEqual(c);
    }
  });

  it('no two students in the seed have exactly the same look', () => {
    const looks = studentsSeed().map((a) => JSON.stringify(avatarConfigMock(a.id)));
    expect(new Set(looks).size).toBe(looks.length);
  });
});
