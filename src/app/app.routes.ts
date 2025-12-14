import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ExamComponent } from './components/exam/exam.component';
import { ResultsComponent } from './components/results/results.component';
import { authGuard } from './guards/auth.guard';
import { authRedirectGuard } from './guards/auth-redirect.guard';
import { ProfileComponent } from './components/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [authRedirectGuard]   // 👈 smart redirect logic
  },
  {
    path: 'auth',
    component: AuthComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'exam',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/exam-runner/exam-runner.component').then(m => m.ExamRunnerComponent),
    data: { preload: true }  // ✅ Preload this
  },
  {
    path: 'results',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/results/results.component').then(m => m.ResultsComponent),
    data: { preload: true }  // ✅ Preload this
  },
  {
    path: 'analysis/:attemptId',
    loadComponent: () =>
      import('./components/analysis/analysis.component').then((m) => m.AnalysisComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];