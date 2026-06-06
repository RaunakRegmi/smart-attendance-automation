import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
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

  listRoutines(): Observable<{ success: boolean; data: RoutineGroup[] }> {
    return this.api.get<RoutineGroup[]>('/routine/list');
  }

  getRoutineBySection(sectionId: string): Observable<{ success: boolean; data: RoutineEntry[] }> {
    return this.api.get<RoutineEntry[]>('/routine', { sectionId });
  }

  uploadRoutine(file: File, batchId: string, sectionId: string): Observable<{ success: boolean; message?: string; data: { recordsCreated: number; batchAbbreviation: string; sectionName: string } }> {
    return this.api.upload('/routine/upload', file, { batchId, sectionId });
  }

  deleteRoutine(sectionId: string): Observable<{ success: boolean; message?: string }> {
    return this.api.delete(`/routine/${sectionId}`);
  }
}
