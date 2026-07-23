import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { QrService, QRSession } from '../../core/services/qr.service';
import { Subject } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-qr-attendance',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './qr-attendance.component.html',
  styleUrl: './qr-attendance.component.scss',
})
export class QrAttendanceComponent implements OnInit {
  private readonly qrService = inject(QrService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly subjects = signal<Subject[]>([]);
  readonly activeSessions = signal<QRSession[]>([]);
  readonly generating = signal(false);
  readonly qrImage = signal<string | null>(null);
  readonly qrSubject = signal<string>('');
  readonly qrExpiry = signal<string>('');
  readonly secondsLeft = signal(0);

  readonly form = this.fb.nonNullable.group({
    subjectId: ['', Validators.required],
  });

  private _timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadSubjects();
    this.loadSessions();
  }

  loadSubjects(): void {
    this.qrService.getAllSubjects().subscribe({
      next: (s) => this.subjects.set(s),
    });
  }

  loadSessions(): void {
    this.qrService.getActiveSessions().subscribe({
      next: (s) => this.activeSessions.set(s),
    });
  }

  generate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    const subjectId = parseInt(this.form.getRawValue().subjectId, 10);
    this.qrService.generateQR(subjectId).subscribe({
      next: (data) => {
        this.qrImage.set(data.qrImage);
        this.qrSubject.set(`${data.subjectCode} - ${data.subjectName}`);
        this.qrExpiry.set(new Date(data.expiresAt).toLocaleTimeString());
        this.startCountdown(data.expiresAt);
        this.toast.success(`QR generated for ${data.subjectCode}`);
        this.generating.set(false);
        this.loadSessions();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to generate QR');
        this.generating.set(false);
      },
    });
  }

  private startCountdown(expiresAt: string): void {
    if (this._timer) clearInterval(this._timer);
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      this.secondsLeft.set(diff);
      if (diff <= 0 && this._timer) {
        clearInterval(this._timer);
        this.qrImage.set(null);
        this.loadSessions();
      }
    };
    update();
    this._timer = setInterval(update, 1000);
  }

  deactivate(id: string): void {
    this.qrService.deactivateSession(id).subscribe({
      next: () => {
        this.toast.success('Session deactivated');
        this.loadSessions();
      },
      error: () => this.toast.error('Failed to deactivate'),
    });
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }
}
