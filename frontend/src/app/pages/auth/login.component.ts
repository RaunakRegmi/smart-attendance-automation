import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private auth = inject(AuthStore);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value as { email: string; password: string };

    this.authApi.login({ email, password }).subscribe({
      next: (resp) => {
        this.loading = false;
        this.auth.setSession(resp.accessToken, resp.user);
        if (resp.user.role === 'ADMIN') this.router.navigate(['/admin']);
        else if (resp.user.role === 'TEACHER') this.router.navigate(['/teacher']);
        else this.router.navigate(['/student']);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Login failed', 'Dismiss', { duration: 3500 });
      },
    });
  }
}

