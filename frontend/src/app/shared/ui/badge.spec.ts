import { TestBed } from '@angular/core/testing';
import { UiBadge } from './badge';

describe('UiBadge', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiBadge],
    }).compileComponents();
  });

  it('renderiza el badge de daisyUI', () => {
    const fixture = TestBed.createComponent(UiBadge);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.className).toContain('badge');
    expect(span.className).toContain('badge-neutral');
  });

  it('aplica el tono pedido', () => {
    const fixture = TestBed.createComponent(UiBadge);
    fixture.componentRef.setInput('tone', 'accent');
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.className).toContain('badge-accent');
  });

  it('outline agrega badge-outline', () => {
    const fixture = TestBed.createComponent(UiBadge);
    fixture.componentRef.setInput('outline', true);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.className).toContain('badge-outline');
  });

  it('pill redondea la etiqueta', () => {
    const fixture = TestBed.createComponent(UiBadge);
    fixture.componentRef.setInput('pill', true);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.className).toContain('rounded-full');
  });
});