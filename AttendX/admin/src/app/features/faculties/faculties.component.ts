import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { FacultyService } from '../../core/services/faculty.service';
import { ToastService } from '../../core/services/toast.service';
import { Faculty } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-faculties',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './faculties.component.html',
})
export class FacultiesComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly faculties = signal<Faculty[]>([]);
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly editing = signal<Faculty | null>(null);
  readonly deleteTarget = signal<Faculty | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | undefined> = { page: this.page(), limit: this.limit() };
    if (this.search()) params['search'] = this.search();
    this.facultyService.getAll(params).subscribe({
      next: (res: any) => {
        if (res.pagination) {
          this.faculties.set(res.data ?? []);
          this.totalPages.set(res.pagination.totalPages ?? 1);
          this.total.set(res.pagination.total ?? 0);
        } else {
          this.faculties.set(res.data ?? []);
          this.total.set(res.data?.length ?? 0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '' });
    this.showModal.set(true);
  }

  openEdit(faculty: Faculty): void {
    this.editing.set(faculty);
    this.form.patchValue({ name: faculty.name });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
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
      ? this.facultyService.update(edit.id, data)
      : this.facultyService.create(data);
    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Faculty updated' : 'Faculty created');
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  confirmDelete(faculty: Faculty): void {
    this.deleteTarget.set(faculty);
  }

  delete(): void {
    const f = this.deleteTarget();
    if (!f || this.deleting()) return;
    this.deleting.set(true);
    this.facultyService.delete(f.id).subscribe({
      next: () => {
        this.toast.success('Faculty deleted');
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }
}
