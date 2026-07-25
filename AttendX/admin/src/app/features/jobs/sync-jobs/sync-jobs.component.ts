import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SyncService } from '../../../core/services/sync.service';
import { SheetsService } from '../../../core/services/sheets.service';
import { ToastService } from '../../../core/services/toast.service';
import { SyncJob, SheetRecord, QueueStatus } from '../../../core/models/api.models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-sync-jobs',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, PaginationComponent],
  templateUrl: './sync-jobs.component.html',
  styleUrl: './sync-jobs.component.scss',
})
export class SyncJobsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly syncService = inject(SyncService);
  private readonly sheetsService = inject(SheetsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly jobs = signal<SyncJob[]>([]);
  readonly sheets = signal<SheetRecord[]>([]);
  readonly manualSheetId = signal('');
  readonly syncing = signal(false);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  readonly queueStatus = signal<QueueStatus | null>(null);
  readonly lastRefreshed = signal('');
  readonly activeFilter = signal('');

  readonly filters = this.fb.nonNullable.group({
    sheetId: [''],
    status: [''],
  });

  ngOnInit(): void {
    const status = this.route.snapshot.queryParams['status'];
    if (status) {
      this.filters.patchValue({ status });
      this.activeFilter.set(status);
    }
    this.sheetsService.getSheets({ limit: 200 }).subscribe({
      next: (res) => this.sheets.set(res.data),
      error: () => {},
    });
    this.loadQueueStatus();
    this.load();
  }

  loadQueueStatus(): void {
    this.lastRefreshed.set(new Date().toLocaleTimeString());
    this.syncService.getQueueStatus().subscribe({
      next: (res) => this.queueStatus.set(res.queueStatus ?? null),
      error: () => {},
    });
  }

  filterByStatus(status: string): void {
    if (this.activeFilter() === status) {
      this.activeFilter.set('');
      this.filters.patchValue({ status: '' });
    } else {
      this.activeFilter.set(status);
      this.filters.patchValue({ status });
    }
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const { sheetId, status } = this.filters.getRawValue();
    this.syncService
      .listJobs({
        sheetId: sheetId || undefined,
        status: status || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (res) => {
          this.jobs.set(res.jobs ?? []);
          this.total.set(res.pagination?.total ?? 0);
          this.totalPages.set(res.pagination?.totalPages ?? 0);
          this.loading.set(false);
        },
      error: () => {
        this.loading.set(false);
      },
      });
  }

  getSheetDisplay(sheetId: string | undefined): string {
    if (!sheetId) return '-';
    const sheet = this.sheets().find((s) => s.id === sheetId);
    if (!sheet) return sheetId.slice(0, 8) + '…';
    const batchName = sheet.Batch?.name ?? '';
    return batchName ? `${sheet.sheetName} (${batchName})` : sheet.sheetName;
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

  manualSync(): void {
    const id = this.manualSheetId().trim();
    if (!id) {
      this.toast.warning('Select or paste a sheet UUID');
      return;
    }
    if (this.syncing()) return;
    this.syncing.set(true);
    this.syncService.manualSync(id).subscribe({
      next: (res) => {
        this.toast.success(res.message ?? 'Manual sync created');
        this.syncing.set(false);
        this.loadQueueStatus();
        this.load();
      },
      error: () => { this.syncing.set(false); },
    });
  }
}