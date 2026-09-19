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

  it('lista las asignaturas iniciales (seed)', () => {
    const list = service.listAll();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].nombre).toContain('Programación');
  });

  it('permite crear una asignatura y agregar unidades con biomas', () => {
    const a = service.create('Algoritmos Avanzados', 'Descripción de prueba');
    expect(a.nombre).toBe('Algoritmos Avanzados');
    expect(service.current()?.id).toBe(a.id);

    service.addUnidad('Nivel Volcánico');
    let current = service.current()!;
    expect(current.unidades.length).toBe(1);
    const uId = current.unidades[0].id;

    // Cambiar a bioma lava
    service.editUnidad(uId, { bioma: 'lava', titulo: 'Tierras de Fuego' });
    current = service.current()!;
    expect(current.unidades[0].bioma).toBe('lava');
    expect(current.unidades[0].titulo).toBe('Tierras de Fuego');

    // Comprobar sincronización con el Roadmap global (3D)
    const rawRm = localStorage.getItem('roadmap-mock-v2');
    expect(rawRm).toBeTruthy();
    const rm = JSON.parse(rawRm!);
    expect(rm.unidades.length).toBe(1);
    expect(rm.unidades[0].nombre).toBe('Tierras de Fuego');
    // 'lava' se proyecta como 'Nether' para el motor 3D
    expect(rm.unidades[0].bioma).toBe('Nether');
  });

  it('permite agregar módulos y anexos que se proyectan como actividades', () => {
    const a = service.create('Curso Web', 'Frontend y Backend');
    service.addUnidad('Unidad Frontend');
    const uId = service.current()!.unidades[0].id;
    service.editUnidad(uId, { bioma: 'nieve' });

    service.addModulo(uId, 'Módulo CSS');
    const mId = service.current()!.unidades[0].modulos[0].id;

    // Agregar un anexo de tipo ejercicio y uno de tipo video
    service.addAnexo(uId, mId, 'Quiz de Flexbox', 'ejercicio');
    service.addAnexo(uId, mId, 'Tutorial Grid', 'video');

    const uActual = service.current()!.unidades[0];
    expect(uActual.modulos[0].anexos.length).toBe(2);

    // Verificar sincronización en el roadmap del alumno
    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v2')!);
    const u3d = rm.unidades[0];
    expect(u3d.bioma).toBe('Nieve');
    expect(u3d.actividades.length).toBe(2);

    const ejercicioAct = u3d.actividades.find((act: any) => act.nombre === 'Quiz de Flexbox');
    expect(ejercicioAct).toBeTruthy();
    expect(ejercicioAct.tipo).toBe('desafio-practico');
    expect(ejercicioAct.esObligatorio).toBe(true);

    const videoAct = u3d.actividades.find((act: any) => act.nombre === 'Tutorial Grid');
    expect(videoAct).toBeTruthy();
    expect(videoAct.tipo).toBe('teoria');
    expect(videoAct.esObligatorio).toBe(false);
  });

  it('no genera actividades artificiales si un módulo no tiene anexos', () => {
    const a = service.create('Matemáticas', 'Cálculo');
    service.addUnidad('Álgebra');
    const uId = service.current()!.unidades[0].id;
    service.addModulo(uId, 'Módulo Vacío Sin Anexos');

    const rm = JSON.parse(localStorage.getItem('roadmap-mock-v2')!);
    expect(rm.unidades[0].actividades.length).toBe(0);
  });
});
