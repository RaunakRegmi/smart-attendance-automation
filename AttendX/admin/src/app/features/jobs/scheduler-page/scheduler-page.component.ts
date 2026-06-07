import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SyncService } from '../../../core/services/sync.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-scheduler-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './scheduler-page.component.html',
  styleUrl: './scheduler-page.component.scss',
})
export class SchedulerPageComponent implements OnInit {
  private readonly syncService = inject(SyncService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly statusJson = signal<string>('');
  readonly busy = signal(false);

  readonly timeForm = this.fb.nonNullable.group({
    newSyncTime: ['07:30', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
  });

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus(): void {
    this.loading.set(true);
    this.syncService.getSchedulerStatus().subscribe({
      next: (res) => {
        this.statusJson.set(JSON.stringify(res.syncStatus ?? res, null, 2));
        this.loading.set(false);
      },
      error: (err) => {
        this.statusJson.set(err.error?.error ?? err.error?.message ?? String(err.message));
        this.loading.set(false);
      },
    });
  }

  start(): void {
    this.busy.set(true);
    this.syncService.startScheduler().subscribe({
      next: (r) => {
        this.toast.success(r.message ?? 'Started');
        this.refreshStatus();
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  stop(): void {
    this.busy.set(true);
    this.syncService.stopScheduler().subscribe({
      next: (r) => {
        this.toast.success(r.message ?? 'Stopped');
        this.refreshStatus();
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  modifyTime(): void {
    if (this.timeForm.invalid) {
      this.timeForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.syncService.modifyScheduler(this.timeForm.controls.newSyncTime.value).subscribe({
      next: (r) => {
        this.toast.success(r.message ?? 'Schedule updated');
        this.refreshStatus();
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }
}
