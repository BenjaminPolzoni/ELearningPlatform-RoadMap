import { Injectable, signal } from '@angular/core';

export type Role = 'TEACHER' | 'STUDENT';

const LS_KEY = 'mock-role';
const DEFAULT_ROLE: Role = 'STUDENT';

/**
 * Mock session (03-plan-de-implementacion.md, Phase 0). There is no JWT or auth backend: the
 * role is switched from the top bar and kept in localStorage. In production the identity is
 * injected by the Gateway through `X-User-*` headers (06-contrato-api.md §0.3).
 */
@Injectable({ providedIn: 'root' })
export class AuthMockService {
  private readonly _role = signal<Role>(this.read());
  readonly role = this._role.asReadonly();

  enterAs(role: Role): void {
    try {
      localStorage.setItem(LS_KEY, role);
    } catch {
      /* ignore */
    }
    this._role.set(role);
  }

  private read(): Role {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved === 'TEACHER' || saved === 'STUDENT' ? saved : DEFAULT_ROLE;
    } catch {
      return DEFAULT_ROLE;
    }
  }
}
