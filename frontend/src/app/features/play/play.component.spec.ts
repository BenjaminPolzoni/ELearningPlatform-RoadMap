import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { PlayComponent } from './play.component';
import { StoreService } from '../../core/educa/store.service';
import { World3dService } from './engine/world-3d.service';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../core/data/in-memory-roadmap.adapter';
import { vi } from 'vitest';

describe('PlayComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mock-rol', 'ALUMNO');
  });
  afterEach(() => localStorage.clear());

  it('resuelve unidad por ID y configura el bioma y título sin faltantes', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PlayComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? CURSO_SEED_ID : key === 'unidadId' ? 'u1-fundamentos' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(PlayComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.missing()).toBe(false);
    expect(comp.title()).toContain('Fundamentos');
    expect(mockWorld3d.init).toHaveBeenCalled();
  });

  it('resuelve unidad por índice numérico (u1) si el id no es id exacto', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PlayComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? CURSO_SEED_ID : key === 'unidadId' ? 'u2' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(PlayComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.missing()).toBe(false);
    expect(comp.title()).toContain('Control');
    expect(mockWorld3d.init).toHaveBeenCalled();
  });

  it('el regreso del mundo apunta a Mis clases, no a la ciudad 3D', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PlayComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? CURSO_SEED_ID : key === 'unidadId' ? 'u1-fundamentos' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(PlayComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayComponent);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const regresos = [...html.querySelectorAll('a[href="/alumno"]')];
    expect(regresos.length).toBeGreaterThan(0);
    expect(regresos.some((a) => a.textContent?.includes('Mis clases'))).toBe(true);
    expect(html.textContent).not.toContain('Ciudad 3D');
  });

  it('conmuta los efectos visuales al hacer clic en el botón FX', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
      alternarVista: vi.fn().mockReturnValue('primera'),
    };

    await TestBed.configureTestingModule({
      imports: [PlayComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? CURSO_SEED_ID : key === 'unidadId' ? 'u1-fundamentos' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(PlayComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(PlayComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.theme.effects()).toBe(true);

    const html = fixture.nativeElement as HTMLElement;
    const fxBtn = [...html.querySelectorAll('button')].find((b) => b.textContent?.includes('FX:'));
    expect(fxBtn).toBeTruthy();
    expect(fxBtn?.textContent).toContain('FX: ON');

    fxBtn?.click();
    fixture.detectChanges();

    expect(comp.theme.effects()).toBe(false);
    expect(fxBtn?.textContent).toContain('FX: OFF');
    expect(mockWorld3d.setEffectsEnabled).toHaveBeenCalledWith(false);

    // Volver a activar
    fxBtn?.click();
    fixture.detectChanges();

    expect(comp.theme.effects()).toBe(true);
    expect(fxBtn?.textContent).toContain('FX: ON');
    expect(mockWorld3d.setEffectsEnabled).toHaveBeenCalledWith(true);
  });
});

