import { computed, inject, Injectable, signal } from '@angular/core';
import { RoadmapDataPort } from './roadmap-data.port';
import { NuevaUnidad, Roadmap } from './roadmap.models';
import { CURSO_SEED_ID } from '../../mocks/seed';

/**
 * Estado del grafo compartido entre el editor (PROFESOR) y el mapa (ALUMNO): al agregar
 * o quitar una unidad en el editor, el mapa se actualiza solo — es el vertical slice de
 * Fase 1 ("agrego unidad → aparece la isla"). Toda mutación va por el `RoadmapDataPort`,
 * así el swap a HTTP de Fase 3 no toca esto.
 */
@Injectable({ providedIn: 'root' })
export class RoadmapStore {
  private readonly port = inject(RoadmapDataPort);

  private readonly _roadmap = signal<Roadmap | null>(null);
  readonly roadmap = this._roadmap.asReadonly();
  readonly unidades = computed(() => this._roadmap()?.unidades ?? []);

  constructor() {
    this.recargar();
  }

  recargar(): void {
    this.port.getRoadmap(CURSO_SEED_ID).subscribe((r) => this._roadmap.set(r));
  }

  agregarUnidad(dto: NuevaUnidad): void {
    this.port.addUnidad(CURSO_SEED_ID, dto).subscribe(() => this.recargar());
  }

  quitarUnidad(unidadId: string): void {
    this.port.removeUnidad(CURSO_SEED_ID, unidadId).subscribe(() => this.recargar());
  }
}
