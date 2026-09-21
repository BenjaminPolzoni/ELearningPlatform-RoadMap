import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * PAR-09 — the system's default level curve. Exact mirror of
 * `CurvaNiveles.THRESHOLDS_PAR_09` of the backend (`domain/service/CurvaNiveles.java`).
 *
 * ⚠️ It is duplicated here because the student's level **is not yet exposed** by the API
 * (debt #10 of `path/deuda-tecnica/tarea-deuda-06-contrato-api.md`): in the meantime the
 * HUD derives it from the XP just like the backend. When the endpoint exists, this calculation is
 * deleted and the level arrives already resolved — and with it the course's *custom* curve, which this
 * constant does not cover (RF-NIV-04 lets the teacher define their own).
 */
export const THRESHOLDS_PAR_09 = [0, 250, 600, 1100, 1800, 2800, 4200, 6000, 8500, 12000] as const;

export interface StudentLevel {
  level: number;
  /** XP accumulated within the current level. */
  inLevel: number;
  /** XP needed to go up a level; 0 if already at the cap. */
  meta: number;
  limit: boolean;
}

/**
 * Level derived from the XP. No ceiling above (RF-NIV-05: the ranking order is always
 * by real XP, so past the last threshold XP keeps being added at level 10).
 */
export function levelOf(xp: number): StudentLevel {
  const x = Math.max(0, xp);
  let i = 0;
  while (i + 1 < THRESHOLDS_PAR_09.length && x >= THRESHOLDS_PAR_09[i + 1]) i++;

  const limit = i === THRESHOLDS_PAR_09.length - 1;
  return {
    level: i + 1,
    inLevel: x - THRESHOLDS_PAR_09[i],
    meta: limit ? 0 : THRESHOLDS_PAR_09[i + 1] - THRESHOLDS_PAR_09[i],
    limit,
  };
}

/** XP bar + level (05-design-system.md §4, `ui-xp-bar`). */
@Component({
  selector: 'app-xp-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex items-baseline gap-2">
      <span class="ui-font text-[9px] text-primary">NIVEL</span>
      <span class="ui-font tabular text-[13px] text-base-content">{{ n().level }}</span>
      <span class="ui-font tabular ml-auto text-[8px] opacity-60">
        @if (n().limit) {
          MÁXIMO
        } @else {
          {{ n().inLevel }}/{{ n().meta }} XP
        }
      </span>
    </div>

    <div
      class="mt-1.5 h-3 w-full border-2 border-secondary bg-base-100 p-[2px]"
      role="progressbar"
      [attr.aria-valuenow]="n().limit ? 1 : n().inLevel"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="n().limit ? 1 : n().meta"
      [attr.aria-label]="'Experiencia del nivel ' + n().level"
    >
      <div
        class="h-full bg-primary transition-[width] duration-500"
        [style.width.%]="percentage()"
        style="box-shadow: 0 0 8px #FF2758"
      ></div>
    </div>
  `,
})
export class XpBarComponent {
  readonly xp = input.required<number>();

  protected readonly n = computed(() => levelOf(this.xp()));
  protected readonly percentage = computed(() => {
    const n = this.n();
    return n.limit ? 100 : (n.inLevel / n.meta) * 100;
  });
}
