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
    loadComponent: () => import('./features/profesor/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'profesor/build/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/profesor/builder/builder.component').then((m) => m.BuilderComponent),
  },
  {
    path: 'profesor/map/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/profesor/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'profesor/unidad/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/profesor/builder/builder.component').then((m) => m.BuilderComponent),
  },
  {
    // Mundo 3D (mundo-3d.ts embebe la herramienta de exploración): cada casa es una
    // unidad/bioma; al entrar avisa por postMessage y acá se navega al mapa de
    // desafíos de esa unidad. Reemplaza al viejo mapa isométrico de islas.
    path: 'alumno',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/mundo-3d').then((m) => m.Mundo3d),
  },
  {
    // Personalización del avatar que recorre el tablero de la unidad.
    path: 'alumno/avatar',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/avatar-editor').then((m) => m.AvatarEditor),
  },
  {
    // Tablero interno de la unidad (estilo Mario 3) — se entra desde una casa del mundo 3D.
    path: 'alumno/unidad/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/unidad-mapa').then((m) => m.UnidadMapa),
  },
  {
    // Material teórico (mock estático): se entra desde el Templo del mundo 3D vía
    // postMessage `openMateriales` — ver features/alumno/materiales.ts.
    path: 'alumno/materiales',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/materiales').then((m) => m.Materiales),
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
  { path: '**', redirectTo: '' },
];
