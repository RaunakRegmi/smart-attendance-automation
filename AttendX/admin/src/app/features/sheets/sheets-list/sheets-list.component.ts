import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SheetsService } from '../../../core/services/sheets.service';
import { BatchService } from '../../../core/services/batch.service';
import { SectionService } from '../../../core/services/section.service';
import { ToastService } from '../../../core/services/toast.service';
import { SheetRecord, Batch, Section } from '../../../core/models/api.models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-sheets-list',
  standalone: true,
  imports: [RouterLink, DatePipe, ConfirmDialogComponent, PaginationComponent],
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
  readonly deleting = signal(false);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  ngOnInit(): void {
    this.batchService.getAll().subscribe((r) => this.batches.set(r.data ?? []));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: { batchId?: string; sectionId?: string; status?: string; page?: number; limit?: number } = {};
    if (this.filterBatchId()) params.batchId = this.filterBatchId();
    if (this.filterSectionId()) params.sectionId = this.filterSectionId();
    if (this.filterStatus()) params.status = this.filterStatus();
    params.page = this.page();
    params.limit = this.limit();
    this.sheetsService.getSheets(params).subscribe({
      next: (res) => {
        this.sheets.set(res.data);
        this.total.set(res.pagination.total);
        this.totalPages.set(res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onLimitChange(l: number): void {
    this.limit.set(l);
    this.page.set(1);
    this.load();
  }

  onBatchFilter(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.filterSectionId.set('');
    this.page.set(1);
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
      error: () => {},
    });
  }

  syncOne(sheet: SheetRecord): void {
    this.sheetsService.syncSheet(sheet.id).subscribe({
      next: (res: unknown) => {
        const msg = (res as { message?: string })?.message ?? 'Sync job enqueued';
        this.toast.success(msg);
      },
      error: () => {},
    });
  }

  syncAll(): void {
    this.sheetsService.syncSheet().subscribe({
      next: (res: unknown) => {
        const msg = (res as { message?: string })?.message ?? 'Sync jobs enqueued';
        this.toast.success(msg);
      },
      error: () => {},
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
    if (!sheet || this.deleting()) return;
    this.deleting.set(true);
    this.sheetsService.deleteSheet(sheet.id).subscribe({
      next: () => {
        this.toast.success('Sheet deleted');
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
