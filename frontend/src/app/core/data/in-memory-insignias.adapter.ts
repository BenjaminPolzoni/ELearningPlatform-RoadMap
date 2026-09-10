import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { InsigniasDataPort } from './insignias-data.port';
import { InsigniaCatalogo, InsigniaOtorgada } from './insignias.models';
import { catalogoInsigniasSeed, insigniasGanadasSeed } from '../../mocks/insignias.seed';

/**
 * Implementación de {@link InsigniasDataPort} para Fases 0-2. El catálogo es estático (no
 * hay CRUD del profesor todavía), así que solo sirve el seed — sin persistencia ni mutación.
 * Fase 3: se reemplaza por `HttpInsigniasAdapter` (una línea en `app.config.ts`).
 */
@Injectable()
export class InMemoryInsigniasAdapter extends InsigniasDataPort {
  getCatalogo(): Observable<InsigniaCatalogo[]> {
    return of(catalogoInsigniasSeed()).pipe(delay(300)); // simula la latencia de red del BFF
  }

  getGanadasPorAlumno(alumnoId: string): Observable<InsigniaOtorgada[]> {
    return of(insigniasGanadasSeed(alumnoId)).pipe(delay(300));
  }
}
