import { effect, Injectable, signal } from '@angular/core';
import { armarAvatar, AvatarConfig, avatarPorDefecto, sanearAvatar } from './avatar.models';

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

  /** Cambia una sola parte; el resto queda como estaba (cambiar el género no toca nada más). */
  set<K extends keyof AvatarConfig>(parte: K, valor: AvatarConfig[K]): void {
    this._avatar.update((a) => ({ ...a, [parte]: valor }));
  }

  /** Vuelve a los valores sugeridos conservando el género actual. */
  reiniciar(): void {
    this._avatar.set(avatarPorDefecto(this._avatar().genero));
  }

  /** Combinación aleatoria válida (manteniendo género sin definir). */
  aleatorio(): void {
    this._avatar.set(
      armarAvatar(<K extends keyof AvatarConfig>(campo: K, opciones: readonly { id: AvatarConfig[K] }[]): AvatarConfig[K] => {
        if (campo === 'genero') {
          return 'indefinido' as AvatarConfig[K];
        }
        return opciones[Math.floor(Math.random() * opciones.length)].id;
      }),
    );
  }

  private leer(): AvatarConfig {
    try {
      const crudo = localStorage.getItem(LS_KEY);
      return sanearAvatar(crudo ? JSON.parse(crudo) : null);
    } catch {
      return avatarPorDefecto('indefinido');
    }
  }
}
