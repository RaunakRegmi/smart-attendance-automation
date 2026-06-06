import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SheetsService } from '../../../core/services/sheets.service';
import { BatchService } from '../../../core/services/batch.service';
import { SectionService } from '../../../core/services/section.service';
import { ToastService } from '../../../core/services/toast.service';
import { Batch, Section } from '../../../core/models/api.models';

@Component({
  selector: 'app-sheets-add',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sheets-add.component.html',
  styleUrl: './sheets-add.component.scss',
})
export class SheetsAddComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sheetsService = inject(SheetsService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    url: ['', [Validators.required]],
    batchId: ['', [Validators.required]],
    sectionId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.batchService.getAll().subscribe((r) => this.batches.set(r.data ?? []));
  }

  onBatchChange(batchId: string): void {
    this.form.patchValue({ sectionId: '' });
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe((res) => this.sections.set(res.data ?? []));
    } else {
      this.sections.set([]);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.sheetsService.linkSheet(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Sheet linked');
        this.router.navigate(['/sheets']);
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error ?? err.error?.message ?? 'Link failed');
        this.saving.set(false);
      },
    });
  }
}
