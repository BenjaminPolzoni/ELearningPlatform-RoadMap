import { Observable } from 'rxjs';

/**
 * Puerta de datos del Banco (Tema 08) — monedas, vidas y XP que el alumno posee.
 * En producción esto lo resuelve el BFF; en Fases 0-2 el mock en memoria con
 * caché y degradación a indisponible si el "servicio" falla.
 *
 * Flujo: el frontend llama a estos métodos; el adapter decide si la fuente
 * está disponible (cache válida / servicio arriba) o degrada gracefully.
 */
export abstract class BancoDataPort {
  /** Saldo actual de monedas del alumno en un curso-cohorte. */
  abstract getMonedas(alumnoId: string, cursoCohorteId: string): Observable<number>;

  /** XP total consolidado del alumno (la fuente de verdad es el Banco, no el front). */
  abstract getXP(alumnoId: string, cursoCohorteId: string): Observable<number>;

  /** Vidas vigentes del alumno (máx PAR-12 = 3). */
  abstract getVidas(alumnoId: string, cursoCohorteId: string): Observable<number>;

  /** Compra de vida: descuenta monedas (PAR-06: 300) y devuelve 1 vida. */
  abstract comprarVida(
    alumnoId: string,
    cursoCohorteId: string,
    costoMonedas: number,
  ): Observable<{ exito: boolean; nuevoSaldo: number; nuevasVidas: number; razon?: string }>;
}
