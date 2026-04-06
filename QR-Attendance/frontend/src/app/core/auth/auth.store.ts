import { Injectable, signal } from '@angular/core';

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private accessTokenSignal = signal<string | null>(null);
  private userSignal = signal<AuthUser | null>(null);

  constructor() {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken) this.accessTokenSignal.set(storedToken);
    if (storedUser) this.userSignal.set(JSON.parse(storedUser));
  }

  accessToken() {
    return this.accessTokenSignal();
  }

  user() {
    return this.userSignal();
  }

  isAuthenticated() {
    return !!this.accessTokenSignal();
  }

  setSession(token: string, user: AuthUser) {
    this.accessTokenSignal.set(token);
    this.userSignal.set(user);
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  logout() {
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
}

