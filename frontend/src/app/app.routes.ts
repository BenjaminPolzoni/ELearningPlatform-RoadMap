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
    // Entrada del alumno: Mis Clases (lista de asignaturas del StoreService,
    // las creadas por el profesor). Elegir una lleva al hub de mundos /play/:id.
    path: 'alumno',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/alumno/mis-clases').then((m) => m.MisClases),
  },
  {
    // Mundo 3D ciudad+islas de una asignatura (antes /alumno). El :id es el id de
    // la asignatura en el StoreService; el componente hace store.open(id).
    path: 'alumno/curso/:id',
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
    // Hub de mundos de la asignatura (Educa)
    path: 'play/:id',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/play/worlds.component').then((m) => m.WorldsComponent),
  },
  {
    // Mapa de hexágonos 3D (Educa) por unidad
    path: 'play/:id/:unidadId',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/play/play.component').then((m) => m.PlayComponent),
  },
  {
    path: 'alumno/play/:unidadId',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/play/play.component').then((m) => m.PlayComponent),
  },
  {
    path: 'insignias',
    canActivate: [sesionGuard],
    loadComponent: () => import('./features/insignias/catalogo').then((m) => m.Catalogo),
  },
  {
    // La raíz siempre cae al selector de rol (login mock Fase 0). Con rol ya
    // guardado en localStorage también: la lista/mundo se alcanza por sus rutas.
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
