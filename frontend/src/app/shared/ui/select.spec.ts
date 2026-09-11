import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiSelect } from './select';

@Component({
  standalone: true,
  imports: [UiSelect],
  template: `
    <ui-select [(value)]="v" [ariaLabel]="'Elegí una opción'">
      <option value="a">Opción A</option>
      <option value="b">Opción B</option>
    </ui-select>
  `,
})
class Host {
  v = 'b';
}

describe('UiSelect', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('pinta el select del design system con la opción inicial seleccionada', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const sel = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(sel.className).toContain('select-bordered');
    expect(sel.value).toBe('b');
  });

  it('el cambio del usuario actualiza el modelo (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const sel = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    sel.value = 'a';
    sel.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Host).v).toBe('a');
  });

  it('un valor externo selecciona la opción en el select', async () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance as Host;
    host.v = 'a';
    fixture.detectChanges();
    await fixture.whenStable();
    const sel = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(sel.value).toBe('a');
  });

  it('replica disabled', () => {
    const fixture = TestBed.createComponent(UiSelect);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const sel = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(sel.disabled).toBe(true);
  });
});