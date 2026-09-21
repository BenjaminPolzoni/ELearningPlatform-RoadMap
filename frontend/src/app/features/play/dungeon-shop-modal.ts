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
  name: string;
  type: 'Arma' | 'Defensa' | 'Consumible' | 'Reliquia' | 'Cosmético';
  price: number;
  desc: string;
  dialog: string;
}

export const SHOP_ITEMS: ShopPropItem[] = [
  {
    id: 'pocion',
    emoji: '🧪',
    name: 'Elixir de Sabiduría',
    type: 'Consumible',
    price: 15,
    desc: 'Brebaje destilado de hierbas silvestres que expande tu agilidad mental.',
    dialog: 'Destilada con bayas de la montaña... sabe a fresa y agudiza tus reflejos.',
  },
  {
    id: 'espada',
    emoji: '🗡️',
    name: 'Espada de Acero',
    type: 'Arma',
    price: 30,
    desc: 'Hoja forjada a mano para encarar desafíos en las torres con determinación.',
    dialog: 'Una espada confiable y equilibrada. Nunca salgas a explorar sin una.',
  },
  {
    id: 'escudo',
    emoji: '🛡️',
    name: 'Escudo Heráldico',
    type: 'Defensa',
    price: 25,
    desc: 'Reforzado con borde de hierro y heráldica de la orden de exploradores.',
    dialog: 'Un buen escudo te salvará más de una vez en terreno hostil.',
  },
  {
    id: 'llave',
    emoji: '🗝️',
    name: 'Llave de Cerrajería',
    type: 'Reliquia',
    price: 40,
    desc: 'Forjada en latón antiguo para abrir cofres sellados en los anexos.',
    dialog: 'Ningún cerrojo se resiste a una llave templada en fuego de forja.',
  },
  {
    id: 'mapa',
    emoji: '📜',
    name: 'Mapa Náutico Antiguo',
    type: 'Reliquia',
    price: 50,
    desc: 'Pergamino con corrientes marítimas y rutas secretas de las islas.',
    dialog: 'Ah, el mapa secreto de los navegantes... te mostrará corrientes ocultas.',
  },
  {
    id: 'brujula',
    emoji: '🧭',
    name: 'Brújula de Cristal',
    type: 'Reliquia',
    price: 35,
    desc: 'Su aguja imantada siempre apunta hacia el conocimiento inexplorado.',
    dialog: 'No apunta al norte magnético, sino a lo que más deseas aprender.',
  },
  {
    id: 'capa',
    emoji: '👑',
    name: 'Capa de Erudito',
    type: 'Cosmético',
    price: 80,
    desc: 'Tejido dorado de la corte que distingue a los estudiantes más dedicados.',
    dialog: '¡Una prenda digna de la realeza académica! Te verás imponente.',
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
      
      <!-- Three.js 3D canvas of the diorama room -->
      <canvas #shopCanvas class="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

      <!-- Subtle vignette on the edges for aesthetic depth -->
      <div class="pointer-events-none absolute inset-0 bg-radial from-transparent via-transparent to-black/60"></div>

      <!-- Top header: Fantasy cartouche + Coins + Exit -->
      <header class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 pointer-events-auto">
        <!-- WASD control indicator / Movement help -->
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

        <!-- Central cartouche, Medieval Fantasy style -->
        <div class="relative flex items-center gap-3 px-6 sm:px-8 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-[#211538]/95 via-[#2b1b46]/95 to-[#211538]/95 border-2 border-[#caa462]/90 shadow-2xl backdrop-blur-md text-[#f5e6c8]">
          <span class="text-base sm:text-xl filter drop-shadow">⚔️</span>
          <h1 class="text-sm sm:text-lg font-serif font-extrabold tracking-widest uppercase text-[#fdf6e2] drop-shadow-md">
            Bazar del Calabozo
          </h1>
          <span class="text-base sm:text-xl filter drop-shadow">⚔️</span>
        </div>

        <!-- Coins and Exit button -->
        <div class="flex items-center gap-2.5 sm:gap-3">
          <div class="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-950/80 to-black/80 border-2 border-amber-400/80 px-3.5 py-1.5 shadow-xl backdrop-blur-md">
            <span class="text-lg sm:text-xl">🪙</span>
            <span class="text-xs sm:text-sm font-bold font-mono text-amber-300">
              G: {{ coins() }}
            </span>
          </div>

          <button
            (click)="startExit()"
            class="btn btn-sm btn-error btn-outline rounded-xl ui-font text-[9px] sm:text-[10px] shadow-lg backdrop-blur-md font-bold"
            title="Salir al exterior [Esc]">
            ✕ SALIR <kbd class="hidden sm:inline-block kbd kbd-xs bg-black/40 text-[8px]">ESC</kbd>
          </button>
        </div>
      </header>

      <!-- Floating interactive dialog of the Merchant (Left) -->
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

      <!-- Interaction prompt when the player walks toward the counter -->
      @if (nearCounter() && !shopOpen()) {
        <aside class="absolute left-1/2 bottom-20 -translate-x-1/2 z-30 pointer-events-auto animate-bounce">
          <button
            (click)="talkWithMerchant()"
            class="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold px-5 py-2.5 text-xs shadow-2xl border-2 border-yellow-200 transition-transform active:scale-95">
            <span class="text-base">💬</span>
            <span>Hablar con Mercader Bran [E / Espacio]</span>
          </button>
        </aside>
      }

      <!-- Floating detail of the Selected Item -->
      @if (selectedItem(); as sel) {
        <div class="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30 w-80 sm:w-96 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          <div class="rounded-2xl bg-[#1c122e]/95 border-2 border-amber-400/80 backdrop-blur-md p-4 text-white shadow-2xl">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex items-center gap-2.5">
                <span class="text-3xl p-1.5 rounded-xl bg-white/5 border border-white/10">
                  {{ sel.emoji }}
                </span>
                <div>
                  <h3 class="text-sm font-bold text-amber-300 title-font">{{ sel.name }}</h3>
                  <span class="badge badge-warning badge-xs font-mono text-[8px]">{{ sel.type }}</span>
                </div>
              </div>
              <button (click)="selectedItem.set(null)" class="btn btn-ghost btn-xs btn-circle text-gray-400 hover:text-white">✕</button>
            </div>
            
            <p class="text-xs text-gray-200 mb-3 leading-relaxed">
              {{ sel.desc }}
            </p>

            <div class="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
              <span class="text-sm font-bold font-mono text-warning">
                🪙 {{ sel.price }} Monedas
              </span>

              @if (isBought(sel.id)) {
                <span class="btn btn-sm btn-disabled text-success text-xs font-bold">
                  ✅ Ya lo tienes
                </span>
              } @else {
                <button
                  (click)="buyItem(sel)"
                  [disabled]="coins() < sel.price"
                  class="btn btn-sm bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold border-none text-xs shadow-lg disabled:opacity-40">
                  Comprar 🛒
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Bottom showcase: opens ONLY when talking to the merchant -->
      @if (shopOpen()) {
        <footer class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-in slide-in-from-bottom-6 duration-200">
          <div class="flex flex-col items-center gap-2">
            <div class="flex items-center justify-between w-full px-2 text-[10px] text-amber-300/80 font-mono font-bold">
              <span>ARTÍCULOS A LA VENTA</span>
              <button (click)="closeCatalog()" class="text-gray-400 hover:text-white underline cursor-pointer">
                ✕ Ocultar lista [Esc]
              </button>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-2xl bg-[#1b102f]/95 border-2 border-[#caa462]/60 backdrop-blur-xl shadow-2xl">
              @for (item of items; track item.id) {
                <button
                  (click)="selectItem(item)"
                  (mouseenter)="onItemHover(item)"
                  (mouseleave)="onItemLeave()"
                  class="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center group"
                  [class.bg-white/5]="!isBought(item.id) && selectedItem()?.id !== item.id"
                  [class.border-white/20]="!isBought(item.id) && selectedItem()?.id !== item.id"
                  [class.hover:border-amber-400]="!isBought(item.id)"
                  [class.hover:scale-110]="true"
                  [class.bg-amber-500/20]="selectedItem()?.id === item.id"
                  [class.border-amber-400]="selectedItem()?.id === item.id"
                  [class.bg-emerald-950/40]="isBought(item.id)"
                  [class.border-emerald-500/60]="isBought(item.id)"
                  [title]="item.name + ' (' + item.price + ' monedas)'">

                  <span class="text-2xl sm:text-3xl filter drop-shadow group-hover:scale-110 transition-transform">
                    {{ item.emoji }}
                  </span>

                  @if (isBought(item.id)) {
                    <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[9px] flex items-center justify-center font-bold">
                      ✓
                    </span>
                  } @else {
                    <span class="absolute -bottom-1 text-[8px] font-mono font-bold text-amber-300 bg-black/80 px-1 rounded border border-amber-400/40">
                      {{ item.price }}
                    </span>
                  }
                </button>
              }
            </div>
          </div>
        </footer>
      }

      <!-- Cinematic Transition Screen (Entry and Exit) -->
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
  close = output<void>();

  readonly items = SHOP_ITEMS;

  // Catalog state: ONLY visible after talking to the merchant
  shopOpen = signal(false);
  nearCounter = signal(false);
  selectedItem = signal<ShopPropItem | null>(null);

  // Cinematic transition states
  transitioning = signal(true);
  transitionOpaque = signal(true);
  transitionText = signal('Entrando al Bazar del Calabozo...');

  // Dynamic merchant dialog
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
      this.startExit();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.shop3d.resize(canvas.clientWidth, canvas.clientHeight);
  }

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.canvasRef().nativeElement;

    // Get the user's customized avatar
    let avatarSpec: Avatar | AvatarBuild = 'Knight';
    const config = this.avatarModular.read();
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
          this.talkWithMerchant();
        },
        onNearCounter: (isNear: boolean) => {
          this.nearCounter.set(isNear);
          if (isNear) {
            this.vendorMessage.set(
              '¡Te escucho, noble viajero! Pulsa [E] o habla conmigo para ver mis mercancías.',
            );
          } else {
            // If the player moves away from the counter, we close the catalog
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

    // Opening sound
    this.audio.playUnlock();

    // Fade out the transition curtain
    setTimeout(() => {
      this.transitionOpaque.set(false);
      setTimeout(() => {
        this.transitioning.set(false);
      }, 700);
    }, 400);
  }

  talkWithMerchant(): void {
    this.shop3d.triggerVendorReaction();
    this.audio.playClick();
    this.shopOpen.set(true);
    this.vendorMessage.set(
      '¡Aquí tienes lo que tengo disponible hoy! Pociones, armas y reliquias raras traídas del mar.',
    );
  }

  closeCatalog(): void {
    this.shopOpen.set(false);
    this.selectedItem.set(null);
  }

  isBought(id: string): boolean {
    return this.owned().includes(id);
  }

  selectItem(item: ShopPropItem): void {
    this.audio.playClick();
    this.selectedItem.set(item);
    this.vendorMessage.set(item.dialog);
    this.shop3d.triggerVendorReaction();
  }

  onItemHover(item: ShopPropItem): void {
    if (this.selectedItem()?.id === item.id) return;
    if (this.isBought(item.id)) {
      this.vendorMessage.set(`Ese ${item.name} ya es tuyo. Es una pieza magnífica.`);
    } else {
      this.vendorMessage.set(item.dialog);
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

  buyItem(item: ShopPropItem): void {
    if (this.coins() < item.price || this.isBought(item.id)) {
      this.vendorMessage.set('No tienes suficientes monedas para esa pieza, aventurero.');
      return;
    }

    const newCoins = this.coins() - item.price;
    this.coins.set(newCoins);
    this.owned.update((arr) => [...arr, item.id]);

    this.audio.playCoin();
    this.shop3d.triggerVendorReaction();
    this.vendorMessage.set(`¡Trato hecho! El ${item.name} ahora es tuyo. ¡Que te sea de gran valor!`);
  }

  startExit(): void {
    this.transitionText.set('Saliendo al exterior...');
    this.transitioning.set(true);
    setTimeout(() => {
      this.transitionOpaque.set(true);
      setTimeout(() => {
        this.shop3d.destroy();
        this.close.emit();
      }, 650);
    }, 20);
  }

  ngOnDestroy(): void {
    this.shop3d.destroy();
  }
}
