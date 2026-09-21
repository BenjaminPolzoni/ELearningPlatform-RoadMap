import type { Routes } from '@angular/router';

import { sessionGuard } from './data-access/session/session.guard';
import { RoadmapShellComponent } from './pages/roadmap-shell/roadmap-shell.component';
import { ROADMAP_PROVIDERS } from './roadmap.providers';

/**
 * Routes of the roadmap feature, mounted by the app under `/roadmap`.
 * Every path below is relative to that prefix.
 */
export const ROADMAP_ROUTES: Routes = [
  {
    path: '',
    component: RoadmapShellComponent,
    providers: ROADMAP_PROVIDERS,
    children: [
      // Mock login (Phase 0): the destination app authenticates through the core AuthService.
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/dev-login-page/dev-login-page.component').then((m) => m.DevLoginPageComponent),
      },
      {
        path: 'teacher',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/teacher-home-page/teacher-home-page.component').then((m) => m.TeacherHomePageComponent),
      },
      {
        path: 'teacher/build/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/course-builder-page/course-builder-page.component').then((m) => m.CourseBuilderPageComponent),
      },
      {
        path: 'teacher/map/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/course-map-page/course-map-page.component').then((m) => m.CourseMapPageComponent),
      },
      {
        path: 'teacher/section/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/course-builder-page/course-builder-page.component').then((m) => m.CourseBuilderPageComponent),
      },
      // Student entry point: My Courses (list of subjects from StoreService, the ones created by the
      // teacher). Choosing one leads to the /play/:id worlds hub.
      {
        path: 'student',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/my-courses-page/my-courses-page.component').then((m) => m.MyCoursesPageComponent),
      },
      // 3D world city+islands of a subject. The :id is the subject id in StoreService; the
      // component calls store.open(id).
      {
        path: 'student/course/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/world-3d-page/world-3d-page.component').then((m) => m.World3dPageComponent),
      },
      // Customization of the avatar that walks the section board.
      {
        path: 'student/avatar',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/avatar-editor-page/avatar-editor-page.component').then((m) => m.AvatarEditorPageComponent),
      },
      // Internal board of the section (Mario 3 style) — entered from a house in the 3D world.
      {
        path: 'student/section/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/section-map-page/section-map-page.component').then((m) => m.SectionMapPageComponent),
      },
      // Theory material (static mock): entered from the Temple in the 3D world via the
      // postMessage `openMaterials`.
      {
        path: 'student/materials',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/materials-page/materials-page.component').then((m) => m.MaterialsPageComponent),
      },
      // Worlds hub of the subject (Educa)
      {
        path: 'play/:id',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/worlds-page/worlds-page.component').then((m) => m.WorldsPageComponent),
      },
      // 3D hexagon map (Educa) per section
      {
        path: 'play/:id/:sectionId',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/hex-world-page/hex-world-page.component').then((m) => m.HexWorldPageComponent),
      },
      {
        path: 'student/play/:sectionId',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/hex-world-page/hex-world-page.component').then((m) => m.HexWorldPageComponent),
      },
      {
        path: 'badges',
        canActivate: [sessionGuard],
        loadComponent: () =>
          import('./pages/badges-catalog-page/badges-catalog-page.component').then((m) => m.BadgesCatalogPageComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
