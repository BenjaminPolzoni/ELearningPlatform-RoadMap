import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { InsigniasDataPort } from '../../core/data/insignias-data.port';
import { InsigniaCatalogo } from '../../core/data/insignias.models';
import { PixelIcon } from '../../shared/pixel-icon';
import { BADGE_ICONS } from './badge-icons';

/**
 * Catálogo de insignias (solo ADMIN — el alumno ve las que ganó desde su fila del
 * ranking, no este catálogo completo). Vista de solo lectura: el alta/edición queda para
 * el CRUD del profesor, todavía no implementado.
 */
@Component({
  selector: 'app-catalogo',
  imports: [PixelIcon],
  template: `
    <div class="flex items-baseline gap-4 mb-6">
      <h2 class="title-font text-primary text-xs">CATÁLOGO DE INSIGNIAS</h2>
      <span class="ui-font opacity-80">{{ insignias().length }} en total</span>
    </div>

    @if (cargando()) {
      <p class="opacity-60">Cargando...</p>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (i of insignias(); track i.insigniaId) {
          <div class="card bg-base-200 border-2 border-base-300 gap-0">
            <div class="card-body gap-2">
              <div class="flex items-center gap-3">
                <app-pixel-icon [grid]="icono(i).grid" [colors]="icono(i).colors" [size]="56" />
                <h3 class="title-font text-xs leading-relaxed">{{ i.nombre }}</h3>
              </div>
              <p class="opacity-80 text-sm">{{ i.descripcion }}</p>
              <div class="flex flex-wrap gap-2 mt-1">
                <span class="badge badge-outline badge-sm ui-font">{{ tipoLabel(i) }}</span>
                <span class="badge badge-outline badge-sm ui-font">{{ i.origen }}</span>
                @if (i.iconoPendiente) {
                  <span class="badge badge-warning badge-sm ui-font">ícono pendiente</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Catalogo {
  private readonly data = inject(InsigniasDataPort);

  private readonly respuesta = toSignal(this.data.getCatalogo());
  protected readonly cargando = computed(() => this.respuesta() === undefined);
  protected readonly insignias = computed(() => this.respuesta() ?? []);

  protected icono(i: InsigniaCatalogo) {
    return BADGE_ICONS[i.codigo];
  }

  protected tipoLabel(i: InsigniaCatalogo): string {
    return i.tipo === 'POR_NODO' ? 'por nodo' : 'transversal';
  }
}
