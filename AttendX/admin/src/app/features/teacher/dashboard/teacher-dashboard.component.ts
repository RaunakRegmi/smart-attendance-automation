import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { TeacherDashboard } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './teacher-dashboard.component.html',
})
export class TeacherDashboardComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);

  readonly loading = signal(true);
  readonly data = signal<TeacherDashboard | null>(null);

  ngOnInit(): void {
    this.portal.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
