import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatbotService, ContextStats, ToolCall } from '../../core/services/chatbot.service';
import { ToastService } from '../../core/services/toast.service';
import { ContextWindowComponent } from './context-window/context-window.component';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: Date;
  /** True while this assistant bubble is being streamed into. */
  streaming?: boolean;
  /** Agent tool calls made while producing this reply. */
  tools?: ToolCall[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, DatePipe, ContextWindowComponent],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  private readonly chatbot = inject(ChatbotService);
  private readonly toast = inject(ToastService);

  readonly messages = signal<Message[]>([]);
  readonly input = signal<string>('');
  readonly sending = signal(false);
  readonly refreshing = signal(false);
  readonly vectorReady = signal<boolean | null>(null);
  /** True while we restore the server-side conversation on mount. */
  readonly loadingConversation = signal(true);
  /** Flips true once the first streamed token arrives (hides the typing dots). */
  readonly streamingStarted = signal(false);
  /** Latest context-window usage from the stream (drives the panel meter). */
  readonly contextStats = signal<ContextStats | null>(null);
  /** Running summary of older turns ("what the model remembers"). */
  readonly summary = signal<string>('');
  /** Context Window side-panel visibility. */
  readonly panelOpen = signal(true);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  private _shouldScroll = false;

  readonly suggested: string[] = [
    'Which students are at critical risk?',
    'Show me the lowest-attendance students',
    'How is the overall attendance health?',
    'Who needs intervention this week?',
    'Which course has the worst attendance?',
  ];

  constructor() {
    // Backend now proxies; assume healthy until first call fails.
    this.vectorReady.set(true);
  }

  async ngOnInit(): Promise<void> {
    // Restore the durable, server-side conversation keyed to this admin account.
    // Survives reload, new tab, and other devices — memory lives in Postgres, not the browser.
    this.loadingConversation.set(true);
    try {
      const conv = await this.chatbot.getConversation();
      this.messages.set(
        conv.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content ?? '', ts: new Date(m.createdAt) }))
      );
      this.summary.set(conv.conversation.runningSummary ?? '');
      this._shouldScroll = true;
    } catch {
      // Non-fatal: start empty if the conversation can't be loaded.
    } finally {
      this.loadingConversation.set(false);
    }
    this.refreshContext();
  }

  /** Pull the context-window stats (token meter + summary) from the server. */
  private async refreshContext(): Promise<void> {
    try {
      const info = await this.chatbot.getContext();
      this.contextStats.set({
        promptTokens: info.used.promptTokens,
        completionTokens: info.used.completionTokens,
        numCtx: info.numCtx,
      });
      this.summary.set(info.runningSummary ?? '');
    } catch {
      // Non-fatal.
    }
  }

  togglePanel(): void {
    this.panelOpen.update((v) => !v);
  }

  ngAfterViewChecked(): void {
    if (this._shouldScroll && this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this._shouldScroll = false;
    }
  }

  useSuggestion(q: string): void {
    this.input.set(q);
    this.send();
  }

  async send(): Promise<void> {
    const text = this.input().trim();
    if (!text || this.sending()) return;

    this.messages.update((m) => [...m, { role: 'user', text, ts: new Date() }]);
    this.input.set('');
    this.sending.set(true);
    this.streamingStarted.set(false);
    this._shouldScroll = true;

    let started = false;
    const ensureAssistant = () => {
      if (!started) {
        started = true;
        this.streamingStarted.set(true);
        this.messages.update((m) => [...m, { role: 'assistant', text: '', ts: new Date(), streaming: true, tools: [] }]);
      }
    };
    try {
      for await (const ev of this.chatbot.streamMessage(text)) {
        if (ev.type === 'token') {
          ensureAssistant();
          this.appendToLastAssistant(ev.delta);
          this._shouldScroll = true;
        } else if (ev.type === 'tool') {
          ensureAssistant();
          this.upsertTool(ev);
          this._shouldScroll = true;
        } else if (ev.type === 'usage') {
          this.contextStats.set(ev.stats);
          this.vectorReady.set(true);
        } else if (ev.type === 'error') {
          ensureAssistant();
          this.appendToLastAssistant(this.lastHasText() ? `\n[${ev.message}]` : ev.message);
        }
      }
      if (!started) {
        this.messages.update((m) => [...m, { role: 'assistant', text: "I don't have that information.", ts: new Date() }]);
      }
    } catch {
      this.vectorReady.set(false);
      if (!started) {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: 'The AI service is unreachable right now. Try again in a moment, or hit "Refresh AI knowledge" once the chatbot service is back online.', ts: new Date() },
        ]);
      }
    } finally {
      this.finalizeLastAssistant();
      this.sending.set(false);
      this._shouldScroll = true;
      this.refreshContext();
    }
  }

  private appendToLastAssistant(delta: string): void {
    this.messages.update((arr) => {
      if (arr.length === 0) return arr;
      const copy = arr.slice();
      const last = copy[copy.length - 1];
      if (last.role === 'assistant') copy[copy.length - 1] = { ...last, text: last.text + delta };
      return copy;
    });
  }

  private finalizeLastAssistant(): void {
    this.messages.update((arr) => {
      if (arr.length === 0) return arr;
      const copy = arr.slice();
      const last = copy[copy.length - 1];
      if (last.role === 'assistant' && last.streaming) copy[copy.length - 1] = { ...last, streaming: false };
      return copy;
    });
  }

  private lastHasText(): boolean {
    const arr = this.messages();
    const last = arr[arr.length - 1];
    return !!last && last.role === 'assistant' && last.text.length > 0;
  }

  /** Add/update a tool chip on the in-progress assistant bubble. */
  private upsertTool(ev: { name: string; args?: unknown; result?: unknown; status: 'running' | 'done' | 'error' }): void {
    this.messages.update((arr) => {
      if (arr.length === 0) return arr;
      const copy = arr.slice();
      const last = { ...copy[copy.length - 1] };
      if (last.role !== 'assistant') return arr;
      const tools = (last.tools ?? []).slice();
      // Settle the most recent still-running call of the same tool; else append.
      let idx = -1;
      for (let i = tools.length - 1; i >= 0; i--) {
        if (tools[i].name === ev.name && tools[i].status === 'running') { idx = i; break; }
      }
      if (ev.status !== 'running' && idx !== -1) {
        tools[idx] = { ...tools[idx], result: ev.result, status: ev.status };
      } else {
        tools.push({ name: ev.name, args: ev.args, result: ev.result, status: ev.status });
      }
      last.tools = tools;
      copy[copy.length - 1] = last;
      return copy;
    });
  }

  /** Human label for a tool-call chip. */
  toolLabel(t: ToolCall): string {
    const labels: Record<string, string> = {
      search_knowledge_base: 'searching knowledge base',
      get_student_attendance: 'fetching attendance',
      list_at_risk_students: 'finding at-risk students',
      get_batch_summary: 'summarising batch',
      get_course_performance: 'course performance',
    };
    const label = labels[t.name] ?? t.name;
    const icon = t.status === 'running' ? '⏳' : t.status === 'error' ? '⚠️' : '✓';
    return `${icon} ${label}`;
  }

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try {
      const res = await this.chatbot.refreshKnowledge();
      if (res?.success) {
        const n = res.studentsExported ?? 0;
        this.toast.success(`AI knowledge refreshed — ${n} students indexed`);
        this.vectorReady.set(true);
      } else {
        this.toast.error(res?.error || res?.message || 'Refresh failed');
      }
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? err?.message ?? 'Refresh failed');
    } finally {
      this.refreshing.set(false);
    }
  }

  async clear(): Promise<void> {
    this.messages.set([]);
    this.summary.set('');
    this.contextStats.set(null);
    try {
      await this.chatbot.clearConversation();
    } catch {
      this.toast.error('Could not clear the conversation on the server');
    }
  }
}
