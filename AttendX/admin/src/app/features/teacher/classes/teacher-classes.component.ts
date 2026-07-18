import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { TeacherClass } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-classes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-classes.component.html',
})
export class TeacherClassesComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);

  readonly loading = signal(true);
  readonly classes = signal<TeacherClass[]>([]);

  ngOnInit(): void {
    this.portal.getClasses().subscribe({
      next: (res) => {
        this.classes.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
