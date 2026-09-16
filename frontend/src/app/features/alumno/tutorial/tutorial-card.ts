import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-tutorial-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="guide" aria-label="Tutorial del mundo 3D">
      <div class="eyebrow"><span class="compass" aria-hidden="true">✦</span> PRIMEROS PASOS <span class="count">{{ step() }} / 3</span></div>
      <div class="progress" aria-hidden="true">
        @for (n of [1, 2, 3]; track n) {
          <span [class.done]="n < step()" [class.current]="n === step()">{{ n < step() ? '✓' : '' }}</span>
        }
      </div>
      <div aria-live="polite" aria-atomic="true">
        <h2>{{ title() }}</h2>
        <p>{{ description() }}</p>
      </div>
      @if (step() === 1) {
        <div class="keys" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>+ Shift para correr</span></div>
      } @else {
        <div class="destination"><span aria-hidden="true">⌖</span> {{ targetName() }}</div>
      }
      <footer><span>Explorá a tu ritmo</span><button type="button" (click)="skip.emit()">Saltar tutorial ↗</button></footer>
    </section>
  `,
  styles: `
    :host { display:block; width:min(300px, calc(100vw - 40px)); color:#edf4f7; }
    .guide { background:rgba(18,22,32,.97); border:1px solid #52787d; border-top:2px solid #7ffaff;
      border-radius:3px 16px 3px 3px; padding:18px; box-shadow:0 8px 28px #0005; animation:arrive .2s ease-out; }
    .eyebrow { display:flex; align-items:center; gap:8px; font-family:var(--font-pixel,monospace); font-size:10px; letter-spacing:1.1px; color:#b4dadd; }
    .compass { color:#7ffaff; font-size:19px; } .count { margin-left:auto; color:#8ba4aa; letter-spacing:0; }
    .progress { display:flex; gap:5px; margin:12px 0 15px; }
    .progress span { flex:1; height:9px; border-radius:2px; background:#303c46; font-size:9px; line-height:9px; text-align:center; color:#152b30; transition:background .2s; }
    .progress .current { background:#709fa5; } .progress .done { background:#7ffaff; }
    h2 { font-size:19px; line-height:1.25; font-weight:700; margin:0 0 8px; }
    p { font-size:14px; line-height:1.6; margin:0; color:#c4cdd7; }
    .keys { display:flex; align-items:center; gap:5px; margin-top:14px; }
    kbd { display:grid; place-items:center; width:23px; height:25px; font-size:12px; border:1px solid #61767e; border-bottom:3px solid #61767e; border-radius:4px; background:#25303c; }
    .keys span { font-size:10px; color:#a8b8c8; margin-left:4px; }
    .destination { margin-top:13px; color:#9ce4e5; font-size:12px; line-height:1.4; overflow-wrap:anywhere; }
    .destination span { margin-right:6px; }
    footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:16px; padding-top:9px; border-top:1px solid #ffffff15; }
    footer span { color:#94a6b6; font-size:10px; }
    button { background:transparent; border:0; color:#cfebef; font-size:11px; cursor:pointer; min-height:32px; padding:4px 0 4px 6px; }
    button:hover { color:#7ffaff; text-decoration:underline; } button:focus-visible { outline:2px solid #7ffaff; outline-offset:4px; }
    @keyframes arrive { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @media (max-width:1300px) { :host { width:280px; } .guide { padding:14px; } }
    @media (prefers-reduced-motion:reduce) { .guide { animation:none; } .progress span { transition:none; } }
  `,
})
export class TutorialCard {
  readonly step = input.required<1 | 2 | 3>();
  readonly targetName = input.required<string>();
  readonly returnToCity = input(false);
  readonly skip = output<void>();
  readonly title = computed(() => this.step() === 1 ? 'Probá moverte' :
    this.returnToCity() ? 'Volvé al recorrido' : this.step() === 2 ? 'Entrá a una unidad' : 'Abrí un desafío');
  readonly description = computed(() => this.step() === 1
    ? 'Hacé clic en el mundo y movete con W, A, S y D.'
    : this.returnToCity() ? 'Esta isla no tiene desafíos disponibles. Acercate al regreso y volvé a la ciudad.'
    : this.step() === 2 ? 'Seguí la marca celeste. Cerca de la casa, tocá «Acceder al Módulo».'
    : 'Acercate al punto señalado y tocá «Resolver Desafío».');
}
