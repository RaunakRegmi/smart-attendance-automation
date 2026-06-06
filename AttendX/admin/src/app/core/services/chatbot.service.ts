import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ChatResponse {
  success: boolean;
  reply: string;
}

interface RefreshResponse {
  success: boolean;
  message?: string;
  studentsExported?: number;
  error?: string;
}

export interface AnalyticsData {
  totalStudents: number;
  avgAttendance: number;
  distribution: { label: string; count: number; percent: number }[];
  byBatch: { batch: string; avgAttendance: number; totalStudents: number; atRisk: number }[];
  byCourse: { code: string; name: string; avgAttendance: number; students: number }[];
  atRiskStudents: { name: string; email: string; batch: string; percentage: number }[];
}

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Admin chat — backend proxy enforces admin RBAC. */
  async sendAdminMessage(message: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<ChatResponse>(`${this.base}/chatbot/chat`, { message })
    );
    return res?.reply ?? '';
  }

  /** Trigger Postgres → CSV → reindex pipeline. */
  async refreshKnowledge(): Promise<RefreshResponse> {
    return firstValueFrom(
      this.http.post<RefreshResponse>(`${this.base}/chatbot/refresh`, {})
    );
  }

  /** Aggregate attendance analytics for the dashboard. */
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await firstValueFrom(
      this.http.get<AnalyticsResponse>(`${this.base}/chatbot/analytics`)
    );
    return res.data;
  }
}
