import { isTutorialScene, TUTORIAL_KEY, TutorialScene, TutorialState } from './tutorial-state';

const destination = (unitId = 'u1', activityId = 'a1', completed = false) =>
  ({ unitId, activityId, completed, unitName: 'Primera unidad', activityName: 'Primer desafío' });
const scene = (overrides: Partial<TutorialScene> = {}): TutorialScene => ({
  type: 'tutorialScene', ready: true, busy: false, zone: 'city',
  destinations: [destination()], ...overrides,
});

describe('First steps tutorial', () => {
  let tutorial: TutorialState;
  beforeEach(() => { localStorage.clear(); tutorial = new TutorialState(localStorage); });
  afterEach(() => { tutorial.dispose(); localStorage.clear(); vi.useRealTimers(); });

  it('waits for the map, character and data; does not start without accessible challenges', () => {
    tutorial.receiveScene(scene({ ready: false }));
    expect(tutorial.status()).toBe('pending');
    tutorial.receiveScene(scene({ destinations: [] }));
    expect(tutorial.status()).toBe('pending');
    tutorial.restart();
    expect(tutorial.helpEmpty()).toBe(true);
    expect(tutorial.status()).toBe('pending');
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('active');
    expect(tutorial.helpEmpty()).toBe(false);
  });

  it('advances on confirmed movement and entry, finishes only on opening a valid challenge', () => {
    tutorial.receiveScene(scene());
    tutorial.moved(0);
    expect(tutorial.step()).toBe(2);
    tutorial.receiveScene(scene({ zone: 'u1' }));
    expect(tutorial.step()).toBe(3);
    tutorial.opened('u1', 'locked');
    expect(tutorial.status()).toBe('active');
    tutorial.opened('u1', 'a1');
    expect(tutorial.status()).toBe('completed');
    expect(tutorial.celebration()).toBe(false);
  });

  it('accepts out-of-order actions without requiring them to be repeated', () => {
    tutorial.receiveScene(scene());
    tutorial.opened('u1', 'a1');
    expect(tutorial.status()).toBe('completed');
  });

  it('prefers pending ones in order, but follows the section chosen by the student', () => {
    const destinations = [destination('u1', 'a1', true), destination('u2', 'a2'), destination('u3', 'a3')];
    tutorial.receiveScene(scene({ destinations }));
    expect(tutorial.destination()?.unitId).toBe('u2');
    tutorial.receiveScene(scene({ destinations, zone: 'u3' }));
    expect(tutorial.destination()?.unitId).toBe('u3');
    expect(tutorial.step()).toBe(3);
  });

  it('allows practicing with completed challenges and reorients on returning to the city', () => {
    tutorial.receiveScene(scene({ zone: 'u1', destinations: [destination('u1', 'a1', true)] }));
    expect(tutorial.step()).toBe(3);
    expect(tutorial.destination()?.activityId).toBe('a1');
    tutorial.receiveScene(scene());
    expect(tutorial.step()).toBe(2);
  });

  it('adapts the destination after rebuilding the map and suspends the selection while loading', () => {
    tutorial.receiveScene(scene({ zone: 'u1' }));
    tutorial.receiveScene(scene({ ready: false }));
    expect(tutorial.destination()).toBeNull();
    tutorial.receiveScene(scene({ zone: 'u1', destinations: [destination('u2', 'a2')] }));
    expect(tutorial.step()).toBe(2);
    expect(tutorial.destination()?.unitId).toBe('u2');
  });

  it('does not advance on stale movement messages or during a pause', () => {
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

  it('remembers skipping and finishing, and allows repeating without erasing academic progress', () => {
    localStorage.setItem('academic-progress', 'unchanged');
    tutorial.receiveScene(scene());
    tutorial.skip();
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('skipped');
    tutorial.restart();
    expect(tutorial.status()).toBe('active');
    tutorial.opened('u1', 'a1');
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.status()).toBe('completed');
    expect(localStorage.getItem('academic-progress')).toBe('unchanged');
  });

  it('resumes the saved step and goes back to entry if the reload leaves the student in the city', () => {
    tutorial.receiveScene(scene({ zone: 'u1' }));
    tutorial = new TutorialState(localStorage);
    tutorial.receiveScene(scene());
    expect(tutorial.step()).toBe(2);
  });

  it('shows the celebration on closing and removes it after four seconds', () => {
    vi.useFakeTimers();
    tutorial.receiveScene(scene()); tutorial.opened('u1', 'a1');
    tutorial.closedChallenge();
    expect(tutorial.celebration()).toBe(true);
    vi.advanceTimersByTime(4000);
    expect(tutorial.celebration()).toBe(false);
  });

  it('tolerates corrupt or denied storage', () => {
    localStorage.setItem(TUTORIAL_KEY, '{invalid');
    expect(new TutorialState(localStorage).status()).toBe('pending');
    tutorial = new TutorialState({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
    tutorial.receiveScene(scene()); tutorial.moved(0); tutorial.skip();
    expect(tutorial.status()).toBe('skipped');
  });

  it('rejects malformed snapshots', () => {
    expect(isTutorialScene(scene())).toBe(true);
    expect(isTutorialScene({ ...scene(), destinations: [{ unitId: 'u1' }] })).toBe(false);
    expect(isTutorialScene({ ...scene(), busy: 'false' })).toBe(false);
    expect(isTutorialScene(null)).toBe(false);
  });
});
