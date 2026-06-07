import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BatchService } from '../../core/services/batch.service';
import { ToastService } from '../../core/services/toast.service';
import { Batch } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './batches.component.html',
  styleUrl: './batches.component.scss',
})
export class BatchesComponent implements OnInit {
  private readonly batchService = inject(BatchService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly batches = signal<Batch[]>([]);
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly editing = signal<Batch | null>(null);
  readonly deleteTarget = signal<Batch | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    abbreviation: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.batchService.getAll({ search: this.search(), page: this.page(), limit: this.limit() }).subscribe({
      next: (res: any) => {
        if (res.pagination) {
          this.batches.set(res.data ?? []);
          this.totalPages.set(res.pagination.totalPages ?? 1);
          this.total.set(res.pagination.total ?? 0);
        } else {
          this.batches.set(res.data ?? []);
          this.total.set(res.data?.length ?? 0);
          this.totalPages.set(1);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', abbreviation: '' });
    this.showModal.set(true);
  }

  openEdit(batch: Batch): void {
    this.editing.set(batch);
    this.form.patchValue({ name: batch.name, abbreviation: batch.abbreviation ?? '' });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editing.set(null);
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
      ? this.batchService.update(edit.id, data)
      : this.batchService.create(data);

    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Batch updated' : 'Batch created');
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  confirmDelete(batch: Batch): void {
    this.deleteTarget.set(batch);
  }

  delete(): void {
    const batch = this.deleteTarget();
    if (!batch || this.deleting()) return;
    this.deleting.set(true);
    this.batchService.delete(batch.id).subscribe({
      next: () => {
        this.toast.success('Batch deleted');
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
