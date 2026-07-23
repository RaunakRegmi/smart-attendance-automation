import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Subject } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly api = inject(ApiService);

  getAll(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<Subject>('/subjects', params);
  }

  create(data: { subjectCode: string; subjectName?: string }) {
    return this.api.post<Subject>('/subjects', data);
  }

  update(id: number, data: Partial<Subject>) {
    return this.api.put<Subject>(`/subjects/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`/subjects/${id}`);
  }
}
