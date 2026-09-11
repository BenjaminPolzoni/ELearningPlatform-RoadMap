import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ACCESORIOS,
  AvatarConfig,
  COLORES_PELO,
  COLORES_ROPA,
  IdColor,
  PELOS,
  PIELES,
} from '../../core/avatar/avatar.models';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarSprite } from '../../shared/ui/avatar-sprite';

/**
 * Personalización del avatar. Todo cambio se aplica en vivo sobre el preview y se guarda
 * solo (`AvatarService` persiste en cada `set`): no hay botón "guardar" porque no hay nada
 * que se pueda perder — es la misma decisión que el toggle de tema.
 */
@Component({
  selector: 'app-avatar-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSprite, RouterLink],
  host: { class: 'block' },
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
  `,
  template: `
    <div class="mb-4 flex items-center gap-3">
      <a routerLink="/alumno" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]">◀ AL MAPA</a>
      <h2 class="title-font text-2xl text-primary">Tu personaje</h2>
    </div>

    <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <!-- vitrina del avatar -->
      <div class="escena-neon chaflan flex flex-col items-center gap-4 border-2 border-primary p-6">
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
          <button class="btn btn-sm btn-primary ui-font flex-1 text-[8px]" (click)="srv.aleatorio()">
            ⟳ AL AZAR
          </button>
          <button class="btn btn-sm btn-outline ui-font flex-1 text-[8px]" (click)="srv.reiniciar()">
            RESET
          </button>
        </div>
      </div>

      <!-- catálogos -->
      <div class="flex flex-col gap-5">
        <section>
          <h3 class="ui-font mb-2 text-[9px] text-secondary">TONO DE PIEL</h3>
          <div class="flex flex-wrap gap-2">
            @for (p of pieles; track p.id) {
              <button
                class="swatch h-10 w-10"
                [style.background]="p.base"
                [class.sel]="srv.avatar().piel === p.id"
                [attr.aria-pressed]="srv.avatar().piel === p.id"
                [attr.aria-label]="'Piel ' + p.nombre"
                [title]="p.nombre"
                (click)="srv.set('piel', p.id)"
              ></button>
            }
          </div>
        </section>

        <section>
          <h3 class="ui-font mb-2 text-[9px] text-secondary">PELO</h3>
          <div class="mb-2 flex flex-wrap gap-2">
            @for (p of pelos; track p.id) {
              <button
                class="btn btn-xs ui-font text-[8px]"
                [class.btn-primary]="srv.avatar().pelo === p.id"
                [class.btn-outline]="srv.avatar().pelo !== p.id"
                [attr.aria-pressed]="srv.avatar().pelo === p.id"
                (click)="srv.set('pelo', p.id)"
              >
                {{ p.nombre }}
              </button>
            }
          </div>
          <div class="flex flex-wrap gap-2">
            @for (c of coloresPelo; track c.id) {
              <button
                class="swatch h-9 w-9"
                [style.background]="c.base"
                [class.sel]="srv.avatar().colorPelo === c.id"
                [attr.aria-pressed]="srv.avatar().colorPelo === c.id"
                [attr.aria-label]="'Pelo ' + c.nombre"
                [title]="c.nombre"
                (click)="elegirColor('colorPelo', c.id)"
              ></button>
            }
          </div>
        </section>

        <section>
          <h3 class="ui-font mb-2 text-[9px] text-secondary">TRAJE</h3>
          <div class="flex flex-wrap gap-2">
            @for (c of coloresRopa; track c.id) {
              <button
                class="swatch h-9 w-9"
                [style.background]="c.base"
                [class.sel]="srv.avatar().colorRopa === c.id"
                [attr.aria-pressed]="srv.avatar().colorRopa === c.id"
                [attr.aria-label]="'Traje ' + c.nombre"
                [title]="c.nombre"
                (click)="elegirColor('colorRopa', c.id)"
              ></button>
            }
          </div>
        </section>

        <section>
          <h3 class="ui-font mb-2 text-[9px] text-secondary">ACCESORIO</h3>
          <div class="mb-2 flex flex-wrap gap-2">
            @for (a of accesorios; track a.id) {
              <button
                class="btn btn-xs ui-font text-[8px]"
                [class.btn-primary]="srv.avatar().accesorio === a.id"
                [class.btn-outline]="srv.avatar().accesorio !== a.id"
                [attr.aria-pressed]="srv.avatar().accesorio === a.id"
                (click)="srv.set('accesorio', a.id)"
              >
                {{ a.nombre }}
              </button>
            }
          </div>
          @if (srv.avatar().accesorio !== 'ninguno') {
            <div class="flex flex-wrap gap-2">
              @for (c of coloresRopa; track c.id) {
                <button
                  class="swatch h-9 w-9"
                  [style.background]="c.base"
                  [class.sel]="srv.avatar().colorAccesorio === c.id"
                  [attr.aria-pressed]="srv.avatar().colorAccesorio === c.id"
                  [attr.aria-label]="'Accesorio ' + c.nombre"
                  [title]="c.nombre"
                  (click)="elegirColor('colorAccesorio', c.id)"
                ></button>
              }
            </div>
          }
        </section>

        <p class="ui-font text-[8px] leading-relaxed opacity-50">
          LOS COLORES SALEN DE LA PALETA DE MARCA · SE GUARDA SOLO
        </p>
      </div>
    </div>
  `,
})
export class AvatarEditor {
  protected readonly srv = inject(AvatarService);

  protected readonly pieles = PIELES;
  protected readonly pelos = PELOS;
  protected readonly coloresPelo = COLORES_PELO;
  protected readonly coloresRopa = COLORES_ROPA;
  protected readonly accesorios = ACCESORIOS;

  protected elegirColor(parte: keyof AvatarConfig & `color${string}`, id: IdColor): void {
    this.srv.set(parte, id);
  }
}
