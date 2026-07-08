import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface ChatResponse {
  success: boolean;
  reply: string;
  usage?: { prompt_tokens: number | null; completion_tokens: number | null; num_ctx: number };
}

export interface ChatMessageDto {
  id: number;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolName?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  createdAt: string;
}

export interface ConversationData {
  conversation: { id: number; scope: string; title: string | null; runningSummary: string | null; createdAt: string; updatedAt: string };
  messages: ChatMessageDto[];
}

interface ConversationResponse {
  success: boolean;
  data: ConversationData;
}

export interface ContextStats {
  promptTokens: number | null;
  completionTokens: number | null;
  numCtx: number;
}

export interface ContextInfo {
  numCtx: number;
  used: { promptTokens: number; completionTokens: number; total: number };
  percentUsed: number;
  messageCount: number;
  summarized: boolean;
  runningSummary: string | null;
}

export interface ToolCall {
  name: string;
  args?: unknown;
  result?: unknown;
  status: 'running' | 'done' | 'error';
}

export type StreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'tool'; name: string; args?: unknown; result?: unknown; status: 'running' | 'done' | 'error' }
  | { type: 'usage'; stats: ContextStats }
  | { type: 'done' }
  | { type: 'error'; message: string };

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
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  /** Admin chat — backend persists the transcript per user (keyed by JWT) and proxies inference. */
  async sendAdminMessage(message: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<ChatResponse>(`${this.base}/chatbot/chat`, { message })
    );
    return res?.reply ?? '';
  }

  /** Restore the signed-in admin's durable conversation (survives reload / new tab / device). */
  async getConversation(): Promise<ConversationData> {
    const res = await firstValueFrom(
      this.http.get<ConversationResponse>(`${this.base}/chatbot/conversation`)
    );
    return res.data;
  }

  /** Clear (soft-archive) the admin's conversation. */
  async clearConversation(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/chatbot/conversation`));
  }

  /** Context-window stats (token meter + memory state) for the panel. */
  async getContext(): Promise<ContextInfo> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; data: ContextInfo }>(`${this.base}/chatbot/conversation/context`)
    );
    return res.data;
  }

  /**
   * Stream an admin chat reply token-by-token (SSE). Uses fetch + ReadableStream
   * because HttpClient can't stream a response body and EventSource can't POST or
   * carry an Authorization header — so we attach the Bearer token manually.
   */
  async *streamMessage(message: string): AsyncGenerator<StreamEvent> {
    yield* this.streamTo(`${this.base}/chatbot/chat/stream`, message);
  }

  /** Shared SSE reader used by admin (and reusable by other surfaces). */
  protected async *streamTo(url: string, message: string): AsyncGenerator<StreamEvent> {
    const token = this.auth.getToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });
    if (!res.ok || !res.body) {
      yield { type: 'error', message: `stream failed (${res.status})` };
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf('\n\n');
      while (idx !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const ev = this.parseFrame(frame);
        if (ev) yield ev;
        idx = buffer.indexOf('\n\n');
      }
    }
  }

  private parseFrame(frame: string): StreamEvent | null {
    let event = '';
    let dataStr = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
    }
    let data: Record<string, unknown> = {};
    if (dataStr) {
      try { data = JSON.parse(dataStr); } catch { data = {}; }
    }
    switch (event) {
      case 'token':
        return { type: 'token', delta: (data['delta'] as string) || '' };
      case 'tool_call':
        return { type: 'tool', name: (data['name'] as string) || '', args: data['args'], status: 'running' };
      case 'tool_result': {
        const result = data['result'];
        const isErr = !!result && typeof result === 'object' && 'error' in (result as object);
        return { type: 'tool', name: (data['name'] as string) || '', result, status: isErr ? 'error' : 'done' };
      }
      case 'usage':
        return {
          type: 'usage',
          stats: {
            promptTokens: (data['prompt_tokens'] as number) ?? null,
            completionTokens: (data['completion_tokens'] as number) ?? null,
            numCtx: (data['num_ctx'] as number) ?? 0,
          },
        };
      case 'done':
        return { type: 'done' };
      case 'error':
        return { type: 'error', message: (data['message'] as string) || 'error' };
      default:
        return null;
    }
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
