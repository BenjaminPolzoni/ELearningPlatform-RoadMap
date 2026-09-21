import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HexWorldPageComponent } from './hex-world-page.component';
import { StoreService } from '../../data-access/educa/store.service';
import { World3dService } from '../../engine/world-3d.service';
import { COURSE_SEED_ID } from '../../data-access/mocks/seed';
import { RoadmapDataPort } from '../../data-access/roadmap/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../data-access/roadmap/in-memory-roadmap.adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('PlayComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mock-role', 'STUDENT');
  });
  afterEach(() => localStorage.clear());

  it('resolves section by ID and configures the biome and title without missing values', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HexWorldPageComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? COURSE_SEED_ID : key === 'sectionId' ? 'u1-fundamentals' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(HexWorldPageComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HexWorldPageComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.missing()).toBe(false);
    expect(comp.title()).toContain('Fundamentos');
    expect(mockWorld3d.init).toHaveBeenCalled();
  });

  it('resolves section by numeric index (u1) if the id is not an exact id', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HexWorldPageComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? COURSE_SEED_ID : key === 'sectionId' ? 'u2' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(HexWorldPageComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HexWorldPageComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.missing()).toBe(false);
    expect(comp.title()).toContain('Control');
    expect(mockWorld3d.init).toHaveBeenCalled();
  });

  it('the way back from the world points to My courses, not to the 3D city', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HexWorldPageComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? COURSE_SEED_ID : key === 'sectionId' ? 'u1-fundamentals' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(HexWorldPageComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HexWorldPageComponent);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const returns = [...html.querySelectorAll('a[href="/roadmap/student"]')];
    expect(returns.length).toBeGreaterThan(0);
    expect(returns.some((a) => a.textContent?.includes('Mis clases'))).toBe(true);
    expect(html.textContent).not.toContain('Ciudad 3D');
  });

  it('toggles the visual effects when clicking the FX button', async () => {
    const mockWorld3d = {
      init: vi.fn().mockResolvedValue(undefined),
      applyTheme: vi.fn(),
      setEffectsEnabled: vi.fn(),
      destroy: vi.fn(),
      dispose: vi.fn(),
      toggleView: vi.fn().mockReturnValue('first'),
    };

    await TestBed.configureTestingModule({
      imports: [HexWorldPageComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? COURSE_SEED_ID : key === 'sectionId' ? 'u1-fundamentals' : null),
              },
            },
          },
        },
      ],
    })
      .overrideComponent(HexWorldPageComponent, {
        set: {
          providers: [{ provide: World3dService, useValue: mockWorld3d }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(HexWorldPageComponent);
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

    // Reactivate
    fxBtn?.click();
    fixture.detectChanges();

    expect(comp.theme.effects()).toBe(true);
    expect(fxBtn?.textContent).toContain('FX: ON');
    expect(mockWorld3d.setEffectsEnabled).toHaveBeenCalledWith(true);
  });
});

