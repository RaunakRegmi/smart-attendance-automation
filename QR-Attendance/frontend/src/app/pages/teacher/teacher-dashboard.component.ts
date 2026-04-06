import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClassesApiService, type ClassSummary } from '../../core/api/classes-api.service';
import { AttendanceApiService, type LiveAttendanceResponse, type StartAttendanceResponse } from '../../core/api/attendance-api.service';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.scss',
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private classesApi = inject(ClassesApiService);
  private attendanceApi = inject(AttendanceApiService);
  private snack = inject(MatSnackBar);

  classes: ClassSummary[] = [];
  selectedClassId: string | null = null;

  busy = false;
  liveBusy = false;

  session: StartAttendanceResponse['session'] | null = null;
  qrDataUrl: string | null = null;
  live: LiveAttendanceResponse | null = null;
  pollHandle: any = null;

  scheduleForm = this.fb.group({
    dayOfWeek: [1, [Validators.required]],
    startTime: ['09:00', [Validators.required]],
    endTime: ['10:00', [Validators.required]],
  });

  enrollForm = this.fb.group({
    studentId: ['', [Validators.required]],
  });

  startForm = this.fb.group({
    durationMinutes: [60, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    this.classesApi.listClasses().subscribe({
      next: (data) => {
        this.classes = data;
        if (data.length && !this.selectedClassId) this.selectedClassId = data[0].id;
      },
      error: () => this.snack.open('Failed to load classes', 'Dismiss', { duration: 3500 }),
    });
  }

  selectClass(id: string) {
    this.selectedClassId = id;
  }

  addSchedule() {
    if (!this.selectedClassId) return;
    if (this.scheduleForm.invalid) return;
    this.busy = true;
    const v = this.scheduleForm.value;

    this.classesApi.addSchedule(this.selectedClassId, {
      dayOfWeek: Number(v.dayOfWeek),
      startTime: String(v.startTime),
      endTime: String(v.endTime),
    }).subscribe({
      next: () => {
        this.busy = false;
        this.snack.open('Schedule added', 'Dismiss', { duration: 2500 });
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Failed to add schedule', 'Dismiss', { duration: 4500 });
      },
    });
  }

  enrollStudent() {
    if (!this.selectedClassId) return;
    if (this.enrollForm.invalid) return;
    this.busy = true;
    const studentId = String(this.enrollForm.value.studentId).trim();

    this.classesApi.enrollStudent(this.selectedClassId, studentId).subscribe({
      next: () => {
        this.busy = false;
        this.snack.open('Student enrolled', 'Dismiss', { duration: 2500 });
        this.enrollForm.reset({ studentId: '' });
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Enrollment failed', 'Dismiss', { duration: 4500 });
      },
    });
  }

  startAttendance() {
    if (!this.selectedClassId) return;
    if (this.startForm.invalid) return;
    this.busy = true;

    const durationMinutes = Number(this.startForm.value.durationMinutes);
    this.attendanceApi.startSession({ classId: this.selectedClassId, durationMinutes }).subscribe({
      next: (resp) => {
        this.busy = false;
        this.session = resp.session;
        this.qrDataUrl = resp.qr.dataUrl;
        this.live = null;
        this.startPolling(resp.session.id);
        this.snack.open('Attendance session started', 'Dismiss', { duration: 2500 });
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Failed to start session', 'Dismiss', { duration: 4500 });
      },
    });
  }

  startPolling(sessionId: string) {
    if (this.pollHandle) clearInterval(this.pollHandle);

    const refresh = () => {
      this.liveBusy = true;
      this.attendanceApi.liveAttendance(sessionId).subscribe({
        next: (data) => {
          this.liveBusy = false;
          this.live = data;
          const end = new Date(data.session.end_time).getTime();
          if (Date.now() > end + 5000) {
            if (this.pollHandle) clearInterval(this.pollHandle);
            this.pollHandle = null;
          }
        },
        error: () => {
          this.liveBusy = false;
          if (this.pollHandle) clearInterval(this.pollHandle);
          this.pollHandle = null;
        },
      });
    };

    refresh();
    this.pollHandle = setInterval(refresh, 3000);
  }

  stopPolling() {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = null;
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  lateClass(status: string) {
    return status === 'LATE';
  }
}

