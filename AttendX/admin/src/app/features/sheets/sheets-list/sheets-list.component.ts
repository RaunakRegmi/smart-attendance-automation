import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SheetsService } from '../../../core/services/sheets.service';
import { BatchService } from '../../../core/services/batch.service';
import { SectionService } from '../../../core/services/section.service';
import { ToastService } from '../../../core/services/toast.service';
import { SheetRecord, Batch, Section } from '../../../core/models/api.models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-sheets-list',
  standalone: true,
  imports: [RouterLink, DatePipe, ConfirmDialogComponent],
  templateUrl: './sheets-list.component.html',
  styleUrl: './sheets-list.component.scss',
})
export class SheetsListComponent implements OnInit {
  private readonly sheetsService = inject(SheetsService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly sheets = signal<SheetRecord[]>([]);
  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly filterBatchId = signal('');
  readonly filterSectionId = signal('');
  readonly filterStatus = signal('');
  readonly deleteTarget = signal<SheetRecord | null>(null);

  ngOnInit(): void {
    this.batchService.getAll().subscribe((r) => this.batches.set(r.data ?? []));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: { batchId?: string; sectionId?: string; status?: string } = {};
    if (this.filterBatchId()) params.batchId = this.filterBatchId();
    if (this.filterSectionId()) params.sectionId = this.filterSectionId();
    if (this.filterStatus()) params.status = this.filterStatus();
    this.sheetsService.getSheets(params).subscribe({
      next: (data) => {
        this.sheets.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load sheets');
      },
    });
  }

  onBatchFilter(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.filterSectionId.set('');
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe((r) => this.sections.set(r.data ?? []));
    } else {
      this.sections.set([]);
    }
    this.load();
  }

  toggle(sheet: SheetRecord): void {
    this.sheetsService.toggleStatus(sheet.id).subscribe({
      next: () => {
        this.toast.success('Status updated');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.error ?? 'Toggle failed'),
    });
  }

  syncOne(sheet: SheetRecord): void {
    this.sheetsService.syncSheet(sheet.id).subscribe({
      next: (res: unknown) => {
        const msg = (res as { message?: string })?.message ?? 'Sync job enqueued';
        this.toast.success(msg);
      },
      error: (err) => this.toast.error(err.error?.error ?? err.error?.message ?? 'Sync failed'),
    });
  }

  syncAll(): void {
    this.sheetsService.syncSheet().subscribe({
      next: (res: unknown) => {
        const msg = (res as { message?: string })?.message ?? 'Sync jobs enqueued';
        this.toast.success(msg);
      },
      error: (err) => this.toast.error(err.error?.error ?? 'Sync failed'),
    });
  }

  sheetUrl(sheet: SheetRecord): string {
    return sheet.metadata?.url ?? `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/edit`;
  }

  sheetDisplayName(sheet: SheetRecord): string {
    const name = sheet.sheetName;
    if (!name || name.startsWith('http')) {
      return sheet.sheetId ? `Sheet (${sheet.sheetId.slice(0, 12)}…)` : '(unnamed)';
    }
    return name;
  }

  confirmDelete(sheet: SheetRecord): void {
    this.deleteTarget.set(sheet);
  }

  deleteSheet(): void {
    const sheet = this.deleteTarget();
    if (!sheet) return;
    this.sheetsService.deleteSheet(sheet.id).subscribe({
      next: () => {
        this.toast.success('Sheet deleted');
        this.deleteTarget.set(null);
        this.load();
      },
      error: (err) => this.toast.error(err.error?.error ?? 'Delete failed'),
    });
  }
}
