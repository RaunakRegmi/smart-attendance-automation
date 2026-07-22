import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubjectService } from '../../core/services/subject.service';
import { BatchService } from '../../core/services/batch.service';
import { SectionService } from '../../core/services/section.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject, Batch, Section } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './subjects.component.html',
})
export class SubjectsComponent implements OnInit {
  private readonly subjectService = inject(SubjectService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly subjects = signal<Subject[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly search = signal('');
  readonly showModal = signal(false);
  readonly editing = signal<Subject | null>(null);
  readonly deleteTarget = signal<Subject | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);

  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);

  readonly form = this.fb.nonNullable.group({
    subjectCode: ['', Validators.required],
    subjectName: [''],
    batchId: ['', Validators.required],
    sectionId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
    this.loadBatches();
  }

  load(): void {
    this.loading.set(true);
    this.subjectService.getAll({ search: this.search(), page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.subjects.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadBatches(): void {
    this.batchService.getAll().subscribe({
      next: (res) => this.batches.set(res.data ?? []),
    });
  }

  onBatchChange(batchId: string): void {
    this.form.patchValue({ sectionId: '' });
    if (!batchId) {
      this.sections.set([]);
      return;
    }
    this.sectionService.getAll(batchId).subscribe({
      next: (res) => this.sections.set(res.data ?? []),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ subjectCode: '', subjectName: '', batchId: '', sectionId: '' });
    this.sections.set([]);
    this.showModal.set(true);
  }

  openEdit(s: Subject): void {
    this.editing.set(s);
    this.form.patchValue({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName ?? '',
      batchId: s.batchId ?? '',
      sectionId: s.sectionId ?? '',
    });
    if (s.batchId) {
      this.onBatchChange(s.batchId);
    }
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
      error: () => {
        this.saving.set(false);
      },
    });
  }

  delete(): void {
    const s = this.deleteTarget();
    if (!s || this.deleting()) return;
    this.deleting.set(true);
    this.subjectService.delete(s.id).subscribe({
      next: () => {
        this.toast.success('Subject deleted');
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
