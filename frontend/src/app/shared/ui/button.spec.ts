import { TestBed } from '@angular/core/testing';
import { UiButton } from './button';

describe('UiButton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiButton],
    }).compileComponents();
  });

  it('crea el botón con el `btn` base', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.className).toContain('btn');
  });

  it('aplica la variante y el tamaño', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.className).toContain('btn-secondary');
    expect(btn.className).toContain('btn-lg');
  });

  it('por defecto es type=button y no está deshabilitado', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.type).toBe('button');
    expect(btn.disabled).toBe(false);
  });

  it('disabled deshabilita el botón nativo', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('mientras está loading bloquea el click, muestra spinner y avisa al lector', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('.loading')).toBeTruthy();
  });

  it('block ocupa todo el ancho', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.componentRef.setInput('block', true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.className).toContain('btn-block');
  });

  it('redirige el submit si se pide type=submit', () => {
    const fixture = TestBed.createComponent(UiButton);
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(btn.type).toBe('submit');
  });
});