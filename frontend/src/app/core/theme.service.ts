import { effect, Injectable, signal } from '@angular/core';

export type Theme = 'arcade-dark' | 'arcade-light';
export type EnvironmentTheme = 'tabletop' | 'arcade';

const LS_KEY = 'mock-tema';
const ENV_STORAGE_KEY = 'educa_theme_env';
const EFFECTS_KEY = 'educa_effects_on';

/** Arcade theme toggle (05-design-system.md §2). Writes `data-theme` on `<html>`. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.read());
  readonly theme = this._theme.asReadonly();

  readonly environment = signal<EnvironmentTheme>('tabletop');
  readonly effects = signal<boolean>(true);

  constructor() {
    effect(() => {
      const t = this._theme();
      document.documentElement.dataset['theme'] = t;
      try {
        localStorage.setItem(LS_KEY, t);
      } catch {
        /* ignore */
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(ENV_STORAGE_KEY) as EnvironmentTheme | null;
        if (saved === 'arcade' || saved === 'tabletop') {
          this.environment.set(saved);
        }
        const fx = localStorage.getItem(EFFECTS_KEY);
        if (fx === '0') this.effects.set(false);
      } catch {
        /* ignore */
      }
    }
  }

  toggle(): void {
    this._theme.set(this._theme() === 'arcade-dark' ? 'arcade-light' : 'arcade-dark');
  }

  setEnvironment(theme: EnvironmentTheme): void {
    this.environment.set(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ENV_STORAGE_KEY, theme);
      } catch {}
    }
  }

  toggleEnvironment(): EnvironmentTheme {
    const next = this.environment() === 'tabletop' ? 'arcade' : 'tabletop';
    this.setEnvironment(next);
    return next;
  }

  setEffects(on: boolean): void {
    this.effects.set(on);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(EFFECTS_KEY, on ? '1' : '0');
      } catch {}
    }
  }

  toggleEffects(): boolean {
    const next = !this.effects();
    this.setEffects(next);
    return next;
  }

  private read(): Theme {
    try {
      return localStorage.getItem(LS_KEY) === 'arcade-light' ? 'arcade-light' : 'arcade-dark';
    } catch {
      return 'arcade-dark';
    }
  }
}
