import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { InsigniasDataPort } from './insignias-data.port';
import {
  CRITERIO_LABEL,
  CRITERIO_NODO_ESPECIFICO,
  CRITERIOS_CON_VALOR,
  InsigniaCatalogo,
  InsigniaOtorgada,
  NuevaInsignia,
} from './insignias.models';
import { catalogoInsigniasSeed, insigniasGanadasSeed } from '../../mocks/insignias.seed';
import { GENERIC_ICONS } from '../../features/insignias/generic-icons';

const LS_KEY = 'insignias-mock-v1';

/**
 * Implementación de {@link InsigniasDataPort} para Fases 0-2. Arranca del seed (14 del
 * sistema), muta en memoria y persiste en localStorage cuando el profesor crea una nueva —
 * mismo patrón que `InMemoryRoadmapAdapter`. Fase 3: se reemplaza por `HttpInsigniasAdapter`
 * (una línea en `app.config.ts`).
 */
@Injectable()
export class InMemoryInsigniasAdapter extends InsigniasDataPort {
  private catalogo: InsigniaCatalogo[] = this.cargar();

  getCatalogo(_cursoCohorteId: string): Observable<InsigniaCatalogo[]> {
    return of(structuredClone(this.catalogo)).pipe(delay(300)); // simula la latencia de red del BFF
  }

  getGanadasPorAlumno(alumnoId: string): Observable<InsigniaOtorgada[]> {
    return of(insigniasGanadasSeed(alumnoId)).pipe(delay(300));
  }

  crear(_cursoCohorteId: string, dto: NuevaInsignia): Observable<InsigniaCatalogo> {
    const insignia: InsigniaCatalogo = {
      insigniaId: `ins-profesor-${Date.now().toString(36)}`,
      codigo: dto.icono,
      nombre: dto.nombre,
      descripcion: this.describir(dto),
      tipo: dto.tipo,
      origen: 'PROFESOR',
      iconoPendiente: GENERIC_ICONS[dto.icono]?.needsRework ?? false,
      criterio: dto.criterio,
      valorCriterio: dto.valorCriterio,
      nodoId: dto.nodoId,
    };
    this.catalogo = [...this.catalogo, insignia];
    this.guardar();
    return of(structuredClone(insignia)).pipe(delay(300));
  }

  /** El profesor no escribe descripción a mano (no es un campo del form) — se arma sola. */
  private describir(dto: NuevaInsignia): string {
    if (dto.tipo === 'POR_NODO') return 'Insignia por nodo — se otorga al completar el nodo elegido.';
    if (!dto.criterio) return '';
    if (dto.criterio === CRITERIO_NODO_ESPECIFICO) {
      return CRITERIO_LABEL[dto.criterio];
    }
    if (CRITERIOS_CON_VALOR.has(dto.criterio) && dto.valorCriterio != null) {
      return `${CRITERIO_LABEL[dto.criterio]}: ${dto.valorCriterio}`;
    }
    return CRITERIO_LABEL[dto.criterio];
  }

  private cargar(): InsigniaCatalogo[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as InsigniaCatalogo[];
    } catch {
      /* localStorage no disponible o corrupto — se cae al seed */
    }
    const seed = catalogoInsigniasSeed();
    this.persistir(seed);
    return seed;
  }

  private guardar(): void {
    this.persistir(this.catalogo);
  }

  private persistir(catalogo: InsigniaCatalogo[]): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(catalogo));
    } catch {
      /* modo incógnito / storage lleno — el mock sigue en memoria */
    }
  }
}
