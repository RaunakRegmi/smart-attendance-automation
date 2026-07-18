import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { TeacherRoster } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-roster',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-roster.component.html',
})
export class TeacherRosterComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly loading = signal(true);
  readonly roster = signal<TeacherRoster | null>(null);

  ngOnInit(): void {
    const sectionId = this.route.snapshot.paramMap.get('sectionId')!;
    const subjectId = Number(this.route.snapshot.paramMap.get('subjectId'));
    this.portal.getRoster(sectionId, subjectId).subscribe({
      next: (res) => {
        this.roster.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  messageStudent(userId: number | null): void {
    if (!userId) return;
    const subjectId = this.roster()?.subject?.id;
    this.router.navigate(['/teacher/messages'], { queryParams: { compose: userId, subjectId } });
  }
}
