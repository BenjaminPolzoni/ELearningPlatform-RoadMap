import { effect, Injectable, signal } from '@angular/core';

export type Tema = 'arcade-dark' | 'arcade-light';

const LS_KEY = 'mock-tema';

/** Toggle de tema arcade (05-design-system.md §2). Escribe `data-theme` en `<html>`. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _tema = signal<Tema>(this.leer());
  readonly tema = this._tema.asReadonly();

  constructor() {
    effect(() => {
      const t = this._tema();
      document.documentElement.dataset['theme'] = t;
      try {
        localStorage.setItem(LS_KEY, t);
      } catch {
        /* ignorar */
      }
    });
  }

  toggle(): void {
    this._tema.set(this._tema() === 'arcade-dark' ? 'arcade-light' : 'arcade-dark');
  }

  private leer(): Tema {
    try {
      return localStorage.getItem(LS_KEY) === 'arcade-light' ? 'arcade-light' : 'arcade-dark';
    } catch {
      return 'arcade-dark';
    }
  }
}
