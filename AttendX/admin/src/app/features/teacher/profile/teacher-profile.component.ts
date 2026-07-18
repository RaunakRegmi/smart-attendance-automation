import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TeacherPortalService } from '../../../core/services/teacher-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TeacherProfileData } from '../../../core/models/api.models';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './teacher-profile.component.html',
})
export class TeacherProfileComponent implements OnInit {
  private readonly portal = inject(TeacherPortalService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly profile = signal<TeacherProfileData | null>(null);
  readonly saving = signal(false);
  readonly changingPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contact: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.portal.getProfile().subscribe({
      next: (res) => {
        this.profile.set(res.data ?? null);
        if (res.data?.lecturer) {
          this.form.patchValue({
            name: res.data.lecturer.name,
            contact: res.data.lecturer.contact ?? '',
          });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.portal.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.toast.success('Profile updated');
        this.saving.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const value = this.passwordForm.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.toast.error('Passwords do not match');
      return;
    }
    this.changingPassword.set(true);
    this.auth.updatePassword(value).subscribe({
      next: () => {
        this.toast.success('Password updated');
        this.passwordForm.reset();
        this.changingPassword.set(false);
        this.load();
      },
      error: () => this.changingPassword.set(false),
    });
  }
}
