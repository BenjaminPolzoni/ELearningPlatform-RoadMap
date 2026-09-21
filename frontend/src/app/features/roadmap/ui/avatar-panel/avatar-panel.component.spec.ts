import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AvatarPanelComponent } from './avatar-panel.component';
import { MODULAR_CONFIG_KEY } from '../../engine/avatar-config';

describe('AvatarPanel (guitar picker)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function create() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [AvatarPanelComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  function selectWithOption(html: HTMLElement, valueOption: string): HTMLSelectElement {
    const selects = [...html.querySelectorAll('select')];
    const found = selects.find((s) => s.querySelector(`option[value="${valueOption}"]`));
    if (!found) throw new Error(`sin select con opción ${valueOption}`);
    return found;
  }

  function choose(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  it('choosing Guitar shows the GUITAR COLOR selector', async () => {
    const fixture = await create();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).not.toContain('COLOR GUITARRA');
    choose(selectWithOption(html, 'guitar'), 'guitar');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(html.textContent).toContain('COLOR GUITARRA');
  });

  it('choosing Blue persists guitarColor B', async () => {
    const fixture = await create();
    const html = fixture.nativeElement as HTMLElement;
    choose(selectWithOption(html, 'guitar'), 'guitar');
    fixture.detectChanges();
    await fixture.whenStable();
    const blue = html.querySelector('button[aria-label="Guitarra azul"]') as HTMLButtonElement;
    expect(blue).toBeTruthy();
    blue.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!).guitarColor).toBe('B');
  });

  it('regression: the chosen guitar stays selected when the panel is reopened', async () => {
    const first = await create();
    const html1 = first.nativeElement as HTMLElement;
    choose(selectWithOption(html1, 'guitar'), 'guitar');
    first.detectChanges();
    await first.whenStable();
    first.destroy();

    const second = await create();
    const html2 = second.nativeElement as HTMLElement;
    const back = selectWithOption(html2, 'guitar');
    expect(back.value).toBe('guitar');
    expect(html2.textContent).toContain('COLOR GUITARRA');
  });
});
