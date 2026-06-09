import { Component, OnInit, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentService } from '../../core/services/student.service';
import { BatchService } from '../../core/services/batch.service';
import { SectionService } from '../../core/services/section.service';
import { SheetsService } from '../../core/services/sheets.service';
import { ToastService } from '../../core/services/toast.service';
import { Student, Batch, Section } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  private readonly studentService = inject(StudentService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly sheetsService = inject(SheetsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  @ViewChild('sectionSelect') sectionSelectEl?: ElementRef<HTMLSelectElement>;

  readonly loading = signal(true);
  readonly students = signal<Student[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly modalSections = signal<Section[]>([]);
  readonly search = signal('');
  readonly filterBatchId = signal('');
  readonly filterSectionId = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly showModal = signal(false);
  readonly showUpload = signal(false);
  readonly editing = signal<Student | null>(null);
  readonly deleteTarget = signal<Student | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);
  readonly uploadFile = signal<File | null>(null);
  readonly uploading = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    batchId: [''],
    sectionId: [''],
    faculty: [''],
  });

  ngOnInit(): void {
    this.batchService.getAll().subscribe((r) => this.batches.set(r.data ?? []));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.studentService
      .getAll({
        search: this.search(),
        batchId: this.filterBatchId(),
        sectionId: this.filterSectionId(),
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          this.students.set(res.data ?? []);
          this.totalPages.set(res.pagination?.totalPages ?? 1);
          this.total.set(res.pagination?.total ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onBatchFilter(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.filterSectionId.set('');
    this.sections.set([]);
    if (this.sectionSelectEl) this.sectionSelectEl.nativeElement.value = '';
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe((r) => this.sections.set(r.data ?? []));
    }
    this.page.set(1);
    this.load();
  }

  loadSections(batchId: string): void {
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe((r) => this.modalSections.set(r.data ?? []));
    } else {
      this.modalSections.set([]);
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.modalSections.set([]);
    this.showModal.set(true);
  }

  openEdit(student: Student): void {
    this.editing.set(student);
    this.form.patchValue({
      name: student.name,
      email: student.email,
      batchId: student.batchId ?? '',
      sectionId: student.sectionId ?? '',
      faculty: student.faculty ?? '',
    });
    if (student.batchId) {
      this.sectionService.getAll(student.batchId).subscribe((r) => this.modalSections.set(r.data ?? []));
    } else {
      this.modalSections.set([]);
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
      ? this.studentService.update(edit.id, data)
      : this.studentService.create(data);
    req.subscribe({
      next: () => {
        this.toast.success(edit ? 'Student updated' : 'Student created');
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
    this.studentService.delete(s.id).subscribe({
      next: () => {
        this.toast.success('Student deleted');
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.uploadFile.set(input.files[0]);
  }

  uploadExcel(): void {
    const file = this.uploadFile();
    if (!file) {
      this.toast.warning('Select a file first');
      return;
    }
    if (this.uploading()) return;
    this.uploading.set(true);
    this.sheetsService.uploadAttendance(file).subscribe({
      next: (res) => {
        this.toast.success(res.message ?? 'Upload complete');
        this.showUpload.set(false);
        this.uploadFile.set(null);
        this.uploading.set(false);
        this.load();
      },
      error: () => { this.uploading.set(false); },
    });
  }

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }
}
