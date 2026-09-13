import { Injectable, signal } from '@angular/core';

export type Rol = 'PROFESOR' | 'ALUMNO' | 'ADMIN';

const LS_KEY = 'mock-rol';

/**
 * Login mock (03-plan-de-implementacion.md, Fase 0). No hay JWT ni backend de auth: el
 * usuario elige un rol y queda guardado en localStorage. En producción la identidad la
 * inyecta el Gateway vía headers `X-User-*` (06-contrato-api.md §0.3).
 */
@Injectable({ providedIn: 'root' })
export class AuthMockService {
  private readonly _rol = signal<Rol | null>(null);
  readonly rol = this._rol.asReadonly();

  entrarComo(rol: Rol): void {
    try {
      localStorage.setItem(LS_KEY, rol);
    } catch {
      /* ignorar */
    }
    this._rol.set(rol);
  }

  salir(): void {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignorar */
    }
    this._rol.set(null);
  }

  private leer(): Rol | null {
    try {
      return (localStorage.getItem(LS_KEY) as Rol) || null;
    } catch {
      return null;
    }
  }
}
