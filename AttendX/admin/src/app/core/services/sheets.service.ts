import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SheetRecord } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  getSheets(params?: { batchId?: string; sectionId?: string; status?: string }): Observable<SheetRecord[]> {
    return this.http.get<{ success: boolean; data: SheetRecord[] }>(`${this.baseUrl}/sheets`, {
      params: params as Record<string, string>,
    }).pipe(map(r => r.data ?? []));
  }

  /** POST /api/sheets — response shape is backend-specific (201 body, not always { success, data }). */
  linkSheet(data: { url: string; batchId: string; sectionId: string }): Observable<unknown> {
    return this.http.post<unknown>(`${this.baseUrl}/sheets`, data);
  }

  addSheet(data: { url: string; batchId: string; sectionId: string }) {
    return this.api.post<unknown>('/attendance/add-sheet', data);
  }

  toggleStatus(id: string) {
    return this.http.put<unknown>(`${this.baseUrl}/sheets/${id}/toggle`, {});
  }

  syncSheet(sheetId?: string) {
    return this.http.post<unknown>(`${this.baseUrl}/sheets/sync`, sheetId ? { sheetId } : {});
  }

  deleteSheet(id: string) {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/sheets/${id}`);
  }

  uploadAttendance(file: File) {
    return this.api.upload<unknown>('/attendance/upload', file);
  }
}
