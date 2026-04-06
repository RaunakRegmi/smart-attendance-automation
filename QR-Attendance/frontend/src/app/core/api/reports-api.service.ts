import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type StudentPerClass = {
  classId: string;
  className: string;
  attended: number;
  total: number;
  percentage: number;
  lowAttendance: boolean;
};

export type StudentReportResponse = {
  studentId: string;
  perClass: StudentPerClass[];
};

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  constructor(private http: HttpClient) {}

  studentMe(): Observable<StudentReportResponse> {
    return this.http.get<StudentReportResponse>('/api/reports/student/me');
  }

  classReport(classId: string): Observable<unknown> {
    return this.http.get(`/api/reports/class/${classId}`);
  }

  monthly(month: string, classId?: string): Observable<unknown> {
    const qp = classId ? `&classId=${encodeURIComponent(classId)}` : '';
    return this.http.get(`/api/reports/monthly?month=${encodeURIComponent(month)}${qp}`);
  }
}

