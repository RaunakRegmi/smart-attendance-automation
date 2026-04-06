import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AnyUserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AnyUserRole;
};

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private http: HttpClient) {}

  listUsers(role?: AnyUserRole): Observable<UserSummary[]> {
    const qp = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.http.get<UserSummary[]>(`/api/admin/users${qp}`);
  }

  createUser(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: AnyUserRole;
    studentProfile?: { batchId: string; parentName: string; parentPhone: string };
    teacherProfile?: { department: string };
  }): Observable<unknown> {
    return this.http.post('/api/admin/users', payload);
  }
}

