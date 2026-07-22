import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { QrScanResult, LateRequestResult } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class StudentPortalApiService {
  private readonly api = inject(ApiService);

  scanAttendance(token: string, sessionId: string) {
    return this.api.post<QrScanResult>('/qr-sessions/scan', { token, sessionId });
  }

  submitLateRequest(sessionId: string, remarks: string) {
    return this.api.post<LateRequestResult>(`/qr-sessions/${sessionId}/late-request`, { remarks });
  }
}
