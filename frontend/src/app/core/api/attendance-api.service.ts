import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type StartAttendanceResponse = {
  session: {
    id: string;
    class_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
    created_at: string;
  };
  qr: { dataUrl: string; payload: string };
};

export type AttendanceScanResult = {
  attendance: {
    id: string;
    session_id: string;
    student_id: string;
    scan_time: string;
    status: 'PRESENT' | 'LATE';
  };
};

export type LiveAttendanceResponse = {
  session: {
    id: string;
    class_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
  };
  attendances: Array<{
    id: string;
    student_id: string;
    student_name: string;
    student_email: string;
    scan_time: string;
    status: 'PRESENT' | 'LATE';
  }>;
};

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  constructor(private http: HttpClient) {}

  startSession(payload: { classId: string; durationMinutes: number }): Observable<StartAttendanceResponse> {
    return this.http.post<StartAttendanceResponse>('/api/attendance/sessions/start', payload);
  }

  getSession(sessionId: string): Observable<unknown> {
    return this.http.get(`/api/attendance/sessions/${sessionId}`);
  }

  scanQr(payload: { qrToken: string }): Observable<AttendanceScanResult> {
    return this.http.post<AttendanceScanResult>('/api/attendance/scan', payload);
  }

  liveAttendance(sessionId: string): Observable<LiveAttendanceResponse> {
    return this.http.get<LiveAttendanceResponse>(`/api/attendance/sessions/${sessionId}/live`);
  }

  createCorrectionRequest(payload: { sessionId: string; reason: string }): Observable<unknown> {
    return this.http.post('/api/attendance/requests', payload);
  }
}

