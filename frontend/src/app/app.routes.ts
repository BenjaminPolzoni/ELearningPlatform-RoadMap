import { Routes } from '@angular/router';

/**
 * Root routes of the standalone roadmap app. In the TPI monolith this file (and the rest of the
 * shell) belongs to the platform team; the only thing that matters is the `roadmap` entry.
 */
export const routes: Routes = [
  {
    path: 'roadmap',
    loadChildren: () => import('./features/roadmap/roadmap.routes').then((m) => m.ROADMAP_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'roadmap' },
  { path: '**', redirectTo: 'roadmap' },
];
