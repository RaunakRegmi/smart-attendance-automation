import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentPortalApiService } from '../../../core/services/student-portal-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-student-attendance',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './student-attendance.component.html',
  styleUrl: './student-attendance.component.scss',
})
export class StudentAttendanceComponent implements OnInit {
  private readonly portal = inject(StudentPortalApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly token = signal('');
  readonly sessionId = signal('');
  readonly scanning = signal(false);
  readonly scanResult = signal<{ status: string; scannedAt: string } | null>(null);
  readonly scanError = signal('');

  readonly lateSessionId = signal('');
  readonly remarks = signal('');
  readonly submittingLate = signal(false);
  readonly lateResult = signal<string | null>(null);
  readonly lateError = signal('');

  ngOnInit(): void {
    // Deep link from a scanned QR code: /student?token=...&sessionId=...
    // Auto-fill and submit immediately — the token has a very short expiry,
    // so don't wait on the student to press anything.
    const params = this.route.snapshot.queryParamMap;
    const tok = params.get('token');
    const sid = params.get('sessionId');
    if (tok && sid) {
      this.token.set(tok);
      this.sessionId.set(sid);
      // Drop the query params from the URL so a refresh doesn't resubmit.
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
      this.scan();
    }
  }

  scan(): void {
    const tok = this.token().trim();
    const sid = this.sessionId().trim();
    if (!tok || !sid) {
      this.scanError.set('Both token and session ID are required');
      return;
    }

    this.scanning.set(true);
    this.scanResult.set(null);
    this.scanError.set('');

    this.portal.scanAttendance(tok, sid).subscribe({
      next: (res) => {
        this.scanning.set(false);
        if (res.success && res.data) {
          this.scanResult.set(res.data);
          this.toast.success(`Attendance marked as ${res.data.status}`);
          this.token.set('');
          this.sessionId.set('');
        } else {
          this.scanError.set(res.message || 'Scan failed');
        }
      },
      error: (err) => {
        this.scanning.set(false);
        this.scanError.set(err.error?.message || 'Failed to scan attendance');
      },
    });
  }

  submitLateRequest(): void {
    const sid = this.lateSessionId().trim();
    const rem = this.remarks().trim();
    if (!sid || !rem) {
      this.lateError.set('Session ID and remarks are required');
      return;
    }

    this.submittingLate.set(true);
    this.lateResult.set(null);
    this.lateError.set('');

    this.portal.submitLateRequest(sid, rem).subscribe({
      next: (res) => {
        this.submittingLate.set(false);
        if (res.success) {
          this.lateResult.set('Late request submitted successfully');
          this.toast.success('Late request submitted');
          this.lateSessionId.set('');
          this.remarks.set('');
        } else {
          this.lateError.set(res.message || 'Submission failed');
        }
      },
      error: (err) => {
        this.submittingLate.set(false);
        this.lateError.set(err.error?.message || 'Failed to submit late request');
      },
    });
  }
}
