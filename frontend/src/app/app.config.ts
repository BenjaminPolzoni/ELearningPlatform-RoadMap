import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { RoadmapDataPort } from './core/data/roadmap-data.port';
import { InMemoryRoadmapAdapter } from './core/data/in-memory-roadmap.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los params de ruta llegan como input() del componente
    // (lo usa UnidadMapa para recibir el id de la unidad).
    provideRouter(routes, withComponentInputBinding()),
    // Fase 3: cambiar a HttpRoadmapAdapter — es la única línea que se toca
    // (01-arquitectura-y-stack.md §4).
    { provide: RoadmapDataPort, useClass: InMemoryRoadmapAdapter },
  ],
};
