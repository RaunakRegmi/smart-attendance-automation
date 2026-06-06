import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QueueStatus, SyncJob } from '../models/api.models';

/** Calls existing /api/sync/* endpoints only (no backend changes). */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/sync`;

  listJobs(params?: { sheetId?: string; status?: string }): Observable<{ success: boolean; jobs?: SyncJob[]; message?: string }> {
    let httpParams = new HttpParams();
    if (params?.sheetId) httpParams = httpParams.set('sheetId', params.sheetId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    return this.http.get<{ success: boolean; jobs?: SyncJob[]; message?: string }>(`${this.base}/status`, {
      params: httpParams,
    });
  }

  getJob(id: string): Observable<{ success: boolean; job?: SyncJob; message?: string }> {
    return this.http.get<{ success: boolean; job?: SyncJob; message?: string }>(`${this.base}/status/${encodeURIComponent(id)}`);
  }

  manualSync(sheetId: string): Observable<{ success: boolean; message?: string; syncJobId?: number }> {
    return this.http.post<{ success: boolean; message?: string; syncJobId?: number }>(`${this.base}/manual`, {
      sheetId,
    });
  }

  getSchedulerStatus(): Observable<{ success: boolean; syncStatus?: unknown; error?: string }> {
    return this.http.get<{ success: boolean; syncStatus?: unknown; error?: string }>(`${this.base}/scheduler-status`);
  }

  startScheduler(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.base}/start`, {});
  }

  stopScheduler(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.base}/stop`, {});
  }

  modifyScheduler(newSyncTime: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.base}/modify`, { newSyncTime });
  }

  getQueueStatus(): Observable<{ success: boolean; queueStatus?: QueueStatus; error?: string }> {
    return this.http.get<{ success: boolean; queueStatus?: QueueStatus; error?: string }>(`${this.base}/queue-status`);
  }
}
