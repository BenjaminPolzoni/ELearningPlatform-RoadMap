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

  it('initializes and opens the seed subject', () => {
    expect(component).toBeTruthy();
    expect(store.current()).toBeTruthy();
    expect(store.current()?.sections.length).toBeGreaterThan(0);
  });

  it('the host scrolls internally (the shell clips with overflow hidden)', () => {
    // RF-NFR-05: the shell (app.css :host + app.html main) is 100vh/98vh with
    // overflow hidden. If the host does not bound its height with its own scroll, a
    // subject with many sections gets clipped and unreachable.
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('h-full')).toBe(true);
    expect(host.classList.contains('overflow-y-auto')).toBe(true);
  });

  it('adds a new section and allows editing its biome', () => {
    component.addSection('Unidad Glacial');
    const u = store.current()!.sections.find((x) => x.title === 'Unidad Glacial');
    expect(u).toBeTruthy();

    component.editSection(u!.id, u!.title, 'Zona fría', '#06b6d4', 'snow');
    expect(component.editing()).toBeTruthy();

    component.onSave({
      title: 'Unidad Glacial Actualizada',
      description: 'Zona fría con nieve',
      color: '#06b6d4',
      biome: 'snow',
    });

    const savedU = store.current()!.sections.find((x) => x.id === u!.id);
    expect(savedU?.title).toBe('Unidad Glacial Actualizada');
    expect(savedU?.biome).toBe('snow');

    // Verifies that the 'snow' biome was projected to the 3D Roadmap
    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v3')!);
    const u3d = rm.sections.find((x: any) => x.name === 'Unidad Glacial Actualizada');
    expect(u3d).toBeTruthy();
    expect(u3d.biome).toBe('Snow');
  });
});
