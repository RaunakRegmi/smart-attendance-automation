import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ClassSummary = {
  id: string;
  class_name: string;
  teacher_id: string;
  batch_id: string;
};

export type ScheduleInput = {
  dayOfWeek: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

@Injectable({ providedIn: 'root' })
export class ClassesApiService {
  constructor(private http: HttpClient) {}

  listClasses(): Observable<ClassSummary[]> {
    return this.http.get<ClassSummary[]>('/api/classes');
  }

  addSchedule(classId: string, payload: { dayOfWeek: number; startTime: string; endTime: string }): Observable<unknown> {
    return this.http.post(`/api/classes/${classId}/schedule`, payload);
  }

  enrollStudent(classId: string, studentId: string): Observable<unknown> {
    return this.http.post(`/api/classes/${classId}/enroll`, { studentId });
  }
}

