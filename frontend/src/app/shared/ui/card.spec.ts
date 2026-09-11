import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiCard } from './card';

@Component({
  standalone: true,
  imports: [UiCard],
  template: `<ui-card [title]="titulo">Contenido de la tarjeta</ui-card>`,
})
class Host {
  titulo: string | undefined = 'Mi tarjeta';
}

describe('UiCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
  });

  it('renderiza el card de daisyUI con el contenido proyectado', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    expect(article.className).toContain('card');
    expect(article.textContent).toContain('Contenido de la tarjeta');
  });

  it('muestra el título como encabezado h3', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const h3 = fixture.nativeElement.querySelector('h3') as HTMLElement;
    expect(h3.textContent).toBe('Mi tarjeta');
  });

  it('el título es opcional: sin él no hay h3', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.titulo = undefined;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h3')).toBeNull();
  });

  it('bordered=false quita el borde', () => {
    const fixture = TestBed.createComponent(UiCard);
    fixture.componentRef.setInput('bordered', false);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    expect(article.className).not.toContain('border-base-300');
  });
});