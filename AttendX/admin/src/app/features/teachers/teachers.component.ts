import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherAdminService } from '../../core/services/teacher-admin.service';
import { LecturerService } from '../../core/services/lecturer.service';
import { SectionService } from '../../core/services/section.service';
import { SubjectService } from '../../core/services/subject.service';
import { ToastService } from '../../core/services/toast.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  Lecturer,
  Section,
  Subject,
  TeacherAccount,
  TeacherAssignmentRow,
} from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './teachers.component.html',
})
export class TeachersComponent implements OnInit {
  private readonly teacherService = inject(TeacherAdminService);
  private readonly lecturerService = inject(LecturerService);
  private readonly sectionService = inject(SectionService);
  private readonly subjectService = inject(SubjectService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly teachers = signal<TeacherAccount[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly showModal = signal(false);
  readonly editing = signal<TeacherAccount | null>(null);
  readonly deactivateTarget = signal<TeacherAccount | null>(null);
  readonly deactivating = signal(false);
  readonly saving = signal(false);

  // Credential delivery
  readonly sendEmail = signal(false);
  readonly sendSms = signal(false);
  readonly deliveryResult = signal<{ teacherName: string; delivery: DeliveryStatus } | null>(null);
  readonly resendFor = signal<TeacherAccount | null>(null);
  readonly resendEmail = signal(false);
  readonly resendSms = signal(false);
  readonly resendNewPassword = signal('');
  readonly resending = signal(false);
  // Server-side duplicate errors shown inline on the relevant field
  readonly emailServerError = signal('');
  readonly phoneServerError = signal('');

  // Assignment management
  readonly assignmentsFor = signal<TeacherAccount | null>(null);
  readonly assignments = signal<TeacherAssignmentRow[]>([]);
  readonly assignmentsLoading = signal(false);
  readonly assignmentSaving = signal(false);
  readonly sections = signal<Section[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly lecturers = signal<Lecturer[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address: [''],
    password: [''],
    lecturerId: [''],
    isActive: [true],
  });

  readonly assignmentForm = this.fb.nonNullable.group({
    sectionId: ['', Validators.required],
    subjectId: ['', Validators.required],
  });

  private emailChannelTouched = false;
  private smsChannelTouched = false;

  ngOnInit(): void {
    this.load();
    this.sectionService.getAll().subscribe({
      next: (res) => this.sections.set((res.data as Section[]) ?? []),
    });
    this.subjectService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.subjects.set(res.data ?? []),
    });
    this.lecturerService.getAll({ limit: 500 }).subscribe({
      next: (res) => this.lecturers.set(res.data ?? []),
    });
    // Channel defaults follow the contact fields (§5): pre-select what's
    // filled in unless the admin has toggled the checkbox manually.
    this.form.controls.email.valueChanges.subscribe((value) => {
      if (!this.emailChannelTouched) this.sendEmail.set(!!value && this.form.controls.email.valid);
      this.emailServerError.set('');
    });
    this.form.controls.phone.valueChanges.subscribe((value) => {
      if (!this.smsChannelTouched) this.sendSms.set(!!value);
      this.phoneServerError.set('');
    });
  }

  load(): void {
    this.loading.set(true);
    this.teacherService.getTeachers({ search: this.search(), page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.teachers.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '', phone: '', address: '', password: '', lecturerId: '', isActive: true });
    this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.sendEmail.set(false);
    this.sendSms.set(false);
    this.emailChannelTouched = false;
    this.smsChannelTouched = false;
    this.emailServerError.set('');
    this.phoneServerError.set('');
    this.showModal.set(true);
  }

  openEdit(t: TeacherAccount): void {
    this.editing.set(t);
    this.form.reset({
      name: t.lecturer?.name ?? '',
      email: t.email,
      phone: t.phone ?? '',
      address: t.address ?? '',
      password: '',
      lecturerId: t.lecturer ? String(t.lecturer.id) : '',
      isActive: t.isActive,
    });
    // Password optional on edit (blank = unchanged; set = reset + force change).
    this.form.controls.password.clearValidators();
    this.form.controls.password.addValidators(Validators.minLength(6));
    this.form.controls.password.updateValueAndValidity();
    this.emailServerError.set('');
    this.phoneServerError.set('');
    this.showModal.set(true);
  }

  toggleEmailChannel(checked: boolean): void {
    this.emailChannelTouched = true;
    this.sendEmail.set(checked);
  }

  toggleSmsChannel(checked: boolean): void {
    this.smsChannelTouched = true;
    this.sendSms.set(checked);
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    this.form.controls.password.setValue(pw);
    this.form.controls.password.markAsDirty();
  }

  private handleServerError(err: HttpErrorResponse): void {
    const message = err?.error?.message || 'Something went wrong';
    if (/email already exists/i.test(message)) this.emailServerError.set(message);
    else if (/phone number already exists/i.test(message) || /invalid nepali mobile/i.test(message)) this.phoneServerError.set(message);
    else this.toast.error(message);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const edit = this.editing();
    if (edit) {
      const data: { email?: string; password?: string; isActive?: boolean; lecturerId?: number | null } = {
        email: value.email,
        isActive: value.isActive,
      };
      if (value.password) data.password = value.password;
      if (value.lecturerId) data.lecturerId = Number(value.lecturerId);
      this.teacherService.updateTeacher(edit.id, data).subscribe({
        next: () => {
          this.toast.success('Teacher updated');
          this.showModal.set(false);
          this.saving.set(false);
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.handleServerError(err);
        },
      });
    } else {
      const channels: DeliveryChannel[] = [];
      if (this.sendEmail()) channels.push('email');
      if (this.sendSms()) channels.push('sms');
      const data: Parameters<TeacherAdminService['createTeacher']>[0] = {
        email: value.email,
        password: value.password,
        deliveryChannels: channels,
      };
      if (value.phone) data.phone = value.phone;
      if (value.address) data.address = value.address;
      if (value.lecturerId) data.lecturerId = Number(value.lecturerId);
      else if (value.name) data.name = value.name;
      this.teacherService.createTeacher(data).subscribe({
        next: (res) => {
          this.toast.success('Teacher account created');
          this.showModal.set(false);
          this.saving.set(false);
          this.load();
          if (res.data?.delivery) {
            this.deliveryResult.set({
              teacherName: value.name || value.email,
              delivery: res.data.delivery,
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.handleServerError(err);
        },
      });
    }
  }

  openResend(t: TeacherAccount): void {
    this.resendFor.set(t);
    this.resendEmail.set(!!t.email);
    this.resendSms.set(!!t.phone);
    this.resendNewPassword.set('');
  }

  resend(): void {
    const t = this.resendFor();
    if (!t || this.resending()) return;
    const channels: DeliveryChannel[] = [];
    if (this.resendEmail()) channels.push('email');
    if (this.resendSms()) channels.push('sms');
    if (!channels.length) {
      this.toast.error('Select at least one channel');
      return;
    }
    const newTempPassword = this.resendNewPassword().trim();
    if (newTempPassword && newTempPassword.length < 6) {
      this.toast.error('New temporary password must be at least 6 characters');
      return;
    }
    this.resending.set(true);
    this.teacherService
      .resendCredentials(t.id, { deliveryChannels: channels, ...(newTempPassword ? { newTempPassword } : {}) })
      .subscribe({
        next: (res) => {
          this.resending.set(false);
          this.resendFor.set(null);
          if (res.data?.delivery) {
            this.deliveryResult.set({ teacherName: t.name, delivery: res.data.delivery });
          }
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.resending.set(false);
          this.toast.error(err?.error?.message || 'Could not resend credentials');
        },
      });
  }

  deactivate(): void {
    const t = this.deactivateTarget();
    if (!t || this.deactivating()) return;
    this.deactivating.set(true);
    this.teacherService.deactivateTeacher(t.id).subscribe({
      next: () => {
        this.toast.success('Teacher deactivated');
        this.deactivateTarget.set(null);
        this.deactivating.set(false);
        this.load();
      },
      error: () => this.deactivating.set(false),
    });
  }

  openAssignments(t: TeacherAccount): void {
    this.assignmentsFor.set(t);
    this.assignmentForm.reset({ sectionId: '', subjectId: '' });
    this.loadAssignments();
  }

  loadAssignments(): void {
    const t = this.assignmentsFor();
    if (!t) return;
    this.assignmentsLoading.set(true);
    this.teacherService.getAssignments(t.id).subscribe({
      next: (res) => {
        this.assignments.set(res.data ?? []);
        this.assignmentsLoading.set(false);
      },
      error: () => this.assignmentsLoading.set(false),
    });
  }

  addAssignment(): void {
    const t = this.assignmentsFor();
    if (!t || this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }
    const value = this.assignmentForm.getRawValue();
    this.assignmentSaving.set(true);
    this.teacherService
      .addAssignment(t.id, { sectionId: value.sectionId, subjectId: Number(value.subjectId) })
      .subscribe({
        next: () => {
          this.toast.success('Class assigned');
          this.assignmentForm.reset({ sectionId: '', subjectId: '' });
          this.assignmentSaving.set(false);
          this.loadAssignments();
          this.load();
        },
        error: () => this.assignmentSaving.set(false),
      });
  }

  removeAssignment(a: TeacherAssignmentRow): void {
    const t = this.assignmentsFor();
    if (!t) return;
    this.teacherService.removeAssignment(t.id, a.id).subscribe({
      next: () => {
        this.toast.success('Assignment removed');
        this.loadAssignments();
        this.load();
      },
    });
  }

  sectionLabel(s: Section): string {
    return s.Batch ? `${s.name} — ${s.Batch.name}` : s.name;
  }
}
