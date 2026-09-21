import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Progress, Section } from '../../core/data/roadmap.models';
import { World3d } from './world-3d';
import { VerticalChallenge } from './vertical-world.engine';

describe('Confirmed progress celebrations', () => {
  beforeEach(() => { localStorage.setItem('mock-role', 'STUDENT'); });
  afterEach(() => { localStorage.clear(); vi.useRealTimers(); });

  async function setup(completed = false, optional = false) {
    const progress = signal<Progress>({ studentId: 'stu-01', courseCohortId: 'curso', xpTotal: 100,
      currentLives: 3, nodes: completed ? [{ nodeId: 'a1', status: 'completed' }] : [] });
    const unit: Section = { id: 'u1', name: 'Bosque', order: 1, xpThreshold: 0,
      activities: [{ id: 'a1', name: 'Desafío', type: 'practical-challenge', isMandatory: !optional,
        allowedRetries: 3, positionX: 0, positionY: 0 }] };
    const save = vi.fn();
    await TestBed.configureTestingModule({ imports: [World3d], providers: [provideRouter([]),
      { provide: RoadmapStore, useValue: { progress, sections: signal([unit]), sectionById: () => unit, addProgress: save } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(World3d);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    host['focusWorld'] = () => {};
    const challenge: VerticalChallenge = { id: 1, activityId: 'a1', title: 'Desafío', type: 'practical-challenge',
      difficulty: 'BASIC', minutes: 1, xp: 100, description: '', x: 0, y: 0 };
    host['openActivity'](challenge); host['activeUnitId'].set('u1'); host['isQuizResolved'].set(true);
    const confirm = () => {
      const next: Progress = { ...progress(), xpTotal: 175, nodes: [{ nodeId: 'a1', status: 'completed' }] };
      progress.set(next); save.mock.calls.at(-1)![3](next);
    };
    return { fixture, host, challenge, save, confirm };
  }

  it('waits for the save, blocks double click and uses the confirmed XP', async () => {
    const { host, challenge, save, confirm } = await setup();
    host['onCompleteActivity'](challenge); host['onCompleteActivity'](challenge);
    expect(save).toHaveBeenCalledTimes(1);
    expect(host['rewardNotice']()).toBeNull();
    expect(host['activeChallenge']()).toBe(challenge);
    confirm();
    expect(host['activeChallenge']()).toBeNull();
    expect(host['pendingReward']).toMatchObject({ xp: 75, unitCompleted: true });
  });

  it('keeps the challenge and allows retrying on error', async () => {
    const { host, challenge, save } = await setup();
    host['onCompleteActivity'](challenge); save.mock.calls[0][4]();
    expect(host['savingProgress']()).toBe(false);
    expect(host['saveError']()).toBeTruthy();
    expect(host['activeChallenge']()).toBe(challenge);
    expect(host['pendingReward']).toBeNull();
    host['onCompleteActivity'](challenge);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('does not save again nor announce the reward when repeated', async () => {
    const { fixture, host, challenge, save } = await setup(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('+100 XP');
    host['onCompleteActivity'](challenge);
    expect(save).not.toHaveBeenCalled();
    expect(host['pendingReward']).toBeNull();
  });

  it('does not declare a section solved without mandatory items', async () => {
    const { host, challenge, confirm } = await setup(false, true);
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']?.unitCompleted).toBe(false);
  });

  it('ignores confirmations from other windows and does not duplicate the notice', async () => {
    const { host, fixture, challenge, confirm } = await setup();
    vi.useFakeTimers();
    host['onCompleteActivity'](challenge); confirm();
    const data = { type: 'celebrationStarted', id: host['pendingReward']!.id };
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: window, data }));
    expect(host['rewardNotice']()).toBeNull();
    const frame = (fixture.nativeElement as HTMLElement).querySelector('iframe')!;
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data }));
    expect(host['rewardNotice']()?.xp).toBe(75);
    vi.advanceTimersByTime(2500);
    window.dispatchEvent(new MessageEvent('message', { origin: location.origin, source: frame.contentWindow, data }));
    vi.advanceTimersByTime(500);
    expect(host['rewardNotice']()).toBeNull();
  });

  it('excludes theory and recovery from the effects', async () => {
    const { host, challenge, confirm } = await setup();
    challenge.type = 'theory'; challenge.xp = 0;
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']).toBeNull();
    host['openActivity'](challenge); host['activeUnitId'].set('u1'); host['isQuizResolved'].set(true);
    challenge.recovery = true;
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']).toBeNull();
    expect(host['localLives']()).toBe(3);
  });

  it('shows a fallback only once if the world does not respond', async () => {
    const { host, challenge, confirm } = await setup();
    vi.useFakeTimers();
    host['onCompleteActivity'](challenge); confirm();
    vi.advanceTimersByTime(3000);
    expect(host['rewardNotice']()?.xp).toBe(75);
    expect(host['pendingReward']).toBeNull();
    vi.advanceTimersByTime(2500);
    expect(host['rewardNotice']()).toBeNull();
  });
});
