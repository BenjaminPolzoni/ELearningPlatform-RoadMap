import { Progreso } from '../../core/data/roadmap.models';
import { nivelNodo } from './nivel-nodo';

function progreso(estados: Progreso['nodos'][number]['estado'][]): Progreso {
  return {
    alumnoId: 'alu-01',
    cursoCohorteId: 'cc',
    xpTotal: 0,
    vidasVigentes: 3,
    nodos: estados.map((estado, i) => ({ nodoId: `n${i}`, estado })),
  };
}

describe('nivelNodo', () => {
  it('es la cantidad de nodos completados + 1 (el nodo donde está parado)', () => {
    expect(nivelNodo(progreso(['completado', 'completado', 'habilitado', 'bloqueado']))).toBe(3);
  });

  it('sin ningún nodo completado, está en el nodo 1', () => {
    expect(nivelNodo(progreso(['habilitado', 'bloqueado']))).toBe(1);
  });

  it('no supera el total de nodos del curso', () => {
    expect(nivelNodo(progreso(['completado', 'completado', 'completado']))).toBe(3);
    expect(nivelNodo(progreso(['completado', 'completado', 'completado']), 3)).toBe(3);
  });
});
