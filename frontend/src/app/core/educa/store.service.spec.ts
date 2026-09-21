import { TestBed } from '@angular/core/testing';
import { StoreService } from './store.service';
import { StorageService } from './storage.service';
import { RoadmapStore } from '../data/roadmap.store';
import { RoadmapDataPort } from '../data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from '../data/in-memory-roadmap.adapter';
import { SaveFeedbackService } from '../services/save-feedback.service';

describe('StoreService (Educa)', () => {
  let service: StoreService;
  let roadmapStore: RoadmapStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        StoreService,
        StorageService,
        RoadmapStore,
        SaveFeedbackService,
        { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
      ],
    });

    service = TestBed.inject(StoreService);
    roadmapStore = TestBed.inject(RoadmapStore);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('lists the initial subjects (seed)', () => {
    const list = service.listAll();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].name).toContain('Programación');
  });

  it('allows creating a subject and adding sections with biomes', () => {
    const a = service.create('Algoritmos Avanzados', 'Descripción de prueba');
    expect(a.name).toBe('Algoritmos Avanzados');
    expect(service.current()?.id).toBe(a.id);

    service.addSection('Nivel Volcánico');
    let current = service.current()!;
    expect(current.sections.length).toBe(1);
    const uId = current.sections[0].id;

    // Switch to the lava biome
    service.editSection(uId, { biome: 'lava', title: 'Tierras de Fuego' });
    current = service.current()!;
    expect(current.sections[0].biome).toBe('lava');
    expect(current.sections[0].title).toBe('Tierras de Fuego');

    // Check synchronization with the global Roadmap (3D)
    const rawRm = localStorage.getItem('roadmap-mock-v3');
    expect(rawRm).toBeTruthy();
    const rm = JSON.parse(rawRm!);
    expect(rm.sections.length).toBe(1);
    expect(rm.sections[0].name).toBe('Tierras de Fuego');
    // 'lava' is projected as 'Nether' for the 3D engine
    expect(rm.sections[0].biome).toBe('Nether');
  });

  it('allows adding modules and attachments that are projected as activities', () => {
    const a = service.create('Curso Web', 'Frontend y Backend');
    service.addSection('Unidad Frontend');
    const uId = service.current()!.sections[0].id;
    service.editSection(uId, { biome: 'nieve' });

    service.addModule(uId, 'Módulo CSS');
    const mId = service.current()!.sections[0].modules[0].id;

    // Add an attachment of type exercise and one of type video
    service.addAttachment(uId, mId, 'Quiz de Flexbox', 'ejercicio');
    service.addAttachment(uId, mId, 'Tutorial Grid', 'video');

    const currentU = service.current()!.sections[0];
    expect(currentU.modules[0].attachments.length).toBe(2);

    // Verify synchronization in the student's roadmap
    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v3')!);
    const u3d = rm.sections[0];
    expect(u3d.biome).toBe('Nieve');
    expect(u3d.activities.length).toBe(2);

    const exerciseAct = u3d.activities.find((act: any) => act.name === 'Quiz de Flexbox');
    expect(exerciseAct).toBeTruthy();
    expect(exerciseAct.type).toBe('desafio-practico');
    expect(exerciseAct.isMandatory).toBe(true);

    const videoAct = u3d.activities.find((act: any) => act.name === 'Tutorial Grid');
    expect(videoAct).toBeTruthy();
    expect(videoAct.type).toBe('teoria');
    expect(videoAct.isMandatory).toBe(false);
  });

  it('does not generate artificial activities if a module has no attachments', () => {
    const a = service.create('Matemáticas', 'Cálculo');
    service.addSection('Álgebra');
    const uId = service.current()!.sections[0].id;
    service.addModule(uId, 'Módulo Vacío Sin Anexos');

    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v3')!);
    expect(rm.sections[0].activities.length).toBe(0);
  });
});
