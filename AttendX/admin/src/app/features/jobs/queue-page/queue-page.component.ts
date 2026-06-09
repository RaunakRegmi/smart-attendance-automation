import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { SyncService } from '../../../core/services/sync.service';
import { QueueStatus } from '../../../core/models/api.models';

@Component({
  selector: 'app-queue-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './queue-page.component.html',
  styleUrl: './queue-page.component.scss',
})
export class QueuePageComponent implements OnInit {
  private readonly syncService = inject(SyncService);

  readonly loading = signal(true);
  readonly queue = signal<QueueStatus | null>(null);
  readonly lastRefreshed = signal<Date | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.syncService.getQueueStatus().subscribe({
      next: (res) => {
        this.queue.set(res.queueStatus ?? null);
        this.lastRefreshed.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}