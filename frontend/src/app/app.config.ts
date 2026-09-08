import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { RoadmapDataPort } from './core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from './core/data/in-memory-roadmap.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Fase 3: cambiar a HttpRoadmapAdapter — es la única línea que se toca
    // (01-arquitectura-y-stack.md §4).
    { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
  ],
};
