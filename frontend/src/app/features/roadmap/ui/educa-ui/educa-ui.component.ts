import { Component } from '@angular/core';

@Component({
  selector: 'app-educa-badge',
  standalone: true,
  template: `<span class="inline-flex items-center rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-xs font-medium text-primary"><ng-content /></span>`,
})
export class EducaBadgeComponent {}

@Component({
  selector: 'app-educa-card',
  standalone: true,
  template: `<div class="rounded-xl border border-base-300 bg-base-200/80 p-4 shadow-sm"><ng-content /></div>`,
})
export class EducaCardComponent {}
