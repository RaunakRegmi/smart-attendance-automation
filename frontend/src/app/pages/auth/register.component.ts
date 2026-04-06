import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/api/auth-api.service';

type Role = 'TEACHER' | 'STUDENT';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  loading = false;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['STUDENT' as Role, [Validators.required]],

    // studentProfile
    batchId: [''],
    parentName: [''],
    parentPhone: [''],

    // teacherProfile
    department: [''],
  });

  get role(): Role {
    return this.form.value.role as Role;
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;

    const v = this.form.value;
    const role = v.role as Role;

    const payload: any = {
      name: String(v.name).trim(),
      email: String(v.email).trim(),
      phone: String(v.phone).trim(),
      password: String(v.password),
      role,
    };

    if (role === 'STUDENT') {
      payload.studentProfile = {
        batchId: String(v.batchId || '').trim(),
        parentName: String(v.parentName || '').trim(),
        parentPhone: String(v.parentPhone || '').trim(),
      };
    }

    if (role === 'TEACHER') {
      payload.teacherProfile = {
        department: String(v.department || '').trim(),
      };
    }

    this.authApi.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Account created. Please login.', 'Dismiss', { duration: 3500 });
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Registration failed', 'Dismiss', { duration: 4500 });
      },
    });
  }
}

