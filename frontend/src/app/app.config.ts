import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { RoadmapDataPort } from './core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from './core/data/in-memory-roadmap.adapter';
import { RankingDataPort } from './core/data/ranking-data.port';
import { InMemoryRankingAdapter } from './core/data/in-memory-ranking.adapter';
import { BadgesDataPort } from './core/data/badges-data.port';
import { InMemoryBadgesAdapter } from './core/data/in-memory-badges.adapter';
import { BankDataPort } from './core/data/bank-data.port';
import { InMemoryBankAdapter } from './core/data/in-memory-bank.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route params arrive as the component's input()
    // (used by SectionMap to receive the section id).
    provideRouter(routes, withComponentInputBinding()),
    // Phase 3: switch to HttpRoadmapAdapter — it is the only line to touch
    // (01-arquitectura-y-stack.md §4).
    { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
    // Phase 3: idem — HttpRankingAdapter against `GET /roadmaps/{cc}/ranking` (06-contrato-api.md §3).
    { provide: RankingDataPort, useClass: InMemoryRankingAdapter },
    // Phase 3: same — there is no catalog endpoint yet (only the earned-badges one
    // is [PLANEADO] in 06-contrato-api.md).
    { provide: BadgesDataPort, useClass: InMemoryBadgesAdapter },
    // Bank (Topic 08): coins, XP and lives as the source of truth. Mock with a 30s
    // cache and degradation to unavailable if the "service" fails.
    { provide: BankDataPort, useClass: InMemoryBankAdapter },
  ],
};
