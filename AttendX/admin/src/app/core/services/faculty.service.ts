import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Faculty, ApiResponse, Pagination } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class FacultyService {
  private readonly api = inject(ApiService);

  getAll(params?: Record<string, string | number | undefined>): Observable<ApiResponse<Faculty[]> & { pagination?: Pagination }> {
    if (params?.['page']) {
      return this.api.getPaginated<Faculty>('/faculties', params);
    }
    return this.api.get<Faculty[]>('/faculties', params);
  }

  getAllForDropdown() {
    return this.api.get<Faculty[]>('/faculties/all');
  }

  create(data: { name: string }) {
    return this.api.post<Faculty>('/faculties', data);
  }

  update(id: string, data: Partial<Faculty>) {
    return this.api.put<Faculty>(`/faculties/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<{ message: string }>(`/faculties/${id}`);
  }
}
