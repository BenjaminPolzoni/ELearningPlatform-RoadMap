import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RoadmapDataPort } from './roadmap-data.port';
import { NewActivity, NewSection, Progress, Roadmap, Section } from './roadmap.models';
import { COURSE_SEED_ID } from '../../mocks/seed';
import { SaveFeedbackService } from '../services/save-feedback.service';
import { SyncChannelService } from '../educa/sync-channel.service';

/**
 * Graph state shared between the editor (PROFESOR) and the map (ALUMNO): when adding
 * or removing a section in the editor, the map updates itself — it is the Phase 1 vertical
 * slice ("I add a section → the island appears"). Every mutation goes through the `RoadmapDataPort`,
 * so the Phase 3 swap to HTTP does not touch this.
 *
 * Each mutation reports to `SaveFeedbackService` (05 §6: "no invisible autosave")
 * — it is the only place that calls the port, so no screen forgets the feedback.
 */
@Injectable({ providedIn: 'root' })
export class RoadmapStore {
  private readonly port = inject(RoadmapDataPort);
  private readonly feedback = inject(SaveFeedbackService);
  private readonly syncChannel = inject(SyncChannelService, { optional: true });

  private readonly _roadmap = signal<Roadmap | null>(null);
  readonly roadmap = this._roadmap.asReadonly();
  readonly sections = computed(() => this._roadmap()?.sections ?? []);
  readonly connections = computed(() => this._roadmap()?.connections ?? []);
  readonly progress = toSignal(this.port.getProgress('alu-01', COURSE_SEED_ID));

  constructor() {
    this.reload();
    this.syncChannel?.events$.subscribe((msg) => {
      if (msg.type === 'roadmap_updated') {
        this.reload();
      }
    });
  }

  addProgress(earnedXp: number, nodeId?: string, lives?: number,
    onOk: (progress: Progress) => void = () => {}, onError: () => void = () => {}): void {
    this.port.registerProgress('alu-01', COURSE_SEED_ID, earnedXp, nodeId, lives).subscribe({
      next: onOk,
      error: () => {
        this.feedback.error('No se pudo guardar el progreso. Intentá nuevamente.');
        onError();
      },
    });
  }

  markContentRead(nodeId: string, onOk: () => void = () => {}): void {
    this.port.markContentRead('alu-01', COURSE_SEED_ID, nodeId).subscribe({
      next: () => {
        this.feedback.ok('Lectura registrada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo registrar la lectura')),
    });
  }

  reload(): void {
    this.port.getRoadmap(COURSE_SEED_ID).subscribe((r) => this._roadmap.set(r));
  }

  /**
   * `onOk` closes the form that triggered the mutation — only when the save was
   * confirmed. That way an error leaves the form open with what the teacher typed, instead
   * of discarding it (05 §6: "do not lose the user's change in the form/canvas").
   */
  addSection(dto: NewSection, onOk: () => void = () => {}): void {
    this.port.addSection(COURSE_SEED_ID, dto).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Unidad agregada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo agregar la unidad')),
    });
  }

  editSection(sectionId: string, dto: NewSection, onOk: () => void = () => {}): void {
    this.port.updateSection(COURSE_SEED_ID, sectionId, dto).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Unidad guardada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo guardar la unidad')),
    });
  }

  removeSection(sectionId: string): void {
    this.port.removeSection(COURSE_SEED_ID, sectionId).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Unidad eliminada ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo eliminar la unidad')),
    });
  }

  moveSection(sectionId: string, direction: 'arriba' | 'abajo'): void {
    this.port.moveSection(COURSE_SEED_ID, sectionId, direction).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Orden guardado ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo reordenar la unidad')),
    });
  }

  sectionById(sectionId: string): Section | undefined {
    return this.sections().find((u) => u.id === sectionId);
  }

  addActivity(sectionId: string, dto: NewActivity, onOk: () => void = () => {}): void {
    this.port.addActivity(COURSE_SEED_ID, sectionId, dto).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Contenido agregado ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo agregar el contenido')),
    });
  }

  editActivity(sectionId: string, activityId: string, dto: NewActivity, onOk: () => void = () => {}): void {
    this.port.updateActivity(COURSE_SEED_ID, sectionId, activityId, dto).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Contenido guardado ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo guardar el contenido')),
    });
  }

  removeActivity(sectionId: string, activityId: string): void {
    this.port.removeActivity(COURSE_SEED_ID, sectionId, activityId).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Contenido eliminado ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo eliminar el contenido')),
    });
  }

  moveActivity(sectionId: string, activityId: string, direction: 'arriba' | 'abajo'): void {
    this.port.moveActivity(COURSE_SEED_ID, sectionId, activityId, direction).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Orden guardado ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo reordenar el contenido')),
    });
  }

  /**
   * Relocates a node in the graphic editor. There is no need to wait for `reload()` for the
   * drag to feel solid: the canvas already keeps its own local position while dragging
   * and only discards it when the store confirms it was saved.
   */
  moveNode(sectionId: string, activityId: string, x: number, y: number, onOk: () => void = () => {}): void {
    this.port.moveNode(COURSE_SEED_ID, sectionId, activityId, x, y).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Posición guardada ✓');
        onOk();
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo guardar la posición')),
    });
  }

  addConnection(nodeOriginId: string, nodeDestinationId: string): void {
    this.port.addConnection(COURSE_SEED_ID, nodeOriginId, nodeDestinationId).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Conexión creada ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo crear la conexión')),
    });
  }

  removeConnection(connectionId: string): void {
    this.port.removeConnection(COURSE_SEED_ID, connectionId).subscribe({
      next: () => {
        this.reload();
        this.feedback.ok('Conexión eliminada ✓');
      },
      error: (err) => this.feedback.error(this.message(err, 'No se pudo eliminar la conexión')),
    });
  }

  private message(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
