import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  /**
   * Where the guard wanted to send us before it bounced to login. Only same-app
   * paths are honoured — anything not starting with a single '/' is discarded so
   * a crafted ?returnUrl= can't turn login into an open redirect.
   * This is what carries the QR deep link's ?token=&sessionId= across login.
   */
  private safeReturnUrl(): string | null {
    const target = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!target || !target.startsWith('/') || target.startsWith('//')) return null;
    return target;
  }

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
          const returnUrl = this.safeReturnUrl();
          if (returnUrl && (role === 'ADMIN' || role === 'TEACHER' || role === 'STUDENT')) {
            // navigateByUrl keeps the query string intact; the role guards still
            // apply, so a wrong-role returnUrl just bounces to their own portal.
            this.router.navigateByUrl(returnUrl);
          } else if (role === 'ADMIN') {
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
