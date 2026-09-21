import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ACCESSORIES,
  GLASSES,
  visibleGlasses,
  AvatarConfig,
  BEARDS,
  MARK_COLORS,
  NATURAL_HAIR_COLORS,
  CLOTHES_COLORS,
  EMBLEMS,
  emblemVisible,
  GENDERS,
  OBJECTS,
  HAIRSTYLES,
  SKINS,
  GARMENTS,
} from '../../data-access/avatar/avatar.models';
import { AvatarService } from '../../data-access/avatar/avatar.service';
import { AvatarSpriteComponent } from '../../ui/avatar-sprite/avatar-sprite.component';

type Tab = 'body' | 'clothes' | 'accessories' | 'gear';

/**
 * Avatar customization. Every change is applied live on the preview and saved
 * automatically (`AvatarService` persists on every `set`): there is no "save" button because there is nothing
 * that can be lost — it is the same decision as the theme toggle.
 *
 * The parts are split into four tabs so the showcase always stays in view
 * while choosing. The active tab is not persisted: when coming back it starts at CUERPO.
 */
@Component({
  selector: 'app-avatar-editor-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarSpriteComponent, RouterLink, NgTemplateOutlet],
  // The root shell (app.html) clips the <router-outlet> to a fixed frame without scroll (designed
  // for the student's arcade map) — this view may be taller than the screen (beard
  // in CUERPO), so it scrolls internally instead of relying on the document.
  host: { class: 'block w-full max-w-6xl h-full overflow-y-auto' },
  styles: `
    /* The chosen swatch is marked with a double ring, not just with the border color:
       over dark swatches a 2 px border is indistinguishable from the unselected one. */
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
    /* Emblems are chosen by their glyph: in the UI pixel font "</>" and "{}" are not legible. */
    .glifo {
      font-family: var(--font-console);
      font-size: 18px;
      line-height: 1;
    }
  `,
  template: `
    <div class="mb-4 flex items-center gap-3">
      <a routerLink="/roadmap/student" class="btn btn-sm btn-outline btn-secondary ui-font text-[8px]">◀ AL MAPA</a>
      <h2 class="title-font text-2xl text-primary">Tu personaje</h2>
    </div>

    <div class="grid gap-6 lg:grid-cols-[440px_1fr]">
      <!-- avatar showcase: stays fixed while browsing the tabs -->
      <div
        class="neon-scene chamfer flex flex-col items-center gap-4 border-2 border-primary p-6 lg:sticky lg:top-4 lg:self-start"
      >
        <div class="grid h-96 w-full place-items-center">
          <app-avatar-sprite
            [config]="srv.avatar()"
            [height]="340"
            [shadow]="true"
            etiqueta="Vista previa de tu avatar"
          />
        </div>
        <p class="ui-font text-center text-[8px] leading-relaxed text-accent">
          ASÍ TE VAS A VER<br />RECORRIENDO EL MAPA
        </p>
        <div class="flex w-full gap-2">
          <button type="button" class="btn btn-sm btn-primary ui-font flex-1 text-[8px]" (click)="srv.random()">
            ⟳ AL AZAR
          </button>
          <button type="button" class="btn btn-sm btn-outline ui-font flex-1 text-[8px]" (click)="srv.reset()">
            RESET
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-5">
        <div role="tablist" aria-label="Partes del personaje" class="tabs tabs-border">
          @for (p of tabs; track p.id) {
            <button
              type="button"
              role="tab"
              class="tab ui-font text-[8px]"
              [id]="'tab-' + p.id"
              [class.tab-active]="tab() === p.id"
              [attr.aria-selected]="tab() === p.id"
              [attr.aria-controls]="tab() === p.id ? 'panel-' + p.id : null"
              (click)="tab.set(p.id)"
            >
              {{ p.name }}
            </button>
          }
        </div>

        <div
          role="tabpanel"
          class="flex flex-col gap-5"
          [id]="'panel-' + tab()"
          [attr.aria-labelledby]="'tab-' + tab()"
        >
          @switch (tab()) {
            @case ('body') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">TONO DE PIEL</h3>
                <ng-container
                  *ngTemplateOutlet="muestras; context: { $implicit: skins, field: 'skin', label: 'Piel' }"
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PELO</h3>
                <div class="mb-2">
                  <ng-container *ngTemplateOutlet="chips; context: { $implicit: hairstyles, field: 'hair' }" />
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: naturalHairColors, field: 'hairColor', label: 'Pelo' }
                    "
                  />
                  <span class="h-8 w-px bg-base-300" aria-hidden="true"></span>
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: markColors, field: 'hairColor', label: 'Pelo' }
                    "
                  />
                </div>
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">BARBA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: beards, field: 'beard' }" />
              </section>
            }

            @case ('clothes') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">PRENDA</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: garments, field: 'garment' }" />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">COLOR</h3>
                <ng-container
                  *ngTemplateOutlet="
                    muestras;
                    context: { $implicit: clothesColors, field: 'clothesColor', label: 'Ropa' }
                  "
                />
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">EMBLEMA</h3>
                <div class="flex flex-wrap gap-2">
                  @for (e of emblems; track e.id) {
                    <button
                      type="button"
                      class="btn btn-sm glifo min-w-12"
                      [class.btn-primary]="chosen('emblem', e.id)"
                      [class.btn-outline]="!chosen('emblem', e.id)"
                      [attr.aria-pressed]="chosen('emblem', e.id)"
                      [attr.aria-label]="'Emblema ' + e.name"
                      [title]="e.name"
                      (click)="choose('emblem', e.id)"
                    >
                      {{ e.glyph }}
                    </button>
                  }
                </div>
                @if (noticeEmblem(); as notice) {
                  <p aria-live="polite" class="ui-font mt-2 text-[7px] leading-relaxed text-warning">{{ notice }}</p>
                }
              </section>
            }

            @case ('accessories') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">CABEZA</h3>
                <div class="mb-2">
                  <ng-container
                    *ngTemplateOutlet="chips; context: { $implicit: accessories, field: 'accessory' }"
                  />
                </div>
                @if (srv.avatar().accessory !== 'none') {
                  <ng-container
                    *ngTemplateOutlet="
                      muestras;
                      context: { $implicit: clothesColors, field: 'accessoryColor', label: 'Accesorio' }
                    "
                  />
                }
              </section>

              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">ANTEOJOS</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: glasses, field: 'glasses' }" />
                @if (noticeGlasses()) {
                  <p aria-live="polite" class="ui-font mt-2 text-[7px] leading-relaxed text-warning">EL VISOR TAPA LOS ANTEOJOS</p>
                }
              </section>
            }

            @case ('gear') {
              <section>
                <h3 class="ui-font mb-2 text-[9px] text-secondary">OBJETO EN MANO</h3>
                <ng-container *ngTemplateOutlet="chips; context: { $implicit: objects, field: 'object' }" />
                <p class="ui-font mt-2 text-[7px] leading-relaxed opacity-60">
                  LO LLEVÁS TAMBIÉN MIENTRAS CAMINÁS POR EL MAPA
                </p>
                @if (noticeEmblem(); as notice) {
                  <p aria-live="polite" class="ui-font mt-2 text-[7px] leading-relaxed text-warning">{{ notice }}</p>
                }
              </section>
            }
          }
        </div>

        <p class="ui-font text-[8px] leading-relaxed opacity-50">SE GUARDA SOLO</p>
      </div>
    </div>

    <!-- row of text options; the ids come from the field's catalog -->
    <ng-template #chips let-options let-field="field">
      <div class="flex flex-wrap gap-2">
        @for (o of options; track o.id) {
          <button
            type="button"
            class="btn btn-xs ui-font text-[8px]"
            [class.btn-primary]="chosen(field, o.id)"
            [class.btn-outline]="!chosen(field, o.id)"
            [attr.aria-pressed]="chosen(field, o.id)"
            (click)="choose(field, o.id)"
          >
            {{ o.name }}
          </button>
        }
      </div>
    </ng-template>

    <!-- row of color swatches -->
    <ng-template #muestras let-options let-field="field" let-label="label">
      <div class="flex flex-wrap gap-2">
        @for (c of options; track c.id) {
          <button
            type="button"
            class="swatch h-9 w-9"
            [style.background]="c.base"
            [class.sel]="chosen(field, c.id)"
            [attr.aria-pressed]="chosen(field, c.id)"
            [attr.aria-label]="label + ' ' + c.name"
            [title]="c.name"
            (click)="choose(field, c.id)"
          ></button>
        }
      </div>
    </ng-template>
  `,
})
export class AvatarEditorPageComponent {
  protected readonly srv = inject(AvatarService);

  protected readonly tabs: readonly { id: Tab; name: string }[] = [
    { id: 'body', name: 'CUERPO' },
    { id: 'clothes', name: 'ROPA' },
    { id: 'accessories', name: 'ACCESORIOS' },
    { id: 'gear', name: 'EQUIPO' },
  ];
  protected readonly tab = signal<Tab>('body');

  protected readonly genders = GENDERS;
  protected readonly skins = SKINS;
  protected readonly hairstyles = HAIRSTYLES;
  protected readonly beards = BEARDS;
  protected readonly garments = GARMENTS;
  protected readonly emblems = EMBLEMS;
  protected readonly accessories = ACCESSORIES;
  protected readonly glasses = GLASSES;
  protected readonly objects = OBJECTS;
  protected readonly naturalHairColors = NATURAL_HAIR_COLORS;
  protected readonly markColors = MARK_COLORS;
  protected readonly clothesColors = CLOTHES_COLORS;

  /** The sprite hides the emblem in these cases; without the warning, it would seem broken. */
  protected readonly noticeEmblem = computed(() => {
    const a = this.srv.avatar();
    if (a.emblem === 'none' || emblemVisible(a)) return null;
    return a.garment === 'shirt'
      ? 'LA CORBATA DE LA CAMISA TAPA EL EMBLEMA'
      : 'LA LAPTOP TAPA EL EMBLEMA';
  });

  protected readonly noticeGlasses = computed(() => {
    const a = this.srv.avatar();
    return a.glasses !== 'none' && !visibleGlasses(a);
  });

  protected chosen(field: keyof AvatarConfig, id: string): boolean {
    return this.srv.avatar()[field] === id;
  }

  /** The ids come from the catalogs that the template itself iterates for that field. */
  protected choose<K extends keyof AvatarConfig>(field: K, id: AvatarConfig[K]): void {
    this.srv.set(field, id);
  }
}
