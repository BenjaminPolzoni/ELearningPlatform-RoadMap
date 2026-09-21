import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RoadmapStore } from '../../../core/data/roadmap.store';
import { World3d } from '../world-3d';

describe('Secure first steps bridge', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('mock-role', 'STUDENT'); });
  afterEach(() => localStorage.clear());

  async function setup() {
    await TestBed.configureTestingModule({ imports: [World3d], providers: [provideRouter([]),
      { provide: RoadmapStore, useValue: { progress: signal(null), sections: signal([]), sectionById: () => undefined } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(World3d);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const frame = root.querySelector('iframe')!;
    const message = (data: unknown, source: MessageEventSource | null = frame.contentWindow, origin = location.origin) => {
      window.dispatchEvent(new MessageEvent('message', { source, origin, data }));
      fixture.detectChanges();
    };
    const snapshot = { type: 'tutorialScene', ready: true, busy: false, zone: 'city',
      destinations: [{ unitId: 'u1', activityId: 'a1', unitName: 'Unidad', activityName: 'Desafío', completed: false }] };
    return { fixture, root, message, snapshot };
  }

  it('ignores other windows, other origins and malformed snapshots', async () => {
    const { root, message, snapshot } = await setup();
    message(snapshot, window);
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    message(snapshot, null, 'https://untrusted.example');
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    message({ ...snapshot, destinations: [null] });
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    message(snapshot);
    expect(root.querySelector('app-tutorial-card')?.textContent).toContain('Probá moverte');
  });

  it('hides the card during customization and remembers the step on return', async () => {
    const { root, message, snapshot } = await setup();
    message(snapshot);
    message({ type: 'tutorialMoved', attempt: 0 });
    expect(root.querySelector('app-tutorial-card')?.textContent).toContain('Entrá a una unidad');
    message({ ...snapshot, busy: true });
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    message(snapshot);
    expect(root.querySelector('app-tutorial-card')?.textContent).toContain('Entrá a una unidad');
  });

  it('does not start automatically for the teacher', async () => {
    localStorage.setItem('mock-role', 'TEACHER');
    const { root, message, snapshot } = await setup();
    message(snapshot);
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    expect(root.querySelector('.tutorial-help')).toBeNull();
  });

  it('navigates to the hexagon map on receiving openUnitPlay', async () => {
    const { message } = await setup();
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    message({ type: 'openUnitPlay', unitId: 'u1-fundamentals' });
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['/play', expect.any(String), 'u1-fundamentals']));
  });
});
