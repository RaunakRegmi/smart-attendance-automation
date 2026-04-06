import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClassesApiService, type ClassSummary } from '../../core/api/classes-api.service';
import { AttendanceApiService, type AttendanceScanResult } from '../../core/api/attendance-api.service';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.scss',
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private classesApi = inject(ClassesApiService);
  private attendanceApi = inject(AttendanceApiService);
  private snack = inject(MatSnackBar);

  classes: ClassSummary[] = [];

  @ViewChild('videoEl')
  videoEl?: ElementRef<HTMLVideoElement>;

  codeReader: BrowserMultiFormatReader | null = null;
  private controls: { stop: () => void } | null = null;
  scanning = false;
  scanBusy = false;
  lastScan: AttendanceScanResult['attendance'] | null = null;
  errorMessage: string | null = null;

  correctionReason = '';
  correctionBusy = false;

  ngOnInit() {
    this.classesApi.listClasses().subscribe({
      next: (data) => (this.classes = data),
      error: () => this.snack.open('Failed to load enrolled classes', 'Dismiss', { duration: 3500 }),
    });
  }

  startScanner() {
    if (this.scanning) return;
    if (!this.videoEl) return;

    this.errorMessage = null;
    this.scanBusy = false;
    this.codeReader = new BrowserMultiFormatReader();
    this.scanning = true;

    const video = this.videoEl.nativeElement;
    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    };

    this.codeReader
      .decodeFromConstraints(constraints, video, (result: any | undefined, error, controls) => {
        if (result) {
          const qrText = result.getText();
          controls.stop();
          this.controls = null;
          this.scanning = false;
          this.handleQrText(qrText);
        }
        if (error) {
          // Keep scanning; ignore transient decode errors.
        }
      })
      .then((controls) => {
        this.controls = controls;
      })
      .catch((err) => {
        this.scanning = false;
        this.errorMessage = err?.message || 'Unable to start camera scanning';
      });
  }

  stopScanner() {
    this.scanning = false;
    this.controls?.stop();
    this.controls = null;
    this.codeReader = null;
  }

  private handleQrText(qrText: string) {
    this.scanBusy = true;
    this.errorMessage = null;
    this.attendanceApi.scanQr({ qrToken: qrText }).subscribe({
      next: (resp) => {
        this.scanBusy = false;
        this.lastScan = resp.attendance;
        this.correctionReason = '';
        this.snack.open('Attendance marked successfully', 'Dismiss', { duration: 3000 });
      },
      error: (err) => {
        this.scanBusy = false;
        this.lastScan = null;
        this.errorMessage = err?.error?.message || 'Scan validation failed';
      },
    });
  }

  submitCorrection() {
    if (!this.lastScan) return;
    if (!this.correctionReason.trim()) {
      this.snack.open('Please provide a reason', 'Dismiss', { duration: 3000 });
      return;
    }
    this.correctionBusy = true;
    this.attendanceApi
      .createCorrectionRequest({ sessionId: this.lastScan.session_id, reason: this.correctionReason.trim() })
      .subscribe({
        next: () => {
          this.correctionBusy = false;
          this.snack.open('Correction request submitted', 'Dismiss', { duration: 3500 });
          this.correctionReason = '';
        },
        error: (err) => {
          this.correctionBusy = false;
          this.snack.open(err?.error?.message || 'Request failed', 'Dismiss', { duration: 4500 });
        },
      });
  }

  ngOnDestroy() {
    this.stopScanner();
  }
}

