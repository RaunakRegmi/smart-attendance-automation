import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SectionService } from '../../core/services/section.service';
import { BatchService } from '../../core/services/batch.service';
import { ToastService } from '../../core/services/toast.service';
import { Section, Batch } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit {
  private readonly sectionService = inject(SectionService);
  private readonly batchService = inject(BatchService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly sections = signal<Section[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly filterBatchId = signal('');
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly editing = signal<Section | null>(null);
  readonly deleteTarget = signal<Section | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    batchId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.batchService.getAll().subscribe((res) => this.batches.set(res.data ?? []));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | undefined> = { page: this.page(), limit: this.limit() };
    if (this.search()) params['search'] = this.search();
    if (this.filterBatchId()) params['batchId'] = this.filterBatchId();
    this.sectionService.getAll(undefined, params).subscribe({
      next: (res: any) => {
        if (res.pagination) {
          this.sections.set(res.data ?? []);
          this.totalPages.set(res.pagination.totalPages ?? 1);
          this.total.set(res.pagination.total ?? 0);
        } else {
          this.sections.set(res.data ?? []);
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
    this.form.reset({ name: '', batchId: '' });
    this.showModal.set(true);
  }

  openEdit(section: Section): void {
    this.editing.set(section);
    this.form.patchValue({ name: section.name, batchId: section.batchId });
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
      ? this.sectionService.update(edit.id, data)
      : this.sectionService.create(data);
    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Section updated' : 'Section created');
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  confirmDelete(section: Section): void {
    this.deleteTarget.set(section);
  }

  delete(): void {
    const s = this.deleteTarget();
    if (!s || this.deleting()) return;
    this.deleting.set(true);
    this.sectionService.delete(s.id).subscribe({
      next: () => {
        this.toast.success('Section deleted');
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
