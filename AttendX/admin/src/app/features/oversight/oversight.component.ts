import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TeacherAdminService } from '../../core/services/teacher-admin.service';
import { ThreadMessageRow, ThreadSummary, ThreadDetail } from '../../core/models/api.models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

/**
 * Read-only oversight of student↔teacher threads (deliberate child-safety
 * design: no fully private, unlogged channels). Admins cannot post here and
 * every view is audit-logged server-side.
 */
@Component({
  selector: 'app-oversight',
  standalone: true,
  imports: [DatePipe, PaginationComponent],
  templateUrl: './oversight.component.html',
})
export class OversightComponent implements OnInit {
  private readonly teacherService = inject(TeacherAdminService);

  readonly loading = signal(true);
  readonly threads = signal<ThreadSummary[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(20);
  readonly activeThread = signal<ThreadDetail | null>(null);
  readonly messages = signal<ThreadMessageRow[]>([]);
  readonly messagesLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.teacherService
      .listOversightThreads({ page: this.page(), limit: this.limit(), search: this.search() })
      .subscribe({
        next: (res) => {
          this.threads.set(res.data ?? []);
          this.totalPages.set(res.pagination?.totalPages ?? 1);
          this.total.set(res.pagination?.total ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openThread(t: ThreadSummary): void {
    this.messagesLoading.set(true);
    this.activeThread.set(null);
    this.teacherService.getOversightThread(t.id, { limit: 200 }).subscribe({
      next: (res) => {
        this.activeThread.set(res.data?.thread ?? null);
        this.messages.set(res.data?.messages ?? []);
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  participantSummary(t: ThreadSummary | ThreadDetail): string {
    return t.participants.map((p) => `${p.name}${p.role ? ` (${p.role.toLowerCase()})` : ''}`).join(' ↔ ');
  }
}
