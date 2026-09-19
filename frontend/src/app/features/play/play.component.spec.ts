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
});
