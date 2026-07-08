import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    // Autentifikatsiya talab qilinadigan hamma narsa AppShell (sidebar + topbar) ichida.
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'analytics',
        data: { title: 'Analitika' },
        loadComponent: () =>
          import('./shared/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'settings',
        data: { title: 'Sozlamalar' },
        loadComponent: () =>
          import('./shared/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
