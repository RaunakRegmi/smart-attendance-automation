import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { AtRiskRow } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-at-risk',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './teacher-at-risk.component.html',
})
export class TeacherAtRiskComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly threshold = signal(80);
  readonly rows = signal<AtRiskRow[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.portal.getAtRisk(this.threshold()).subscribe({
      next: (res) => {
        this.rows.set(res.data?.students ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  messageStudent(row: AtRiskRow): void {
    if (!row.student.userId) return;
    this.router.navigate(['/teacher/messages'], {
      queryParams: { compose: row.student.userId, subjectId: row.subjectId },
    });
  }
}
