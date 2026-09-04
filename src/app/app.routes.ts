import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [

  // -----------------------------
  // AUTH (only when not logged in; redirect to dashboard if already logged in)
  // -----------------------------
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page.component')
        .then(m => m.AuthPageComponent),
    canActivate: [guestGuard]
  },

  // -----------------------------
  // PROTECTED ROUTES (Lazy-Loaded for Minimal Initial Bundle Size)
  // -----------------------------
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component')
        .then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'records',
    loadComponent: () =>
      import('./features/records/records.component')
        .then(m => m.RecordsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'add-new',
    loadComponent: () =>
      import('./features/add-new/add-new.component')
        .then(m => m.AddNewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'add-new/:id',
    loadComponent: () =>
      import('./features/add-new/add-new.component')
        .then(m => m.AddNewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component')
        .then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'more',
    loadComponent: () =>
      import('./features/more/more.component')
        .then(m => m.MoreComponent),
    canActivate: [authGuard]
  },
  {
    path: 'measure',
    loadComponent: () =>
      import('./features/land-measurement/land-measurement.component')
        .then(m => m.LandMeasurementComponent),
    canActivate: [authGuard]
  },

  // -----------------------------
  // DEFAULT & FALLBACK
  // -----------------------------
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
