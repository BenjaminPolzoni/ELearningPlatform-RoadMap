import { Component, computed, HostListener, inject, OnDestroy, output, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AvatarModularConfig, sanitizeConfigModular } from '../../engine/avatar-config';
import { AvatarModularService } from '../../engine/avatar-modular.service';
import {
  STAR_COLORS,
  BACKPACK_COLORS,
  HAIR_COLORS,
  SHOES_COLORS,
  ARCHETYPE_OPTIONS,
  BEARD_OPTIONS,
  HEAD_OPTIONS,
  HEAD_ITEM_OPTIONS,
  BACK_OPTIONS,
  HAND_RIGHT_OPTIONS,
  HAND_LEFT_OPTIONS,
  PET_OPTIONS,
  PANTS_OPTIONS,
  HAIR_OPTIONS,
  TORSO_OPTIONS,
  SHOES_OPTIONS,
  AvatarOption,
} from '../../data-access/avatar/avatar-options';

/**
 * My character panel: modifies the 3D character with the same groups and values as
 * the city editor. Instant save (same `modular_character_config` key
 * that the city writes) and live 3D preview (iframe of `avatar-preview.html` that
 * reloads with debounce — that preview reads the config only on load).
 */
@Component({
  selector: 'app-avatar-panel',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" (click)="close.emit()">
      <div class="w-full max-w-7xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-primary bg-base-200 shadow-2xl"
        role="dialog" aria-modal="true" aria-label="Modificar tu personaje 3D" (click)="$event.stopPropagation()">
        <header class="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-3">
          <h2 class="title-font text-primary text-xs">🧍 MI PERSONAJE 3D</h2>
          <button (click)="close.emit()" class="btn btn-sm btn-ghost ui-font text-[8px]" aria-label="Cerrar (ESC)">✕ Cerrar</button>
        </header>

        <div class="grid gap-0 md:grid-cols-[1fr_460px] min-h-0 flex-1">
          <div class="overflow-y-auto p-5 min-h-0">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">⚡ ARQUETIPO</span>
                <select class="select select-bordered select-sm" [value]="config().characterClass" (change)="archetype(val($event))">
                  @for (o of archetypes; track o.value) { <option [value]="o.value" [selected]="o.value === config().characterClass">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👤 CABEZA</span>
                <select class="select select-bordered select-sm" [value]="config().headStyle" (change)="head(val($event))">
                  @for (o of heads; track o.value) { <option [value]="o.value" [selected]="o.value === config().headStyle">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">💇 CABELLO</span>
                <select class="select select-bordered select-sm" [value]="config().hairStyle" (change)="set('hairStyle', val($event))">
                  @for (o of hairstyles; track o.value) { <option [value]="o.value" [selected]="o.value === config().hairStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR PELO</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of hairColors; track c.hex) {
                    <button type="button" [title]="c.name" [attr.aria-label]="c.name"
                      (click)="set('hairColor', c.hex)" class="w-7 h-7 rounded border-2"
                      [style.background]="c.hex" [class.border-primary]="config().hairColor === c.hex"
                      [class.border-base-300]="config().hairColor !== c.hex"></button>
                  }
                  <input type="color" [value]="config().hairColor" (input)="set('hairColor', val($event))" title="Elegir otro color" class="w-7 h-7 cursor-pointer" />
                </div>
              </div>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🎭 COSMÉTICO CARA</span>
                <select class="select select-bordered select-sm" [value]="config().beardStyle" (change)="set('beardStyle', val($event))">
                  @for (o of beards; track o.value) { <option [value]="o.value" [selected]="o.value === config().beardStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR CARA</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of hairColors; track c.hex) {
                    <button type="button" [title]="c.name" [attr.aria-label]="c.name"
                      (click)="set('beardColor', c.hex)" class="w-7 h-7 rounded border-2"
                      [style.background]="c.hex" [class.border-primary]="config().beardColor === c.hex"
                      [class.border-base-300]="config().beardColor !== c.hex"></button>
                  }
                  <input type="color" [value]="config().beardColor" (input)="set('beardColor', val($event))" title="Elegir otro color" class="w-7 h-7 cursor-pointer" />
                </div>
              </div>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👕 PARTE SUPERIOR</span>
                <select class="select select-bordered select-sm" [value]="config().topStyle" (change)="set('topStyle', val($event))">
                  @for (o of torsos; track o.value) { <option [value]="o.value" [selected]="o.value === config().topStyle">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👖 PANTALÓN</span>
                <select class="select select-bordered select-sm" [value]="config().pantsStyle" (change)="set('pantsStyle', val($event))">
                  @for (o of pants; track o.value) { <option [value]="o.value" [selected]="o.value === config().pantsStyle">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👟 ZAPATOS</span>
                <select class="select select-bordered select-sm" [value]="config().shoesStyle" (change)="set('shoesStyle', val($event))">
                  @for (o of shoes; track o.value) { <option [value]="o.value" [selected]="o.value === config().shoesStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR CALZADO</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of shoesColors; track c.hex) {
                    <button type="button" [title]="c.name" [attr.aria-label]="c.name"
                      (click)="set('shoesColor', c.hex)" class="w-7 h-7 rounded border-2"
                      [style.background]="c.hex" [class.border-primary]="config().shoesColor === c.hex"
                      [class.border-base-300]="config().shoesColor !== c.hex"></button>
                  }
                  <input type="color" [value]="config().shoesColor" (input)="set('shoesColor', val($event))" title="Elegir otro color" class="w-7 h-7 cursor-pointer" />
                </div>
              </div>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🎒 ESPALDA</span>
                <select class="select select-bordered select-sm" [value]="config().backItem" (change)="set('backItem', val($event))">
                  @for (o of backs; track o.value) { <option [value]="o.value" [selected]="o.value === config().backItem">{{ o.label }}</option> }
                </select>
              </label>
              @if (config().backItem === 'backpack') {
                <div>
                  <span class="label-text ui-font text-[8px] block mb-1">COLOR MOCHILA</span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    @for (c of backpackColors; track c.hex) {
                      <button type="button" [title]="c.name" [attr.aria-label]="c.name"
                        (click)="set('backpackColor', c.hex)" class="w-7 h-7 rounded border-2"
                        [style.background]="c.hex" [class.border-primary]="config().backpackColor === c.hex"
                        [class.border-base-300]="config().backpackColor !== c.hex"></button>
                    }
                    <input type="color" [value]="config().backpackColor" (input)="set('backpackColor', val($event))" title="Elegir otro color" class="w-7 h-7 cursor-pointer" />
                  </div>
                </div>
              }
              @if (config().backItem === 'guitar') {
                <div>
                  <span class="label-text ui-font text-[8px] block mb-1">COLOR GUITARRA</span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <button type="button" title="Rosa" aria-label="Guitarra rosa"
                      (click)="set('guitarColor', 'A')" class="w-7 h-7 rounded border-2"
                      style="background:#ec4899" [class.border-primary]="config().guitarColor === 'A'"
                      [class.border-base-300]="config().guitarColor !== 'A'"></button>
                    <button type="button" title="Azul" aria-label="Guitarra azul"
                      (click)="set('guitarColor', 'B')" class="w-7 h-7 rounded border-2"
                      style="background:#2563eb" [class.border-primary]="config().guitarColor === 'B'"
                      [class.border-base-300]="config().guitarColor !== 'B'"></button>
                  </div>
                </div>
              }
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🧢 CABEZA ITEM</span>
                <select class="select select-bordered select-sm" [value]="config().headItem" (change)="set('headItem', val($event))">
                  @for (o of headItems; track o.value) { <option [value]="o.value" [selected]="o.value === config().headItem">{{ o.label }}</option> }
                </select>
              </label>
              @if (config().headItem === 'star_orbit') {
                <label class="form-control">
                  <span class="label-text ui-font text-[8px]">COLOR ESTRELLAS</span>
                  <select class="select select-bordered select-sm" [value]="config().starOrbitColor" (change)="set('starOrbitColor', val($event))">
                    @for (o of starColors; track o.value) { <option [value]="o.value" [selected]="o.value === config().starOrbitColor">{{ o.label }}</option> }
                  </select>
                </label>
              }
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🛸 MASCOTA</span>
                <select class="select select-bordered select-sm" [value]="config().pet" (change)="set('pet', val($event))">
                  @for (o of pets; track o.value) { <option [value]="o.value" [selected]="o.value === config().pet">{{ o.label }}</option> }
                </select>
              </label>
              @if (config().pet === 'chicken') {
                <label class="form-control">
                  <span class="label-text ui-font text-[8px]">COLOR GALLINA</span>
                  <select class="select select-bordered select-sm" [value]="config().chickenVariant" (change)="set('chickenVariant', val($event))">
                    <option value="A" [selected]="config().chickenVariant === 'A'">Blanca</option>
                    <option value="B" [selected]="config().chickenVariant === 'B'">Marrón</option>
                  </select>
                </label>
              }
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🗡️ MANO DERECHA</span>
                <select class="select select-bordered select-sm" [value]="config().rightHandItem" (change)="set('rightHandItem', val($event))">
                  @for (o of handRight; track o.value) { <option [value]="o.value" [selected]="o.value === config().rightHandItem">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🛡️ MANO IZQUIERDA</span>
                <select class="select select-bordered select-sm" [value]="config().leftHandItem" (change)="set('leftHandItem', val($event))">
                  @for (o of handLeft; track o.value) { <option [value]="o.value" [selected]="o.value === config().leftHandItem">{{ o.label }}</option> }
                </select>
              </label>
            </div>
          </div>

          <aside class="border-t-2 md:border-t-0 md:border-l-2 border-base-300 bg-black/40 p-4 flex flex-col min-h-0">
            <span class="ui-font text-[8px] opacity-70 mb-2">VISTA PREVIA 3D</span>
            <iframe title="Vista previa de tu personaje" [src]="previewUrl()"
              class="w-full flex-1 min-h-[480px] rounded-xl border border-white/10" style="background:#161328"></iframe>
            <p class="mt-2 text-xs opacity-60">Se guarda solo al cambiar. Tu personaje aparece así en las islas y desafíos.</p>
          </aside>
        </div>
      </div>
    </div>
  `,
})
export class AvatarPanelComponent implements OnDestroy {
  readonly close = output<void>();

  private readonly avatarModular = inject(AvatarModularService);
  private readonly sanitizer = inject(DomSanitizer);
  private timer = 0;

  protected readonly archetypes = ARCHETYPE_OPTIONS;
  protected readonly heads = HEAD_OPTIONS;
  protected readonly hairstyles = HAIR_OPTIONS;
  protected readonly beards = BEARD_OPTIONS;
  protected readonly torsos = TORSO_OPTIONS;
  protected readonly pants = PANTS_OPTIONS;
  protected readonly shoes = SHOES_OPTIONS;
  protected readonly backs = BACK_OPTIONS;
  protected readonly headItems = HEAD_ITEM_OPTIONS;
  protected readonly pets = PET_OPTIONS;
  protected readonly handRight = HAND_RIGHT_OPTIONS;
  protected readonly handLeft = HAND_LEFT_OPTIONS;
  protected readonly hairColors = HAIR_COLORS;
  protected readonly shoesColors = SHOES_COLORS;
  protected readonly backpackColors = BACKPACK_COLORS;
  protected readonly starColors: AvatarOption[] = STAR_COLORS;

  protected readonly config = signal<AvatarModularConfig>(
    this.avatarModular.read() ?? sanitizeConfigModular({}),
  );
  private readonly previewKey = signal(0);
  protected readonly previewUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`/assets/roadmap/world-3d/avatar-preview.html?v=${this.previewKey()}`),
  );

  protected val(e: Event): string {
    return (e.target as HTMLSelectElement | HTMLInputElement | null)?.value ?? '';
  }

  protected set<K extends keyof AvatarModularConfig>(field: K, value: AvatarModularConfig[K]): void {
    this.saveYPreview({ ...this.config(), [field]: value });
  }

  /** Archetype: propagates to head, torso, pants, shoes, hair and beard (same as the city). */
  protected archetype(characterClass: string): void {
    this.saveYPreview(this.avatarModular.applyArchetype(this.config(), characterClass));
  }

  /** Head: resets hair and adjusts beard (same as the city). */
  protected head(head: string): void {
    this.saveYPreview(this.avatarModular.applyHead(this.config(), head));
  }

  private saveYPreview(next: AvatarModularConfig): void {
    this.config.set(this.avatarModular.save(next));
    // The preview reads the config only on load: reload with debounce.
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.previewKey.update((n) => n + 1), 500);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.timer);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close.emit();
  }
}
