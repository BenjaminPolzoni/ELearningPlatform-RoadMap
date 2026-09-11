import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AvatarService } from '../../core/avatar/avatar.service';
import { AvatarEditor } from './avatar-editor';

describe('AvatarEditor', () => {
  let fixture: ComponentFixture<AvatarEditor>;
  let el: HTMLElement;
  let srv: AvatarService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AvatarEditor],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AvatarEditor);
    srv = TestBed.inject(AvatarService);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  const boton = (texto: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
  const click = (texto: string) => {
    const b = boton(texto);
    expect(b, `botón "${texto}"`).toBeTruthy();
    b!.click();
    fixture.detectChanges();
  };
  const panel = () => el.querySelector('[role="tabpanel"]')?.textContent ?? '';

  it('arranca en la pestaña CUERPO', () => {
    expect(boton('CUERPO')!.getAttribute('aria-selected')).toBe('true');
    expect(panel()).toContain('GÉNERO');
  });

  it('cambiar de pestaña muestra solo sus secciones', () => {
    click('ROPA');
    expect(boton('ROPA')!.getAttribute('aria-selected')).toBe('true');
    expect(boton('CUERPO')!.getAttribute('aria-selected')).toBe('false');
    expect(panel()).toContain('PRENDA');
    expect(panel()).not.toContain('GÉNERO');

    click('EQUIPO');
    expect(panel()).toContain('OBJETO EN MANO');
  });

  it('elegir un género cambia la silueta y no toca el resto', () => {
    srv.set('pelo', 'afro');
    fixture.detectChanges();
    click('Varón');
    expect(srv.avatar().genero).toBe('varon');
    expect(srv.avatar().pelo).toBe('afro');
    expect(boton('Varón')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('avisa cuando la camisa o la laptop tapan el emblema', () => {
    click('ROPA');
    expect(panel()).not.toContain('TAPA EL EMBLEMA');
    click('Camisa y corbata');
    expect(panel()).toContain('LA CORBATA DE LA CAMISA TAPA EL EMBLEMA');
    click('Hoodie');
    srv.set('objeto', 'laptop');
    fixture.detectChanges();
    expect(panel()).toContain('LA LAPTOP TAPA EL EMBLEMA');
  });

  it('avisa cuando el visor tapa los anteojos', () => {
    click('ACCESORIOS');
    click('Con código');
    expect(panel()).not.toContain('EL VISOR TAPA LOS ANTEOJOS');
    click('Visor');
    expect(panel()).toContain('EL VISOR TAPA LOS ANTEOJOS');
  });

  it('RESET conserva el género elegido', () => {
    click('Mujer');
    srv.set('objeto', 'mate');
    click('RESET');
    expect(srv.avatar().genero).toBe('mujer');
    expect(srv.avatar().pelo).toBe('largo');
    expect(srv.avatar().objeto).toBe('ninguno');
  });
});
