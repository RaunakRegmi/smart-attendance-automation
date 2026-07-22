import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LecturerService, LecturerCreatePayload } from '../../core/services/lecturer.service';
import { ToastService } from '../../core/services/toast.service';
import { DeliveryChannel, DeliveryStatus, Lecturer, Subject } from '../../core/models/api.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { MultiSelectComponent, SelectOption } from '../../shared/components/multi-select/multi-select.component';

@Component({
  selector: 'app-lecturers',
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmDialogComponent, PaginationComponent, MultiSelectComponent],
  templateUrl: './lecturers.component.html',
  styleUrl: './lecturers.component.scss',
})
export class LecturersComponent implements OnInit {
  private readonly lecturerService = inject(LecturerService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly lecturers = signal<Lecturer[]>([]);
  readonly allSubjects = signal<Subject[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly showModal = signal(false);
  readonly editing = signal<Lecturer | null>(null);
  readonly deleteTarget = signal<Lecturer | null>(null);
  readonly deleting = signal(false);
  readonly saving = signal(false);
  readonly selectedSubjectIds = signal<number[]>([]);

  private savedSubjectIds: number[] = [];
  private savedSubjectsMap = new Map<number, number[]>();

  readonly sendEmail = signal(false);
  readonly sendSms = signal(false);
  readonly deliveryResult = signal<{ lecturerName: string; delivery: DeliveryStatus } | null>(null);

  readonly resendFor = signal<Lecturer | null>(null);
  readonly resendEmail = signal(false);
  readonly resendSms = signal(false);
  readonly resendNewPassword = signal('');
  readonly resending = signal(false);

  readonly emailServerError = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    contact: [''],
    password: [''],
  });

  readonly subjectOptions = signal<SelectOption[]>([]);

  private emailChannelTouched = false;

  ngOnInit(): void {
    this.load();
    this.loadSubjects();

    this.form.controls.email.valueChanges.subscribe((value) => {
      if (!this.emailChannelTouched) this.sendEmail.set(!!value && this.form.controls.email.valid);
      this.emailServerError.set('');
    });
  }

  load(): void {
    this.loading.set(true);
    this.lecturerService.getAll({ search: this.search(), page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.lecturers.set(res.data ?? []);
        this.totalPages.set(res.pagination?.totalPages ?? 1);
        this.total.set(res.pagination?.total ?? 0);
        this.loading.set(false);
        this.syncSavedMap(res.data ?? []);
      },
      error: () => this.loading.set(false),
    });
  }

  private syncSavedMap(data: Lecturer[]): void {
    for (const l of data) {
      this.savedSubjectsMap.set(l.id, (l.subjects ?? []).map((s) => s.id));
    }
  }

  loadSubjects(): void {
    this.lecturerService.getAllSubjects().subscribe({
      next: (res) => {
        this.allSubjects.set(res.data ?? []);
        this.subjectOptions.set(
          (res.data ?? []).map((s) => ({
            id: s.id,
            label: `${s.subjectCode}`,
            sublabel: s.subjectName || undefined,
          }))
        );
      },
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.email.addValidators([Validators.required, Validators.email]);
    this.form.controls.email.updateValueAndValidity();
    this.savedSubjectIds = [];
    this.selectedSubjectIds.set([]);
    this.sendEmail.set(false);
    this.sendSms.set(false);
    this.emailChannelTouched = false;
    this.emailServerError.set('');
    this.showModal.set(true);
  }

  openEdit(l: Lecturer): void {
    this.editing.set(l);
    this.form.reset({
      name: l.name,
      email: l.email ?? '',
      contact: l.contact ?? '',
      password: '',
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.addValidators(Validators.minLength(6));
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.email.clearValidators();
    this.form.controls.email.addValidators(Validators.email);
    this.form.controls.email.updateValueAndValidity();
    const dbIds = this.savedSubjectsMap.get(l.id) ?? (l.subjects ?? []).map((s) => s.id);
    this.savedSubjectIds = [...dbIds];
    this.selectedSubjectIds.set([...dbIds]);
    this.emailServerError.set('');
    this.showModal.set(true);
  }

  cancelModal(): void {
    this.selectedSubjectIds.set([...this.savedSubjectIds]);
    this.showModal.set(false);
  }

  toggleEmailChannel(checked: boolean): void {
    this.emailChannelTouched = true;
    this.sendEmail.set(checked);
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    this.form.controls.password.setValue(pw);
    this.form.controls.password.markAsDirty();
  }

  onSubjectsChange(ids: (number | string)[]): void {
    this.selectedSubjectIds.set(ids.map(Number));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const formData = this.form.getRawValue();
    const edit = this.editing();

    if (edit) {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email || undefined,
        contact: formData.contact || undefined,
        subjectIds: this.selectedSubjectIds(),
      };
      if (formData.password) {
        payload['password'] = formData.password;
      }
      this.lecturerService.update(edit.id, payload as Partial<Lecturer> & { password?: string; subjectIds?: number[] }).subscribe({
        next: () => {
          const newIds = [...this.selectedSubjectIds()];
          this.savedSubjectIds = newIds;
          this.savedSubjectsMap.set(edit.id, newIds);
          this.toast.success('Lecturer updated');
          this.showModal.set(false);
          this.load();
          this.saving.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const message = err?.error?.message || 'Something went wrong';
          if (/email already exists/i.test(message)) this.emailServerError.set(message);
          else this.toast.error(message);
        },
      });
    } else {
      const channels: DeliveryChannel[] = [];
      if (this.sendEmail()) channels.push('email');
      if (this.sendSms()) channels.push('sms');

      const payload: LecturerCreatePayload = {
        name: formData.name,
        email: formData.email || undefined,
        contact: formData.contact || undefined,
        password: formData.password || undefined,
        subjectIds: this.selectedSubjectIds(),
        deliveryChannels: channels.length ? channels : undefined,
      };

      this.lecturerService.create(payload).subscribe({
        next: (res) => {
          this.toast.success('Lecturer created');
          this.showModal.set(false);
          this.load();
          this.saving.set(false);
          if (res.data?.delivery) {
            this.deliveryResult.set({
              lecturerName: formData.name || formData.email || 'Lecturer',
              delivery: res.data.delivery,
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const message = err?.error?.message || 'Something went wrong';
          if (/email already exists/i.test(message)) this.emailServerError.set(message);
          else this.toast.error(message);
        },
      });
    }
  }

  openResend(l: Lecturer): void {
    this.resendFor.set(l);
    this.resendEmail.set(!!l.email);
    this.resendSms.set(false);
    this.resendNewPassword.set('');
  }

  resend(): void {
    const l = this.resendFor();
    if (!l || this.resending()) return;
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
    this.lecturerService
      .resendCredentials(l.id, { deliveryChannels: channels, ...(newTempPassword ? { newTempPassword } : {}) })
      .subscribe({
        next: (res) => {
          this.resending.set(false);
          this.resendFor.set(null);
          if (res.data?.delivery) {
            this.deliveryResult.set({ lecturerName: l.name, delivery: res.data.delivery });
          }
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.resending.set(false);
          this.toast.error(err?.error?.message || 'Could not resend credentials');
        },
      });
  }

  delete(): void {
    const l = this.deleteTarget();
    if (!l || this.deleting()) return;
    this.deleting.set(true);
    this.lecturerService.delete(l.id).subscribe({
      next: () => {
        this.toast.success('Lecturer deleted');
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.savedSubjectsMap.delete(l.id);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }
}
