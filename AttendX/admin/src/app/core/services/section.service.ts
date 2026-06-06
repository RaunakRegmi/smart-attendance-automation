import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Section } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly api = inject(ApiService);

  getAll(batchId?: string) {
    return this.api.get<Section[]>('/sections', batchId ? { batchId } : undefined);
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
