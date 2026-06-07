import { Component, input, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (totalPages() > 0) {
      <div class="pagination">
        <span class="pagination__info">
          Showing {{ from() }} to {{ to() }} of {{ total() }} {{ total() === 1 ? 'entry' : 'entries' }}.
        </span>
        <div class="pagination__center">
          <div class="pagination__controls">
            <button type="button" class="pagination__btn" [disabled]="page() <= 1" (click)="go(1)" title="First page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
            </button>
            <button type="button" class="pagination__btn" [disabled]="page() <= 1" (click)="go(page() - 1)" title="Previous page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            @for (p of pageNumbers(); track p) {
              @if (p === -1) {
                <span class="pagination__ellipsis">…</span>
              } @else {
                <button type="button" class="pagination__btn" [class.active]="p === page()" (click)="go(p)">{{ p }}</button>
              }
            }
            <button type="button" class="pagination__btn" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" title="Next page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="pagination__btn" [disabled]="page() >= totalPages()" (click)="go(totalPages())" title="Last page">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>
          </div>
          <div class="pagination__size">
            <select [ngModel]="limit()" (ngModelChange)="onLimitChange($event)">
              @for (s of pageSizes; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border, #E2E8F0);
      font-size: 0.875rem;
      color: var(--text-secondary, #64748B);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .pagination__info {
      white-space: nowrap;
    }
    .pagination__center {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .pagination__controls {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }
    .pagination__btn {
      min-width: 2rem;
      height: 2rem;
      border: 1px solid var(--border, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8125rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary, #0F172A);
      transition: all 0.1s;
      padding: 0 0.375rem;
    }
    .pagination__btn:hover:not(:disabled):not(.active) {
      background: var(--bg-page, #F8FAFC);
    }
    .pagination__btn.active {
      background: var(--primary, #1A3A5C);
      color: #fff;
      border-color: var(--primary, #1A3A5C);
    }
    .pagination__btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination__ellipsis {
      padding: 0 0.25rem;
      color: var(--text-muted, #94A3B8);
    }
    .pagination__size select {
      padding: 0.5rem 0.75rem;
      padding-right: 2.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      height: 38px;
      min-width: 80px;
    }
  `],
})
export class PaginationComponent {
  page = input<number>(1);
  totalPages = input<number>(1);
  total = input<number>(0);
  limit = input<number>(10);
  pageChange = output<number>();
  limitChange = output<number>();

  readonly pageSizes = [10, 20, 50, 80, 120];

  readonly from = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  readonly to = computed(() => {
    return Math.min(this.page() * this.limit(), this.total());
  });

  readonly pageNumbers = computed(() => {
    const tp = this.totalPages();
    const cp = this.page();
    const pages: number[] = [];
    if (tp <= 7) {
      for (let i = 1; i <= tp; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (cp > 3) pages.push(-1);
    const start = Math.max(2, cp - 1);
    const end = Math.min(tp - 1, cp + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (cp < tp - 2) pages.push(-1);
    pages.push(tp);
    return pages;
  });

  go(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.pageChange.emit(p);
  }

  onLimitChange(value: number): void {
    this.limitChange.emit(value);
  }
}
