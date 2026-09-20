import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { WorldsComponent } from './worlds.component';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../core/data/in-memory-roadmap.adapter';
import { Archipielago3dService } from './engine/archipielago-3d.service';

describe('WorldsComponent (mapa de islas)', () => {
  const mock3d = {
    init: vi.fn(),
    zarparHacia: vi.fn(),
    zarparYAtracar: vi.fn(),
    estaAtracadoEn: vi.fn().mockReturnValue(true),
    getEstaNavegando: vi.fn().mockReturnValue(false),
    resize: vi.fn(),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => localStorage.clear());

  async function crear(modoInicial?: '3d' | '2.5d') {
    if (modoInicial) {
      localStorage.setItem('educa_islas_modo', modoInicial);
    }
    await TestBed.configureTestingModule({
      imports: [WorldsComponent],
      providers: [
        provideRouter([]),
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        { provide: Archipielago3dService, useValue: mock3d },
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

  it('dibuja una isla por unidad del curso seed en la Carta Náutica 2.5D', async () => {
    const fixture = await crear('2.5d');
    const islas = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    expect(islas.length).toBe(4);
  });

  it('click en una isla muestra su ficha flotante arcade', async () => {
    const fixture = await crear('2.5d');
    const islas = fixture.debugElement.queryAll(By.css('svg g[role="option"]'));
    islas[1].nativeElement.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    const ficha = fixture.nativeElement as HTMLElement;
    expect(ficha.textContent).toContain('Estructuras de Control');
    expect(ficha.textContent).toContain('ENTRAR A LA ISLA');
    expect(ficha.textContent).toContain('ZARPAR');
  });

  it('permite alternar entre los modos Diorama 3D y Carta Náutica', async () => {
    const fixture = await crear('2.5d');
    const comp = fixture.componentInstance;
    expect(comp['modo']()).toBe('2.5d');

    // Cambiar a 3D
    const btn3d = fixture.debugElement.query(By.css('button[title*="3D"]'));
    expect(btn3d).toBeTruthy();
    btn3d.nativeElement.click();
    fixture.detectChanges();

    expect(comp['modo']()).toBe('3d');
    expect(localStorage.getItem('educa_islas_modo')).toBe('3d');

    // Cambiar de regreso a 2.5D
    const btn2d = fixture.debugElement.query(By.css('button[title*="Carta"]'));
    expect(btn2d).toBeTruthy();
    btn2d.nativeElement.click();
    fixture.detectChanges();

    expect(comp['modo']()).toBe('2.5d');
    expect(localStorage.getItem('educa_islas_modo')).toBe('2.5d');
  });

  it('en modo 3D inicializa el servicio de Three.js y el canvas', async () => {
    const fixture = await crear('3d');
    const canvas = fixture.debugElement.query(By.css('canvas'));
    expect(canvas).toBeTruthy();
    expect(mock3d.init).toHaveBeenCalled();
  });

  it('en modo 3D muestra la ficha flotante al hacer hover sobre una isla', async () => {
    const fixture = await crear('3d');
    const comp = fixture.componentInstance;
    const unidadSeed = comp.store.current()?.unidades[0];
    expect(unidadSeed).toBeTruthy();

    comp['hoveredId'].set(unidadSeed!.id);
    comp['hoverPos'].set({ x: 300, y: 300 });
    fixture.detectChanges();

    const tooltip = fixture.nativeElement.querySelector('.pointer-events-none.fixed');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toContain(unidadSeed!.titulo);
    expect(tooltip.textContent).toContain('torres');
    expect(tooltip.textContent).toContain('Clic para navegar y atracar');
  });
});
