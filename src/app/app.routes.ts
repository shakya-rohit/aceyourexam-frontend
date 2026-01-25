import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { authRedirectGuard } from './guards/auth-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [authRedirectGuard]
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
    path: 'forgot-password',
    loadComponent: () =>
      import('./components/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password.component')
        .then(m => m.ResetPasswordComponent)
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./components/verify-email/verify-email.component')
        .then(m => m.VerifyEmailComponent)
  },
  {
    path: 'create-exam',
    loadComponent: () =>
      import('./components/create-exam/create-exam.component')
        .then(m => m.CreateExamComponent)
  },
  {
    path: 'create-exam/:examId/edit',
    loadComponent: () =>
      import('./components/create-exam/create-exam.component')
        .then(m => m.CreateExamComponent)
  },
  {
    path: 'exam-list',
    loadComponent: () =>
      import('./components/exams-list/exams-list.component')
        .then(m => m.ExamsListComponent)
  },
  {
    path: 'verify-otp',
    loadComponent: () =>
      import('./components/verify-otp/verify-otp.component')
        .then(m => m.VerifyOtpComponent)
  },
  {
    path: 'question-bank',
    loadComponent: () =>
      import('./components/question-bank/question-bank.component')
        .then(m => m.QuestionBankComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];