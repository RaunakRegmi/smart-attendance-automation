import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  AtRiskRow,
  TeacherAttendanceView,
  TeacherClass,
  TeacherDashboard,
  TeacherProfileData,
  TeacherReport,
  TeacherRoster,
  UserNotification,
} from '../models/api.models';

/** Teacher-portal data. Every endpoint is server-scoped to the teacher's assignments. */
@Injectable({ providedIn: 'root' })
export class TeacherPortalService {
  private readonly api = inject(ApiService);

  getDashboard() {
    return this.api.get<TeacherDashboard>('/teacher/dashboard');
  }

  getClasses() {
    return this.api.get<TeacherClass[]>('/teacher/classes');
  }

  getRoster(sectionId: string, subjectId: number) {
    return this.api.get<TeacherRoster>(`/teacher/classes/${sectionId}/${subjectId}/students`);
  }

  getAttendanceView(params: Record<string, string | number | undefined>) {
    return this.api.get<TeacherAttendanceView>('/teacher/attendance', params);
  }

  getReport(subjectId: number, sectionId?: string) {
    return this.api.get<TeacherReport>('/teacher/reports', { subjectId, sectionId });
  }

  getAtRisk(threshold?: number) {
    return this.api.get<{ threshold: number; totalAtRisk: number; students: AtRiskRow[] }>('/teacher/at-risk', {
      threshold,
    });
  }

  getNotifications(limit?: number) {
    return this.api.get<UserNotification[]>('/teacher/notifications', { limit });
  }

  getProfile() {
    return this.api.get<TeacherProfileData>('/teacher/profile');
  }

  updateProfile(data: { name?: string; contact?: string }) {
    return this.api.put<{ lecturer: { id: number; name: string; contact?: string | null } }>('/teacher/profile', data);
  }
}
