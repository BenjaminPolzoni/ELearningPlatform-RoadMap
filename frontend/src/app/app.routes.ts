import { Routes } from '@angular/router';
import { sessionGuard } from './core/auth/session.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'profesor',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/teacher/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'profesor/build/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/teacher/builder/builder.component').then((m) => m.BuilderComponent),
  },
  {
    path: 'profesor/map/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/teacher/map/map.component').then((m) => m.MapComponent),
  },
  {
    path: 'profesor/unidad/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/teacher/builder/builder.component').then((m) => m.BuilderComponent),
  },
  {
    // Student entry point: My Courses (list of subjects from StoreService,
    // the ones created by the teacher). Choosing one leads to the /play/:id worlds hub.
    path: 'alumno',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/student/my-courses').then((m) => m.MyCourses),
  },
  {
    // 3D world city+islands of a subject (formerly /alumno). The :id is the subject id
    // in StoreService; the component calls store.open(id).
    path: 'alumno/curso/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/student/world-3d').then((m) => m.World3d),
  },
  {
    // Customization of the avatar that walks the section board.
    path: 'alumno/avatar',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/student/avatar-editor').then((m) => m.AvatarEditor),
  },
  {
    // Internal board of the section (Mario 3 style) — entered from a house in the 3D world.
    path: 'alumno/unidad/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/student/section-map').then((m) => m.SectionMap),
  },
  {
    // Theory material (static mock): entered from the Temple in the 3D world via
    // postMessage `openMateriales` — see features/student/materials.ts.
    path: 'alumno/materiales',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/student/materials').then((m) => m.Materials),
  },
  {
    // Worlds hub of the subject (Educa)
    path: 'play/:id',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/play/worlds.component').then((m) => m.WorldsComponent),
  },
  {
    // 3D hexagon map (Educa) per section
    path: 'play/:id/:unidadId',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/play/play.component').then((m) => m.PlayComponent),
  },
  {
    path: 'alumno/play/:unidadId',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/play/play.component').then((m) => m.PlayComponent),
  },
  {
    path: 'insignias',
    canActivate: [sessionGuard],
    loadComponent: () => import('./features/badges/catalog').then((m) => m.Catalog),
  },
  {
    // The root always falls back to the role selector (mock login, Phase 0). With a role
    // already saved in localStorage too: the list/world is reached through its routes.
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
