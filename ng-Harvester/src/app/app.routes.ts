import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AddNewComponent } from './features/add-new/add-new.component';
import { RecordsComponent } from './features/records/records.component';
import { SettingsComponent } from './features/settings/settings.component';
import { MoreComponent } from './features/more/more.component';

export const routes: Routes = [

  // -----------------------------
  // AUTH (PUBLIC ROUTE)
  // -----------------------------
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page.component')
        .then(m => m.AuthPageComponent)
  },

  // -----------------------------
  // PROTECTED ROUTES
  // -----------------------------
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'records',
    component: RecordsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'add-new',
    component: AddNewComponent,
    canActivate: [authGuard]
  },
  {
    path: 'add-new/:id',
    component: AddNewComponent,
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'more',
    component: MoreComponent,
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
