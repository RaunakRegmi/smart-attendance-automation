import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthUser } from '../auth/auth.store';

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private http: HttpClient) {}

  login(payload: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', payload);
  }

  register(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'TEACHER' | 'STUDENT';
    studentProfile?: { batchId: string; parentName: string; parentPhone: string };
    teacherProfile?: { department: string };
  }): Observable<unknown> {
    return this.http.post('/api/auth/register', payload);
  }
}

