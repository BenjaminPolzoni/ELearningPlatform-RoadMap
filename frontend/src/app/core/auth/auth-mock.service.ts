import { Injectable, signal } from '@angular/core';

export type Role = 'TEACHER' | 'STUDENT' | 'ADMIN';

const LS_KEY = 'mock-role';

/**
 * Mock login (03-plan-de-implementacion.md, Phase 0). There is no JWT or auth backend: the
 * user picks a role and it is saved in localStorage. In production the identity is
 * injected by the Gateway through `X-User-*` headers (06-contrato-api.md §0.3).
 */
@Injectable({ providedIn: 'root' })
export class AuthMockService {
  private readonly _role = signal<Role | null>(this.read());
  readonly role = this._role.asReadonly();

  enterAs(role: Role): void {
    try {
      localStorage.setItem(LS_KEY, role);
    } catch {
      /* ignore */
    }
    this._role.set(role);
  }

  exit(): void {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    this._role.set(null);
  }

  private read(): Role | null {
    try {
      return (localStorage.getItem(LS_KEY) as Role) || null;
    } catch {
      return null;
    }
  }
}
