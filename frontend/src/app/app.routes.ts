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
    path: '',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
