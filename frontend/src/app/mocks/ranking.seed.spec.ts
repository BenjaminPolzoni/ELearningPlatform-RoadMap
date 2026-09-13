import { sanearAvatar } from '../core/avatar/avatar.models';
import { avatarConfigMock } from './ranking.seed';
import { alumnosSeed } from './seed';

describe('avatarConfigMock', () => {
  it('es determinístico: la misma semilla da siempre el mismo avatar', () => {
    expect(avatarConfigMock('alu-05')).toEqual(avatarConfigMock('alu-05'));
  });

  it('da una config válida y completa para cada alumno del seed', () => {
    for (const a of alumnosSeed()) {
      const c = avatarConfigMock(a.id);
      expect(sanearAvatar(c)).toEqual(c);
    }
  });

  it('no hay dos alumnos del seed con exactamente el mismo look', () => {
    const looks = alumnosSeed().map((a) => JSON.stringify(avatarConfigMock(a.id)));
    expect(new Set(looks).size).toBe(looks.length);
  });
});
