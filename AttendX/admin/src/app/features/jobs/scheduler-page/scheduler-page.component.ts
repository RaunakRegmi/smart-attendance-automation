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
  readonly busy = signal(false);
  readonly running = signal(false);
  readonly syncTimeDisplay = signal('--:--');
  readonly timezone = signal('--');
  readonly nextRunDisplay = signal('--');

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
        const status = (res.syncStatus ?? res) as { running?: boolean; syncTime?: string; timezone?: string; nextRun?: string };
        this.running.set(status.running ?? false);
        this.syncTimeDisplay.set(status.syncTime ?? '--:--');
        this.timezone.set(status.timezone ?? '--');
        this.nextRunDisplay.set(status.nextRun ? new Date(status.nextRun).toLocaleString() : '--');
        if (status.syncTime) {
          this.timeForm.controls.newSyncTime.setValue(status.syncTime);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.syncTimeDisplay.set('Error');
        this.loading.set(false);
      },
    });
  }

  toggle(): void {
    if (this.busy()) return;
    this.busy.set(true);
    const action = this.running() ? this.syncService.stopScheduler() : this.syncService.startScheduler();
    action.subscribe({
      next: (r) => {
        this.toast.success(r.message ?? (this.running() ? 'Stopped' : 'Started'));
        this.refreshStatus();
        this.busy.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? err.error?.error ?? 'Invalid time format. Use HH:MM (24-hour)');
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
      error: (err) => {
        this.toast.error(err.error?.message ?? err.error?.error ?? 'Invalid time format. Use HH:MM (24-hour)');
        this.busy.set(false);
      },
    });
  }
}
