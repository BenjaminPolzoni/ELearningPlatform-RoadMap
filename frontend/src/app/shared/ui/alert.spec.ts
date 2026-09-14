import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiAlert, UiAlertTone } from './alert';

@Component({
  standalone: true,
  imports: [UiAlert],
  template: `
    <ui-alert [(visible)]="visible" [tone]="tone">
      <p>No se pudieron guardar los cambios.</p>
    </ui-alert>
  `,
})
class Host {
  visible = true;
  tone: UiAlertTone = 'error';
}

describe('UiAlert', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('muestra el contenido con rol de alerta', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('No se pudieron guardar los cambios.');
  });

  it('aplica el tono del tema', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.tone = 'success';
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert') as HTMLElement;
    expect(alert.className).toContain('alert-success');
  });

  it('el botón de cierre pone visible en false (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector(
      'button[aria-label="Cerrar"]',
    ) as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.visible).toBe(false);
    expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
  });

  it('closable=false no ofrece botón de cierre', () => {
    const fixture = TestBed.createComponent(UiAlert);
    fixture.componentRef.setInput('closable', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[aria-label="Cerrar"]')).toBeNull();
  });
});