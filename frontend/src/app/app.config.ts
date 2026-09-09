import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { RoadmapDataPort } from './core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from './core/data/in-memory-roadmap.adapter';
import { RankingDataPort } from './core/data/ranking-data.port';
import { InMemoryRankingAdapter } from './core/data/in-memory-ranking.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Fase 3: cambiar a HttpRoadmapAdapter — es la única línea que se toca
    // (01-arquitectura-y-stack.md §4).
    { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
    // Fase 3: idem — HttpRankingAdapter contra `GET /roadmaps/{cc}/ranking` (06-contrato-api.md §3).
    { provide: RankingDataPort, useClass: InMemoryRankingAdapter },
  ],
};
