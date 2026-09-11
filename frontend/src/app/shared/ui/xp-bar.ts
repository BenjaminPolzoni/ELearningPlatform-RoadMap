import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * PAR-09 — curva de niveles por defecto del sistema. Espejo exacto de
 * `CurvaNiveles.UMBRALES_PAR_09` del backend (`domain/service/CurvaNiveles.java`).
 *
 * ⚠️ Está duplicada acá porque el nivel del alumno **todavía no se expone** por API
 * (deuda #10 de `path/deuda-tecnica/tarea-deuda-06-contrato-api.md`): mientras tanto el
 * HUD lo deriva del XP igual que el backend. Cuando el endpoint exista, este cálculo se
 * borra y el nivel llega ya resuelto — y con él la curva *custom* del curso, que esta
 * constante no contempla (RF-NIV-04 permite que el profesor defina la suya).
 */
export const UMBRALES_PAR_09 = [0, 250, 600, 1100, 1800, 2800, 4200, 6000, 8500, 12000] as const;

export interface NivelAlumno {
  nivel: number;
  /** XP acumulado dentro del nivel actual. */
  enNivel: number;
  /** XP que hace falta para pasar de nivel; 0 si ya está en el tope. */
  meta: number;
  tope: boolean;
}

/**
 * Nivel derivado del XP. Sin techo por arriba (RF-NIV-05: el orden del ranking es siempre
 * por XP real, así que pasado el último umbral se sigue sumando XP en el nivel 10).
 */
export function nivelDe(xp: number): NivelAlumno {
  const x = Math.max(0, xp);
  let i = 0;
  while (i + 1 < UMBRALES_PAR_09.length && x >= UMBRALES_PAR_09[i + 1]) i++;

  const tope = i === UMBRALES_PAR_09.length - 1;
  return {
    nivel: i + 1,
    enNivel: x - UMBRALES_PAR_09[i],
    meta: tope ? 0 : UMBRALES_PAR_09[i + 1] - UMBRALES_PAR_09[i],
    tope,
  };
}

/** Barra de XP + nivel (05-design-system.md §4, `ui-xp-bar`). */
@Component({
  selector: 'ui-xp-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline gap-2">
      <span class="ui-font text-[9px] text-primary">NIVEL</span>
      <span class="ui-font tabular text-[13px] text-base-content">{{ n().nivel }}</span>
      <span class="ui-font tabular ml-auto text-[8px] opacity-60">
        @if (n().tope) {
          MÁXIMO
        } @else {
          {{ n().enNivel }}/{{ n().meta }} XP
        }
      </span>
    </div>

    <div
      class="mt-1.5 h-3 w-full border-2 border-secondary bg-base-100 p-[2px]"
      role="progressbar"
      [attr.aria-valuenow]="n().tope ? 1 : n().enNivel"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="n().tope ? 1 : n().meta"
      [attr.aria-label]="'Experiencia del nivel ' + n().nivel"
    >
      <div
        class="h-full bg-primary transition-[width] duration-500"
        [style.width.%]="porcentaje()"
        style="box-shadow: 0 0 8px #FF2758"
      ></div>
    </div>
  `,
})
export class XpBar {
  readonly xp = input.required<number>();

  protected readonly n = computed(() => nivelDe(this.xp()));
  protected readonly porcentaje = computed(() => {
    const n = this.n();
    return n.tope ? 100 : (n.enNivel / n.meta) * 100;
  });
}
