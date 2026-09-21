import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { WorldsComponent } from './worlds.component';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../core/data/in-memory-roadmap.adapter';
import { Archipelago3dService } from './engine/archipelago-3d.service';
import { SyncChannelService } from '../../core/educa/sync-channel.service';

describe('WorldsComponent (island map)', () => {
  const mock3d = {
    init: vi.fn(),
    sailToward: vi.fn(),
    sailYDock: vi.fn(),
    isDockedIn: vi.fn().mockReturnValue(true),
    getIsNavigating: vi.fn().mockReturnValue(false),
    updateSections: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => localStorage.clear());

  async function create(modeInitial?: '3d' | '2.5d') {
    if (modeInitial) {
      localStorage.setItem('educa_islands_mode', modeInitial);
    }
    await TestBed.configureTestingModule({
      imports: [WorldsComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        { provide: Archipelago3dService, useValue: mock3d },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? COURSE_SEED_ID : null) } } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorldsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('draws one island per section of the seed course on the 2.5D Nautical Chart', async () => {
    const fixture = await create('2.5d');
    const islands = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    expect(islands.length).toBe(4);
  });

  it('clicking an island shows its floating arcade card', async () => {
    const fixture = await create('2.5d');
    const islands = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    islands[1].nativeElement.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    const card = fixture.nativeElement as HTMLElement;
    expect(card.textContent).toContain('Estructuras de Control');
    expect(card.textContent).toContain('ENTRAR A LA ISLA');
    expect(card.textContent).toContain('ZARPAR');
  });

  it('allows toggling between the 3D Diorama and Nautical Chart modes', async () => {
    const fixture = await create('2.5d');
    const comp = fixture.componentInstance;
    expect(comp['mode']()).toBe('2.5d');

    // Switch to 3D
    const btn3d = fixture.debugElement.query(By.css('button[title*="3D"]'));
    expect(btn3d).toBeTruthy();
    btn3d.nativeElement.click();
    fixture.detectChanges();

    expect(comp['mode']()).toBe('3d');
    expect(localStorage.getItem('educa_islands_mode')).toBe('3d');

    // Switch back to 2.5D
    const btn2d = fixture.debugElement.query(By.css('button[title*="Carta"]'));
    expect(btn2d).toBeTruthy();
    btn2d.nativeElement.click();
    fixture.detectChanges();

    expect(comp['mode']()).toBe('2.5d');
    expect(localStorage.getItem('educa_islands_mode')).toBe('2.5d');
  });

  it('in 3D mode it initializes the Three.js service and the canvas', async () => {
    const fixture = await create('3d');
    const canvas = fixture.debugElement.query(By.css('canvas'));
    expect(canvas).toBeTruthy();
    expect(mock3d.init).toHaveBeenCalled();
  });

  it('in 3D mode it shows the floating card when hovering over an island', async () => {
    const fixture = await create('3d');
    const comp = fixture.componentInstance;
    const sectionSeed = comp.store.current()?.sections[0];
    expect(sectionSeed).toBeTruthy();

    comp['hoveredId'].set(sectionSeed!.id);
    comp['hoverPos'].set({ x: 300, y: 300 });
    fixture.detectChanges();

    const tooltip = fixture.nativeElement.querySelector('.pointer-events-none.fixed');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain(sectionSeed!.title);
    expect(tooltip.textContent).toContain('torres');
    expect(tooltip.textContent).toContain('Clic para navegar y atracar');
  });

  it('updates the sections live when receiving the course_updated event', async () => {
    const fixture = await create('3d');
    const syncChannel = TestBed.inject(SyncChannelService);
    syncChannel.broadcast({ type: 'course_updated', courseId: COURSE_SEED_ID });
    fixture.detectChanges();

    expect(mock3d.updateSections).toHaveBeenCalled();
    const toast = fixture.nativeElement.querySelector('.animate-bounce');
    expect(toast?.textContent).toContain('Archipiélago actualizado');
  });
});
