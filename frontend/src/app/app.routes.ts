import { Routes } from '@angular/router';
import { sesionGuard } from './core/auth/sesion.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'profesor',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/profesor/editor').then((m) => m.Editor),
  },
  {
    path: 'profesor/unidad/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/profesor/unidad-editor').then((m) => m.UnidadEditor),
  },
  {
    path: 'alumno',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/mapa').then((m) => m.Mapa),
  },
  {
    // Personalización del avatar que recorre el mapa y el tablero.
    path: 'alumno/avatar',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/avatar-editor').then((m) => m.AvatarEditor),
  },
  {
    // Tablero interno de la unidad (estilo Mario 3) — se entra desde una isla del mapa.
    path: 'alumno/unidad/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/unidad-mapa').then((m) => m.UnidadMapa),
  },
  {
    path: 'insignias',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/insignias/catalogo').then((m) => m.Catalogo),
  },
  {
    path: '',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'dev-showcase',
    // Showroom temporal de la librería UI compartida (G6) — no es una pantalla
    // de negocio; se usa aislada para probar los ui-* en ambos temas.
    loadComponent: () => import('./dev/ui-showcase').then((m) => m.UiShowcase),
  },
  { path: '**', redirectTo: '' },
];
