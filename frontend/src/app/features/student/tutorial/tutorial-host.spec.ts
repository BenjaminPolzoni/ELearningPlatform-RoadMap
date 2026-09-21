import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RoadmapStore } from '../../../core/data/roadmap.store';
import { Mundo3d } from '../mundo-3d';

describe('Puente seguro de primeros pasos', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('mock-rol', 'ALUMNO'); });
  afterEach(() => localStorage.clear());

  async function setup() {
    await TestBed.configureTestingModule({ imports: [Mundo3d], providers: [provideRouter([]),
      { provide: RoadmapStore, useValue: { progreso: signal(null), unidades: signal([]), unidadPorId: () => undefined } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(Mundo3d);
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

  it('ignora otras ventanas, otros orígenes y snapshots malformados', async () => {
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

  it('oculta la tarjeta durante personalización y recuerda el paso al regresar', async () => {
    const { root, message, snapshot } = await setup();
    message(snapshot);
    message({ type: 'tutorialMoved', attempt: 0 });
    expect(root.querySelector('app-tutorial-card')?.textContent).toContain('Entrá a una unidad');
    message({ ...snapshot, busy: true });
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    message(snapshot);
    expect(root.querySelector('app-tutorial-card')?.textContent).toContain('Entrá a una unidad');
  });

  it('no inicia automáticamente para el profesor', async () => {
    localStorage.setItem('mock-rol', 'PROFESOR');
    const { root, message, snapshot } = await setup();
    message(snapshot);
    expect(root.querySelector('app-tutorial-card')).toBeNull();
    expect(root.querySelector('.tutorial-help')).toBeNull();
  });

  it('navega al mapa de hexágonos al recibir openUnitPlay', async () => {
    const { message } = await setup();
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    message({ type: 'openUnitPlay', unitId: 'u1-fundamentos' });
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['/play', expect.any(String), 'u1-fundamentos']));
  });
});
