import { computed, inject, Injectable, signal } from '@angular/core';
import { RoadmapDataPort } from './roadmap-data.port';
import { NuevaActividad, NuevaUnidad, Roadmap, Unidad } from './roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { SaveFeedbackService } from '../services/save-feedback.service';

/**
 * Estado del grafo compartido entre el editor (PROFESOR) y el mapa (ALUMNO): al agregar
 * o quitar una unidad en el editor, el mapa se actualiza solo — es el vertical slice de
 * Fase 1 ("agrego unidad → aparece la isla"). Toda mutación va por el `RoadmapDataPort`,
 * así el swap a HTTP de Fase 3 no toca esto.
 *
 * Cada mutación reporta al `SaveFeedbackService` (05 §6: "nada de autoguardado invisible")
 * — es el único lugar donde se llama al puerto, así ninguna pantalla se olvida del feedback.
 */
@Injectable({ providedIn: 'root' })
export class RoadmapStore {
  private readonly port = inject(RoadmapDataPort);
  private readonly feedback = inject(SaveFeedbackService);

  private readonly _roadmap = signal<Roadmap | null>(null);
  readonly roadmap = this._roadmap.asReadonly();
  readonly unidades = computed(() => this._roadmap()?.unidades ?? []);
  readonly conexiones = computed(() => this._roadmap()?.conexiones ?? []);

  constructor() {
    this.recargar();
  }

  recargar(): void {
    this.port.getRoadmap(CURSO_SEED_ID).subscribe((r) => this._roadmap.set(r));
  }

  /**
   * `onOk` cierra el formulario que disparó la mutación — solo cuando el guardado se
   * confirmó. Así un error deja el formulario abierto con lo que el profesor tipeó, en vez
   * de descartarlo (05 §6: "no perder el cambio del usuario en el formulario/canvas").
   */
  agregarUnidad(dto: NuevaUnidad, onOk: () => void = () => {}): void {
    this.port.addUnidad(CURSO_SEED_ID, dto).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Unidad agregada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo agregar la unidad')),
    });
  }

  editarUnidad(unidadId: string, dto: NuevaUnidad, onOk: () => void = () => {}): void {
    this.port.updateUnidad(CURSO_SEED_ID, unidadId, dto).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Unidad guardada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo guardar la unidad')),
    });
  }

  quitarUnidad(unidadId: string): void {
    this.port.removeUnidad(CURSO_SEED_ID, unidadId).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Unidad eliminada ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo eliminar la unidad')),
    });
  }

  moverUnidad(unidadId: string, direccion: 'arriba' | 'abajo'): void {
    this.port.moverUnidad(CURSO_SEED_ID, unidadId, direccion).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Orden guardado ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo reordenar la unidad')),
    });
  }

  unidadPorId(unidadId: string): Unidad | undefined {
    return this.unidades().find((u) => u.id === unidadId);
  }

  agregarActividad(unidadId: string, dto: NuevaActividad, onOk: () => void = () => {}): void {
    this.port.addActividad(CURSO_SEED_ID, unidadId, dto).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Contenido agregado ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo agregar el contenido')),
    });
  }

  editarActividad(unidadId: string, actividadId: string, dto: NuevaActividad, onOk: () => void = () => {}): void {
    this.port.updateActividad(CURSO_SEED_ID, unidadId, actividadId, dto).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Contenido guardado ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo guardar el contenido')),
    });
  }

  quitarActividad(unidadId: string, actividadId: string): void {
    this.port.removeActividad(CURSO_SEED_ID, unidadId, actividadId).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Contenido eliminado ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo eliminar el contenido')),
    });
  }

  moverActividad(unidadId: string, actividadId: string, direccion: 'arriba' | 'abajo'): void {
    this.port.moverActividad(CURSO_SEED_ID, unidadId, actividadId, direccion).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Orden guardado ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo reordenar el contenido')),
    });
  }

  /**
   * Reubica un nodo en el editor gráfico. No hace falta esperar `recargar()` para que el
   * drag se sienta sólido: el canvas ya mantiene su propia posición local mientras arrastra
   * y solo la descarta cuando el store confirma que se guardó.
   */
  moverNodo(unidadId: string, actividadId: string, x: number, y: number, onOk: () => void = () => {}): void {
    this.port.moverNodo(CURSO_SEED_ID, unidadId, actividadId, x, y).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Posición guardada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo guardar la posición')),
    });
  }

  agregarConexion(nodoOrigenId: string, nodoDestinoId: string): void {
    this.port.addConexion(CURSO_SEED_ID, nodoOrigenId, nodoDestinoId).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Conexión creada ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo crear la conexión')),
    });
  }

  quitarConexion(conexionId: string): void {
    this.port.removeConexion(CURSO_SEED_ID, conexionId).subscribe({
      next: () => {
        this.recargar();
        this.feedback.ok('Conexión eliminada ✓');
      },
      error: (err) => this.feedback.error(this.mensaje(err, 'No se pudo eliminar la conexión')),
    });
  }

  private mensaje(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
