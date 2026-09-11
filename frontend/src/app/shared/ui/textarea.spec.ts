import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiTextarea } from './textarea';

@Component({
  standalone: true,
  imports: [UiTextarea],
  template: `<ui-textarea [(value)]="v" [ariaLabel]="'Descripción'" [rows]="5" />`,
})
class Host {
  v = 'primera línea';
}

describe('UiTextarea', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('pinta el textarea del design system con el valor inicial', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.className).toContain('textarea-bordered');
    expect(area.value).toBe('primera línea');
    expect(area.getAttribute('aria-label')).toBe('Descripción');
    expect(area.rows).toBe(5);
  });

  it('las escrituras del usuario actualizan el modelo (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'segunda línea';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Host).v).toBe('segunda línea');
  });

  it('un valor externo vuelve a pintarse en el textarea', () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance as Host;
    host.v = 'externa';
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.value).toBe('externa');
  });

  it('replica disabled', () => {
    const fixture = TestBed.createComponent(UiTextarea);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.disabled).toBe(true);
  });
});