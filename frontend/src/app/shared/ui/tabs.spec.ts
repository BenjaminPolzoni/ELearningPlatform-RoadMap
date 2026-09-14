import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiTabs } from './tabs';

@Component({
  standalone: true,
  imports: [UiTabs],
  template: `
    <ui-tabs [(value)]="activa" [tabs]="pestanas" [boxed]="true" />
  `,
})
class Host {
  pestanas = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];
  activa: string | undefined = 'a';
}

describe('UiTabs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('lista una pestaña por entrada con su rótulo y contexto tablist', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent!.trim()).toBe('Alpha');
    expect(tabs[1].textContent!.trim()).toBe('Beta');
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeTruthy();
  });

  it('marca como activa la pestaña del model (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    expect(tabs[0].classList.contains('tab-active')).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].classList.contains('tab-active')).toBe(false);
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('el click propaga la pestaña elegida al model (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activa).toBe('b');
  });

  it('sin valor inicial ninguna pestaña queda activa', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.activa = undefined;
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    expect(tabs[0].classList.contains('tab-active')).toBe(false);
    expect(tabs[1].classList.contains('tab-active')).toBe(false);
  });
});