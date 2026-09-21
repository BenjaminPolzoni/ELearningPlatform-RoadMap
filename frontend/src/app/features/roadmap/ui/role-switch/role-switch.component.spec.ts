import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthMockService } from '../../data-access/session/auth-mock.service';
import { RoleSwitchComponent } from './role-switch.component';

describe('RoleSwitchComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
  });

  it('marks the current role and switches to the other one', async () => {
    const fixture = TestBed.createComponent(RoleSwitchComponent);
    fixture.detectChanges();
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

    buttons[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(AuthMockService).role()).toBe('TEACHER');
    expect(TestBed.inject(Router).url).toBe('/roadmap/teacher');
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });
});
