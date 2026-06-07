import { Component, OnInit, inject, signal } from '@angular/core';
import { SyncService } from '../../../core/services/sync.service';
import { ToastService } from '../../../core/services/toast.service';
import { QueueStatus } from '../../../core/models/api.models';

@Component({
  selector: 'app-queue-page',
  standalone: true,
  templateUrl: './queue-page.component.html',
  styleUrl: './queue-page.component.scss',
})
export class QueuePageComponent implements OnInit {
  private readonly syncService = inject(SyncService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly queue = signal<QueueStatus | null>(null);
  readonly raw = signal<string>('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.syncService.getQueueStatus().subscribe({
      next: (res) => {
        this.queue.set(res.queueStatus ?? null);
        this.raw.set(JSON.stringify(res, null, 2));
        this.loading.set(false);
      },
      error: (err) => {
        this.raw.set(err.error?.error ?? err.error?.message ?? String(err.message));
        this.loading.set(false);
      },
    });
  }
}
