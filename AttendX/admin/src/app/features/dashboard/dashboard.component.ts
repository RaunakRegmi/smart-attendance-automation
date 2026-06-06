import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../core/services/dashboard.service';
import { ChatbotService, AnalyticsData } from '../../core/services/chatbot.service';
import { ReportService } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardData } from '../../core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly chatbot = inject(ChatbotService);
  private readonly reports = inject(ReportService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly data = signal<DashboardData | null>(null);
  readonly analytics = signal<AnalyticsData | null>(null);
  readonly sendingWeekly = signal(false);
  readonly refreshingAI = signal(false);

  readonly statCards = signal<
    { label: string; value: number; color: string; icon: string; route: string }[]
  >([]);

  ngOnInit(): void {
    this.dashboardService.getOverview().subscribe({
      next: (res) => {
        if (res.success) {
          this.data.set(res.data);
          this.statCards.set([
            { label: 'Total Students', value: res.data.totalStudents, color: 'blue', icon: 'students', route: '/students' },
            { label: 'Total Subjects', value: res.data.totalSubjects, color: 'green', icon: 'subjects', route: '/subjects' },
            { label: 'Total Batches', value: res.data.totalBatches, color: 'purple', icon: 'batches', route: '/batches' },
            { label: 'Generated Reports', value: res.data.generatedReports, color: 'orange', icon: 'reports', route: '/reports' },
          ]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // Fire analytics in parallel — non-blocking, charts appear when ready
    this.chatbot.getAnalytics()
      .then((a) => this.analytics.set(a))
      .catch(() => this.analytics.set(null));
  }

  // ── Enrollment SVG line chart ──
  readonly enrollmentSvg = computed<{
    points: string;
    areaPoints: string;
    dots: { x: number; y: number; count: number; label: string }[];
    trendPct: number | null;
  } | null>(() => {
    const trend = this.data()?.enrollmentTrend ?? [];
    if (!trend.length) return null;

    const PAD_L = 30, PAD_T = 20, CHART_W = 520, CHART_H = 140;
    const n = trend.length;
    const counts = trend.map((t) => parseInt(String(t.count), 10) || 0);
    const maxVal = Math.max(...counts, 1);
    const xStep = n > 1 ? CHART_W / (n - 1) : CHART_W / 2;

    const dots = trend.map((t, i) => {
      const count = counts[i];
      const x = Math.round(PAD_L + (n > 1 ? i * xStep : CHART_W / 2));
      const y = Math.round(PAD_T + CHART_H - (count / maxVal) * CHART_H);
      return { x, y, count, label: this.formatMonth(String(t.month)) };
    });

    const points = dots.map((d) => `${d.x},${d.y}`).join(' ');
    const areaPoints = `${dots[0].x},${PAD_T + CHART_H} ${points} ${dots[n - 1].x},${PAD_T + CHART_H}`;

    const first = counts[0], last = counts[n - 1];
    const trendPct = first > 0 ? Math.round(((last - first) / first) * 100) : null;

    return { points, areaPoints, dots, trendPct };
  });

  // ── Helpers for the existing charts ──
  maxEnrollment(): number {
    const trend = this.data()?.enrollmentTrend ?? [];
    return Math.max(...trend.map((t) => parseInt(String(t.count), 10) || 0), 1);
  }

  maxDept(): number {
    const depts = this.data()?.subjectsByDepartment ?? [];
    return Math.max(...depts.map((d) => d.count), 1);
  }

  formatMonth(month: string): string {
    if (!month) return '';
    const d = new Date(month);
    return d.toLocaleDateString('en-US', { month: 'short' });
  }

  parseCount(value: string | number): number {
    return parseInt(String(value), 10) || 0;
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }

  // ── Donut chart maths ──
  /** Returns SVG path "stroke-dasharray" entries summed to 100. */
  donutSegments(): { color: string; offset: number; length: number; label: string; count: number; percent: number }[] {
    const a = this.analytics();
    if (!a) return [];
    const palette: Record<string, string> = {
      'Excellent': '#22C55E',
      'Satisfactory': '#1A3A5C',
      'At Risk': '#F59E0B',
      'Critical': '#EF4444',
    };
    let offset = 25; // start at top
    return a.distribution.map((d) => {
      const seg = {
        color: palette[d.label] || '#94A3B8',
        offset,
        length: d.percent,
        label: d.label,
        count: d.count,
        percent: d.percent,
      };
      offset += d.percent;
      return seg;
    });
  }

  maxBatchAttendance(): number {
    return Math.max(...(this.analytics()?.byBatch.map((b) => b.avgAttendance) ?? [0]), 1);
  }

  maxCourseAttendance(): number {
    return Math.max(...(this.analytics()?.byCourse.map((c) => c.avgAttendance) ?? [0]), 1);
  }

  attendanceTier(pct: number): string {
    if (pct >= 90) return 'excellent';
    if (pct >= 75) return 'good';
    if (pct >= 60) return 'risk';
    return 'critical';
  }

  sendWeeklyReports(): void {
    if (this.sendingWeekly()) return;
    this.sendingWeekly.set(true);
    this.reports.runWeeklyReportsNow().subscribe({
      next: (res) => {
        this.toast.success(`Weekly reports sent to ${res.data.generated} students`);
        this.sendingWeekly.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Failed to send weekly reports');
        this.sendingWeekly.set(false);
      },
    });
  }

  refreshAI(): void {
    if (this.refreshingAI()) return;
    this.refreshingAI.set(true);
    this.chatbot.refreshKnowledge()
      .then((res) => {
        if (res?.success) {
          this.toast.success(`AI knowledge refreshed — ${res.studentsExported ?? 0} students indexed`);
        } else {
          this.toast.error(res?.error || res?.message || 'Refresh failed');
        }
      })
      .catch((err) => this.toast.error(err?.message ?? 'Refresh failed'))
      .finally(() => this.refreshingAI.set(false));
  }
}
