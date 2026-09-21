import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BadgesDataPort } from '../../data-access/badges/badges-data.port';
import { BadgeCatalog } from '../../data-access/badges/badges.models';
import { COURSE_SEED_ID } from '../../data-access/mocks/seed';
import { PixelIconComponent } from '../pixel-icon/pixel-icon.component';
import { BADGE_ICONS } from '../badge-icons/badge-icons';
import { GENERIC_ICONS } from '../badge-icons/generic-icons';

export type InventoryMode = 'badges' | 'equipment';

export interface InvItem {
  icon?: string;
  name: string;
  desc: string;
  obtained: boolean;
  code?: string;
}

const EQUIPMENT: InvItem[] = [
  { icon: '⚔️', name: 'Espada de código', desc: 'Acelera tu tecleo de desafíos.', obtained: true },
  { icon: '🛡️', name: 'Escudo de datos', desc: 'Protege un reintento por desafío.', obtained: true },
  { icon: '👟', name: 'Zapato ++', desc: 'Navegás el roadmap más rápido.', obtained: false },
  { icon: '🧥', name: 'Capa anti-bugs', desc: 'Evita trampas en los retos.', obtained: false },
  { icon: '🔮', name: 'Amuleto debug', desc: 'Muestra pistas en ejercicios difíciles.', obtained: false },
];

@Component({
  selector: 'app-inventory-modal',
  imports: [PixelIconComponent],
  host: { class: 'block' },
  template: `
    <div
      class="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      (click)="close.emit()"
    >
      <div
        class="w-[480px] max-w-[92vw] rounded-2xl border-2 bg-base-200 p-5 shadow-[0_0_40px_rgba(139,92,246,0.4)]"
        [class.border-[#FFD60A]]="mode() === 'badges'"
        [class.border-primary]="mode() === 'equipment'"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between border-b border-neutral/30 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ mode() === 'badges' ? '🏅' : '🎒' }}</span>
            <h3
              class="text-lg font-black tracking-wide"
              [class.text-warning]="mode() === 'badges'"
              [class.glow-gold]="mode() === 'badges'"
              [class.text-primary]="mode() === 'equipment'"
              [class.glow-cyan]="mode() === 'equipment'"
            >
              {{ mode() === 'badges' ? 'INSIGNIAS DEL CURSO' : 'EQUIPAMIENTO' }}
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
          @if (mode() === 'badges') {
            @for (item of badgesList(); track item.badgeId) {
              <li
                class="card bg-base-300 p-3 flex flex-row items-center gap-3.5 border border-neutral/40 rounded-xl"
                [class.opacity-60]="!item.obtained"
              >
                <div class="flex-shrink-0 grid place-items-center w-12 h-12 bg-base-100/70 rounded-lg border border-neutral/50 p-1">
                  <app-pixel-icon [grid]="icon(item).grid" [colors]="icon(item).colors" [size]="40" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-black text-sm flex items-center justify-between gap-1">
                    <span class="truncate text-base-content">{{ item.name }}</span>
                    <span
                      class="badge badge-xs flex-shrink-0"
                      [class]="
                        item.obtained
                          ? 'badge-warning text-[#0D0B1E] font-black'
                          : 'badge-ghost text-base-content/50 border-neutral/40'
                      "
                    >
                      {{ item.obtained ? 'OBTENIDA' : 'BLOQUEADA' }}
                    </span>
                  </div>
                  <div class="text-xs text-base-content/70 mt-1 leading-snug">{{ item.description }}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="badge badge-outline badge-xs ui-font text-[8px]">{{ item.type === 'PER_NODE' ? 'por nodo' : 'transversal' }}</span>
                    @if (item.origin === 'TEACHER') {
                      <span class="badge badge-accent badge-xs ui-font text-[8px]">profesor</span>
                    }
                  </div>
                </div>
              </li>
            } @empty {
              <li class="text-center py-6 opacity-60 text-sm">Cargando catálogo de insignias...</li>
            }
          } @else {
            @for (item of equipment; track item.name) {
              <li
                class="card bg-base-300 p-3 flex flex-row items-center gap-3 border border-neutral/40 rounded-xl"
                [class.opacity-50]="!item.obtained"
              >
                <span class="text-3xl flex-shrink-0">{{ item.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-black text-sm flex items-center justify-between gap-1">
                    <span class="truncate">{{ item.name }}</span>
                    <span
                      class="badge badge-xs flex-shrink-0"
                      [class]="
                        item.obtained
                          ? 'badge-primary text-[#0D0B1E] font-black'
                          : 'badge-ghost text-base-content/50 border-neutral/40'
                      "
                    >
                      {{ item.obtained ? 'OBTENIDA' : 'BLOQUEADA' }}
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
            {{ mode() === 'badges' ? badgesList().length + ' insignias disponibles' : equipment.length + ' ítems' }}
          </span>
          <button class="btn btn-ghost btn-sm border border-neutral/40 hover:bg-neutral/40" (click)="close.emit()">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class InventoryModalComponent {
  readonly mode = input<InventoryMode>('badges');
  readonly close = output<void>();

  private readonly data = inject(BadgesDataPort);

  private readonly catalog = toSignal(this.data.getCatalog(COURSE_SEED_ID), {
    initialValue: [] as BadgeCatalog[],
  });
  private readonly earned = toSignal(this.data.getEarnedByStudent('stu-01'), {
    initialValue: [],
  });

  protected readonly equipment = EQUIPMENT;

  protected readonly badgesList = computed(() => {
    const earnedIds = new Set(this.earned().map((g) => g.badgeId));
    return this.catalog().map((i) => ({
      ...i,
      obtained: earnedIds.has(i.badgeId),
    }));
  });

  protected icon(i: BadgeCatalog) {
    return BADGE_ICONS[i.code] ?? GENERIC_ICONS[i.code] ?? BADGE_ICONS['badge_perfect_section'];
  }
}
