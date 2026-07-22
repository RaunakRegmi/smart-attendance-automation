import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly serverError = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    this.serverError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          const role = res.data.user.role;
          if (role === 'ADMIN') {
            this.router.navigate(['/dashboard']);
          } else if (role === 'TEACHER') {
            this.router.navigate(['/teacher']);
          } else if (role === 'STUDENT') {
            this.router.navigate(['/student']);
          } else {
            this.serverError.set('Admin, teacher, or student access required');
            this.auth.logout();
          }
        } else {
          this.serverError.set('Invalid email or password');
        }
      },
      error: () => {
        this.loading.set(false);
        this.serverError.set('Invalid email or password');
      },
    });
  }
}
