import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Section, ApiResponse, Pagination } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly api = inject(ApiService);

  getAll(batchId?: string, params?: Record<string, string | number | undefined>): Observable<ApiResponse<Section[]> & { pagination?: Pagination }> {
    const query = { ...(batchId ? { batchId } : {}), ...params };
    if (params?.['page']) {
      return this.api.getPaginated<Section>('/sections', query);
    }
    return this.api.get<Section[]>('/sections', query);
  }

  create(data: { name: string; batchId: string }) {
    return this.api.post<Section>('/sections', data);
  }

  update(id: string, data: Partial<Section>) {
    return this.api.put<Section>(`/sections/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<{ message: string }>(`/sections/${id}`);
  }
}
