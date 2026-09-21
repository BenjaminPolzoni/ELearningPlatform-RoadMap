import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { BadgesDataPort } from './badges-data.port';
import {
  CRITERION_LABEL,
  CRITERION_SPECIFIC_NODE,
  CRITERIA_WITH_VALUE,
  BadgeCatalog,
  GrantedBadge,
  NewBadge,
} from './badges.models';
import { catalogBadgesSeed, earnedBadgesSeed } from '../../mocks/badges.seed';
import { GENERIC_ICONS } from '../../features/badges/generic-icons';

const LS_KEY = 'insignias-mock-v2';

/**
 * Implementation of {@link BadgesDataPort} for Phases 0-2. Starts from the seed (14 from the
 * system), mutates in memory and persists in localStorage when the teacher creates a new one —
 * same pattern as `InMemoryRoadmapAdapter`. Phase 3: replaced by `HttpBadgesAdapter`
 * (one line in `app.config.ts`).
 */
@Injectable()
export class InMemoryBadgesAdapter extends BadgesDataPort {
  private catalog: BadgeCatalog[] = this.load();

  getCatalog(_courseCohortId: string): Observable<BadgeCatalog[]> {
    return of(structuredClone(this.catalog)).pipe(delay(300)); // simulates the BFF's network latency
  }

  getEarnedByStudent(studentId: string): Observable<GrantedBadge[]> {
    return of(earnedBadgesSeed(studentId)).pipe(delay(300));
  }

  create(_courseCohortId: string, dto: NewBadge): Observable<BadgeCatalog> {
    const badge: BadgeCatalog = {
      badgeId: `ins-profesor-${Date.now().toString(36)}`,
      code: dto.icon,
      name: dto.name,
      description: this.describe(dto),
      type: dto.type,
      origin: 'PROFESOR',
      pendingIcon: GENERIC_ICONS[dto.icon]?.needsRework ?? false,
      criterion: dto.criterion,
      valueCriterion: dto.valueCriterion,
      nodeId: dto.nodeId,
    };
    this.catalog = [...this.catalog, badge];
    this.save();
    return of(structuredClone(badge)).pipe(delay(300));
  }

  /** The teacher does not write the description by hand (it is not a form field) — it builds itself. */
  private describe(dto: NewBadge): string {
    if (dto.type === 'POR_NODO') return 'Insignia por nodo — se otorga al completar el nodo elegido.';
    if (!dto.criterion) return '';
    if (dto.criterion === CRITERION_SPECIFIC_NODE) {
      return CRITERION_LABEL[dto.criterion];
    }
    if (CRITERIA_WITH_VALUE.has(dto.criterion) && dto.valueCriterion != null) {
      return `${CRITERION_LABEL[dto.criterion]}: ${dto.valueCriterion}`;
    }
    return CRITERION_LABEL[dto.criterion];
  }

  private load(): BadgeCatalog[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as BadgeCatalog[];
    } catch {
      /* localStorage unavailable or corrupt — fall back to the seed */
    }
    const seed = catalogBadgesSeed();
    this.persist(seed);
    return seed;
  }

  private save(): void {
    this.persist(this.catalog);
  }

  private persist(catalog: BadgeCatalog[]): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(catalog));
    } catch {
      /* incognito mode / storage full — the mock keeps working in memory */
    }
  }
}
