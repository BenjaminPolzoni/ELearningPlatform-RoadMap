import type { Provider } from '@angular/core';

import { BadgesDataPort } from './data-access/badges/badges-data.port';
import { InMemoryBadgesAdapter } from './data-access/badges/in-memory-badges.adapter';
import { BankDataPort } from './data-access/bank/bank-data.port';
import { InMemoryBankAdapter } from './data-access/bank/in-memory-bank.adapter';
import { StoreService } from './data-access/educa/store.service';
import { InMemoryRankingAdapter } from './data-access/ranking/in-memory-ranking.adapter';
import { RankingDataPort } from './data-access/ranking/ranking-data.port';
import { InMemoryRoadmapAdapter } from './data-access/roadmap/in-memory-roadmap.adapter';
import { RoadmapDataPort } from './data-access/roadmap/roadmap-data.port';
import { RoadmapStore } from './data-access/roadmap/roadmap.store';

/**
 * Providers scoped to the roadmap feature (registered on the parent route, so the app
 * config does not need to know about them).
 *
 * The data ports are bound to their in-memory adapters for now. Phase 3: switch each
 * `useClass` to its HTTP adapter — these are the only lines to touch.
 *
 * `RoadmapStore` and `StoreService` are listed here on purpose: they depend on the ports,
 * so they must be instantiated by this route injector and not by the root one.
 */
export const ROADMAP_PROVIDERS: Provider[] = [
  { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
  { provide: RankingDataPort, useClass: InMemoryRankingAdapter },
  // No catalog endpoint yet (only the earned-badges one is planned in 06-contrato-api.md).
  { provide: BadgesDataPort, useClass: InMemoryBadgesAdapter },
  // Bank (Topic 08): coins, XP and lives as the source of truth. Mock with a 30s cache and
  // degradation to unavailable if the "service" fails.
  { provide: BankDataPort, useClass: InMemoryBankAdapter },
  RoadmapStore,
  StoreService,
];
