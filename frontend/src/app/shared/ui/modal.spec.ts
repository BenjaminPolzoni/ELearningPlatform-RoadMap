import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiModal } from './modal';

@Component({
  standalone: true,
  imports: [UiModal],
  template: `
    <ui-modal [(open)]="abierto" [title]="'Confirmar'">
      <p>¿Borrar el desafío?</p>
    </ui-modal>
  `,
})
class Host {
  abierto = false;
}

describe('UiModal', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  });

  it('cerrado por default: sin open ni backdrop', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(fixture.nativeElement.querySelector('.modal-backdrop')).toBeTruthy();
  });

  it('se abre con [(open)] y muestra título y contenido', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.abierto = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('h3')!.textContent).toBe('Confirmar');
    expect(dialog.textContent).toContain('¿Borrar el desafío?');
  });

  it('el botón de cierre desconecta el modal del model (doble bind)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.abierto = true;
    fixture.detectChanges();
    const cierre = fixture.nativeElement.querySelector(
      'button[aria-label="Cerrar"]',
    ) as HTMLButtonElement;
    cierre.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.abierto).toBe(false);
  });

  it('ESC (cancel) cierra el model si es cerrarlo permitido', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.abierto = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.abierto).toBe(false);
  });

  it('closable=false no ofrece controles de cierre y el ESC no lo cierra', () => {
    const fixture = TestBed.createComponent(UiModal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('closable', false);
    fixture.detectChanges();
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('button[aria-label="Cerrar"]')).toBeNull();
    expect(native.querySelector('.modal-backdrop')).toBeNull();
  });
});