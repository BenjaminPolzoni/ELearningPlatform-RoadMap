import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiInput } from './input';

@Component({
  standalone: true,
  imports: [UiInput],
  template: `<ui-input [(value)]="v" [ariaLabel]="'Campo de prueba'" />`,
})
class Host {
  v = 'hola';
}

describe('UiInput', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('pinta el input del design system con el valor inicial', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.className).toContain('input-bordered');
    expect(input.value).toBe('hola');
    expect(input.getAttribute('aria-label')).toBe('Campo de prueba');
  });

  it('las escrituras del usuario actualizan el modelo (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'chau';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Host).v).toBe('chau');
  });

  it('un valor externo vuelve a pintarse en el input', () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance as Host;
    host.v = 'externo';
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('externo');
  });

  it('replica disabled y required', () => {
    const fixture = TestBed.createComponent(UiInput);
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('required', true);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
  });
});