import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  TeacherAccount,
  TeacherAssignmentRow,
  NotificationSummary,
  NotificationReadStatus,
  ThreadSummary,
  ThreadDetail,
  ThreadMessageRow,
  User,
} from '../models/api.models';

/** Admin-side teacher management, notifications and oversight. */
@Injectable({ providedIn: 'root' })
export class TeacherAdminService {
  private readonly api = inject(ApiService);

  getTeachers(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<TeacherAccount>('/admin/teachers', params);
  }

  createTeacher(data: {
    email: string;
    password: string;
    name?: string;
    lecturerId?: number;
    phone?: string;
    address?: string;
    deliveryChannels?: DeliveryChannel[];
  }) {
    return this.api.post<{
      user: User & { phone?: string | null; address?: string | null };
      lecturer: { id: number; name: string } | null;
      delivery: DeliveryStatus | null;
    }>('/admin/teachers', data);
  }

  resendCredentials(teacherId: number, data: { deliveryChannels: DeliveryChannel[]; newTempPassword?: string }) {
    return this.api.post<{ delivery: DeliveryStatus }>(`/admin/teachers/${teacherId}/resend-credentials`, data);
  }

  updateTeacher(id: number, data: { email?: string; password?: string; isActive?: boolean; lecturerId?: number | null }) {
    return this.api.put<User>(`/admin/teachers/${id}`, data);
  }

  deactivateTeacher(id: number) {
    return this.api.delete<{ message: string }>(`/admin/teachers/${id}`);
  }

  getAssignments(teacherId: number) {
    return this.api.get<TeacherAssignmentRow[]>(`/admin/teachers/${teacherId}/assignments`);
  }

  addAssignment(teacherId: number, data: { sectionId: string; subjectId: number }) {
    return this.api.post<TeacherAssignmentRow>(`/admin/teachers/${teacherId}/assignments`, data);
  }

  removeAssignment(teacherId: number, assignmentId: number) {
    return this.api.delete<{ message: string }>(`/admin/teachers/${teacherId}/assignments/${assignmentId}`);
  }

  sendNotification(data: { title: string; body: string; recipients: 'all' | number[] }) {
    return this.api.post<{ threadId: number; recipientCount: number }>('/admin/notifications', data);
  }

  listNotifications(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<NotificationSummary>('/admin/notifications', params);
  }

  getReadStatus(threadId: number) {
    return this.api.get<NotificationReadStatus>(`/admin/notifications/${threadId}/read-status`);
  }

  listOversightThreads(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<ThreadSummary>('/admin/oversight/threads', params);
  }

  getOversightThread(threadId: number, params?: Record<string, string | number | undefined>) {
    return this.api.get<{ thread: ThreadDetail; messages: ThreadMessageRow[]; readOnly: boolean }>(
      `/admin/oversight/threads/${threadId}`,
      params
    );
  }
}
