import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Subject } from '../models/api.models';

export interface QRSession {
  id: string;
  subjectCode: string;
  subjectName: string;
  date: string;
  expiresAt: string;
  isActive: boolean;
  scannedCount: number;
}

export interface QRGenerateResponse {
  sessionId: string;
  qrImage: string;
  token: string;
  subjectCode: string;
  subjectName: string;
  date: string;
  expiresAt: string;
  expiresInMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly api = inject(ApiService);

  generateQR(subjectId: number): Observable<QRGenerateResponse> {
    return this.api
      .post<QRGenerateResponse>('/qr/generate', { subjectId })
      .pipe(map((res) => res.data!));
  }

  getActiveSessions(): Observable<QRSession[]> {
    return this.api
      .get<QRSession[]>('/qr/sessions')
      .pipe(map((res) => res.data ?? []));
  }

  deactivateSession(id: string): Observable<unknown> {
    return this.api.put<unknown>(`/qr/deactivate/${id}`, {}).pipe(map((res) => res.data));
  }

  getAllSubjects(): Observable<Subject[]> {
    return this.api
      .getPaginated<Subject>('/subjects', { limit: 100 })
      .pipe(map((res) => res.data ?? []));
  }
}
