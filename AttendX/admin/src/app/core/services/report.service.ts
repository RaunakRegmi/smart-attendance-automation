import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  StudentDailyReport, StudentSubjectWiseReport, StudentAggregateReport,
  SectionWiseReport, BatchWiseReport, SubjectWiseReport,
  DailySummaryReport, MonthlyReport, DateRangeReport,
  LowAttendanceReport, TopPerformer, LeaderboardReport, TrendAnalytics, ApiResponse, PaginatedResponse, ReportStudent, AttendanceSummary,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  getStudentDailyReport(studentId: number, date?: string) {
    return this.api.get<StudentDailyReport>('/reports/student/daily', { studentId, ...(date && { date }) });
  }

  getStudentSubjectTimeReport(studentId: number, subjectId: number, date: string) {
    return this.api.get<any>('/reports/student/subject-time', { studentId, subjectId, date });
  }

  getStudentSubjectWiseReport(studentId: number, subjectId?: number) {
    return this.api.get<StudentSubjectWiseReport>('/reports/student/subject-wise', { studentId, subjectId });
  }

  getStudentAggregateReport(studentId: number) {
    return this.api.get<StudentAggregateReport>('/reports/student/aggregate', { studentId });
  }

  getSectionWiseReport(sectionId: string, params?: { page?: number; limit?: number; search?: string }) {
    return this.api.getPaginated<SectionWiseReport>('/reports/section', { sectionId, ...params } as any);
  }

  getBatchWiseReport(batchId: string, params?: { page?: number; limit?: number; search?: string }) {
    return this.api.getPaginated<BatchWiseReport>('/reports/batch', { batchId, ...params } as any);
  }

  getSubjectWiseReport(params: { subjectId?: number; subjectCode?: string; page?: number; limit?: number }) {
    return this.api.getPaginated<SubjectWiseReport>('/reports/subject', params as any);
  }

  getFacultyWiseReport(faculty: string, params?: { page?: number; limit?: number }) {
    return this.api.getPaginated<{ faculty: string; studentData: { student: ReportStudent; overall: AttendanceSummary }[] }>('/reports/faculty', { faculty, ...params } as any);
  }

  getDailySummaryReport(date?: string) {
    return this.api.get<DailySummaryReport>('/reports/daily-summary', date ? { date } : {});
  }

  getMonthlyReport(month?: number, year?: number) {
    return this.api.get<MonthlyReport>('/reports/monthly', { month, year });
  }

  getDateRangeReport(params: { startDate: string; endDate: string; sectionId?: string; batchId?: string; page?: number; limit?: number }) {
    return this.api.getPaginated<DateRangeReport>('/reports/date-range', params as any);
  }

  getLowAttendanceReport(params: { threshold?: number; batchId?: string; sectionId?: string; page?: number; limit?: number }) {
    return this.api.getPaginated<LowAttendanceReport>('/reports/low-attendance', params as any);
  }

  getTopPerformersReport(params: { limit?: number; batchId?: string; sectionId?: string }) {
    return this.api.get<{ topPerformers: TopPerformer[]; totalStudents: number }>('/reports/top-performers', params as any);
  }

  getAbsentStudentsReport(params: { date?: string; subjectId?: number; sectionId?: string; page?: number; limit?: number }) {
    return this.api.getPaginated<{ date: string; subjectId: number | null; records: { id: number; student: ReportStudent; subject: { id: number; code: string; name: string } }[] }>('/reports/absent-students', params as any);
  }

  getLeaderboardReport(params?: { batchId?: string; sectionId?: string }) {
    return this.api.get<LeaderboardReport>('/reports/leaderboard', params as any);
  }

  getSectionComparisonReport(batchId: string) {
    return this.api.get<{ batch: { id: string; name: string }; sections: SectionComparisonData[] }>('/reports/section-comparison', { batchId });
  }

  getBatchComparisonReport() {
    return this.api.get<{ batches: BatchComparisonData[] }>('/reports/batch-comparison');
  }

  getTrendAnalytics(params?: { months?: number; batchId?: string; sectionId?: string }) {
    return this.api.get<TrendAnalytics>('/reports/trends', params as any);
  }

  /** Manually trigger the auto-weekly report job for every student. */
  runWeeklyReportsNow() {
    return this.api.post<{ generated: number; emailsSent: number; emailsFailed: number; weekStart: string; weekEnd: string }>('/reports/weekly/run-now', {});
  }
}

interface SectionComparisonData {
  section: { id: string; name: string };
  studentCount: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
}

interface BatchComparisonData {
  batch: { id: string; name: string };
  studentCount: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  attendancePercentage: number;
  totalSessions: number;
}
