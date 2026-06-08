import { Component, ElementRef, ViewChild, AfterViewChecked, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatbotService } from '../../core/services/chatbot.service';
import { ToastService } from '../../core/services/toast.service';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  ts: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, DatePipe],
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

  /** Unique per page-visit; cleared when navigating away. */
  private sessionId = '';

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

  ngOnInit(): void {
    const savedId = sessionStorage.getItem('chat_session_id');
    this.sessionId = savedId || crypto.randomUUID();
    if (!savedId) {
      sessionStorage.setItem('chat_session_id', this.sessionId);
    }

    const savedMessages = sessionStorage.getItem('chat_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as { role: 'user' | 'assistant'; text: string; ts: string }[];
        this.messages.set(parsed.map((m) => ({ ...m, ts: new Date(m.ts) })));
        setTimeout(() => (this._shouldScroll = true));
      } catch { /* ignore corrupt data */ }
    }
  }

  private saveMessages(): void {
    sessionStorage.setItem('chat_messages', JSON.stringify(this.messages()));
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
    this._shouldScroll = true;

    try {
      const reply = await this.chatbot.sendAdminMessage(text, this.sessionId);
      this.messages.update((m) => [
        ...m,
        { role: 'assistant', text: reply || "I don't have that information.", ts: new Date() },
      ]);
      this.saveMessages();
    } catch (err) {
      this.vectorReady.set(false);
      this.messages.update((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'The AI service is unreachable right now. Try again in a moment, or hit "Refresh AI knowledge" once the chatbot service is back online.',
          ts: new Date(),
        },
      ]);
    } finally {
      this.sending.set(false);
      this._shouldScroll = true;
    }
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

  clear(): void {
    this.messages.set([]);
    sessionStorage.removeItem('chat_messages');
  }
}
