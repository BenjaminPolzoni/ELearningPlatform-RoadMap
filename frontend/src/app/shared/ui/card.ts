import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Tarjeta genérica sobre el `card` de daisyUI (05-design-system.md §4, `ui-card`).
 * Sin textos de negocio: el título es opcional y el resto va por <ng-content>.
 */
@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  template: `
    <article class="card h-full bg-base-100" [class]="clases()">
      @if (title()) {
        <div class="card-body pb-0">
          <h3 class="card-title">{{ title() }}</h3>
        </div>
      }
      <div class="card-body pt-4">
        <ng-content></ng-content>
      </div>
    </article>
  `,
})
export class UiCard {
  /** Encabezado opcional; si se omite, el contenido arranca arriba. */
  readonly title = input<string | undefined>(undefined);
  readonly bordered = input(true);

  protected readonly clases = computed(() =>
    this.bordered() ? 'border border-base-300' : '',
  );
}