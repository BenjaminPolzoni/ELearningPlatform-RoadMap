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

  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  const click = (text: string) => {
    const b = button(text);
    expect(b, `botón "${text}"`).toBeTruthy();
    b!.click();
    fixture.detectChanges();
  };
  const panel = () => el.querySelector('[role="tabpanel"]')?.textContent ?? '';

  it('starts on the CUERPO tab with skin tone', () => {
    expect(button('CUERPO')!.getAttribute('aria-selected')).toBe('true');
    expect(panel()).toContain('TONO DE PIEL');
    expect(panel()).not.toContain('GÉNERO');
  });

  it('switching tabs shows only its sections', () => {
    click('ROPA');
    expect(button('ROPA')!.getAttribute('aria-selected')).toBe('true');
    expect(button('CUERPO')!.getAttribute('aria-selected')).toBe('false');
    expect(panel()).toContain('PRENDA');

    click('EQUIPO');
    expect(panel()).toContain('OBJETO EN MANO');
  });

  it('keeps the gender undefined by default', () => {
    expect(srv.avatar().gender).toBe('indefinido');
  });

  it('warns when the shirt or the laptop cover the emblem', () => {
    click('ROPA');
    expect(panel()).not.toContain('TAPA EL EMBLEMA');
    click('Camisa y corbata');
    expect(panel()).toContain('LA CORBATA DE LA CAMISA TAPA EL EMBLEMA');
    click('Hoodie');
    srv.set('object', 'laptop');
    fixture.detectChanges();
    expect(panel()).toContain('LA LAPTOP TAPA EL EMBLEMA');
  });

  it('warns when the visor covers the glasses', () => {
    click('ACCESORIOS');
    click('Con código');
    expect(panel()).not.toContain('EL VISOR TAPA LOS ANTEOJOS');
    click('Visor');
    expect(panel()).toContain('EL VISOR TAPA LOS ANTEOJOS');
  });

  it('RESET restarts keeping the gender undefined', () => {
    srv.set('object', 'mate');
    click('RESET');
    expect(srv.avatar().gender).toBe('indefinido');
    expect(srv.avatar().object).toBe('ninguno');
  });
});
