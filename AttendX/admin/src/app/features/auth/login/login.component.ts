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

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
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
            this.toast.success('Welcome back!');
            this.router.navigate(['/dashboard']);
          } else if (role === 'TEACHER') {
            this.toast.success('Welcome back!');
            this.router.navigate(['/teacher']);
          } else {
            this.toast.error('Admin or teacher access required');
            this.auth.logout();
            return;
          }
        } else {
          this.toast.error('Invalid email or password');
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Invalid email or password');
      },
    });
  }
}
