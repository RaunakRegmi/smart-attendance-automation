import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgTemplateOutlet, DecimalPipe } from '@angular/common';
import { ReportService } from '../../core/services/report.service';
import { BatchService } from '../../core/services/batch.service';
import { SectionService } from '../../core/services/section.service';
import { StudentService } from '../../core/services/student.service';
import { SubjectService } from '../../core/services/subject.service';
import { ToastService } from '../../core/services/toast.service';
import {
  ReportStudent, ReportSubject, ReportSubjectStat, AttendanceSummary,
  StudentDailyReport, StudentSubjectWiseReport, StudentAggregateReport,
  SectionWiseReport, SectionStudentReport, BatchWiseReport, BatchStudentReport,
  SubjectWiseReport, DailySummaryReport, MonthlyReport, DateRangeReport,
  LowAttendanceReport, TopPerformer, LeaderboardEntry, TrendAnalytics,
  Batch, Section, Student, Subject,
} from '../../core/models/api.models';

interface ReportTab {
  id: string;
  label: string;
  subReports: { id: string; label: string; icon: string }[];
}

const REPORT_TABS: ReportTab[] = [
  { id: 'student', label: 'Student', subReports: [
    { id: 'student-daily', label: 'Daily Report', icon: 'calendar' },
    { id: 'student-subject-wise', label: 'Subject-wise', icon: 'book' },
    { id: 'student-aggregate', label: 'Aggregate', icon: 'chart' },
  ]},
  { id: 'class', label: 'Class', subReports: [
    { id: 'section-wise', label: 'Section-wise', icon: 'users' },
    { id: 'batch-wise', label: 'Batch-wise', icon: 'layers' },
  ]},
  { id: 'analytics', label: 'Analytics', subReports: [
    { id: 'subject-report', label: 'Subject Report', icon: 'book' },
    { id: 'daily-summary', label: 'Daily Summary', icon: 'calendar' },
    { id: 'monthly', label: 'Monthly Report', icon: 'calendar' },
    { id: 'date-range', label: 'Date Range', icon: 'range' },
  ]},
  { id: 'exceptions', label: 'Exceptions', subReports: [
    { id: 'low-attendance', label: 'Low Attendance', icon: 'warning' },
    { id: 'absent-students', label: 'Absent Students', icon: 'x-circle' },
  ]},
  { id: 'performance', label: 'Performance', subReports: [
    { id: 'top-performers', label: 'Top Performers', icon: 'award' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'list' },
  ]},
  { id: 'comparisons', label: 'Comparisons', subReports: [
    { id: 'section-comparison', label: 'Section Compare', icon: 'bar-chart' },
    { id: 'batch-comparison', label: 'Batch Compare', icon: 'bar-chart' },
  ]},
  { id: 'trends', label: 'Trends', subReports: [
    { id: 'trend-analytics', label: 'Trend Analytics', icon: 'trending' },
  ]},
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [ReactiveFormsModule, NgTemplateOutlet, DecimalPipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly studentService = inject(StudentService);
  private readonly subjectService = inject(SubjectService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tabs = REPORT_TABS;
  readonly activeTab = signal('student');
  readonly activeSubReport = signal('student-daily');
  readonly loading = signal(false);
  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly students = signal<Student[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly searchResults = signal<Student[]>([]);
  readonly searchingStudent = signal(false);

  readonly activeSubReports = computed(() => {
    const tab = this.tabs.find(t => t.id === this.activeTab());
    return tab ? tab.subReports : [];
  });

  readonly activeSub = computed(() => {
    const subs = this.activeSubReports();
    const found = subs.find(s => s.id === this.activeSubReport());
    return found || (subs.length > 0 ? subs[0] : { id: '', label: '', icon: '' });
  });

  selectSubReport(id: string): void {
    this.activeSubReport.set(id);
    this.reset();
  }

  isSubActive(id: string): boolean {
    return this.activeSubReport() === id;
  }

  readonly filters = this.fb.group({
    studentId: [''], date: [''], subjectId: [''], subjectCode: [''],
    sectionId: [''], batchId: [''], faculty: [''],
    startDate: [''], endDate: [''], month: [''], year: [new Date().getFullYear().toString()],
    threshold: ['80'], limit: ['10'], search: [''], months: ['6'],
    studentSearch: [''],
  });

  readonly reportData = signal<any>(null);
  readonly pagination = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  readonly page = signal(1);

  ngOnInit(): void {
    this.batchService.getAll().subscribe(r => this.batches.set(r.data ?? []));
    this.subjectService.getAll({ limit: 200 }).subscribe(r => this.subjects.set(r.data ?? []));
  }

  setTab(tabId: string): void {
    this.activeTab.set(tabId);
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.activeSubReport.set(tab.subReports[0].id);
      this.reset();
    }
  }

  setSubReport(id: string): void {
    this.activeSubReport.set(id);
    this.reset();
  }

  reset(): void {
    this.reportData.set(null);
    this.pagination.set(null);
    this.page.set(1);
    this.filters.patchValue({ search: '', studentSearch: '' });
  }

  onBatchChange(batchId: string): void {
    this.filters.patchValue({ sectionId: '' });
    this.sections.set([]);
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe(r => this.sections.set(r.data ?? []));
    }
  }

  searchStudents(): void {
    const q = this.filters.value.studentSearch;
    if (!q || q.length < 2) return;
    this.searchingStudent.set(true);
    this.studentService.getAll({ search: q, limit: 10 }).subscribe({
      next: (r) => this.searchResults.set(r.data ?? []),
      error: () => this.searchResults.set([]),
    }).add(() => this.searchingStudent.set(false));
  }

  selectStudent(student: Student): void {
    this.filters.patchValue({ studentId: String(student.id), studentSearch: `${student.name} (${student.email})` });
    this.searchResults.set([]);
  }

  generate(): void {
    const sub = this.activeSubReport();
    this.loading.set(true);
    this.reportData.set(null);
    const f = this.filters.value;

    switch (sub) {
      case 'student-daily':
        if (!f.studentId) { this.toast.warning('Select a student'); this.loading.set(false); return; }
        this.reportService.getStudentDailyReport(Number(f.studentId), f.date || undefined).subscribe(this.onData, this.onError);
        break;
      case 'student-subject-wise':
        if (!f.studentId) { this.toast.warning('Select a student'); this.loading.set(false); return; }
        this.reportService.getStudentSubjectWiseReport(Number(f.studentId), f.subjectId ? Number(f.subjectId) : undefined).subscribe(this.onData, this.onError);
        break;
      case 'student-aggregate':
        if (!f.studentId) { this.toast.warning('Select a student'); this.loading.set(false); return; }
        this.reportService.getStudentAggregateReport(Number(f.studentId)).subscribe(this.onData, this.onError);
        break;
      case 'section-wise':
        if (!f.sectionId) { this.toast.warning('Select a section'); this.loading.set(false); return; }
        this.reportService.getSectionWiseReport(f.sectionId, { page: this.page(), search: f.search || undefined }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'batch-wise':
        if (!f.batchId) { this.toast.warning('Select a batch'); this.loading.set(false); return; }
        this.reportService.getBatchWiseReport(f.batchId, { page: this.page(), search: f.search || undefined }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'subject-report':
        if (!f.subjectId && !f.subjectCode) { this.toast.warning('Select a subject'); this.loading.set(false); return; }
        this.reportService.getSubjectWiseReport({ subjectId: f.subjectId ? Number(f.subjectId) : undefined, subjectCode: f.subjectCode || undefined, page: this.page() }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'daily-summary':
        this.reportService.getDailySummaryReport(f.date || undefined).subscribe(this.onData, this.onError);
        break;
      case 'monthly':
        this.reportService.getMonthlyReport(f.month ? Number(f.month) : undefined, f.year ? Number(f.year) : undefined).subscribe(this.onData, this.onError);
        break;
      case 'date-range':
        if (!f.startDate || !f.endDate) { this.toast.warning('Select start and end dates'); this.loading.set(false); return; }
        this.reportService.getDateRangeReport({ startDate: f.startDate, endDate: f.endDate, sectionId: f.sectionId || undefined, batchId: f.batchId || undefined, page: this.page() }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'low-attendance':
        this.reportService.getLowAttendanceReport({ threshold: Number(f.threshold || 80), batchId: f.batchId || undefined, sectionId: f.sectionId || undefined, page: this.page() }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'absent-students':
        this.reportService.getAbsentStudentsReport({ date: f.date || undefined, subjectId: f.subjectId ? Number(f.subjectId) : undefined, sectionId: f.sectionId || undefined, page: this.page() }).subscribe({
          next: (r) => { this.reportData.set(r.data); this.pagination.set(r.pagination ?? null); this.loading.set(false); },
          error: this.onError,
        });
        break;
      case 'top-performers':
        this.reportService.getTopPerformersReport({ limit: Number(f.limit || 10), batchId: f.batchId || undefined, sectionId: f.sectionId || undefined }).subscribe(this.onData, this.onError);
        break;
      case 'leaderboard':
        this.reportService.getLeaderboardReport({ batchId: f.batchId || undefined, sectionId: f.sectionId || undefined }).subscribe(this.onData, this.onError);
        break;
      case 'section-comparison':
        if (!f.batchId) { this.toast.warning('Select a batch'); this.loading.set(false); return; }
        this.reportService.getSectionComparisonReport(f.batchId).subscribe(this.onData, this.onError);
        break;
      case 'batch-comparison':
        this.reportService.getBatchComparisonReport().subscribe(this.onData, this.onError);
        break;
      case 'trend-analytics':
        this.reportService.getTrendAnalytics({ months: Number(f.months || 6), batchId: f.batchId || undefined, sectionId: f.sectionId || undefined }).subscribe(this.onData, this.onError);
        break;
      default:
        this.loading.set(false);
    }
  }

  private readonly onData = (res: any) => {
    this.reportData.set(res.data ?? res);
    this.loading.set(false);
  };

  private readonly onError = (err: any) => {
    this.toast.error(err.error?.message ?? 'Failed to load report');
    this.loading.set(false);
  };

  goToPage(p: number): void {
    this.page.set(p);
    this.generate();
  }

  exportCSV(): void {
    const data = this.reportData();
    if (!data) { this.toast.warning('No data to export'); return; }
    let csv = '';
    const sub = this.activeSubReport();

    if (sub === 'student-daily' && data.attendance) {
      csv = 'Subject,Status,Date\n';
      data.attendance.forEach((r: any) => { csv += `${r.subject.code},${r.status},${r.date}\n`; });
    } else if ((sub === 'student-subject-wise' || sub === 'student-aggregate') && data.subjects) {
      csv = 'Subject,Total,Present,Absent,Late,Percentage\n';
      data.subjects.forEach((s: any) => { csv += `${s.subject.code},${s.total},${s.present},${s.absent},${s.late},${s.attendancePercentage}\n`; });
    } else if ((sub === 'section-wise' || sub === 'batch-wise') && data.studentData) {
      csv = 'Student Name,Email,Reg No,Total,Present,Absent,Late,Percentage\n';
      data.studentData.forEach((sd: any) => {
        const s = sd.student || sd;
        const o = sd.overall || sd;
        csv += `${s.name},${s.email},${s.regNum || ''},${o.total || 0},${o.present || 0},${o.absent || 0},${o.late || 0},${o.attendancePercentage || 0}\n`;
      });
    } else if (sub === 'leaderboard' && data.leaderboard) {
      csv = 'Rank,Name,Email,Total,Present,Absent,Late,Percentage\n';
      data.leaderboard.forEach((e: LeaderboardEntry) => {
        csv += `${e.rank},${e.student.name},${e.student.email},${e.overall.total},${e.overall.present},${e.overall.absent},${e.overall.late},${e.overall.attendancePercentage}\n`;
      });
    } else if (sub === 'top-performers' && data.topPerformers) {
      csv = 'Rank,Name,Email,Total,Present,Absent,Late,Percentage\n';
      data.topPerformers.forEach((p: TopPerformer) => {
        csv += `${p.rank},${p.student.name},${p.student.email},${p.total},${p.present},${p.absent},${p.late},${p.attendancePercentage}\n`;
      });
    } else if (sub === 'low-attendance' && data.students) {
      csv = 'Name,Email,Reg No,Total,Present,Absent,Late,Percentage\n';
      data.students.forEach((s: any) => {
        csv += `${s.student.name},${s.student.email},${s.student.regNum || ''},${s.overall.total},${s.overall.present},${s.overall.absent},${s.overall.late},${s.overall.attendancePercentage}\n`;
      });
    } else if (sub === 'monthly' && data.dailyTrend) {
      csv = 'Date,Total,Present,Absent,Late\n';
      data.dailyTrend.forEach((d: any) => { csv += `${d.date},${d.total},${d.present},${d.absent},${d.late}\n`; });
    } else if (sub === 'trend-analytics' && data.monthlyTrend) {
      csv = 'Month,Total,Present,Absent,Late,Percentage\n';
      data.monthlyTrend.forEach((m: any) => { csv += `${m.month},${m.total},${m.present},${m.absent},${m.late},${m.attendancePercentage}\n`; });
    } else {
      csv = JSON.stringify(data, null, 2);
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sub}-report.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.toast.success('CSV exported');
  }

  pct(value: number | undefined | null): number {
    return value ?? 0;
  }

  pctClass(value: number | undefined | null): string {
    const v = value ?? 0;
    if (v >= 90) return 'pct--excellent';
    if (v >= 80) return 'pct--good';
    if (v >= 60) return 'pct--average';
    return 'pct--poor';
  }

  /**
   * Returns a chart configuration for the current report or null if no chart
   * applies. Used by the visualisation panel injected above the report table.
   */
  readonly chart = computed<{ title: string; subtitle?: string; items: { label: string; value: number; color: string }[] } | null>(() => {
    const data = this.reportData();
    if (!data) return null;
    const sub = this.activeSubReport();
    const colorFor = (pct: number) => {
      if (pct >= 90) return '#22C55E';
      if (pct >= 80) return '#1A3A5C';
      if (pct >= 60) return '#F59E0B';
      return '#EF4444';
    };

    // Subject-level attendance for one student
    if ((sub === 'student-subject-wise' || sub === 'student-aggregate') && data.subjectStats?.length) {
      return {
        title: 'Attendance by Subject',
        subtitle: `${data.student?.name ?? 'Student'}`,
        items: data.subjectStats.map((s: any) => ({
          label: s.subject?.code || s.subject?.name || '—',
          value: s.attendancePercentage ?? 0,
          color: colorFor(s.attendancePercentage ?? 0),
        })),
      };
    }
    if (sub === 'student-subject-wise' && data.subjects?.length) {
      return {
        title: 'Attendance by Subject',
        subtitle: `${data.student?.name ?? 'Student'}`,
        items: data.subjects.map((s: any) => ({
          label: s.subject?.code || s.subject?.name || '—',
          value: s.attendancePercentage ?? 0,
          color: colorFor(s.attendancePercentage ?? 0),
        })),
      };
    }

    // Section / Batch report — show top 12 students by attendance %
    if ((sub === 'section-wise' || sub === 'batch-wise') && data.studentData?.length) {
      const items = data.studentData
        .map((sd: any) => ({
          label: (sd.student?.name || sd.name || '').split(' ')[0] || '—',
          value: sd.overall?.attendancePercentage ?? sd.attendancePercentage ?? 0,
          color: colorFor(sd.overall?.attendancePercentage ?? sd.attendancePercentage ?? 0),
        }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 12);
      return {
        title: 'Top Students by Attendance',
        subtitle: `${items.length} of ${data.studentData.length} students`,
        items,
      };
    }

    // Daily summary — subject breakdown
    if (sub === 'daily-summary' && data.subjectBreakdown?.length) {
      return {
        title: 'Attendance by Subject Today',
        subtitle: data.date,
        items: data.subjectBreakdown.map((s: any) => ({
          label: s.subjectCode,
          value: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
          color: colorFor(s.total > 0 ? (s.present / s.total) * 100 : 0),
        })),
      };
    }

    // Monthly — daily trend
    if (sub === 'monthly' && data.dailyTrend?.length) {
      return {
        title: 'Daily Attendance Trend',
        subtitle: `${data.month}/${data.year}`,
        items: data.dailyTrend.slice(-20).map((d: any) => ({
          label: String(d.date).slice(-5),
          value: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
          color: colorFor(d.total > 0 ? (d.present / d.total) * 100 : 0),
        })),
      };
    }

    // Top performers
    if (sub === 'top-performers' && data.topPerformers?.length) {
      return {
        title: 'Top Performers',
        subtitle: `${data.topPerformers.length} students`,
        items: data.topPerformers.slice(0, 12).map((p: any) => ({
          label: (p.student?.name ?? '').split(' ')[0] || `#${p.rank}`,
          value: p.attendancePercentage ?? 0,
          color: '#22C55E',
        })),
      };
    }

    // Leaderboard
    if (sub === 'leaderboard' && data.leaderboard?.length) {
      return {
        title: 'Leaderboard',
        subtitle: `Average ${data.summary?.averageAttendance?.toFixed?.(1) ?? '—'}%`,
        items: data.leaderboard.slice(0, 12).map((e: any) => ({
          label: (e.student?.name ?? '').split(' ')[0] || `#${e.rank}`,
          value: e.overall?.attendancePercentage ?? 0,
          color: colorFor(e.overall?.attendancePercentage ?? 0),
        })),
      };
    }

    // Low attendance — sorted ascending
    if (sub === 'low-attendance' && data.students?.length) {
      const items = data.students
        .map((s: any) => ({
          label: (s.student?.name ?? '').split(' ')[0] || '—',
          value: s.overall?.attendancePercentage ?? 0,
          color: '#EF4444',
        }))
        .sort((a: any, b: any) => a.value - b.value)
        .slice(0, 12);
      return {
        title: 'Students Needing Attention',
        subtitle: `${data.totalLowAttendance ?? items.length} of ${data.totalStudents ?? items.length} below threshold`,
        items,
      };
    }

    // Section comparison
    if (sub === 'section-comparison' && data.sections?.length) {
      return {
        title: 'Section Comparison',
        subtitle: data.batch?.name ?? '',
        items: data.sections.map((s: any) => ({
          label: s.section?.name || s.name || '—',
          value: s.attendancePercentage ?? 0,
          color: colorFor(s.attendancePercentage ?? 0),
        })),
      };
    }

    // Batch comparison
    if (sub === 'batch-comparison' && data.batches?.length) {
      return {
        title: 'Batch Comparison',
        items: data.batches.map((b: any) => ({
          label: b.batch?.name || b.name || '—',
          value: b.attendancePercentage ?? 0,
          color: colorFor(b.attendancePercentage ?? 0),
        })),
      };
    }

    return null;
  });

  readonly trendSvg = computed<{
    points: string;
    areaPoints: string;
    dots: { x: number; y: number; pct: number; month: string }[];
    thresholdY: number;
  } | null>(() => {
    const data = this.reportData();
    if (this.activeSubReport() !== 'trend-analytics') return null;
    const trend = data?.monthlyTrend;
    if (!trend?.length) return null;

    const PAD_L = 40, PAD_T = 20, CHART_W = 520, CHART_H = 150;
    const n = trend.length;
    const xStep = n > 1 ? CHART_W / (n - 1) : CHART_W;

    const dots = trend.map((m: any, i: number) => {
      const pct = m.attendancePercentage ?? 0;
      const x = Math.round(PAD_L + (n > 1 ? i * xStep : CHART_W / 2));
      const y = Math.round(PAD_T + CHART_H - (pct / 100) * CHART_H);
      return { x, y, pct: Math.round(pct * 10) / 10, month: String(m.month).slice(-5) };
    });

    const points = dots.map((d: { x: number; y: number }) => `${d.x},${d.y}`).join(' ');
    const areaPoints = `${dots[0].x},${PAD_T + CHART_H} ${points} ${dots[n - 1].x},${PAD_T + CHART_H}`;
    const thresholdY = Math.round(PAD_T + CHART_H - 0.8 * CHART_H);

    return { points, areaPoints, dots, thresholdY };
  });

  /** Print just the report area (filters, tabs, and toolbar are hidden via @media print). */
  printReport(): void {
    setTimeout(() => window.print(), 100);
  }
}
