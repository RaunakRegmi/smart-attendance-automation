import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Student } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiService);

  getAll(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<Student>('/students', params);
  }

  create(data: Partial<Student> & { password?: string }) {
    return this.api.post<Student>('/students', data);
  }

  update(id: number, data: Partial<Student>) {
    return this.api.put<Student>(`/students/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`/students/${id}`);
  }
}
