import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  // Mijoz virtual navbat sahifalari — PUBLIC (login yo'q, shell yo'q, mobil-birinchi).
  {
    path: 'q/join',
    loadComponent: () =>
      import('./features/virtual-queue/ui/queue-join/queue-join'),
  },
  {
    path: 'q/:token',
    loadComponent: () =>
      import('./features/virtual-queue/ui/queue-ticket/queue-ticket'),
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
