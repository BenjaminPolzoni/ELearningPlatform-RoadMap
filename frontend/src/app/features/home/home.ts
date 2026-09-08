import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { RoadmapDataPort } from '../../core/data/roadmap-data.port';
import { CURSO_SEED_ID } from '../../mocks/seed';

/**
 * Landing post-login de Fase 0: confirma que el shell, el tema y el `RoadmapDataPort`
 * (seed vía `InMemoryRoadmapAdapter`) están cableados. Las pantallas reales por rol
 * —editor, mapa, ranking— son Fase 1.
 */
@Component({
  selector: 'app-home',
  template: `
    <section class="flex flex-col gap-6">
      <div>
        <h2 class="title-font text-primary text-xs mb-2">FASE 0 · ANDAMIAJE</h2>
        <p class="opacity-70">
          Sesión mock como <b class="text-secondary">{{ auth.rol() }}</b>. Curso seed cargado desde
          <code class="ui-font">InMemoryRoadmapAdapter</code>.
        </p>
      </div>

      @if (roadmap(); as rm) {
        <div class="stats bg-base-200 border-2 border-base-300">
          <div class="stat">
            <div class="stat-title">Curso</div>
            <div class="stat-value text-base">{{ rm.nombre }}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Unidades</div>
            <div class="stat-value tabular">{{ rm.unidades.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Actividades</div>
            <div class="stat-value tabular">{{ totalActividades() }}</div>
          </div>
          <div class="stat">
            <div class="stat-title">Alumnos</div>
            <div class="stat-value tabular">{{ alumnos().length }}</div>
          </div>
        </div>

        <table class="table border-2 border-base-300">
          <thead>
            <tr><th>#</th><th>Unidad</th><th class="text-right">Umbral XP</th><th class="text-right">Actividades</th></tr>
          </thead>
          <tbody>
            @for (u of rm.unidades; track u.id) {
              <tr>
                <td class="tabular">{{ u.orden }}</td>
                <td>{{ u.nombre }}</td>
                <td class="text-right tabular">{{ u.umbralXpDesbloqueo }}</td>
                <td class="text-right tabular">{{ u.actividades.length }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <p>Cargando seed…</p>
      }

      @if (auth.rol() === 'ALUMNO' && progreso(); as p) {
        <div class="alert border-2 border-success">
          <span class="ui-font">
            alu-01 — XP <b class="tabular">{{ p.xpTotal }}</b> · vidas
            <b class="tabular">{{ p.vidasVigentes }}</b> · nodos habilitados
            <b class="tabular">{{ habilitados(p.nodos) }}</b>
          </span>
        </div>
      }

      <div class="alert border-2 border-secondary">
        <span>Fase 1: acá va {{ destino() }}.</span>
      </div>
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthMockService);
  private readonly data = inject(RoadmapDataPort);

  protected readonly roadmap = toSignal(this.data.getRoadmap(CURSO_SEED_ID));
  protected readonly alumnos = toSignal(this.data.getAlumnos(CURSO_SEED_ID), { initialValue: [] });
  protected readonly progreso = toSignal(this.data.getProgreso('alu-01', CURSO_SEED_ID));

  protected readonly totalActividades = computed(
    () => this.roadmap()?.unidades.reduce((n, u) => n + u.actividades.length, 0) ?? 0,
  );

  protected readonly destino = computed(() => {
    switch (this.auth.rol()) {
      case 'PROFESOR':
        return 'el editor de curso, unidades y actividades';
      case 'ALUMNO':
        return 'el mapa de islas 2.5D y el mapa interno de la unidad';
      default:
        return 'la vista de administración';
    }
  });

  protected habilitados(nodos: { estado: string }[]): number {
    return nodos.filter((n) => n.estado === 'habilitado').length;
  }
}
