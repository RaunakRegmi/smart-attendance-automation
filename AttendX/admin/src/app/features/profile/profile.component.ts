import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly user = this.auth.user;
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly isStudent = computed(() => this.user()?.role === 'STUDENT');

  readonly profileLoading = signal(false);
  readonly passwordLoading = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.mustMatch('newPassword', 'confirmPassword') }
  );

  ngOnInit(): void {
    this.profileForm.patchValue({ email: this.user()?.email ?? '' });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileLoading.set(true);
    const data = this.profileForm.getRawValue();
    this.auth.updateProfile(data).subscribe({
      next: (res) => {
        this.profileLoading.set(false);
        if (res.success) {
          this.toast.success('Profile updated successfully');
        } else {
          this.toast.error(res.message || 'Failed to update profile');
        }
      },
      error: (err) => {
        this.profileLoading.set(false);
        const msg = err.error?.message || 'Failed to update profile';
        this.toast.error(msg);
      },
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordLoading.set(true);
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    this.auth.updatePassword({ currentPassword, newPassword, confirmPassword }).subscribe({
      next: (res) => {
        this.passwordLoading.set(false);
        if (res.success) {
          this.toast.success('Password updated successfully');
          this.passwordForm.reset();
          this.passwordForm.markAsPristine();
          this.passwordForm.markAsUntouched();
        } else {
          this.toast.error(res.message || 'Failed to update password');
        }
      },
      error: (err) => {
        this.passwordLoading.set(false);
        const msg = err.error?.message || 'Failed to update password';
        this.toast.error(msg);
      },
    });
  }

  private mustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl) => {
      const control = formGroup.get(controlName);
      const matchingControl = formGroup.get(matchingControlName);
      if (!control || !matchingControl) return null;
      if (control.value !== matchingControl.value) {
        return { mustMatch: true };
      }
      return null;
    };
  }
}
