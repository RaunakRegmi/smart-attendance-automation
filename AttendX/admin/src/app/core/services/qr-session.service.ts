import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import {
  AttendanceRequest,
  CreateSessionPayload,
  DecideRequestPayload,
  QRSession,
  QRSessionDetail,
  QRSessionHistoryItem,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class QrSessionService {
  private readonly api = inject(ApiService);

  createSession(body: CreateSessionPayload) {
    return this.api.post<QRSession>('/qr-sessions', body);
  }

  refreshQR(sessionId: string) {
    return this.api.post<{ token: string; tokenExpiresAt: string }>(`/qr-sessions/${sessionId}/refresh`, {});
  }

  closeSession(sessionId: string) {
    return this.api.put<QRSession>(`/qr-sessions/${sessionId}/close`, {});
  }

  getSession(sessionId: string) {
    return this.api.get<QRSessionDetail>(`/qr-sessions/${sessionId}`);
  }

  getSessionHistory(params: Record<string, string | number | boolean | undefined>) {
    return this.api.getPaginated<QRSessionHistoryItem>('/qr-sessions', params);
  }

  getPendingRequests(params?: Record<string, string | number | boolean | undefined>) {
    return this.api.getPaginated<AttendanceRequest>('/qr-sessions/requests', params);
  }

  decideRequest(requestId: number, body: DecideRequestPayload) {
    return this.api.put<AttendanceRequest>(`/qr-sessions/requests/${requestId}`, body);
  }
}
