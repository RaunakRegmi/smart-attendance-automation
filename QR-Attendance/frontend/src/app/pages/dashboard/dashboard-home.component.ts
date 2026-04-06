import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressBarModule],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss',
})
export class DashboardHomeComponent {
  private router = inject(Router);
  private auth = inject(AuthStore);
  protected userRole = computed(() => this.auth.user()?.role);

  constructor() {
    // Route user to their role-specific dashboard.
    const role = this.auth.user()?.role;
    if (role === 'ADMIN') this.router.navigate(['/admin']);
    if (role === 'TEACHER') this.router.navigate(['/teacher']);
    if (role === 'STUDENT') this.router.navigate(['/student']);
  }
}

