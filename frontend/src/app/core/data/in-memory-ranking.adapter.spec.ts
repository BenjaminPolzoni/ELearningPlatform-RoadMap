import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthMockService } from '../auth/auth-mock.service';
import { InMemoryRankingAdapter } from './in-memory-ranking.adapter';
import { VistaRankingAlumno, VistaRankingStaff } from './ranking.models';

describe('InMemoryRankingAdapter — recorte por rol (RF-RNK-03 / 10)', () => {
  let adapter: InMemoryRankingAdapter;
  let auth: AuthMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [InMemoryRankingAdapter] });
    adapter = TestBed.inject(InMemoryRankingAdapter);
    auth = TestBed.inject(AuthMockService);
  });

  afterEach(() => auth.salir());

  it('ALUMNO: la lista viene anonimizada salvo la fila propia, que va identificada', async () => {
    auth.entrarComo('ALUMNO');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as VistaRankingAlumno;

    expect(v.rol).toBe('ALUMNO');
    const identificadas = v.lista.filter((f) => 'nombre' in f);
    expect(identificadas).toHaveLength(1);
    expect((identificadas[0] as { nombre: string }).nombre).toBe('Camila');
    expect(v.lista.filter((f) => 'seudonimo' in f)).toHaveLength(11);
    expect(v.top3.every((f) => 'seudonimo' in f && !('nombre' in f))).toBe(true);
    expect(v.top3).toHaveLength(3);
    expect(v.bottom3).toHaveLength(3);
    expect(v.yo?.nombre).toBe('Camila'); // alu-01 en alumnosSeed()
    expect(v.yo?.legajo).toBe('90001');
  });

  it('ALUMNO: con 12 inscriptos hay cortes P90/P10 (RF-RNK-09)', async () => {
    auth.entrarComo('ALUMNO');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as VistaRankingAlumno;
    expect(v.totalInscriptos).toBe(12);
    expect(v.cortes).not.toBeNull();
    expect(v.cortes!.p90.zona).toBe('p90');
    expect(v.cortes!.p10.zona).toBe('p10');
  });

  it('PROFESOR: recibe todas las filas identificadas', async () => {
    auth.entrarComo('PROFESOR');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as VistaRankingStaff;
    expect(v.rol).toBe('PROFESOR');
    expect(v.filas).toHaveLength(12);
    expect(v.filas.every((f) => typeof f.legajo === 'string' && f.legajo.length > 0)).toBe(true);
    expect(v.filas[0].posicion).toBe(1);
  });

  it('ADMIN: misma vista identificada que PROFESOR (RF-RNK-10)', async () => {
    auth.entrarComo('ADMIN');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as VistaRankingStaff;
    expect(v.rol).toBe('ADMIN');
    expect(v.filas).toHaveLength(12);
  });

  it('el orden respeta XP descendente', async () => {
    auth.entrarComo('PROFESOR');
    const v = (await firstValueFrom(adapter.getRanking('cc'))) as VistaRankingStaff;
    const xps = v.filas.map((f) => f.xpTotal);
    expect(xps).toEqual([...xps].sort((a, b) => b - a));
  });
});
