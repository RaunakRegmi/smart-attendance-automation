import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';
import { Observable } from 'rxjs';

export interface RoutineEntry {
  id: number;
  sectionId: string;
  dayOfWeek: string;
  subjectCode: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  block: string | null;
  room: string | null;
  teacher: string | null;
  createdAt: string;
  Section?: { id: string; name: string; Batch?: { id: string; name: string; abbreviation: string } };
}

export interface RoutineGroup {
  sectionId: string;
  section: { id: string; name: string };
  batch: { id: string; name: string; abbreviation: string };
  entryCount: number;
  lastUploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly api = inject(ApiService);

  listRoutines(params?: { page?: number; limit?: number }): Observable<{ success: boolean; data: RoutineGroup[]; pagination?: { total: number; page: number; limit: number; totalPages: number } }> {
    return this.api.get<RoutineGroup[]>('/routine/list', params);
  }

  getRoutineBySection(sectionId: string): Observable<{ success: boolean; data: RoutineEntry[] }> {
    return this.api.get<RoutineEntry[]>('/routine', { sectionId });
  }

  uploadRoutine(file: File, batchId: string, sectionId: string): Observable<{ success: boolean; message?: string; data: { recordsCreated: number; batchAbbreviation: string; sectionName: string } }> {
    const params: Record<string, string> = { batchId, sectionId };
    return this.api.upload('/routine/upload', file, params);
  }

  updateRoutine(id: number, data: Partial<{ dayOfWeek: string; subjectCode: string; subjectName: string; startTime: string; endTime: string; block: string; room: string; teacher: string }>): Observable<ApiResponse<RoutineEntry>> {
    return this.api.put<RoutineEntry>(`/routine/${id}`, data);
  }

  deleteRoutine(sectionId: string): Observable<{ success: boolean; message?: string }> {
    return this.api.delete(`/routine/${sectionId}`);
  }
}
