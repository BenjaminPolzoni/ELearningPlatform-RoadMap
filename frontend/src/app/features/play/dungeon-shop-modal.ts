import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  model,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DungeonShop3dService } from './engine/dungeon-shop-3d.service';
import { AudioService } from './engine/audio.service';
import { AvatarModularService, type AvatarBuild } from './engine/avatar-modular.service';
import type { Avatar } from './world-gen';

export interface ShopPropItem {
  id: string;
  emoji: string;
  nombre: string;
  tipo: 'Arma' | 'Defensa' | 'Consumible' | 'Reliquia' | 'Cosmético';
  precio: number;
  desc: string;
  dialogo: string;
}

export const SHOP_ITEMS: ShopPropItem[] = [
  {
    id: 'pocion',
    emoji: '🧪',
    nombre: 'Elixir de Sabiduría',
    tipo: 'Consumible',
    precio: 15,
    desc: 'Brebaje destilado de hierbas silvestres que expande tu agilidad mental.',
    dialogo: 'Destilada con bayas de la montaña... sabe a fresa y agudiza tus reflejos.',
  },
  {
    id: 'espada',
    emoji: '🗡️',
    nombre: 'Espada de Acero',
    tipo: 'Arma',
    precio: 30,
    desc: 'Hoja forjada a mano para encarar desafíos en las torres con determinación.',
    dialogo: 'Una espada confiable y equilibrada. Nunca salgas a explorar sin una.',
  },
  {
    id: 'escudo',
    emoji: '🛡️',
    nombre: 'Escudo Heráldico',
    tipo: 'Defensa',
    precio: 25,
    desc: 'Reforzado con borde de hierro y heráldica de la orden de exploradores.',
    dialogo: 'Un buen escudo te salvará más de una vez en terreno hostil.',
  },
  {
    id: 'llave',
    emoji: '🗝️',
    nombre: 'Llave de Cerrajería',
    tipo: 'Reliquia',
    precio: 40,
    desc: 'Forjada en latón antiguo para abrir cofres sellados en los anexos.',
    dialogo: 'Ningún cerrojo se resiste a una llave templada en fuego de forja.',
  },
  {
    id: 'mapa',
    emoji: '📜',
    nombre: 'Mapa Náutico Antiguo',
    tipo: 'Reliquia',
    precio: 50,
    desc: 'Pergamino con corrientes marítimas y rutas secretas de las islas.',
    dialogo: 'Ah, el mapa secreto de los navegantes... te mostrará corrientes ocultas.',
  },
  {
    id: 'brujula',
    emoji: '🧭',
    nombre: 'Brújula de Cristal',
    tipo: 'Reliquia',
    precio: 35,
    desc: 'Su aguja imantada siempre apunta hacia el conocimiento inexplorado.',
    dialogo: 'No apunta al norte magnético, sino a lo que más deseas aprender.',
  },
  {
    id: 'capa',
    emoji: '👑',
    nombre: 'Capa de Erudito',
    tipo: 'Cosmético',
    precio: 80,
    desc: 'Tejido dorado de la corte que distingue a los estudiantes más dedicados.',
    dialogo: '¡Una prenda digna de la realeza académica! Te verás imponente.',
  },
];

@Component({
  selector: 'app-dungeon-shop-modal',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <div
      class="fixed inset-0 z-50 overflow-hidden select-none bg-[#130a21]"
      role="dialog"
      aria-modal="true"
      aria-label="Bazar del Calabozo">
      
      <!-- Canvas 3D Three.js de la sala diorama -->
      <canvas #shopCanvas class="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

      <!-- Viñeta sutil en los bordes para profundidad estética -->
      <div class="pointer-events-none absolute inset-0 bg-radial from-transparent via-transparent to-black/60"></div>

      <!-- Cabecera Superior: Cartela de Fantasía + Monedas + Salir -->
      <header class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 pointer-events-auto">
        <!-- Indicador de control WASD / Ayuda de movimiento -->
        <div class="flex items-center gap-2 rounded-xl bg-black/75 border border-white/20 px-3.5 py-1.5 backdrop-blur-md shadow-xl text-white">
          <span class="text-sm">🎮</span>
          <span class="text-[10px] sm:text-xs font-mono font-medium text-gray-200">
            WASD / Flechas: Moverte
          </span>
          @if (nearCounter()) {
            <span class="badge badge-warning badge-xs font-mono font-bold animate-pulse text-[8px]">
              JUNTO AL MOSTRADOR
            </span>
          }
        </div>

        <!-- Cartela Central Estilo Fantasía Medieval -->
        <div class="relative flex items-center gap-3 px-6 sm:px-8 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#211538]/95 via-[#2b1b46]/95 to-[#211538]/95 border-2 border-[#caa462]/90 shadow-2xl backdrop-blur-md text-[#f5e6c8]">
          <span class="text-base sm:text-xl filter drop-shadow">⚔️</span>
          <h1 class="text-sm sm:text-lg font-serif font-extrabold tracking-widest uppercase text-[#fdf6e2] drop-shadow-md">
            Bazar del Calabozo
          </h1>
          <span class="text-base sm:text-xl filter drop-shadow">⚔️</span>
        </div>

        <!-- Monedas y Botón Salir -->
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-950/80 to-black/80 border-2 border-amber-400/80 px-3.5 py-1.5 shadow-xl backdrop-blur-md">
            <span class="text-lg sm:text-xl">🪙</span>
            <span class="text-xs sm:text-sm font-bold font-mono text-amber-300">
              G: {{ coins() }}
            </span>
          </div>

          <button
            (click)="iniciarSalida()"
            class="btn btn-sm btn-error btn-outline rounded-xl ui-font text-[9px] sm:text-[10px] shadow-lg backdrop-blur-md font-bold"
            title="Salir al exterior [Esc]">
            ✕ SALIR <kbd class="hidden sm:inline-block kbd kbd-xs bg-black/40 text-[8px]">ESC</kbd>
          </button>
        </div>
      </header>

      <!-- Diálogo Interactivo Flotante del Mercader (Izquierda) -->
      <div class="absolute top-20 sm:top-24 left-4 sm:left-6 z-20 max-w-xs sm:max-w-sm pointer-events-auto">
        <div class="relative rounded-2xl bg-[#1c122e]/90 border-2 border-amber-500/60 backdrop-blur-md p-3 sm:p-3.5 text-white shadow-2xl">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center text-xl shrink-0 shadow-inner">
              🧕
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <span class="text-xs font-bold text-amber-300 title-font tracking-wide">
                  MERCADER BRAN
                </span>
                <span class="badge badge-warning badge-xs text-[7px] font-mono font-bold">
                  EN EL MOSTRADOR
                </span>
              </div>
              <p class="text-[11px] sm:text-xs text-gray-200 mt-1 leading-snug italic">
                "{{ vendorMessage() }}"
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Prompt de interacción cuando el jugador camina hacia el mostrador -->
      @if (nearCounter() && !shopOpen()) {
        <aside class="absolute left-1/2 bottom-20 -translate-x-1/2 z-30 pointer-events-auto animate-bounce">
          <button
            (click)="hablarConMercader()"
            class="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold px-5 py-2.5 text-xs shadow-2xl border-2 border-yellow-200 transition-transform active:scale-95">
            <span class="text-base">💬</span>
            <span>Hablar con Mercader Bran [E / Espacio]</span>
          </button>
        </aside>
      }

      <!-- Detalle Flotante del Ítem Seleccionado -->
      @if (selectedItem(); as sel) {
        <div class="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 w-80 sm:w-96 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          <div class="rounded-2xl bg-[#1c122e]/95 border-2 border-amber-400/80 backdrop-blur-md p-4 text-white shadow-2xl">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2.5">
                <span class="text-3xl p-1.5 rounded-xl bg-white/5 border border-white/10">
                  {{ sel.emoji }}
                </span>
                <div>
                  <h3 class="text-sm font-bold text-amber-300 title-font">{{ sel.nombre }}</h3>
                  <span class="badge badge-warning badge-xs font-mono text-[8px]">{{ sel.tipo }}</span>
                </div>
              </div>
              <button (click)="selectedItem.set(null)" class="btn btn-ghost btn-xs btn-circle text-gray-400 hover:text-white">✕</button>
            </div>
            
            <p class="text-xs text-gray-200 mb-3 leading-relaxed">
              {{ sel.desc }}
            </p>

            <div class="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <span class="text-sm font-bold font-mono text-warning">
                🪙 {{ sel.precio }} Monedas
              </span>

              @if (esComprado(sel.id)) {
                <span class="btn btn-sm btn-disabled text-success text-xs font-bold">
                  ✅ Ya lo tienes
                </span>
              } @else {
                <button
                  (click)="comprarItem(sel)"
                  [disabled]="coins() < sel.precio"
                  class="btn btn-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold border-none text-xs shadow-lg disabled:opacity-40">
                  Comprar 🛒
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Vitrina Inferior: Se abre SOLO cuando se habla con el mercader -->
      @if (shopOpen()) {
        <footer class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-in slide-in-from-bottom-6 duration-200">
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center justify-between w-full px-2 text-[10px] text-amber-300/80 font-mono font-bold">
              <span>ARTÍCULOS A LA VENTA</span>
              <button (click)="cerrarCatalogo()" class="text-gray-400 hover:text-white underline cursor-pointer">
                ✕ Ocultar lista [Esc]
              </button>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-2xl bg-[#1b102f]/95 border-2 border-[#caa462]/60 backdrop-blur-xl shadow-2xl">
              @for (item of items; track item.id) {
                <button
                  (click)="seleccionarItem(item)"
                  (mouseenter)="onItemHover(item)"
                  (mouseleave)="onItemLeave()"
                  class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center group"
                  [class.bg-white/5]="!esComprado(item.id) && selectedItem()?.id !== item.id"
                  [class.border-white/20]="!esComprado(item.id) && selectedItem()?.id !== item.id"
                  [class.hover:border-amber-400]="!esComprado(item.id)"
                  [class.hover:scale-110]="true"
                  [class.bg-amber-500/20]="selectedItem()?.id === item.id"
                  [class.border-amber-400]="selectedItem()?.id === item.id"
                  [class.bg-emerald-950/40]="esComprado(item.id)"
                  [class.border-emerald-500/60]="esComprado(item.id)"
                  [title]="item.nombre + ' (' + item.precio + ' monedas)'">

                  <span class="text-2xl sm:text-3xl filter drop-shadow group-hover:scale-110 transition-transform">
                    {{ item.emoji }}
                  </span>

                  @if (esComprado(item.id)) {
                    <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] flex items-center justify-center font-bold">
                      ✓
                    </span>
                  } @else {
                    <span class="absolute -bottom-1 text-[8px] font-mono font-bold text-amber-300 bg-black/80 px-1 rounded border border-amber-400/40">
                      {{ item.precio }}
                    </span>
                  }
                </button>
              }
            </div>
          </div>
        </footer>
      }

      <!-- Pantalla Cinemática de Transición (Entrada y Salida) -->
      @if (transitioning()) {
        <div
          class="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#130a21] transition-opacity duration-700 ease-in-out"
          [class.opacity-100]="transitionOpaque()"
          [class.opacity-0]="!transitionOpaque()">
          <div class="flex flex-col items-center gap-3 text-center px-4">
            <span class="text-4xl sm:text-5xl animate-spin">🗝️</span>
            <h2 class="text-base sm:text-xl font-extrabold text-amber-300 title-font tracking-widest uppercase">
              {{ transitionText() }}
            </h2>
            <p class="text-xs text-gray-400 font-mono">
              El bazar del mercader medieval te aguarda
            </p>
          </div>
        </div>
      }

    </div>
  `,
})
export class DungeonShopModalComponent implements AfterViewInit, OnDestroy {
  private shop3d = inject(DungeonShop3dService);
  private audio = inject(AudioService);
  private avatarModular = inject(AvatarModularService);

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('shopCanvas');

  coins = model.required<number>();
  owned = model.required<string[]>();
  cerrar = output<void>();

  readonly items = SHOP_ITEMS;

  // Estado del catálogo: SOLO visible tras hablar con el mercader
  shopOpen = signal(false);
  nearCounter = signal(false);
  selectedItem = signal<ShopPropItem | null>(null);

  // Estados de transición cinemática
  transitioning = signal(true);
  transitionOpaque = signal(true);
  transitionText = signal('Entrando al Bazar del Calabozo...');

  // Diálogo dinámico del mercader
  vendorMessage = signal(
    '¡Bienvenido a mi bazar, forastero! Camina hacia el mostrador para ver qué reliquias tengo para ti.',
  );

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.selectedItem()) {
      this.selectedItem.set(null);
    } else if (this.shopOpen()) {
      this.shopOpen.set(false);
    } else {
      this.iniciarSalida();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.shop3d.resize(canvas.clientWidth, canvas.clientHeight);
  }

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.canvasRef().nativeElement;

    // Obtener el avatar personalizado del usuario
    let avatarSpec: Avatar | AvatarBuild = 'Knight';
    const config = this.avatarModular.leer();
    if (config) {
      try {
        avatarSpec = await this.avatarModular.buildAvatar(config);
      } catch {
        avatarSpec = 'Knight';
      }
    }

    await this.shop3d.init(
      canvas,
      {
        onVendorClick: () => {
          this.hablarConMercader();
        },
        onNearCounter: (isNear: boolean) => {
          this.nearCounter.set(isNear);
          if (isNear) {
            this.vendorMessage.set(
              '¡Te escucho, noble viajero! Pulsa [E] o habla conmigo para ver mis mercancías.',
            );
          } else {
            // Si el jugador se aleja del mostrador, cerramos el catálogo
            this.shopOpen.set(false);
            this.selectedItem.set(null);
            this.vendorMessage.set(
              'Tómate tu tiempo... las mejores reliquias esperan al viajero paciente.',
            );
          }
        },
      },
      avatarSpec,
    );

    // Sonido de apertura
    this.audio.playUnlock();

    // Desvanecer cortina de transición
    setTimeout(() => {
      this.transitionOpaque.set(false);
      setTimeout(() => {
        this.transitioning.set(false);
      }, 700);
    }, 400);
  }

  hablarConMercader(): void {
    this.shop3d.triggerVendorReaction();
    this.audio.playClick();
    this.shopOpen.set(true);
    this.vendorMessage.set(
      '¡Aquí tienes lo que tengo disponible hoy! Pociones, armas y reliquias raras traídas del mar.',
    );
  }

  cerrarCatalogo(): void {
    this.shopOpen.set(false);
    this.selectedItem.set(null);
  }

  esComprado(id: string): boolean {
    return this.owned().includes(id);
  }

  seleccionarItem(item: ShopPropItem): void {
    this.audio.playClick();
    this.selectedItem.set(item);
    this.vendorMessage.set(item.dialogo);
    this.shop3d.triggerVendorReaction();
  }

  onItemHover(item: ShopPropItem): void {
    if (this.selectedItem()?.id === item.id) return;
    if (this.esComprado(item.id)) {
      this.vendorMessage.set(`Ese ${item.nombre} ya es tuyo. Es una pieza magnífica.`);
    } else {
      this.vendorMessage.set(item.dialogo);
    }
  }

  onItemLeave(): void {
    if (this.selectedItem()) return;
    if (this.shopOpen()) {
      this.vendorMessage.set(
        'Elige cualquier pieza de la lista. Cada una tiene su propia historia.',
      );
    } else if (this.nearCounter()) {
      this.vendorMessage.set(
        '¿Quieres revisar mis mercancías? Pulsa [E] o habla conmigo.',
      );
    }
  }

  comprarItem(item: ShopPropItem): void {
    if (this.coins() < item.precio || this.esComprado(item.id)) {
      this.vendorMessage.set('No tienes suficientes monedas para esa pieza, aventurero.');
      return;
    }

    const nuevasMonedas = this.coins() - item.precio;
    this.coins.set(nuevasMonedas);
    this.owned.update((arr) => [...arr, item.id]);

    this.audio.playCoin();
    this.shop3d.triggerVendorReaction();
    this.vendorMessage.set(`¡Trato hecho! El ${item.nombre} ahora es tuyo. ¡Que te sea de gran valor!`);
  }

  iniciarSalida(): void {
    this.transitionText.set('Saliendo al exterior...');
    this.transitioning.set(true);
    setTimeout(() => {
      this.transitionOpaque.set(true);
      setTimeout(() => {
        this.shop3d.destroy();
        this.cerrar.emit();
      }, 650);
    }, 20);
  }

  ngOnDestroy(): void {
    this.shop3d.destroy();
  }
}
