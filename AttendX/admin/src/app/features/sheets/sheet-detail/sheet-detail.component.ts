import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SheetsService } from '../../../core/services/sheets.service';
import { ToastService } from '../../../core/services/toast.service';
import { SheetRecord } from '../../../core/models/api.models';

@Component({
  selector: 'app-sheet-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './sheet-detail.component.html',
  styleUrl: './sheet-detail.component.scss',
})
export class SheetDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sheetsService = inject(SheetsService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly sheet = signal<SheetRecord | null>(null);
  readonly previewOpen = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.sheetsService.getSheets({ limit: 200 }).subscribe({
      next: (rows) => {
        const found = rows.data.find((s) => s.id === id) ?? null;
        this.sheet.set(found);
        this.loading.set(false);
        if (!found) {
          this.toast.error('Sheet not found');
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  sheetUrl(s: SheetRecord): string {
    return s.metadata?.url ?? `https://docs.google.com/spreadsheets/d/${s.sheetId}/edit`;
  }

  previewUrl(s: SheetRecord): SafeResourceUrl {
    const u = this.sheetUrl(s).replace('/edit', '/preview');
    return this.sanitizer.bypassSecurityTrustResourceUrl(u);
  }

  toggle(): void {
    const s = this.sheet();
    if (!s) return;
    this.sheetsService.toggleStatus(s.id).subscribe({
      next: () => {
        this.toast.success('Status updated');
        this.reload(s.id);
      },
      error: () => {},
    });
  }

  sync(): void {
    const s = this.sheet();
    if (!s) return;
    this.sheetsService.syncSheet(s.id).subscribe({
      next: (res: unknown) => {
        this.toast.success((res as { message?: string })?.message ?? 'Sync enqueued');
      },
      error: () => {},
    });
  }

  private reload(id: string): void {
    this.sheetsService.getSheets().subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.sheet.set(list.find((x) => x.id === id) ?? null);
      },
    });
  }
}
