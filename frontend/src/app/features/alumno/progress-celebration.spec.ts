import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RoadmapStore } from '../../core/data/roadmap.store';
import { Progreso, Unidad } from '../../core/data/roadmap.models';
import { Mundo3d } from './mundo-3d';
import { VerticalChallenge } from './vertical-world.engine';

describe('Celebraciones de progreso confirmado', () => {
  beforeEach(() => { localStorage.setItem('mock-rol', 'ALUMNO'); });
  afterEach(() => { localStorage.clear(); vi.useRealTimers(); });

  async function setup(completed = false, optional = false) {
    const progreso = signal<Progreso>({ alumnoId: 'alu-01', cursoCohorteId: 'curso', xpTotal: 100,
      vidasVigentes: 3, nodos: completed ? [{ nodoId: 'a1', estado: 'completado' }] : [] });
    const unit: Unidad = { id: 'u1', nombre: 'Bosque', orden: 1, umbralXpDesbloqueo: 0,
      actividades: [{ id: 'a1', nombre: 'Desafío', tipo: 'desafio-practico', esObligatorio: !optional,
        reintentosPermitidos: 3, posicionX: 0, posicionY: 0 }] };
    const save = vi.fn();
    await TestBed.configureTestingModule({ imports: [Mundo3d], providers: [provideRouter([]),
      { provide: RoadmapStore, useValue: { progreso, unidades: signal([unit]), unidadPorId: () => unit, sumarProgreso: save } },
    ] }).compileComponents();
    const fixture = TestBed.createComponent(Mundo3d);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    host['focusWorld'] = () => {};
    const challenge: VerticalChallenge = { id: 1, actividadId: 'a1', title: 'Desafío', type: 'desafio-practico',
      difficulty: 'BASICO', minutes: 1, xp: 100, description: '', x: 0, y: 0 };
    host['openActivity'](challenge); host['activeUnitId'].set('u1'); host['isQuizResolved'].set(true);
    const confirm = () => {
      const next: Progreso = { ...progreso(), xpTotal: 175, nodos: [{ nodoId: 'a1', estado: 'completado' }] };
      progreso.set(next); save.mock.calls.at(-1)![3](next);
    };
    return { fixture, host, challenge, save, confirm };
  }

  it('espera el guardado, bloquea doble clic y usa el XP confirmado', async () => {
    const { host, challenge, save, confirm } = await setup();
    host['onCompleteActivity'](challenge); host['onCompleteActivity'](challenge);
    expect(save).toHaveBeenCalledTimes(1);
    expect(host['rewardNotice']()).toBeNull();
    expect(host['activeChallenge']()).toBe(challenge);
    confirm();
    expect(host['activeChallenge']()).toBeNull();
    expect(host['pendingReward']).toMatchObject({ xp: 75, unitCompleted: true });
  });

  it('conserva el desafío y permite reintentar ante error', async () => {
    const { host, challenge, save } = await setup();
    host['onCompleteActivity'](challenge); save.mock.calls[0][4]();
    expect(host['savingProgress']()).toBe(false);
    expect(host['saveError']()).toBeTruthy();
    expect(host['activeChallenge']()).toBe(challenge);
    expect(host['pendingReward']).toBeNull();
    host['onCompleteActivity'](challenge);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('no vuelve a guardar ni anunciar recompensa al repetir', async () => {
    const { fixture, host, challenge, save } = await setup(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('+100 XP');
    host['onCompleteActivity'](challenge);
    expect(save).not.toHaveBeenCalled();
    expect(host['pendingReward']).toBeNull();
  });

  it('no declara resuelta una unidad sin obligatorias', async () => {
    const { host, challenge, confirm } = await setup(false, true);
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']?.unitCompleted).toBe(false);
  });

  it('ignora confirmaciones de otras ventanas y no duplica el aviso', async () => {
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

  it('excluye teoría y recuperación de los efectos', async () => {
    const { host, challenge, confirm } = await setup();
    challenge.type = 'teoria'; challenge.xp = 0;
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']).toBeNull();
    host['openActivity'](challenge); host['activeUnitId'].set('u1'); host['isQuizResolved'].set(true);
    challenge.recovery = true;
    host['onCompleteActivity'](challenge); confirm();
    expect(host['pendingReward']).toBeNull();
    expect(host['localVidas']()).toBe(3);
  });

  it('muestra fallback una sola vez si el mundo no responde', async () => {
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
