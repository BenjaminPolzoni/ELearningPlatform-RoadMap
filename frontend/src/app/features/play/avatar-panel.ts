import { Component, computed, HostListener, inject, OnDestroy, output, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { AvatarModularConfig, sanearConfigModular } from './engine/avatar-config';
import { AvatarModularService } from './engine/avatar-modular.service';
import {
  COLORES_ESTRELLA,
  COLORES_MOCHILA,
  COLORES_PELO,
  COLORES_ZAPATOS,
  OPCIONES_ARQUETIPO,
  OPCIONES_BARBA,
  OPCIONES_CABEZA,
  OPCIONES_CABEZA_ITEM,
  OPCIONES_ESPALDA,
  OPCIONES_MANO_DER,
  OPCIONES_MANO_IZQ,
  OPCIONES_MASCOTA,
  OPCIONES_PANTALON,
  OPCIONES_PELO,
  OPCIONES_TORSO,
  OPCIONES_ZAPATOS,
  OpcionAvatar,
} from './avatar-opciones';

/**
 * Panel Mi personaje: modifica el personaje 3D con los mismos grupos y valores que
 * el editor de la ciudad. Guardado instantáneo (misma clave `modular_character_config`
 * que escribe la ciudad) y preview 3D en vivo (iframe de `avatar-preview.html` que se
 * recarga con debounce — ese preview lee la config solo al cargar).
 */
@Component({
  selector: 'app-avatar-panel',
  standalone: true,
  host: { class: 'block' },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" (click)="cerrar.emit()">
      <div class="w-full max-w-7xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-primary bg-base-200 shadow-2xl"
        role="dialog" aria-modal="true" aria-label="Modificar tu personaje 3D" (click)="$event.stopPropagation()">
        <header class="flex items-center justify-between gap-4 border-b border-base-300 px-5 py-3">
          <h2 class="title-font text-primary text-xs">🧍 MI PERSONAJE 3D</h2>
          <button (click)="cerrar.emit()" class="btn btn-sm btn-ghost ui-font text-[8px]" aria-label="Cerrar (ESC)">✕ Cerrar</button>
        </header>

        <div class="grid gap-0 md:grid-cols-[1fr_460px] min-h-0 flex-1">
          <div class="overflow-y-auto p-5 min-h-0">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">⚡ ARQUETIPO</span>
                <select class="select select-bordered select-sm" [value]="config().characterClass" (change)="arquetipo(val($event))">
                  @for (o of arquetipos; track o.value) { <option [value]="o.value" [selected]="o.value === config().characterClass">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👤 CABEZA</span>
                <select class="select select-bordered select-sm" [value]="config().headStyle" (change)="cabeza(val($event))">
                  @for (o of cabezas; track o.value) { <option [value]="o.value" [selected]="o.value === config().headStyle">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">💇 CABELLO</span>
                <select class="select select-bordered select-sm" [value]="config().hairStyle" (change)="set('hairStyle', val($event))">
                  @for (o of pelos; track o.value) { <option [value]="o.value" [selected]="o.value === config().hairStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR PELO</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of coloresPelo; track c.hex) {
                    <button type="button" [title]="c.nombre" [attr.aria-label]="c.nombre"
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
                  @for (o of barbas; track o.value) { <option [value]="o.value" [selected]="o.value === config().beardStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR CARA</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of coloresPelo; track c.hex) {
                    <button type="button" [title]="c.nombre" [attr.aria-label]="c.nombre"
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
                  @for (o of pantalones; track o.value) { <option [value]="o.value" [selected]="o.value === config().pantsStyle">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">👟 ZAPATOS</span>
                <select class="select select-bordered select-sm" [value]="config().shoesStyle" (change)="set('shoesStyle', val($event))">
                  @for (o of zapatos; track o.value) { <option [value]="o.value" [selected]="o.value === config().shoesStyle">{{ o.label }}</option> }
                </select>
              </label>
              <div>
                <span class="label-text ui-font text-[8px] block mb-1">COLOR CALZADO</span>
                <div class="flex items-center gap-1.5 flex-wrap">
                  @for (c of coloresZapatos; track c.hex) {
                    <button type="button" [title]="c.nombre" [attr.aria-label]="c.nombre"
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
                  @for (o of espaldas; track o.value) { <option [value]="o.value" [selected]="o.value === config().backItem">{{ o.label }}</option> }
                </select>
              </label>
              @if (config().backItem === 'backpack') {
                <div>
                  <span class="label-text ui-font text-[8px] block mb-1">COLOR MOCHILA</span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    @for (c of coloresMochila; track c.hex) {
                      <button type="button" [title]="c.nombre" [attr.aria-label]="c.nombre"
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
                  @for (o of cabezaItems; track o.value) { <option [value]="o.value" [selected]="o.value === config().headItem">{{ o.label }}</option> }
                </select>
              </label>
              @if (config().headItem === 'star_orbit') {
                <label class="form-control">
                  <span class="label-text ui-font text-[8px]">COLOR ESTRELLAS</span>
                  <select class="select select-bordered select-sm" [value]="config().starOrbitColor" (change)="set('starOrbitColor', val($event))">
                    @for (o of coloresEstrella; track o.value) { <option [value]="o.value" [selected]="o.value === config().starOrbitColor">{{ o.label }}</option> }
                  </select>
                </label>
              }
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🛸 MASCOTA</span>
                <select class="select select-bordered select-sm" [value]="config().pet" (change)="set('pet', val($event))">
                  @for (o of mascotas; track o.value) { <option [value]="o.value" [selected]="o.value === config().pet">{{ o.label }}</option> }
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
                  @for (o of manoDer; track o.value) { <option [value]="o.value" [selected]="o.value === config().rightHandItem">{{ o.label }}</option> }
                </select>
              </label>
              <label class="form-control">
                <span class="label-text ui-font text-[8px]">🛡️ MANO IZQUIERDA</span>
                <select class="select select-bordered select-sm" [value]="config().leftHandItem" (change)="set('leftHandItem', val($event))">
                  @for (o of manoIzq; track o.value) { <option [value]="o.value" [selected]="o.value === config().leftHandItem">{{ o.label }}</option> }
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
export class AvatarPanel implements OnDestroy {
  readonly cerrar = output<void>();

  private readonly avatarModular = inject(AvatarModularService);
  private readonly sanitizer = inject(DomSanitizer);
  private timer = 0;

  protected readonly arquetipos = OPCIONES_ARQUETIPO;
  protected readonly cabezas = OPCIONES_CABEZA;
  protected readonly pelos = OPCIONES_PELO;
  protected readonly barbas = OPCIONES_BARBA;
  protected readonly torsos = OPCIONES_TORSO;
  protected readonly pantalones = OPCIONES_PANTALON;
  protected readonly zapatos = OPCIONES_ZAPATOS;
  protected readonly espaldas = OPCIONES_ESPALDA;
  protected readonly cabezaItems = OPCIONES_CABEZA_ITEM;
  protected readonly mascotas = OPCIONES_MASCOTA;
  protected readonly manoDer = OPCIONES_MANO_DER;
  protected readonly manoIzq = OPCIONES_MANO_IZQ;
  protected readonly coloresPelo = COLORES_PELO;
  protected readonly coloresZapatos = COLORES_ZAPATOS;
  protected readonly coloresMochila = COLORES_MOCHILA;
  protected readonly coloresEstrella: OpcionAvatar[] = COLORES_ESTRELLA;

  protected readonly config = signal<AvatarModularConfig>(
    this.avatarModular.leer() ?? sanearConfigModular({}),
  );
  private readonly previewKey = signal(0);
  protected readonly previewUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`mundo-3d/avatar-preview.html?v=${this.previewKey()}`),
  );

  protected val(e: Event): string {
    return (e.target as HTMLSelectElement | HTMLInputElement | null)?.value ?? '';
  }

  protected set<K extends keyof AvatarModularConfig>(campo: K, valor: AvatarModularConfig[K]): void {
    this.guardarYPrevisualizar({ ...this.config(), [campo]: valor });
  }

  /** Arquetipo: propaga a cabeza, torso, pantalón, zapatos, pelo y barba (igual que la ciudad). */
  protected arquetipo(clase: string): void {
    this.guardarYPrevisualizar(this.avatarModular.aplicarArquetipo(this.config(), clase));
  }

  /** Cabeza: resetea pelo y ajusta barba (igual que la ciudad). */
  protected cabeza(cabeza: string): void {
    this.guardarYPrevisualizar(this.avatarModular.aplicarCabeza(this.config(), cabeza));
  }

  private guardarYPrevisualizar(next: AvatarModularConfig): void {
    this.config.set(this.avatarModular.guardar(next));
    // El preview lee la config solo al cargar: recarga con debounce.
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.previewKey.update((n) => n + 1), 500);
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.timer);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cerrar.emit();
  }
}
