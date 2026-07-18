import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  MessageContact,
  ThreadDetail,
  ThreadMessageRow,
  ThreadSummary,
} from '../models/api.models';

/**
 * Async messaging shared by admin and teacher sessions (students use the
 * mobile app against the same endpoints). No sockets — callers refresh on open.
 */
@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly api = inject(ApiService);

  getContacts() {
    return this.api.get<{ teachers?: MessageContact[]; students?: MessageContact[]; admins?: MessageContact[] }>(
      '/messages/contacts'
    );
  }

  getUnreadCount() {
    return this.api.get<{ unreadCount: number }>('/messages/unread-count');
  }

  listThreads(params?: Record<string, string | number | boolean | undefined>) {
    return this.api.get<ThreadSummary[]>('/messages/threads', params as Record<string, string | number | undefined>);
  }

  createThread(data: { recipientUserId: number; subjectId?: number; body: string }) {
    return this.api.post<{ thread: ThreadDetail; created: boolean }>('/messages/threads', data);
  }

  getThread(threadId: number, params?: Record<string, string | number | undefined>) {
    return this.api.get<{ thread: ThreadDetail; messages: ThreadMessageRow[] }>(`/messages/threads/${threadId}`, params);
  }

  postMessage(threadId: number, body: string) {
    return this.api.post<ThreadMessageRow>(`/messages/threads/${threadId}`, { body });
  }

  markRead(threadId: number) {
    return this.api.post<{ threadId: number; lastReadAt: string }>(`/messages/threads/${threadId}/read`, {});
  }
}
