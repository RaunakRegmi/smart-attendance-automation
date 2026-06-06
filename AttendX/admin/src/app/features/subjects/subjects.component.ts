import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubjectService } from '../../core/services/subject.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './subjects.component.html',
})
export class SubjectsComponent implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly subjects = signal<Subject[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly editing = signal<Subject | null>(null);
  readonly deleteTarget = signal<Subject | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    subjectCode: ['', Validators.required],
    subjectName: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.subjectService.getAll({ search: this.search(), page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.subjects.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.showModal.set(true);
  }

  openEdit(s: Subject): void {
    this.editing.set(s);
    this.form.patchValue({ subjectCode: s.subjectCode, subjectName: s.subjectName ?? '' });
    this.showModal.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const data = this.form.getRawValue();
    const edit = this.editing();
    const req = edit
      ? this.subjectService.update(edit.id, data)
      : this.subjectService.create(data);
    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Subject updated' : 'Subject created');
        this.showModal.set(false);
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Failed');
        this.saving.set(false);
      },
    });
  }

  delete(): void {
    const s = this.deleteTarget();
    if (!s) return;
    this.subjectService.delete(s.id).subscribe({
      next: () => {
        this.toast.success('Deleted');
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'Failed'),
    });
  }
}
