import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SyncService } from '../../../core/services/sync.service';
import { SheetsService } from '../../../core/services/sheets.service';
import { ToastService } from '../../../core/services/toast.service';
import { SyncJob, SheetRecord } from '../../../core/models/api.models';

@Component({
  selector: 'app-sync-jobs',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './sync-jobs.component.html',
  styleUrl: './sync-jobs.component.scss',
})
export class SyncJobsComponent implements OnInit {
  private readonly syncService = inject(SyncService);
  private readonly sheetsService = inject(SheetsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly jobs = signal<SyncJob[]>([]);
  readonly sheets = signal<SheetRecord[]>([]);
  readonly manualSheetId = signal('');

  readonly filters = this.fb.nonNullable.group({
    sheetId: [''],
    status: [''],
  });

  ngOnInit(): void {
    this.sheetsService.getSheets().subscribe({
      next: (data) => this.sheets.set(Array.isArray(data) ? data : []),
      error: () => {},
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const { sheetId, status } = this.filters.getRawValue();
    this.syncService
      .listJobs({
        sheetId: sheetId || undefined,
        status: status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.jobs.set(res.jobs ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load sync jobs');
        },
      });
  }

  manualSync(): void {
    const id = this.manualSheetId().trim();
    if (!id) {
      this.toast.warning('Select or paste a sheet UUID');
      return;
    }
    this.syncService.manualSync(id).subscribe({
      next: (res) => {
        this.toast.success(res.message ?? 'Manual sync created');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message ?? 'Manual sync failed'),
    });
  }
}
