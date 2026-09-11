import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ACCESORIOS,
  ANTEOJOS,
  anteojosVisibles,
  AvatarConfig,
  BARBAS,
  COLORES_MARCA,
  COLORES_PELO_NATURALES,
  COLORES_ROPA,
  EMBLEMAS,
  emblemaVisible,
  GENEROS,
  OBJETOS,
  PELOS,
  PIELES,
  PRENDAS,
} from '../../core/avatar/avatar.models';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

type Pestana = 'cuerpo' | 'ropa' | 'accesorios' | 'equipo';

/**
 * Personalización del avatar. Todo cambio se aplica en vivo sobre el preview y se guarda
 * solo (`AvatarService` persiste en cada `set`): no hay botón "guardar" porque no hay nada
 * que se pueda perder — es la misma decisión que el toggle de tema.
 *
 * Las partes se reparten en cuatro pestañas para que la vitrina quede siempre a la vista
 * mientras se elige. La pestaña activa no se persiste: al volver se arranca por CUERPO.
 */
@Component({
  selector: 'app-avatar-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink, NgTemplateOutlet],
  host: { class: 'block w-full max-w-6xl' },
  styles: `
    /* La muestra elegida se marca con un doble anillo, no solo con el color del borde:
       sobre swatches oscuros un borde de 2 px es indistinguible del no-seleccionado. */
    .swatch {
      border: 2px solid var(--color-base-300);
      transition:
        transform 0.12s,
        box-shadow 0.12s;
    }
    .swatch:hover {
      transform: scale(1.12);
    }
    .swatch.sel {
      border-color: #f3eaff;
      box-shadow:
        0 0 0 2px var(--color-base-100),
        0 0 0 4px #ff2758;
      transform: scale(1.12);
    }
    .swatch:focus-visible {
      outline: 2px solid #f3eaff;
      outline-offset: 3px;
    }
    /* Los emblemas se eligen por su glifo: en la pixel font de UI "</>" y "{}" no se leen. */
    .glifo {
      font-family: var(--font-console);
      font-size: 18px;
      line-height: 1;
    }
  `,
  template: `
    <div class="mb-4 flex items-center gap-3">
      <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]">◀ AL MAPA</a>
      <h2 class="title-font text-2xl text-primary">Tu personaje</h2>
    </div>

    <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <!-- vitrina del avatar: queda fija mientras se recorren las pestañas -->
      <div
        class="escena-neon chaflan flex flex-col items-center gap-4 border-2 border-primary p-6 lg:sticky lg:top-4 lg:self-start"
      >
        <div class="grid h-56 w-full place-items-center">
          <ui-avatar-sprite
            [config]="srv.avatar()"
            [alto]="190"
            [sombra]="true"
            [caminando]="true"
            etiqueta="Vista previa de tu avatar"
          />
        </div>
        <p class="ui-font text-center text-[8px] leading-relaxed text-accent">
          ASÍ TE VAS A VER<br />RECORRIENDO EL MAPA
        </p>
        <div class="flex w-full gap-2">
          <button type="button" class="btn btn-sm btn-primary ui-font flex-1 text-[8px]" (click)="srv.aleatorio()">
            ⟳ AL AZAR
          </button>
          <button type="button" class="btn btn-sm btn-outline ui-font flex-1 text-[8px]" (click)="srv.reiniciar()">
            RESET
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-5">
        <div role="tablist" aria-label="Partes del personaje" class="tabs tabs-border">
          @for (p of pestanas; track p.id) {
            <button
              type="button"
              role="tab"
              class="tab ui-font text-[8px]"
              [id]="'tab-' + p.id"
              [class.tab-active]="pestana() === p.id"
              [attr.aria-selected]="pestana() === p.id"
              [attr.aria-controls]="'panel-' + p.id"
              (click)="pestana.set(p.id)"
            >
              {{ p.nombre }}
            </button>
          }
        </div>

        <div
          role="tabpanel"
          class="flex flex-col gap-5"
          [id]="'panel-' + pestana()"
          [attr.aria-labelledby]="'tab-' + pestana()"
        >
          @switch (pestana()) {
            @case ('cuerpo') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">GÉNERO</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: generos, campo: 'genero' }" />
                <p class="ui-font mt-2 text-[7px] leading-relaxed opacity-60">
                  CAMBIA LA SILUETA · TODO EL CATÁLOGO SIGUE DISPONIBLE
                </p>
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">TONO DE PIEL</h3>
                <ng-container
                  *ngTemplateOutlet="muestras; context: { $implicit: pieles, campo: 'piel', etiqueta: 'Piel' }"
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PELO</h3>
                <div class="mb-2">
                  <ng-container *ngTemplateOutlet="chips; context: { $implicit: pelos, campo: 'pelo' }" />
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresPeloNaturales, campo: 'colorPelo', etiqueta: 'Pelo' }
                    "
                  />
                  <span class="h-8 w-px bg-base-300" aria-hidden="true"></span>
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresMarca, campo: 'colorPelo', etiqueta: 'Pelo' }
                    "
                  />
                </div>
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">BARBA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: barbas, campo: 'barba' }" />
              </section>
            }

            @case ('ropa') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PRENDA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: prendas, campo: 'prenda' }" />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">COLOR</h3>
                <ng-container
                  *ngTemplateOutlet="
                    muestras;
                    context: { $implicit: coloresRopa, campo: 'colorRopa', etiqueta: 'Ropa' }
                  "
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">EMBLEMA</h3>
                <div class="flex flex-wrap gap-2">
                  @for (e of emblemas; track e.id) {
                    <button
                      type="button"
                      class="btn btn-sm glifo min-w-12"
                      [class.btn-primary]="elegido('emblema', e.id)"
                      [class.btn-outline]="!elegido('emblema', e.id)"
                      [attr.aria-pressed]="elegido('emblema', e.id)"
                      [attr.aria-label]="'Emblema ' + e.nombre"
                      [title]="e.nombre"
                      (click)="elegir('emblema', e.id)"
                    >
                      {{ e.glifo }}
                    </button>
                  }
                </div>
                @if (avisoEmblema(); as aviso) {
                  <p class="ui-font mt-2 text-[7px] leading-relaxed text-warning">{{ aviso }}</p>
                }
              </section>
            }

            @case ('accesorios') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">CABEZA</h3>
                <div class="mb-2">
                  <ng-container
                    *ngTemplateOutlet="chips; context: { $implicit: accesorios, campo: 'accesorio' }"
                  />
                </div>
                @if (srv.avatar().accesorio !== 'ninguno') {
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: coloresRopa, campo: 'colorAccesorio', etiqueta: 'Accesorio' }
                    "
                  />
                }
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">ANTEOJOS</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: anteojos, campo: 'anteojos' }" />
                @if (avisoAnteojos()) {
                  <p class="ui-font mt-2 text-[7px] leading-relaxed text-warning">EL VISOR TAPA LOS ANTEOJOS</p>
                }
              </section>
            }

            @case ('equipo') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">OBJETO EN MANO</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: objetos, campo: 'objeto' }" />
                <p class="ui-font mt-2 text-[7px] leading-relaxed opacity-60">
                  LO LLEVÁS TAMBIÉN MIENTRAS CAMINÁS POR EL MAPA
                </p>
              </section>
            }
          }
        </div>

        <p class="ui-font text-[8px] leading-relaxed opacity-50">SE GUARDA SOLO</p>
      </div>
    </div>

    <!-- fila de opciones de texto; los ids vienen del catálogo del campo -->
    <ng-template #chips let-opciones let-campo="campo">
      <div class="flex flex-wrap gap-2">
        @for (o of opciones; track o.id) {
          <button
            type="button"
            class="btn btn-xs ui-font text-[8px]"
            [class.btn-primary]="elegido(campo, o.id)"
            [class.btn-outline]="!elegido(campo, o.id)"
            [attr.aria-pressed]="elegido(campo, o.id)"
            (click)="elegir(campo, o.id)"
          >
            {{ o.nombre }}
          </button>
        }
      </div>
    </ng-template>

    <!-- fila de muestras de color -->
    <ng-template #muestras let-opciones let-campo="campo" let-etiqueta="etiqueta">
      <div class="flex flex-wrap gap-2">
        @for (c of opciones; track c.id) {
          <button
            type="button"
            class="swatch h-9 w-9"
            [style.background]="c.base"
            [class.sel]="elegido(campo, c.id)"
            [attr.aria-pressed]="elegido(campo, c.id)"
            [attr.aria-label]="etiqueta + ' ' + c.nombre"
            [title]="c.nombre"
            (click)="elegir(campo, c.id)"
          ></button>
        }
      </div>
    </ng-template>
  `,
})
export class AvatarEditor {
  protected readonly srv = inject(AvatarService);

  protected readonly pestanas: readonly { id: Pestana; nombre: string }[] = [
    { id: 'cuerpo', nombre: 'CUERPO' },
    { id: 'ropa', nombre: 'ROPA' },
    { id: 'accesorios', nombre: 'ACCESORIOS' },
    { id: 'equipo', nombre: 'EQUIPO' },
  ];
  protected readonly pestana = signal<Pestana>('cuerpo');

  protected readonly generos = GENEROS;
  protected readonly pieles = PIELES;
  protected readonly pelos = PELOS;
  protected readonly barbas = BARBAS;
  protected readonly prendas = PRENDAS;
  protected readonly emblemas = EMBLEMAS;
  protected readonly accesorios = ACCESORIOS;
  protected readonly anteojos = ANTEOJOS;
  protected readonly objetos = OBJETOS;
  protected readonly coloresPeloNaturales = COLORES_PELO_NATURALES;
  protected readonly coloresMarca = COLORES_MARCA;
  protected readonly coloresRopa = COLORES_ROPA;

  /** El sprite oculta el emblema en estos casos; sin el aviso, parecería que no anda. */
  protected readonly avisoEmblema = computed(() => {
    const a = this.srv.avatar();
    if (a.emblema === 'ninguno' || emblemaVisible(a)) return null;
    return a.prenda === 'camisa'
      ? 'LA CORBATA DE LA CAMISA TAPA EL EMBLEMA'
      : 'LA LAPTOP TAPA EL EMBLEMA';
  });

  protected readonly avisoAnteojos = computed(() => {
    const a = this.srv.avatar();
    return a.anteojos !== 'ninguno' && !anteojosVisibles(a);
  });

  protected elegido(campo: keyof AvatarConfig, id: string): boolean {
    return this.srv.avatar()[campo] === id;
  }

  /** Los ids llegan de los catálogos que el propio template recorre para ese campo. */
  protected elegir<K extends keyof AvatarConfig>(campo: K, id: AvatarConfig[K]): void {
    this.srv.set(campo, id);
  }
}
