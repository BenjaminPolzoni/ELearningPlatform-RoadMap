import { avatarPorDefecto } from '../../core/avatar/avatar.models';
import { FilaRanking } from '../../core/data/ranking.models';
import {
  cortesActivos,
  enRiesgoRegularidad,
  esCandidatoPromocion,
  ordenarCohorte,
  percentilDe,
  zonaDe,
} from './ranking.reglas';

function fila(over: Partial<FilaRanking>): FilaRanking {
  return {
    alumnoId: 'x',
    posicion: 0,
    nombre: 'N',
    apellido: 'A',
    legajo: '0',
    avatar: avatarPorDefecto('indefinido'),
    xpTotal: 1000,
    nivelNodo: 5,
    percentil: 0,
    zona: 'ninguna',
    insignias: 0,
    vidas: 3,
    monedas: 0,
    vidasPerdidasHistorico: 0,
    ejerciciosCompletados: 0,
    obligatoriosAprobadosPct: 100,
    ...over,
  };
}

describe('ordenarCohorte', () => {
  it('ordena por XP descendente y numera las posiciones', () => {
    const r = ordenarCohorte([
      fila({ alumnoId: 'b', xpTotal: 500 }),
      fila({ alumnoId: 'a', xpTotal: 900 }),
      fila({ alumnoId: 'c', xpTotal: 100 }),
    ]);
    expect(r.map((f) => f.alumnoId)).toEqual(['a', 'b', 'c']);
    expect(r.map((f) => f.posicion)).toEqual([1, 2, 3]);
  });

  it('aplica la cascada de desempate RF-RNK-11: +insignias, −vidas perdidas, +ejercicios', () => {
    const base = { xpTotal: 1000 };
    const porInsignias = ordenarCohorte([
      fila({ alumnoId: 'pocas', ...base, insignias: 2 }),
      fila({ alumnoId: 'muchas', ...base, insignias: 6 }),
    ]);
    expect(porInsignias[0].alumnoId).toBe('muchas');

    const porVidas = ordenarCohorte([
      fila({ alumnoId: 'perdio', ...base, insignias: 3, vidasPerdidasHistorico: 2 }),
      fila({ alumnoId: 'intacto', ...base, insignias: 3, vidasPerdidasHistorico: 0 }),
    ]);
    expect(porVidas[0].alumnoId).toBe('intacto');

    const porEjercicios = ordenarCohorte([
      fila({
        alumnoId: 'menos',
        ...base,
        insignias: 3,
        vidasPerdidasHistorico: 1,
        ejerciciosCompletados: 10,
      }),
      fila({
        alumnoId: 'mas',
        ...base,
        insignias: 3,
        vidasPerdidasHistorico: 1,
        ejerciciosCompletados: 30,
      }),
    ]);
    expect(porEjercicios[0].alumnoId).toBe('mas');
  });

  it('no muta el array de entrada', () => {
    const entrada = [fila({ xpTotal: 1 }), fila({ xpTotal: 2 })];
    const copia = [...entrada];
    ordenarCohorte(entrada);
    expect(entrada).toEqual(copia);
  });
});

describe('percentiles y zonas (RF-RNK-09)', () => {
  it('los cortes se activan solo con 10 o más inscriptos', () => {
    expect(cortesActivos(9)).toBe(false);
    expect(cortesActivos(10)).toBe(true);
  });

  it('con menos de 10 inscriptos ninguna posición tiene zona', () => {
    expect(zonaDe(1, 9)).toBe('ninguna');
    expect(zonaDe(9, 9)).toBe('ninguna');
  });

  it('con 12 inscriptos marca P90 arriba y P10 abajo', () => {
    expect(zonaDe(1, 12)).toBe('p90');
    expect(zonaDe(6, 12)).toBe('ninguna');
    expect(zonaDe(12, 12)).toBe('p10');
  });

  it('percentil decreciente por posición', () => {
    expect(percentilDe(1, 12)).toBe(100);
    expect(percentilDe(12, 12)).toBe(8);
  });
});

describe('candidato a promoción / riesgo de regularidad', () => {
  it('candidato = P90 + 0 vidas perdidas + 100% obligatorios (RF-RNK-05)', () => {
    expect(
      esCandidatoPromocion(
        fila({ zona: 'p90', vidasPerdidasHistorico: 0, obligatoriosAprobadosPct: 100 }),
      ),
    ).toBe(true);
    expect(
      esCandidatoPromocion(
        fila({ zona: 'p90', vidasPerdidasHistorico: 1, obligatoriosAprobadosPct: 100 }),
      ),
    ).toBe(false);
    expect(
      esCandidatoPromocion(
        fila({ zona: 'ninguna', vidasPerdidasHistorico: 0, obligatoriosAprobadosPct: 100 }),
      ),
    ).toBe(false);
  });

  it('riesgo = P10 + obligatorios sin cerrar (RF-RNK-06)', () => {
    expect(enRiesgoRegularidad(fila({ zona: 'p10', obligatoriosAprobadosPct: 70 }))).toBe(true);
    expect(enRiesgoRegularidad(fila({ zona: 'p10', obligatoriosAprobadosPct: 100 }))).toBe(false);
    expect(enRiesgoRegularidad(fila({ zona: 'ninguna', obligatoriosAprobadosPct: 40 }))).toBe(
      false,
    );
  });
});
