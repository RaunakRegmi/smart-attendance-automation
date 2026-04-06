import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../core/auth/auth.store';
import { ClassesApiService, type ClassSummary } from '../../core/api/classes-api.service';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { FormsModule } from '@angular/forms';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private auth = inject(AuthStore);
  private classesApi = inject(ClassesApiService);
  private reportsApi = inject(ReportsApiService);
  private snack = inject(MatSnackBar);

  role: Role | null = null;
  classes: ClassSummary[] = [];

  busy = false;

  // Student
  studentReport: any | null = null;

  // Teacher/Admin
  selectedClassId: string | null = null;
  classReport: any | null = null;

  month = '';
  monthlyReport: any | null = null;

  ngOnInit() {
    this.role = this.auth.user()?.role || null;
    this.month = this.month || new Date().toISOString().slice(0, 7);

    this.classesApi.listClasses().subscribe({
      next: (data) => {
        this.classes = data;
        if (data.length && !this.selectedClassId) this.selectedClassId = data[0].id;
      },
      error: () => {
        // Student can still load report; teacher/admin needs class report.
      },
    });
  }

  loadMyReport() {
    if (!this.role || this.role !== 'STUDENT') return;
    this.busy = true;
    this.reportsApi.studentMe().subscribe({
      next: (resp) => {
        this.busy = false;
        this.studentReport = resp;
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Failed to load report', 'Dismiss', { duration: 4500 });
      },
    });
  }

  loadClassReport() {
    if (!this.selectedClassId) return;
    this.busy = true;
    this.reportsApi.classReport(this.selectedClassId).subscribe({
      next: (resp) => {
        this.busy = false;
        this.classReport = resp;
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Failed to load class report', 'Dismiss', { duration: 4500 });
      },
    });
  }

  loadMonthly() {
    this.busy = true;
    const classId = this.selectedClassId || undefined;
    this.reportsApi.monthly(this.month, classId).subscribe({
      next: (resp) => {
        this.busy = false;
        this.monthlyReport = resp;
      },
      error: (err) => {
        this.busy = false;
        this.snack.open(err?.error?.message || 'Failed to load monthly report', 'Dismiss', { duration: 4500 });
      },
    });
  }
}

