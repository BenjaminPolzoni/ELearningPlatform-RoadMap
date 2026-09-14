import { TestBed } from '@angular/core/testing';
import { UiProgress } from './progress';

describe('UiProgress', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiProgress],
    }).compileComponents();
  });

  it('crea el `progress` base con ancho completo', () => {
    const fixture = TestBed.createComponent(UiProgress);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('progress') as HTMLProgressElement;
    expect(bar.className).toContain('progress');
    expect(bar.className).toContain('w-full');
  });

  it('aplica el tono del tema y refleja value y max', () => {
    const fixture = TestBed.createComponent(UiProgress);
    fixture.componentRef.setInput('value', 50);
    fixture.componentRef.setInput('max', 100);
    fixture.componentRef.setInput('tone', 'success');
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('progress') as HTMLProgressElement;
    expect(bar.className).toContain('progress-success');
    expect(bar.getAttribute('value')).toBe('50');
    expect(bar.getAttribute('max')).toBe('100');
  });

  it('sin value queda indeterminado (sin atributo value)', () => {
    const fixture = TestBed.createComponent(UiProgress);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('progress') as HTMLProgressElement;
    expect(bar.hasAttribute('value')).toBe(false);
  });

  it('muestra el label y lo usa como aria-label', () => {
    const fixture = TestBed.createComponent(UiProgress);
    fixture.componentRef.setInput('label', 'Avance del curso');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Avance del curso');
    const bar = fixture.nativeElement.querySelector('progress') as HTMLProgressElement;
    expect(bar.getAttribute('aria-label')).toBe('Avance del curso');
  });
});