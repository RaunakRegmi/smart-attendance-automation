import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'batches',
        loadComponent: () =>
          import('./features/batches/batches.component').then((m) => m.BatchesComponent),
      },
      {
        path: 'sections',
        loadComponent: () =>
          import('./features/sections/sections.component').then((m) => m.SectionsComponent),
      },
      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component').then((m) => m.StudentsComponent),
      },
      {
        path: 'subjects',
        loadComponent: () =>
          import('./features/subjects/subjects.component').then((m) => m.SubjectsComponent),
      },
      {
        path: 'lecturers',
        loadComponent: () =>
          import('./features/lecturers/lecturers.component').then((m) => m.LecturersComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'chatbot',
        loadComponent: () =>
          import('./features/chatbot/chatbot.component').then((m) => m.ChatbotComponent),
      },
      {
        path: 'routines/add',
        loadComponent: () =>
          import('./features/routines/routines-add/routines-add.component').then((m) => m.RoutinesAddComponent),
      },
      {
        path: 'routines/:sectionId',
        loadComponent: () =>
          import('./features/routines/routine-detail/routine-detail.component').then((m) => m.RoutineDetailComponent),
      },
      {
        path: 'routines',
        loadComponent: () =>
          import('./features/routines/routines-list/routines-list.component').then((m) => m.RoutinesListComponent),
      },
      {
        path: 'sheets/add',
        loadComponent: () =>
          import('./features/sheets/sheets-add/sheets-add.component').then((m) => m.SheetsAddComponent),
      },
      {
        path: 'sheets/:id',
        loadComponent: () =>
          import('./features/sheets/sheet-detail/sheet-detail.component').then((m) => m.SheetDetailComponent),
      },
      {
        path: 'sheets',
        loadComponent: () =>
          import('./features/sheets/sheets-list/sheets-list.component').then((m) => m.SheetsListComponent),
      },
      {
        path: 'jobs/sync',
        loadComponent: () =>
          import('./features/jobs/sync-jobs/sync-jobs.component').then((m) => m.SyncJobsComponent),
      },
      {
        path: 'jobs/scheduler',
        loadComponent: () =>
          import('./features/jobs/scheduler-page/scheduler-page.component').then((m) => m.SchedulerPageComponent),
      },
      {
        path: 'jobs/queue',
        loadComponent: () =>
          import('./features/jobs/queue-page/queue-page.component').then((m) => m.QueuePageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
