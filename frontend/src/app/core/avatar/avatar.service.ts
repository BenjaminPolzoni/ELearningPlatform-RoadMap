import { effect, Injectable, signal } from '@angular/core';
import { assembleAvatar, AvatarConfig, defaultAvatar, sanitizeAvatar } from './avatar.models';

const LS_KEY = 'mock-avatar-v2';

/**
 * Persistence of the customized avatar. Like `AuthMockService` and `ThemeService`,
 * it lives in localStorage today; in Phase 3 the avatar is part of the profile returned by the BFF
 * and this service becomes a local cache of that — the public API does not change.
 */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly _avatar = signal<AvatarConfig>(this.read());
  readonly avatar = this._avatar.asReadonly();

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this._avatar()));
      } catch {
        /* ignore: without storage the avatar simply does not survive a refresh */
      }
    });
  }

  /** Changes a single part; the rest stays as it was (changing the gender touches nothing else). */
  set<K extends keyof AvatarConfig>(parte: K, value: AvatarConfig[K]): void {
    this._avatar.update((a) => ({ ...a, [parte]: value }));
  }

  /** Goes back to the suggested values keeping the current gender. */
  reset(): void {
    this._avatar.set(defaultAvatar(this._avatar().gender));
  }

  /** Valid random combination (keeping the gender undefined). */
  random(): void {
    this._avatar.set(
      assembleAvatar(<K extends keyof AvatarConfig>(field: K, options: readonly { id: AvatarConfig[K] }[]): AvatarConfig[K] => {
        if (field === 'gender') {
          return 'unspecified' as AvatarConfig[K];
        }
        return options[Math.floor(Math.random() * options.length)].id;
      }),
    );
  }

  private read(): AvatarConfig {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return sanitizeAvatar(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultAvatar('unspecified');
    }
  }
}
