import { TestBed } from '@angular/core/testing';
import { AvatarPanel } from './avatar-panel';
import { MODULAR_CONFIG_KEY } from './engine/avatar-config';

describe('AvatarPanel (picker de guitarra)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function crear() {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [AvatarPanel] }).compileComponents();
    const fixture = TestBed.createComponent(AvatarPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  function selectConOpcion(html: HTMLElement, valorOpcion: string): HTMLSelectElement {
    const selects = [...html.querySelectorAll('select')];
    const found = selects.find((s) => s.querySelector(`option[value="${valorOpcion}"]`));
    if (!found) throw new Error(`sin select con opción ${valorOpcion}`);
    return found;
  }

  function elegir(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  it('al elegir Guitarra aparece el selector COLOR GUITARRA', async () => {
    const fixture = await crear();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).not.toContain('COLOR GUITARRA');
    elegir(selectConOpcion(html, 'guitar'), 'guitar');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(html.textContent).toContain('COLOR GUITARRA');
  });

  it('elegir Azul persiste guitarColor B', async () => {
    const fixture = await crear();
    const html = fixture.nativeElement as HTMLElement;
    elegir(selectConOpcion(html, 'guitar'), 'guitar');
    fixture.detectChanges();
    await fixture.whenStable();
    const azul = html.querySelector('button[aria-label="Guitarra azul"]') as HTMLButtonElement;
    expect(azul).toBeTruthy();
    azul.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(JSON.parse(localStorage.getItem(MODULAR_CONFIG_KEY)!).guitarColor).toBe('B');
  });

  it('regresión: la guitarra elegida sigue seleccionada al reabrir el panel', async () => {
    const primera = await crear();
    const html1 = primera.nativeElement as HTMLElement;
    elegir(selectConOpcion(html1, 'guitar'), 'guitar');
    primera.detectChanges();
    await primera.whenStable();
    primera.destroy();

    const segunda = await crear();
    const html2 = segunda.nativeElement as HTMLElement;
    const espalda = selectConOpcion(html2, 'guitar');
    expect(espalda.value).toBe('guitar');
    expect(html2.textContent).toContain('COLOR GUITARRA');
  });
});
