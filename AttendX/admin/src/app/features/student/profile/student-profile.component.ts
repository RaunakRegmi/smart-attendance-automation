import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProfileResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './student-profile.component.html',
})
export class StudentProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly profile = signal<ProfileResponse | null>(null);
  readonly saving = signal(false);
  readonly changingPassword = signal(false);

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
    this.api.get<{ user: ProfileResponse['user']; student?: ProfileResponse['student'] }>('/auth/me').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.profile.set(res.data as ProfileResponse);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
