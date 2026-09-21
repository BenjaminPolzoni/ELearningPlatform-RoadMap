import { isTutorialScene, TUTORIAL_KEY, TutorialScene, TutorialState } from './tutorial-state';

const destination = (unitId = 'u1', activityId = 'a1', completed = false) =>
  ({ unitId, activityId, completed, unitName: 'Primera unidad', activityName: 'Primer desafío' });
const scene = (overrides: Partial<TutorialScene> = {}): TutorialScene => ({
  type: 'tutorialScene', ready: true, busy: false, zone: 'city',
  destinations: [destination()], ...overrides,
});

describe('Tutorial de primeros pasos', () => {
  let tutorial: TutorialState;
  beforeEach(() => { localStorage.clear(); tutorial = new TutorialState(localStorage); });
  afterEach(() => { tutorial.dispose(); localStorage.clear(); vi.useRealTimers(); });

  it('espera al mapa, personaje y datos; no inicia sin desafíos accesibles', () => {
    tutorial.receiveScene(scene({ ready: false }));
    expect(tutorial.status()).toBe('pendiente');
    tutorial.receiveScene(scene({ destinations: [] }));
    expect(tutorial.status()).toBe('pendiente');
    tutorial.restart();
    expect(tutorial.helpEmpty()).toBe(true);
    expect(tutorial.status()).toBe('pendiente');
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('activo');
    expect(tutorial.helpEmpty()).toBe(false);
  });

  it('avanza por movimiento confirmado y entrada, termina solo al abrir un desafío válido', () => {
    tutorial.receiveScene(scene());
    tutorial.moved(0);
    expect(tutorial.step()).toBe(2);
    tutorial.receiveScene(scene({ zone: 'u1' }));
    expect(tutorial.step()).toBe(3);
    tutorial.opened('u1', 'bloqueado');
    expect(tutorial.status()).toBe('activo');
    tutorial.opened('u1', 'a1');
    expect(tutorial.status()).toBe('completado');
    expect(tutorial.celebration()).toBe(false);
  });

  it('acepta acciones fuera de orden sin exigir repetirlas', () => {
    tutorial.receiveScene(scene());
    tutorial.opened('u1', 'a1');
    expect(tutorial.status()).toBe('completado');
  });

  it('prefiere pendientes por orden, pero sigue la unidad elegida por el alumno', () => {
    const destinations = [destination('u1', 'a1', true), destination('u2', 'a2'), destination('u3', 'a3')];
    tutorial.receiveScene(scene({ destinations }));
    expect(tutorial.destination()?.unitId).toBe('u2');
    tutorial.receiveScene(scene({ destinations, zone: 'u3' }));
    expect(tutorial.destination()?.unitId).toBe('u3');
    expect(tutorial.step()).toBe(3);
  });

  it('permite practicar con desafíos completados y reorienta al regresar a la ciudad', () => {
    tutorial.receiveScene(scene({ zone: 'u1', destinations: [destination('u1', 'a1', true)] }));
    expect(tutorial.step()).toBe(3);
    expect(tutorial.destination()?.activityId).toBe('a1');
    tutorial.receiveScene(scene());
    expect(tutorial.step()).toBe(2);
  });

  it('adapta destino tras reconstruir el mapa y suspende la selección mientras carga', () => {
    tutorial.receiveScene(scene({ zone: 'u1' }));
    tutorial.receiveScene(scene({ ready: false }));
    expect(tutorial.destination()).toBeNull();
    tutorial.receiveScene(scene({ zone: 'u1', destinations: [destination('u2', 'a2')] }));
    expect(tutorial.step()).toBe(2);
    expect(tutorial.destination()?.unitId).toBe('u2');
  });

  it('no avanza por mensajes de movimiento atrasados o durante una pausa', () => {
    tutorial.receiveScene(scene());
    tutorial.restart();
    tutorial.moved(0);
    expect(tutorial.step()).toBe(1);
    tutorial.receiveScene(scene({ busy: true }));
    tutorial.moved(1);
    expect(tutorial.step()).toBe(1);
    tutorial.receiveScene(scene());
    tutorial.moved(1);
    expect(tutorial.step()).toBe(2);
  });

  it('recuerda omisión y finalización, y permite repetir sin borrar progreso académico', () => {
    localStorage.setItem('academic-progress', 'unchanged');
    tutorial.receiveScene(scene());
    tutorial.skip();
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('omitido');
    tutorial.restart();
    expect(tutorial.status()).toBe('activo');
    tutorial.opened('u1', 'a1');
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('completado');
    expect(localStorage.getItem('academic-progress')).toBe('unchanged');
  });

  it('retoma el paso guardado y vuelve a entrada si la recarga deja al alumno en la ciudad', () => {
    tutorial.receiveScene(scene({ zone: 'u1' }));
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.step()).toBe(2);
  });

  it('muestra la celebración al cerrar y la retira luego de cuatro segundos', () => {
    vi.useFakeTimers();
    tutorial.receiveScene(scene()); tutorial.opened('u1', 'a1');
    tutorial.closedChallenge();
    expect(tutorial.celebration()).toBe(true);
    vi.advanceTimersByTime(4000);
    expect(tutorial.celebration()).toBe(false);
  });

  it('tolera almacenamiento corrupto o denegado', () => {
    localStorage.setItem(TUTORIAL_KEY, '{invalid');
    expect(new TutorialState(localStorage).status()).toBe('pendiente');
    tutorial = new TutorialState({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    tutorial.receiveScene(scene()); tutorial.moved(0); tutorial.skip();
    expect(tutorial.status()).toBe('omitido');
  });

  it('rechaza snapshots malformados', () => {
    expect(isTutorialScene(scene())).toBe(true);
    expect(isTutorialScene({ ...scene(), destinations: [{ unitId: 'u1' }] })).toBe(false);
    expect(isTutorialScene({ ...scene(), busy: 'false' })).toBe(false);
    expect(isTutorialScene(null)).toBe(false);
  });
});
