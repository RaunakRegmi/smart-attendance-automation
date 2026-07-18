import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { TeacherClass, TeacherReport } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-reports',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './teacher-reports.component.html',
})
export class TeacherReportsComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);

  readonly classes = signal<TeacherClass[]>([]);
  readonly subjectId = signal<number | null>(null);
  readonly sectionId = signal<string>('');
  readonly loading = signal(false);
  readonly report = signal<TeacherReport | null>(null);

  readonly subjects = computed(() => {
    const seen = new Map<number, TeacherClass>();
    for (const c of this.classes()) {
      if (!seen.has(c.subjectId)) seen.set(c.subjectId, c);
    }
    return [...seen.values()];
  });

  readonly sectionsForSubject = computed(() =>
    this.classes().filter((c) => c.subjectId === this.subjectId())
  );

  ngOnInit(): void {
    this.portal.getClasses().subscribe({
      next: (res) => this.classes.set(res.data ?? []),
    });
  }

  load(): void {
    const subjectId = this.subjectId();
    if (!subjectId) return;
    this.loading.set(true);
    this.report.set(null);
    this.portal.getReport(subjectId, this.sectionId() || undefined).subscribe({
      next: (res) => {
        this.report.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  exportCsv(): void {
    const r = this.report();
    if (!r) return;
    const rows = [
      ['Name', 'Email', 'Reg. No', 'Total', 'Present', 'Absent', 'Late', 'Percentage', 'Low attendance'],
      ...r.students.map((s) => [
        s.student.name,
        s.student.email,
        s.student.regNum || s.student.univId || '',
        String(s.total),
        String(s.present),
        String(s.absent),
        String(s.late),
        `${s.attendancePercentage}%`,
        s.lowAttendance ? 'yes' : 'no',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${r.subject.subjectCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
