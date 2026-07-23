import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * Live "context window" panel — shows what the agent currently has in working
 * memory: a token meter (used vs the model's num_ctx), how many messages are in
 * context, and the running summary of older turns.
 */
@Component({
  selector: 'app-context-window',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './context-window.component.html',
  styleUrl: './context-window.component.scss',
})
export class ContextWindowComponent {
  readonly promptTokens = input<number>(0);
  readonly completionTokens = input<number>(0);
  readonly numCtx = input<number>(8192);
  readonly messageCount = input<number>(0);
  readonly summary = input<string>('');

  readonly used = computed(() => (this.promptTokens() || 0) + (this.completionTokens() || 0));
  readonly pct = computed(() => {
    const n = this.numCtx() || 1;
    return Math.min(100, Math.round((this.used() / n) * 1000) / 10);
  });
  readonly level = computed<'ok' | 'warn' | 'bad'>(() => {
    const p = this.pct();
    return p < 60 ? 'ok' : p < 85 ? 'warn' : 'bad';
  });
}
