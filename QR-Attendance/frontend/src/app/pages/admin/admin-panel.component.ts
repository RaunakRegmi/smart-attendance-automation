import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminApiService, type UserSummary } from '../../core/api/admin-api.service';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

@Component({
  selector: 'app-admin-panel',
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
    MatTableModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent {
  private fb = inject(FormBuilder);
  private adminApi = inject(AdminApiService);
  private snack = inject(MatSnackBar);

  loading = false;
  users: UserSummary[] = [];

  roleFilter = this.fb.control<Role | ''>('');

  createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['STUDENT' as Role, [Validators.required]],

    batchId: [''],
    parentName: [''],
    parentPhone: [''],
    department: [''],
  });

  get role(): Role {
    return this.createForm.value.role as Role;
  }

  displayedColumns = ['name', 'email', 'phone', 'role'];

  ngOnInit() {
    this.refreshUsers();
  }

  refreshUsers() {
    const role = this.roleFilter.value || undefined;
    this.adminApi.listUsers(role as any).subscribe({
      next: (data) => {
        this.users = data;
      },
      error: () => {
        this.snack.open('Failed to load users', 'Dismiss', { duration: 3500 });
      },
    });
  }

  submit() {
    if (this.createForm.invalid) return;

    const v = this.createForm.value;
    const payload: any = {
      name: String(v.name).trim(),
      email: String(v.email).trim(),
      phone: String(v.phone).trim(),
      password: String(v.password),
      role: v.role as Role,
    };

    if (payload.role === 'STUDENT') {
      payload.studentProfile = {
        batchId: String(v.batchId || '').trim(),
        parentName: String(v.parentName || '').trim(),
        parentPhone: String(v.parentPhone || '').trim(),
      };
    }
    if (payload.role === 'TEACHER') {
      payload.teacherProfile = { department: String(v.department || '').trim() };
    }

    this.loading = true;
    this.adminApi.createUser(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('User created', 'Dismiss', { duration: 3000 });
        this.createForm.reset({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'STUDENT',
          batchId: '',
          parentName: '',
          parentPhone: '',
          department: '',
        });
        this.refreshUsers();
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err?.error?.message || 'Create failed', 'Dismiss', { duration: 4500 });
      },
    });
  }
}

