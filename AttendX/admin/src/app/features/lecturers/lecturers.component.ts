import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LecturerService } from '../../core/services/lecturer.service';
import { ToastService } from '../../core/services/toast.service';
import { Lecturer } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-lecturers',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './lecturers.component.html',
})
export class LecturersComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly lecturers = signal<Lecturer[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly showModal = signal(false);
  readonly editing = signal<Lecturer | null>(null);
  readonly deleteTarget = signal<Lecturer | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', Validators.email],
    contact: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.lecturerService.getAll({ search: this.search(), page: this.page(), limit: 10 }).subscribe({
      next: (res) => {
        this.lecturers.set(res.data ?? []);
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

  openEdit(l: Lecturer): void {
    this.editing.set(l);
    this.form.patchValue({ name: l.name, email: l.email ?? '', contact: l.contact ?? '' });
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
      ? this.lecturerService.update(edit.id, data)
      : this.lecturerService.create(data);
    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Lecturer updated' : 'Lecturer created');
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
    const l = this.deleteTarget();
    if (!l) return;
    this.lecturerService.delete(l.id).subscribe({
      next: () => {
        this.toast.success('Deleted');
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'Failed'),
    });
  }
}
