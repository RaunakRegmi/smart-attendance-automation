import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Lecturer } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class LecturerService {
  private readonly api = inject(ApiService);

  getAll(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<Lecturer>('/lecturers', params);
  }

  create(data: Partial<Lecturer>) {
    return this.api.post<Lecturer>('/lecturers', data);
  }

  update(id: number, data: Partial<Lecturer>) {
    return this.api.put<Lecturer>(`/lecturers/${id}`, data);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`/lecturers/${id}`);
  }
}
