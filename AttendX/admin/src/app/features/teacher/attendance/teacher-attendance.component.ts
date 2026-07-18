import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { TeacherAttendanceView, TeacherClass } from '../../../core/models/api.models';

/**
 * Read-only in v1: attendance comes from the sheet sync pipeline. The disabled
 * "Mark attendance" action is the deliberate UI placeholder for the reserved
 * POST /api/teacher/attendance extension point (returns 501 today).
 */
@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './teacher-attendance.component.html',
})
export class TeacherAttendanceComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);

  readonly classes = signal<TeacherClass[]>([]);
  readonly selectedKey = signal('');
  readonly date = signal('');
  readonly loading = signal(false);
  readonly view = signal<TeacherAttendanceView | null>(null);

  readonly selectedClass = computed(() => {
    const [sectionId, subjectId] = this.selectedKey().split('::');
    return this.classes().find((c) => c.sectionId === sectionId && String(c.subjectId) === subjectId) ?? null;
  });

  ngOnInit(): void {
    this.portal.getClasses().subscribe({
      next: (res) => this.classes.set(res.data ?? []),
    });
  }

  classKey(c: TeacherClass): string {
    return `${c.sectionId}::${c.subjectId}`;
  }

  load(): void {
    const cls = this.selectedClass();
    if (!cls) return;
    this.loading.set(true);
    this.view.set(null);
    this.portal
      .getAttendanceView({
        sectionId: cls.sectionId,
        subjectId: cls.subjectId,
        date: this.date() || undefined,
        limit: 200,
      })
      .subscribe({
        next: (res) => {
          this.view.set(res.data ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
