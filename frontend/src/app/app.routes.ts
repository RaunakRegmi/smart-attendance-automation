import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login.component';
import { RegisterComponent } from './pages/auth/register.component';
import { AppLayoutComponent } from './layout/app-layout.component';
import { DashboardHomeComponent } from './pages/dashboard/dashboard-home.component';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { AdminPanelComponent } from './pages/admin/admin-panel.component';
import { TeacherDashboardComponent } from './pages/teacher/teacher-dashboard.component';
import { StudentDashboardComponent } from './pages/student/student-dashboard.component';
import { ReportsComponent } from './pages/reports/reports.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'admin', component: AdminPanelComponent, canActivate: [roleGuard('ADMIN')] },
      { path: 'teacher', component: TeacherDashboardComponent, canActivate: [roleGuard('TEACHER')] },
      { path: 'student', component: StudentDashboardComponent, canActivate: [roleGuard('STUDENT')] },
      { path: 'reports', component: ReportsComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
