import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError, of, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthData, User, ApiResponse, ProfileResponse } from '../models/api.models';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(this.loadUser());

  readonly user = this.userSignal.asReadonly();
  // Must read `user()` so this computed invalidates when login/logout updates the signal.
  // Otherwise only localStorage updates and the guard keeps seeing the stale `false`.
  readonly isAuthenticated = computed(() => {
    this.user();
    return !!this.getToken();
  });
  readonly isAdmin = computed(() => {
    const role = this.user()?.role;
    return role === 'ADMIN' || String(role).toUpperCase() === 'ADMIN';
  });
  readonly isTeacher = computed(() => {
    const role = this.user()?.role;
    return role === 'TEACHER' || String(role).toUpperCase() === 'TEACHER';
  });
  readonly isStudent = computed(() => {
    const role = this.user()?.role;
    return role === 'STUDENT' || String(role).toUpperCase() === 'STUDENT';
  });

  login(email: string, password: string): Observable<ApiResponse<AuthData> | null> {
    return this.api.post<AuthData>('/auth/login', { email, password }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.userSignal.set(res.data.user);
        }
      }),
      catchError(() => of(null))
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Clear stored credentials without navigating (for use from guards). */
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  loadCurrentUser(): Observable<ApiResponse<{ user: User }> | null> {
    return this.api.get<{ user: User }>('/auth/me').pipe(
      tap((res) => {
        if (res.success && res.data?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.userSignal.set(res.data.user);
        }
      }),
      catchError(() => of(null))
    );
  }

  updateProfile(data: Record<string, unknown>): Observable<ApiResponse<ProfileResponse>> {
    return this.api.put<ProfileResponse>('/auth/profile', data).pipe(
      tap((res) => {
        if (res.success && res.data?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          this.userSignal.set(res.data.user);
        }
      })
    );
  }

  updatePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Observable<ApiResponse<User>> {
    return this.api.put<User>('/auth/password', data).pipe(
      tap((res) => {
        // Keep the cached user fresh — clears mustChangePassword client-side
        // right after a successful change.
        if (res.success && res.data?.id) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
          this.userSignal.set(res.data);
        }
      })
    );
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
