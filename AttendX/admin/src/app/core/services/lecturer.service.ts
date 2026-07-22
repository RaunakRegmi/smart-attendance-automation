import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { DeliveryChannel, DeliveryStatus, Lecturer, Subject } from '../models/api.models';
import { Observable } from 'rxjs';

export interface LecturerCreatePayload {
  name: string;
  email?: string;
  contact?: string;
  password?: string;
  subjectIds?: number[];
  deliveryChannels?: DeliveryChannel[];
}

export interface ResendPayload {
  deliveryChannels: DeliveryChannel[];
  newTempPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class LecturerService {
  private readonly api = inject(ApiService);

  getAll(params?: Record<string, string | number | undefined>) {
    return this.api.getPaginated<Lecturer>('/lecturers', params);
  }

  getAllSubjects(): Observable<{ success: boolean; data: Subject[] }> {
    return this.api.get<Subject[]>('/lecturers/subjects/all');
  }

  create(data: LecturerCreatePayload) {
    return this.api.post<Lecturer & { delivery?: DeliveryStatus }>('/lecturers', data);
  }

  update(id: number, data: Partial<Lecturer> & { password?: string; subjectIds?: number[] }) {
    return this.api.put<Lecturer>(`/lecturers/${id}`, data);
  }

  resendCredentials(id: number, payload: ResendPayload): Observable<{ success: boolean; data: { delivery: DeliveryStatus } }> {
    return this.api.post<{ delivery: DeliveryStatus }>(`/lecturers/${id}/resend-credentials`, payload);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`/lecturers/${id}`);
  }
}
