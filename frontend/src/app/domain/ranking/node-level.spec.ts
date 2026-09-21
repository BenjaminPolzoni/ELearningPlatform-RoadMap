import { Progress } from '../../core/data/roadmap.models';
import { nodeLevel } from './node-level';

function progress(statuses: Progress['nodes'][number]['status'][]): Progress {
  return {
    studentId: 'alu-01',
    courseCohortId: 'cc',
    xpTotal: 0,
    currentLives: 3,
    nodes: statuses.map((status, i) => ({ nodeId: `n${i}`, status })),
  };
}

describe('nodeLevel', () => {
  it('is the number of completed nodes + 1 (the node where they stand)', () => {
    expect(nodeLevel(progress(['completado', 'completado', 'habilitado', 'bloqueado']))).toBe(3);
  });

  it('with no completed node, they are on node 1', () => {
    expect(nodeLevel(progress(['habilitado', 'bloqueado']))).toBe(1);
  });

  it('does not exceed the total number of nodes of the course', () => {
    expect(nodeLevel(progress(['completado', 'completado', 'completado']))).toBe(3);
    expect(nodeLevel(progress(['completado', 'completado', 'completado']), 3)).toBe(3);
  });
});
