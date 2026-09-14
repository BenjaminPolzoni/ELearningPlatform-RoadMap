import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ThemeService } from '../core/theme.service';
import {
  UiAlert,
  UiAlertTone,
  UiBadge,
  UiBadgeTone,
  UiButton,
  UiButtonSize,
  UiButtonVariant,
  UiCard,
  UiInput,
  UiModal,
  UiProgress,
  UiProgressTone,
  UiSelect,
  UiTabs,
  UiTab,
  UiTextarea,
} from '../shared/ui';

/**
 * Showroom interactivo de la librería UI compartida (05-design-system.md §4).
 * No es una pantalla de negocio: playground para probar en el navegador las 10
 * piezas del barrel `shared/ui/index.ts` en ambos temas.
 * Ruta: `/dev-showcase`.
 */
@Component({
  selector: 'ui-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UiAlert,
    UiBadge,
    UiButton,
    UiCard,
    UiInput,
    UiModal,
    UiProgress,
    UiSelect,
    UiTabs,
    UiTextarea,
  ],
  template: `
    <div id="showcase-top" class="w-full h-[98vh] overflow-y-auto p-6 scroll-smooth">
      <header class="mb-6">
        <h1 class="title-font text-3xl text-primary">Catálogo UI · G6</h1>
        <p class="ui-font mt-2 text-[9px] opacity-70">
          Showroom interactivo — todo deriva de los tokens del tema activo; scrolleá y probá.
        </p>
      </header>

      <!-- ============ Panel de controles global (sticky) ============ -->
      <nav class="sticky top-0 z-40 -mx-6 mb-8 border-b-2 border-primary/30 bg-base-100/90 px-6 py-3 backdrop-blur">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <span class="badge badge-accent ui-font text-[9px]">{{ temas.tema() }}</span>
            <ui-button variant="secondary" size="sm" (click)="temas.toggle()">Cambiar tema</ui-button>
            <span class="mx-1 h-5 w-px bg-base-300" aria-hidden="true"></span>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs"
                [checked]="gDisabled()"
                (change)="gDisabled.set(leerCheck($event))"
              />
              disabled global
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="checkbox checkbox-secondary checkbox-xs"
                [checked]="gLoading()"
                (change)="gLoading.set(leerCheck($event))"
              />
              loading global
            </label>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (n of navs; track n.id) {
              <ui-button size="xs" variant="ghost" (click)="saltar(n.id)">{{ n.label }}</ui-button>
            }
          </div>
        </div>
      </nav>

      <!-- ============ ui-button ============ -->
      <section id="sec-buttons" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-button "ui-botón"</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <ui-card title="Tamaños">
            <div class="flex flex-wrap items-center gap-3">
              @for (t of tamanyos; track t) {
                <ui-button size="sm" variant="outline" (click)="tamanyoSel.set(t)">
                  {{ t }}
                </ui-button>
              }
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              @for (t of tamanyos; track t) {
                <ui-button [size]="tamanyoSel()" [disabled]="gDisabled()" [loading]="gLoading()">
                  {{ t }}
                </ui-button>
              }
            </div>
            <p class="console-font mt-2 text-sm opacity-70">seleccionado: {{ tamanyoSel() }}</p>
          </ui-card>

          <ui-card title="Las 10 variantes · respetan globales">
            <div class="flex flex-wrap gap-3">
              @for (v of botonVariantes; track v) {
                <ui-button [variant]="v" [disabled]="gDisabled()" [loading]="gLoading()">
                  {{ v }}
                </ui-button>
              }
            </div>
          </ui-card>
        </div>
      </section>

      <!-- ============ ui-card + ui-badge ============ -->
      <section id="sec-card-badge" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-card + ui-badge "ui-tarjeta + ui-insignia" · galería de tonos</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (t of badgeTonos; track t) {
            <ui-card [title]="'tone: ' + t">
              <div class="flex flex-wrap gap-2">
                <ui-badge [tone]="t">sólido</ui-badge>
                <ui-badge [tone]="t" [outline]="true">outline</ui-badge>
                <ui-badge [tone]="t" [pill]="true">pill</ui-badge>
              </div>
              <p class="mt-3 text-sm text-base-content/80">
                Mismo token, tres tratamientos distintos.
              </p>
            </ui-card>
          }
        </div>
      </section>

      <!-- ============ ui-input / ui-textarea / ui-select ============ -->
      <section id="sec-form" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-input · ui-textarea · ui-select "ui-entrada · ui-área de texto · ui-selector"</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <ui-card title="Formulario (double bind)">
            <div class="flex flex-col gap-4">
              <label class="block">
                <span class="mb-1 block text-sm text-base-content/80">Nombre</span>
                <ui-input
                  [(value)]="nombre"
                  placeholder="Ingresá tu nombre"
                  ariaLabel="Nombre"
                  [disabled]="gDisabled()"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-sm text-base-content/80">Descripción</span>
                <ui-textarea
                  [(value)]="descripcion"
                  [rows]="3"
                  placeholder="Contá algo"
                  ariaLabel="Descripción"
                  [disabled]="gDisabled()"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-sm text-base-content/80">Dificultad</span>
                <ui-select
                  [(value)]="dificultad"
                  ariaLabel="Dificultad"
                  [disabled]="gDisabled()"
                >
                  <option value="basico">Básico</option>
                  <option value="medio">Medio</option>
                  <option value="avanzado">Avanzado</option>
                </ui-select>
              </label>
            </div>
          </ui-card>

          <ui-card title="Live JSON del double bind">
            <pre class="console-font min-h-40 overflow-x-auto border-2 border-base-300 p-3 text-sm">{{ vivo() }}</pre>
          </ui-card>
        </div>
      </section>

      <!-- ============ ui-progress ============ -->
      <section id="sec-progress" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-progress "ui-progreso"</h2>
        <ui-card title="Playground">
          <div class="grid gap-4 md:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-sm text-base-content/80">Valor: {{ progresoValue() }}</span>
              <input
                type="range"
                class="range range-primary w-full"
                min="0"
                [max]="progresoMax()"
                [value]="progresoValue()"
                (input)="progresoValue.set(leerNumero($event))"
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm text-base-content/80">Máx: {{ progresoMax() }}</span>
              <input
                type="number"
                class="input input-bordered w-full"
                min="1"
                [value]="progresoMax()"
                (input)="progresoMax.set(Math.max(1, leerNumero($event)))"
              />
            </label>
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" class="checkbox checkbox-secondary checkbox-xs" (change)="indet.set(leerCheck($event))" />
                Indeterminado (sin value)
              </label>
              <label class="flex items-center gap-2 text-sm">
                <span class="opacity-70">Tono:</span>
                <select
                  class="select select-bordered select-sm"
                  [value]="progresoTono()"
                  (change)="progresoTono.set($any($event.target).value)"
                >
                  @for (t of progresoTonos; track t) {
                    <option [attr.value]="t">{{ t }}</option>
                  }
                </select>
              </label>
            </div>
          </div>
          <div class="mt-4">
            <ui-progress
              [value]="indet() ? undefined : progresoValue()"
              [max]="progresoMax()"
              [tone]="progresoTono()"
              [label]="indet() ? 'Indeterminado' : progresoValue() + ' / ' + progresoMax()"
            />
          </div>
        </ui-card>
      </section>

      <!-- ============ ui-tabs ============ -->
      <section id="sec-tabs" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-tabs "ui-pestañas"</h2>
        <ui-card title="Playground · pestañas dinámicas">
          <div class="flex flex-wrap items-center gap-3">
            <ui-button size="xs" variant="outline" (click)="agregarPestana()">+ agregar pestaña</ui-button>
            <span class="console-font text-sm opacity-70">activa: {{ pestanaActiva() || 'ninguna' }}</span>
          </div>
          <div class="mt-3">
            <ui-tabs [(value)]="pestanaActiva" [tabs]="pestanas()" [boxed]="true" />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            @for (t of pestanas(); track t.id) {
              <button type="button" class="btn btn-xs btn-ghost" (click)="quitarPestana(t.id)">✕ {{ t.label }}</button>
            }
          </div>
          <div class="mt-3 border-2 border-base-300 p-3 text-sm">
            @if (pestanaActiva()) {
              <p>Panel <span class="text-primary">{{ pestanaActiva() }}</span> — el mismo signal pilotea la barra y el panel.</p>
            } @else {
              <p class="opacity-70">Sin pestaña activa (agregá o tocá una).</p>
            }
          </div>
        </ui-card>
      </section>

      <!-- ============ ui-modal ============ -->
      <section id="sec-modal" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-modal "ui-diálogo"</h2>
        <ui-card title="Playground de apertura y cierre">
          <ui-button [disabled]="gDisabled()" (click)="modalAbierto.set(true)">Abrir modal</ui-button>
          <p class="console-font mt-2 text-sm opacity-70">open: {{ modalAbierto() }}</p>
          <ui-modal [(open)]="modalAbierto" title="Confirmar eliminación">
            <p class="text-sm text-base-content/80">
              Cerrar por botón ✕, tecla ESC o click al backdrop — los tres pasan por el model.
              Scrolleá la página: el &lt;dialog&gt; queda fijo en el viewport, no se va.
            </p>
            <button
              type="button"
              class="btn btn-sm btn-outline mt-4"
              (click)="modalAbierto.set(false)"
            >
              Cerrar desde adentro
            </button>
          </ui-modal>
        </ui-card>
      </section>

      <!-- ============ ui-alert ============ -->
      <section id="sec-alert" class="mb-10 scroll-mt-24">
        <h2 class="title-font mb-3 text-xl text-secondary">ui-alert "ui-alerta"</h2>
        <ui-card title="Playground · selector de tonos y cierre">
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 text-sm">
              <span class="opacity-70">Tono:</span>
              <select
                class="select select-bordered select-sm"
                [value]="alertaTono()"
                (change)="alertaTono.set($any($event.target).value)"
              >
                @for (t of alertaTonos; track t) {
                  <option [attr.value]="t">{{ t }}</option>
                }
              </select>
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="checkbox checkbox-primary checkbox-xs"
                [checked]="alertaClosable()"
                (change)="alertaClosable.set(leerCheck($event))"
              />
              closable
            </label>
            <ui-button size="sm" variant="outline" (click)="alertaVisible.set(true)">
              Restablecer visibilidad
            </ui-button>
            <span class="console-font text-sm opacity-70">visible: {{ alertaVisible() }}</span>
          </div>
          <div class="mt-4">
            <ui-alert
              [tone]="alertaTono()"
              [closable]="alertaClosable()"
              [(visible)]="alertaVisible"
            >
              <span class="text-sm">Alerta de demostración — cerrá y restablecé.</span>
            </ui-alert>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            @for (t of alertaTonos; track t) {
              <ui-alert [tone]="t" [closable]="false">
                <span class="ui-font text-[9px]">[{{ t }}]</span>
                <span class="ml-2 text-sm">Aviso sin cierre.</span>
              </ui-alert>
            }
          </div>
        </ui-card>
      </section>

      <footer class="pb-2 text-center">
        <ui-button size="xs" variant="ghost" (click)="saltar('showcase-top')">↑ volver arriba</ui-button>
      </footer>
    </div>
  `,
})
export class UiShowcase {
  protected readonly temas = inject(ThemeService);

  /** Convención del proyecto: las carpetas van en inglés, pero acá va el UI… */
  protected readonly navs = [
    { id: 'sec-buttons', label: 'Button' },
    { id: 'sec-card-badge', label: 'Card/Badge' },
    { id: 'sec-form', label: 'Form' },
    { id: 'sec-progress', label: 'Progress' },
    { id: 'sec-tabs', label: 'Tabs' },
    { id: 'sec-modal', label: 'Modal' },
    { id: 'sec-alert', label: 'Alert' },
  ];

  // ---------- estado global ----------
  protected readonly gDisabled = signal(false);
  protected readonly gLoading = signal(false);

  // ---------- ui-button ----------
  protected readonly tamanyos: UiButtonSize[] = ['xs', 'sm', 'md', 'lg'];
  protected readonly tamanyoSel = signal<UiButtonSize>('md');
  protected readonly botonVariantes: UiButtonVariant[] = [
    'primary',
    'secondary',
    'accent',
    'neutral',
    'ghost',
    'outline',
    'info',
    'success',
    'warning',
    'error',
  ];

  // ---------- ui-card / ui-badge ----------
  protected readonly badgeTonos: UiBadgeTone[] = [
    'neutral',
    'primary',
    'secondary',
    'accent',
    'info',
    'success',
    'warning',
    'error',
  ];

  // ---------- ui-input / textarea / select ----------
  protected readonly nombre = signal('');
  protected readonly descripcion = signal('');
  protected readonly dificultad = signal('basico');
  protected readonly vivo = computed(() =>
    JSON.stringify(
      { nombre: this.nombre(), descripcion: this.descripcion(), dificultad: this.dificultad() },
      null,
      2,
    ),
  );

  // ---------- ui-progress ----------
  protected readonly progresoValue = signal(25);
  protected readonly progresoMax = signal(100);
  protected readonly indet = signal(false);
  protected readonly progresoTono = signal<UiProgressTone>('primary');
  protected readonly progresoTonos: UiProgressTone[] = [
    'neutral',
    'primary',
    'secondary',
    'accent',
    'info',
    'success',
    'warning',
    'error',
  ];

  // ---------- ui-tabs ----------
  protected readonly pestanas = signal<UiTab[]>([
    { id: 'alpha', label: 'Alpha' },
    { id: 'beta', label: 'Beta' },
    { id: 'gamma', label: 'Gamma' },
  ]);
  protected readonly pestanaActiva = signal('alpha');
  private _siguienteTab = 4;

  protected agregarPestana(): void {
    const n = this._siguienteTab++;
    this.pestanas.update((p) => [...p, { id: `tab-${n}`, label: `Pestaña ${n}` }]);
  }

  protected quitarPestana(id: string): void {
    this.pestanas.update((p) => p.filter((t) => t.id !== id));
    if (this.pestanaActiva() === id) {
      this.pestanaActiva.set(this.pestanas()[0]?.id ?? '');
    }
  }

  // ---------- ui-modal ----------
  protected readonly modalAbierto = signal(false);

  // ---------- ui-alert ----------
  protected readonly alertaTono = signal<UiAlertTone>('info');
  protected readonly alertaClosable = signal(true);
  protected readonly alertaVisible = signal(true);
  protected readonly alertaTonos: UiAlertTone[] = ['info', 'success', 'warning', 'error'];

  // ---------- helpers ----------
  protected leerNumero(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected leerCheck(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected saltar(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** const de Math, expuesta al template (Angular no expone globales). */
  protected readonly Math = Math;
}