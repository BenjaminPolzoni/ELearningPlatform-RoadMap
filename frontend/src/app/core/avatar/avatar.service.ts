import { effect, Injectable, signal } from '@angular/core';
import {
  ACCESORIOS,
  AvatarConfig,
  AVATAR_POR_DEFECTO,
  COLORES,
  PELOS,
  PIELES,
  sanearAvatar,
} from './avatar.models';

const LS_KEY = 'mock-avatar';

/**
 * Persistencia del avatar personalizado. Igual que `AuthMockService` y `ThemeService`,
 * hoy vive en localStorage; en Fase 3 el avatar es parte del perfil que devuelve el BFF
 * y este servicio pasa a ser un cache local de eso — la API pública no cambia.
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly _avatar = signal<AvatarConfig>(this.leer());
  readonly avatar = this._avatar.asReadonly();

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this._avatar()));
      } catch {
        /* ignorar: sin storage el avatar simplemente no sobrevive al refresh */
      }
    });
  }

  /** Cambia una sola parte; el resto queda como estaba. */
  set<K extends keyof AvatarConfig>(parte: K, valor: AvatarConfig[K]): void {
    this._avatar.update((a) => ({ ...a, [parte]: valor }));
  }

  reiniciar(): void {
    this._avatar.set({ ...AVATAR_POR_DEFECTO });
  }

  /** Combinación aleatoria válida — atajo "sorprendeme" del editor. */
  aleatorio(): void {
    const elegir = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
    this._avatar.set({
      piel: elegir(PIELES).id,
      pelo: elegir(PELOS).id,
      colorPelo: elegir(COLORES).id,
      colorTraje: elegir(COLORES).id,
      accesorio: elegir(ACCESORIOS).id,
      colorAccesorio: elegir(COLORES).id,
    });
  }

  private leer(): AvatarConfig {
    try {
      const crudo = localStorage.getItem(LS_KEY);
      return sanearAvatar(crudo ? JSON.parse(crudo) : null);
    } catch {
      return { ...AVATAR_POR_DEFECTO };
    }
  }
}
