import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  template: `<span class="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary"><ng-content /></span>`,
})
export class UiBadge {}

@Component({
  selector: 'ui-btn',
  standalone: true,
  template: `<button [attr.class]="'rounded-lg px-3 py-1.5 text-sm font-medium transition active:scale-95 disabled:opacity-50 ' + cls()"><ng-content /></button>`,
})
export class UiBtn {
  cls = input('bg-base-200 hover:bg-base-300 border border-base-300');
}

@Component({
  selector: 'ui-card',
  standalone: true,
  template: `<div class="rounded-xl border border-base-300 bg-base-200/80 p-4 shadow-sm"><ng-content /></div>`,
})
export class UiCard {}
