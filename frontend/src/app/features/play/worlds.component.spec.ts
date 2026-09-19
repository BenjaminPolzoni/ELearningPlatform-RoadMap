import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { WorldsComponent } from './worlds.component';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../core/data/in-memory-roadmap.adapter';

describe('WorldsComponent (mapa de islas)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function crear() {
    await TestBed.configureTestingModule({
      imports: [WorldsComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? CURSO_SEED_ID : null) } } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(WorldsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('dibuja una isla por unidad del curso seed', async () => {
    const fixture = await crear();
    const islas = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    expect(islas.length).toBe(4);
  });

  it('click en una isla muestra su ficha', async () => {
    const fixture = await crear();
    const islas = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    islas[1].nativeElement.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    const ficha = fixture.nativeElement as HTMLElement;
    expect(ficha.textContent).toContain('Estructuras de Control');
    expect(ficha.textContent).toContain('ENTRAR A LA ISLA');
  });
});
