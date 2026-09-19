import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { BuilderComponent } from './builder.component';
import { StoreService } from '../../../core/educa/store.service';
import { StorageService } from '../../../core/educa/storage.service';
import { RoadmapStore } from '../../../core/data/roadmap.store';
import { RoadmapDataPort } from '../../../core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../../../core/data/in-memory-roadmap.adapter';
import { SaveFeedbackService } from '../../../core/services/save-feedback.service';

describe('BuilderComponent (Educa)', () => {
  let fixture: ComponentFixture<BuilderComponent>;
  let component: BuilderComponent;
  let store: StoreService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BuilderComponent],
      providers: [
        provideRouter([]),
        StoreService,
        StorageService,
        RoadmapStore,
        SaveFeedbackService,
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '11111111-1111-1111-1111-111111111111' } },
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(StoreService);
    fixture = TestBed.createComponent(BuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('se inicializa y abre la asignatura de seed', () => {
    expect(component).toBeTruthy();
    expect(store.current()).toBeTruthy();
    expect(store.current()?.unidades.length).toBeGreaterThan(0);
  });

  it('agrega una nueva unidad y permite editar su bioma', () => {
    component.addUnidad('Unidad Glacial');
    const u = store.current()!.unidades.find((x) => x.titulo === 'Unidad Glacial');
    expect(u).toBeTruthy();

    component.editUnidad(u!.id, u!.titulo, 'Zona fría', '#06b6d4', 'nieve');
    expect(component.editing()).toBeTruthy();

    component.onSave({
      titulo: 'Unidad Glacial Actualizada',
      descripcion: 'Zona fría con nieve',
      color: '#06b6d4',
      bioma: 'nieve',
    });

    const uGuardada = store.current()!.unidades.find((x) => x.id === u!.id);
    expect(uGuardada?.titulo).toBe('Unidad Glacial Actualizada');
    expect(uGuardada?.bioma).toBe('nieve');

    // Verifica que el bioma 'nieve' fue proyectado al Roadmap 3D
    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v2')!);
    const u3d = rm.unidades.find((x: any) => x.nombre === 'Unidad Glacial Actualizada');
    expect(u3d).toBeTruthy();
    expect(u3d.bioma).toBe('Nieve');
  });
});
