import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { InsigniasDataPort } from '../../core/data/insignias-data.port';
import { InsigniaCatalogo } from '../../core/data/insignias.models';
import { CURSO_SEED_ID } from '../../mocks/seed';
import { PixelIcon } from '../pixel-icon';
import { BADGE_ICONS } from '../../features/insignias/badge-icons';
import { GENERIC_ICONS } from '../../features/insignias/generic-icons';

export type InventoryMode = 'insignias' | 'equipamiento';

export interface InvItem {
  icon?: string;
  nombre: string;
  desc: string;
  obtenida: boolean;
  codigo?: string;
}

const EQUIPAMIENTO: InvItem[] = [
  { icon: '⚔️', nombre: 'Espada de código', desc: 'Acelera tu tecleo de desafíos.', obtenida: true },
  { icon: '🛡️', nombre: 'Escudo de datos', desc: 'Protege un reintento por desafío.', obtenida: true },
  { icon: '👟', nombre: 'Zapato ++', desc: 'Navegás el roadmap más rápido.', obtenida: false },
  { icon: '🧥', nombre: 'Capa anti-bugs', desc: 'Evita trampas en los retos.', obtenida: false },
  { icon: '🔮', nombre: 'Amuleto debug', desc: 'Muestra pistas en ejercicios difíciles.', obtenida: false },
];

@Component({
  selector: 'app-inventory-modal',
  imports: [PixelIcon],
  host: { class: 'block' },
  template: `
    <div
      class="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      (click)="close.emit()"
    >
      <div
        class="w-[480px] max-w-[92vw] rounded-2xl border-2 bg-base-200 p-5 shadow-[0_0_40px_rgba(139,92,246,0.4)]"
        [class.border-[#FFD60A]]="mode() === 'insignias'"
        [class.border-primary]="mode() === 'equipamiento'"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between border-b border-neutral/30 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ mode() === 'insignias' ? '🏅' : '🎒' }}</span>
            <h3
              class="text-lg font-black tracking-wide"
              [class.text-warning]="mode() === 'insignias'"
              [class.glow-gold]="mode() === 'insignias'"
              [class.text-primary]="mode() === 'equipamiento'"
              [class.glow-cyan]="mode() === 'equipamiento'"
            >
              {{ mode() === 'insignias' ? 'INSIGNIAS DEL CURSO' : 'EQUIPAMIENTO' }}
            </h3>
          </div>
          <button
            class="btn btn-circle btn-sm btn-ghost text-base-content/60 hover:text-white"
            (click)="close.emit()"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <ul class="mt-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          @if (mode() === 'insignias') {
            @for (item of insigniasList(); track item.insigniaId) {
              <li
                class="card bg-base-300 p-3 flex flex-row items-center gap-3.5 border border-neutral/40 rounded-xl"
                [class.opacity-60]="!item.obtenida"
              >
                <div class="flex-shrink-0 grid place-items-center w-12 h-12 bg-base-100/70 rounded-lg border border-neutral/50 p-1">
                  <app-pixel-icon [grid]="icono(item).grid" [colors]="icono(item).colors" [size]="40" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-black text-sm flex items-center justify-between gap-1">
                    <span class="truncate text-base-content">{{ item.nombre }}</span>
                    <span
                      class="badge badge-xs flex-shrink-0"
                      [class]="
                        item.obtenida
                          ? 'badge-warning text-[#0D0B1E] font-black'
                          : 'badge-ghost text-base-content/50 border-neutral/40'
                      "
                    >
                      {{ item.obtenida ? 'OBTENIDA' : 'BLOQUEADA' }}
                    </span>
                  </div>
                  <div class="text-xs text-base-content/70 mt-1 leading-snug">{{ item.descripcion }}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="badge badge-outline badge-xs ui-font text-[8px]">{{ item.tipo === 'POR_NODO' ? 'por nodo' : 'transversal' }}</span>
                    @if (item.origen === 'PROFESOR') {
                      <span class="badge badge-accent badge-xs ui-font text-[8px]">profesor</span>
                    }
                  </div>
                </div>
              </li>
            } @empty {
              <li class="text-center py-6 opacity-60 text-sm">Cargando catálogo de insignias...</li>
            }
          } @else {
            @for (item of equipamiento; track item.nombre) {
              <li
                class="card bg-base-300 p-3 flex flex-row items-center gap-3 border border-neutral/40 rounded-xl"
                [class.opacity-50]="!item.obtenida"
              >
                <span class="text-3xl flex-shrink-0">{{ item.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-black text-sm flex items-center justify-between gap-1">
                    <span class="truncate">{{ item.nombre }}</span>
                    <span
                      class="badge badge-xs flex-shrink-0"
                      [class]="
                        item.obtenida
                          ? 'badge-primary text-[#0D0B1E] font-black'
                          : 'badge-ghost text-base-content/50 border-neutral/40'
                      "
                    >
                      {{ item.obtenida ? 'OBTENIDA' : 'BLOQUEADA' }}
                    </span>
                  </div>
                  <div class="text-xs text-base-content/60 mt-0.5">{{ item.desc }}</div>
                </div>
              </li>
            }
          }
        </ul>

        <div class="modal-action mt-4 flex justify-between items-center border-t border-neutral/30 pt-3">
          <span class="text-[10px] ui-font text-base-content/50">
            {{ mode() === 'insignias' ? insigniasList().length + ' insignias disponibles' : equipamiento.length + ' ítems' }}
          </span>
          <button class="btn btn-ghost btn-sm border border-neutral/40 hover:bg-neutral/40" (click)="close.emit()">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class InventoryModal {
  readonly mode = input<InventoryMode>('insignias');
  readonly close = output<void>();

  private readonly data = inject(InsigniasDataPort);

  private readonly catalogo = toSignal(this.data.getCatalogo(CURSO_SEED_ID), {
    initialValue: [] as InsigniaCatalogo[],
  });
  private readonly ganadas = toSignal(this.data.getGanadasPorAlumno('alu-01'), {
    initialValue: [],
  });

  protected readonly equipamiento = EQUIPAMIENTO;

  protected readonly insigniasList = computed(() => {
    const ganadasIds = new Set(this.ganadas().map((g) => g.insigniaId));
    return this.catalogo().map((i) => ({
      ...i,
      obtenida: ganadasIds.has(i.insigniaId),
    }));
  });

  protected icono(i: InsigniaCatalogo) {
    return BADGE_ICONS[i.codigo] ?? GENERIC_ICONS[i.codigo] ?? BADGE_ICONS['badge_seccion_perfecta'];
  }
}
