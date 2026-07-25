import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import QRCode from 'qrcode';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { QrSessionService } from '../../../core/services/qr-session.service';
import {
  AttendanceRequest,
  ClassType,
  TeacherClass,
  QRSession,
  QRSessionHistoryItem,
  QRSessionDetail,
} from '../../../core/models/api.models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-teacher-attendance',
  standalone: true,
  imports: [FormsModule, DatePipe, PaginationComponent],
  templateUrl: './teacher-attendance.component.html',
})
export class TeacherAttendanceComponent implements OnInit, OnDestroy {
  private readonly portal = inject(TeacherPortalService);
  private readonly qrService = inject(QrSessionService);

  readonly tabs = ['Create Session', 'Session History', 'Late Requests'] as const;
  readonly classTypes: ClassType[] = ['Lecture', 'Tutorial', 'Workshop'];

  readonly activeTab = signal<number>(0);
  readonly loading = signal(false);
  readonly classes = signal<TeacherClass[]>([]);

  readonly selectedSectionId = signal('');
  readonly selectedSubjectId = signal<number | null>(null);
  readonly selectedClassType = signal<ClassType>('Lecture');
  readonly selectedDate = signal('');

  readonly activeSession = signal<QRSession | null>(null);
  readonly sessionDetail = signal<QRSessionDetail | null>(null);
  readonly showDetailModal = signal(false);

  readonly history = signal<QRSessionHistoryItem[]>([]);
  readonly historyPage = signal(1);
  readonly historyTotalPages = signal(1);
  readonly historyTotal = signal(0);
  readonly historyLimit = signal(10);

  readonly pendingRequests = signal<AttendanceRequest[]>([]);
  readonly requestsPage = signal(1);
  readonly requestsTotalPages = signal(1);
  readonly requestsTotal = signal(0);
  readonly requestsLimit = signal(10);

  readonly requestActionLoading = signal<number | null>(null);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly filteredSubjects = computed(() => {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return [];
    const seen = new Map<number, { id: number; code: string | null; name: string | null }>();
    for (const c of this.classes()) {
      if (c.sectionId === sectionId && !seen.has(c.subjectId)) {
        seen.set(c.subjectId, { id: c.subjectId, code: c.subjectCode, name: c.subjectName });
      }
    }
    return Array.from(seen.values());
  });

  readonly uniqueSections = computed(() => {
    const seen = new Map<string, { id: string; name: string | null; batch: string | null }>();
    for (const c of this.classes()) {
      if (!seen.has(c.sectionId)) {
        seen.set(c.sectionId, { id: c.sectionId, name: c.sectionName, batch: c.batchName });
      }
    }
    return Array.from(seen.values());
  });

  private readonly qrDeepLink = computed(() => {
    const session = this.activeSession();
    if (!session?.token) return '';
    // Encode a deep link (not just the raw token) so any phone's native camera
    // app can scan and open it directly — the student page auto-submits from
    // the URL's query params instead of requiring manual copy-paste.
    // publicOrigin overrides the browser origin: a phone scanning a `localhost`
    // link resolves it to itself, so serving over LAN/tunnel needs that host baked in.
    const origin = environment.publicOrigin || window.location.origin;
    return `${origin}/student?token=${encodeURIComponent(session.token)}&sessionId=${encodeURIComponent(session.id)}`;
  });

  readonly qrImageUrl = signal<string>('');

  /// The QR is rendered to a local data URI rather than fetched from an image API,
  /// so it still appears when the machine has no internet access — and so a token
  /// that lives 5 seconds isn't waiting on a network round-trip to be displayed.
  private readonly renderQr = effect(() => {
    const link = this.qrDeepLink();
    if (!link) {
      this.qrImageUrl.set('');
      return;
    }
    QRCode.toDataURL(link, {
      width: 280,
      margin: 1,
      color: { dark: '#0F172AFF', light: '#FFFFFFFF' },
    })
      .then((dataUrl) => this.qrImageUrl.set(dataUrl))
      .catch(() => this.qrImageUrl.set(''));
  });

  ngOnInit(): void {
    const today = new Date();
    this.selectedDate.set(today.toISOString().slice(0, 10));

    this.portal.getClasses().subscribe({
      next: (res) => this.classes.set(res.data ?? []),
    });

    this.loadSessionHistory();
    this.loadPendingRequests();
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  switchTab(index: number): void {
    this.activeTab.set(index);
    if (index === 1) this.loadSessionHistory();
    if (index === 2) this.loadPendingRequests();
  }

  onSectionChange(sectionId: string): void {
    this.selectedSectionId.set(sectionId);
    this.selectedSubjectId.set(null);
  }

  startSession(): void {
    const sectionId = this.selectedSectionId();
    const subjectId = this.selectedSubjectId();
    if (!sectionId || !subjectId) return;

    this.loading.set(true);
    this.qrService
      .createSession({
        sectionId,
        subjectId,
        classType: this.selectedClassType(),
        date: this.selectedDate(),
      })
      .subscribe({
        next: (res) => {
          this.activeSession.set(res.data);
          this.loading.set(false);
          this.startRefreshTimer();
        },
        error: () => this.loading.set(false),
      });
  }

  refreshQR(): void {
    const session = this.activeSession();
    if (!session || !session.id) return;
    this.qrService.refreshQR(session.id).subscribe({
      next: (res) => {
        this.activeSession.update((s) =>
          s ? { ...s, token: res.data.token, tokenExpiresAt: res.data.tokenExpiresAt } : s,
        );
      },
    });
  }

  closeSession(): void {
    const session = this.activeSession();
    if (!session) return;
    this.loading.set(true);
    this.qrService.closeSession(session.id).subscribe({
      next: (res) => {
        this.activeSession.set(null);
        this.clearRefreshTimer();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  viewSession(session: QRSessionHistoryItem): void {
    this.loading.set(true);
    this.qrService.getSession(session.id).subscribe({
      next: (res) => {
        this.sessionDetail.set(res.data);
        this.showDetailModal.set(true);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.sessionDetail.set(null);
  }

  loadSessionHistory(): void {
    this.loading.set(true);
    this.qrService
      .getSessionHistory({
        page: this.historyPage(),
        limit: this.historyLimit(),
      })
      .subscribe({
        next: (res) => {
          this.history.set(res.data ?? []);
          this.historyTotal.set(res.pagination.total);
          this.historyTotalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onHistoryPageChange(page: number): void {
    this.historyPage.set(page);
    this.loadSessionHistory();
  }

  onHistoryLimitChange(limit: number): void {
    this.historyLimit.set(limit);
    this.historyPage.set(1);
    this.loadSessionHistory();
  }

  loadPendingRequests(): void {
    this.loading.set(true);
    this.qrService
      .getPendingRequests({
        page: this.requestsPage(),
        limit: this.requestsLimit(),
      })
      .subscribe({
        next: (res) => {
          this.pendingRequests.set(res.data ?? []);
          this.requestsTotal.set(res.pagination.total);
          this.requestsTotalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  approveRequest(req: AttendanceRequest, resolvedStatus: 'Present' | 'Late'): void {
    this.requestActionLoading.set(req.id);
    this.qrService.decideRequest(req.id, { status: 'Approved', resolvedStatus }).subscribe({
      next: () => {
        this.pendingRequests.update((list) => list.filter((r) => r.id !== req.id));
        this.requestsTotal.update((t) => t - 1);
        this.requestActionLoading.set(null);
      },
      error: () => this.requestActionLoading.set(null),
    });
  }

  rejectRequest(req: AttendanceRequest): void {
    this.requestActionLoading.set(req.id);
    this.qrService.decideRequest(req.id, { status: 'Rejected' }).subscribe({
      next: () => {
        this.pendingRequests.update((list) => list.filter((r) => r.id !== req.id));
        this.requestsTotal.update((t) => t - 1);
        this.requestActionLoading.set(null);
      },
      error: () => this.requestActionLoading.set(null),
    });
  }

  scansByStatus(scans: QRSessionDetail['scans'], status: string) {
    return scans.filter((s) => s.status === status);
  }

  private startRefreshTimer(): void {
    this.clearRefreshTimer();
    this.refreshTimer = setInterval(() => this.refreshQR(), 5000);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
