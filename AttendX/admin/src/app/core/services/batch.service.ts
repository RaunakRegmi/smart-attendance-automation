import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Batch } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly api = inject(ApiService);

  getAll() {
    return this.api.get<Batch[]>('/batches');
  }

  getById(id: string) {
    return this.api.get<Batch>(`/batches/${id}`);
  }

  create(data: { name: string; abbreviation: string }) {
    return this.api.post<Batch>('/batches', data);
  }

  update(id: string, data: Partial<Batch>) {
    return this.api.put<Batch>(`/batches/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<{ message: string }>(`/batches/${id}`);
  }
}
