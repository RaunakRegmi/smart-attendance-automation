import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeacherAdminService } from '../../core/services/teacher-admin.service';
import { LecturerService } from '../../core/services/lecturer.service';
import { SectionService } from '../../core/services/section.service';
import { SubjectService } from '../../core/services/subject.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Lecturer,
  Section,
  Subject,
  TeacherAccount,
  TeacherAssignmentRow,
} from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './teachers.component.html',
})
export class TeachersComponent implements OnInit {
  private readonly teacherService = inject(TeacherAdminService);
  private readonly lecturerService = inject(LecturerService);
  private readonly sectionService = inject(SectionService);
  private readonly subjectService = inject(SubjectService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly teachers = signal<TeacherAccount[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly showModal = signal(false);
  readonly editing = signal<TeacherAccount | null>(null);
  readonly deactivateTarget = signal<TeacherAccount | null>(null);
  readonly deactivating = signal(false);
  readonly saving = signal(false);

  // Assignment management
  readonly assignmentsFor = signal<TeacherAccount | null>(null);
  readonly assignments = signal<TeacherAssignmentRow[]>([]);
  readonly assignmentsLoading = signal(false);
  readonly assignmentSaving = signal(false);
  readonly sections = signal<Section[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly lecturers = signal<Lecturer[]>([]);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    name: [''],
    lecturerId: [''],
    isActive: [true],
  });

  readonly assignmentForm = this.fb.nonNullable.group({
    sectionId: ['', Validators.required],
    subjectId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
    this.sectionService.getAll().subscribe({
      next: (res) => this.sections.set((res.data as Section[]) ?? []),
    });
    this.subjectService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.subjects.set(res.data ?? []),
    });
    this.lecturerService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.lecturers.set(res.data ?? []),
    });
  }

  load(): void {
    this.loading.set(true);
    this.teacherService.getTeachers({ search: this.search(), page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.teachers.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ email: '', password: '', name: '', lecturerId: '', isActive: true });
    this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(t: TeacherAccount): void {
    this.editing.set(t);
    this.form.reset({
      email: t.email,
      password: '',
      name: t.lecturer?.name ?? '',
      lecturerId: t.lecturer ? String(t.lecturer.id) : '',
      isActive: t.isActive,
    });
    // Password optional on edit (blank = unchanged; set = reset + force change).
    this.form.controls.password.clearValidators();
    this.form.controls.password.addValidators(Validators.minLength(6));
    this.form.controls.password.updateValueAndValidity();
    this.showModal.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const edit = this.editing();
    if (edit) {
      const data: { email?: string; password?: string; isActive?: boolean; lecturerId?: number | null } = {
        email: value.email,
        isActive: value.isActive,
      };
      if (value.password) data.password = value.password;
      if (value.lecturerId) data.lecturerId = Number(value.lecturerId);
      this.teacherService.updateTeacher(edit.id, data).subscribe({
        next: () => {
          this.toast.success('Teacher updated');
          this.showModal.set(false);
          this.saving.set(false);
          this.load();
        },
        error: () => this.saving.set(false),
      });
    } else {
      const data: { email: string; password: string; name?: string; lecturerId?: number } = {
        email: value.email,
        password: value.password,
      };
      if (value.lecturerId) data.lecturerId = Number(value.lecturerId);
      else if (value.name) data.name = value.name;
      this.teacherService.createTeacher(data).subscribe({
        next: () => {
          this.toast.success('Teacher account created');
          this.showModal.set(false);
          this.saving.set(false);
          this.load();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  deactivate(): void {
    const t = this.deactivateTarget();
    if (!t || this.deactivating()) return;
    this.deactivating.set(true);
    this.teacherService.deactivateTeacher(t.id).subscribe({
      next: () => {
        this.toast.success('Teacher deactivated');
        this.deactivateTarget.set(null);
        this.deactivating.set(false);
        this.load();
      },
      error: () => this.deactivating.set(false),
    });
  }

  openAssignments(t: TeacherAccount): void {
    this.assignmentsFor.set(t);
    this.assignmentForm.reset({ sectionId: '', subjectId: '' });
    this.loadAssignments();
  }

  loadAssignments(): void {
    const t = this.assignmentsFor();
    if (!t) return;
    this.assignmentsLoading.set(true);
    this.teacherService.getAssignments(t.id).subscribe({
      next: (res) => {
        this.assignments.set(res.data ?? []);
        this.assignmentsLoading.set(false);
      },
      error: () => this.assignmentsLoading.set(false),
    });
  }

  addAssignment(): void {
    const t = this.assignmentsFor();
    if (!t || this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }
    const value = this.assignmentForm.getRawValue();
    this.assignmentSaving.set(true);
    this.teacherService
      .addAssignment(t.id, { sectionId: value.sectionId, subjectId: Number(value.subjectId) })
      .subscribe({
        next: () => {
          this.toast.success('Class assigned');
          this.assignmentForm.reset({ sectionId: '', subjectId: '' });
          this.assignmentSaving.set(false);
          this.loadAssignments();
          this.load();
        },
        error: () => this.assignmentSaving.set(false),
      });
  }

  removeAssignment(a: TeacherAssignmentRow): void {
    const t = this.assignmentsFor();
    if (!t) return;
    this.teacherService.removeAssignment(t.id, a.id).subscribe({
      next: () => {
        this.toast.success('Assignment removed');
        this.loadAssignments();
        this.load();
      },
    });
  }

  sectionLabel(s: Section): string {
    return s.Batch ? `${s.name} — ${s.Batch.name}` : s.name;
  }
}
