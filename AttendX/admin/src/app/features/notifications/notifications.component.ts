import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeacherAdminService } from '../../core/services/teacher-admin.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ToastService } from '../../core/services/toast.service';
import {
  MessageContact,
  NotificationReadStatus,
  NotificationSummary,
} from '../../core/models/api.models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [ReactiveFormsModule, PaginationComponent, DatePipe],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private readonly teacherService = inject(TeacherAdminService);
  private readonly messaging = inject(MessagingService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly notifications = signal<NotificationSummary[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly showCompose = signal(false);
  readonly sending = signal(false);
  readonly teachers = signal<MessageContact[]>([]);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly sendToAll = signal(true);
  readonly readStatus = signal<NotificationReadStatus | null>(null);
  readonly readStatusLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    body: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
    this.messaging.getContacts().subscribe({
      next: (res) => this.teachers.set(res.data?.teachers ?? []),
    });
  }

  load(): void {
    this.loading.set(true);
    this.teacherService.listNotifications({ page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.notifications.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleRecipient(userId: number): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const recipients = this.sendToAll() ? ('all' as const) : [...this.selectedIds()];
    if (recipients !== 'all' && recipients.length === 0) {
      this.toast.error('Select at least one teacher');
      return;
    }
    this.sending.set(true);
    const { title, body } = this.form.getRawValue();
    this.teacherService.sendNotification({ title, body, recipients }).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Notification sent');
        this.showCompose.set(false);
        this.form.reset();
        this.selectedIds.set(new Set());
        this.sendToAll.set(true);
        this.sending.set(false);
        this.page.set(1);
        this.load();
      },
      error: () => this.sending.set(false),
    });
  }

  openReadStatus(n: NotificationSummary): void {
    this.readStatusLoading.set(true);
    this.readStatus.set(null);
    this.teacherService.getReadStatus(n.threadId).subscribe({
      next: (res) => {
        this.readStatus.set(res.data);
        this.readStatusLoading.set(false);
      },
      error: () => this.readStatusLoading.set(false),
    });
  }
}
