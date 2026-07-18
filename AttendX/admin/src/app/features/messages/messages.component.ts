import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessagingService } from '../../core/services/messaging.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  MessageContact,
  ThreadMessageRow,
  ThreadSummary,
} from '../../core/models/api.models';

/**
 * Shared async inbox for admin and teacher sessions. Refreshes on open —
 * deliberately no sockets/polling (§10.1).
 */
@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [FormsModule, DatePipe, SlicePipe],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit {
  private readonly messaging = inject(MessagingService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly threads = signal<ThreadSummary[]>([]);
  readonly filter = signal<'all' | 'unread'>('all');
  readonly activeThreadId = signal<number | null>(null);
  readonly messages = signal<ThreadMessageRow[]>([]);
  readonly messagesLoading = signal(false);
  readonly sending = signal(false);
  readonly draft = signal('');

  // Compose state
  readonly showCompose = signal(false);
  readonly contacts = signal<{ teachers?: MessageContact[]; students?: MessageContact[]; admins?: MessageContact[] }>({});
  readonly composeRecipient = signal<MessageContact | null>(null);
  readonly composeSubjectId = signal<number | null>(null);
  readonly composeBody = signal('');
  readonly composeGroup = signal<'students' | 'admins' | 'teachers'>('students');

  readonly visibleThreads = computed(() => {
    const list = this.threads();
    return this.filter() === 'unread' ? list.filter((t) => t.unreadCount > 0) : list;
  });

  readonly activeThread = computed(() => this.threads().find((t) => t.id === this.activeThreadId()) ?? null);

  readonly myUserId = computed(() => this.auth.user()?.id ?? -1);

  readonly composeNeedsSubject = computed(() => {
    const recipient = this.composeRecipient();
    return !!recipient?.subjects; // students (for teachers) carry subject context
  });

  ngOnInit(): void {
    this.load();
    this.messaging.getContacts().subscribe({ next: (res) => this.contacts.set(res.data ?? {}) });
    // Deep-link support: /messages?compose=<userId>&subjectId=<id> (e.g. from at-risk list)
    const composeUserId = Number(this.route.snapshot.queryParamMap.get('compose'));
    const subjectId = Number(this.route.snapshot.queryParamMap.get('subjectId'));
    if (composeUserId) {
      this.messaging.getContacts().subscribe({
        next: (res) => {
          const all = [...(res.data?.students ?? []), ...(res.data?.teachers ?? []), ...(res.data?.admins ?? [])];
          const match = all.find((c) => c.userId === composeUserId);
          if (match) {
            this.openCompose();
            this.composeRecipient.set(match);
            if (subjectId) this.composeSubjectId.set(subjectId);
          }
        },
      });
    }
  }

  load(): void {
    this.loading.set(true);
    this.messaging.listThreads().subscribe({
      next: (res) => {
        this.threads.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openThread(t: ThreadSummary): void {
    this.activeThreadId.set(t.id);
    this.messagesLoading.set(true);
    this.messaging.getThread(t.id, { limit: 100 }).subscribe({
      next: (res) => {
        this.messages.set(res.data?.messages ?? []);
        this.messagesLoading.set(false);
        if (t.unreadCount > 0) {
          this.messaging.markRead(t.id).subscribe({
            next: () => {
              this.threads.update((list) => list.map((x) => (x.id === t.id ? { ...x, unreadCount: 0 } : x)));
            },
          });
        }
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  canReply(): boolean {
    const t = this.activeThread();
    if (!t) return false;
    // Broadcast notifications are one-way for recipients.
    return t.contextType !== 'ADMIN_BROADCAST' || t.createdBy === this.myUserId();
  }

  send(): void {
    const t = this.activeThread();
    const body = this.draft().trim();
    if (!t || !body || this.sending()) return;
    this.sending.set(true);
    this.messaging.postMessage(t.id, body).subscribe({
      next: () => {
        this.draft.set('');
        this.sending.set(false);
        this.openThread(t);
        this.load();
      },
      error: () => this.sending.set(false),
    });
  }

  openCompose(): void {
    this.composeRecipient.set(null);
    this.composeSubjectId.set(null);
    this.composeBody.set('');
    this.composeGroup.set(this.auth.isAdmin() ? 'teachers' : 'students');
    this.showCompose.set(true);
  }

  composeList(): MessageContact[] {
    const c = this.contacts();
    if (this.auth.isAdmin()) return c.teachers ?? [];
    return this.composeGroup() === 'admins' ? (c.admins ?? []) : (c.students ?? []);
  }

  selectRecipient(contact: MessageContact): void {
    this.composeRecipient.set(contact);
    this.composeSubjectId.set(contact.subjects?.length === 1 ? contact.subjects[0].id : null);
  }

  selectRecipientById(userId: string | number): void {
    const match = this.composeList().find((c) => c.userId === Number(userId)) ?? null;
    if (match) this.selectRecipient(match);
    else {
      this.composeRecipient.set(null);
      this.composeSubjectId.set(null);
    }
  }

  sendCompose(): void {
    const recipient = this.composeRecipient();
    const body = this.composeBody().trim();
    if (!recipient || !body || this.sending()) return;
    if (this.composeNeedsSubject() && !this.composeSubjectId()) {
      this.toast.error('Choose the subject this message is about');
      return;
    }
    this.sending.set(true);
    this.messaging
      .createThread({
        recipientUserId: recipient.userId,
        subjectId: this.composeSubjectId() ?? undefined,
        body,
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.showCompose.set(false);
          this.toast.success(res.data?.created ? 'Message sent' : 'Added to existing conversation');
          this.load();
          if (res.data?.thread?.id) {
            this.activeThreadId.set(res.data.thread.id);
            this.messaging.getThread(res.data.thread.id, { limit: 100 }).subscribe({
              next: (r) => this.messages.set(r.data?.messages ?? []),
            });
          }
        },
        error: () => this.sending.set(false),
      });
  }

  threadTitle(t: ThreadSummary): string {
    if (t.contextType === 'ADMIN_BROADCAST') return t.title || 'Notification';
    const other = t.otherParticipants[0];
    const name = other?.name || 'Conversation';
    return t.subject ? `${name} · ${t.subject.subjectCode}` : name;
  }
}
