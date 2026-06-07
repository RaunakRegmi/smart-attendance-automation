import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RoutineService, RoutineGroup } from '../../../core/services/routine.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-routines-list',
  standalone: true,
  imports: [RouterLink, DatePipe, ConfirmDialogComponent, PaginationComponent],
  templateUrl: './routines-list.component.html',
  styleUrl: './routines-list.component.scss',
})
export class RoutinesListComponent implements OnInit {
  private readonly routineService = inject(RoutineService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly routines = signal<RoutineGroup[]>([]);
  readonly deleteTarget = signal<RoutineGroup | null>(null);
  readonly deleting = signal(false);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.routineService.listRoutines({ page: this.page(), limit: this.limit() }).subscribe({
      next: (res) => {
        this.routines.set(res.data ?? []);
        this.total.set(res.pagination?.total ?? 0);
        this.totalPages.set(res.pagination?.totalPages ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  onLimitChange(l: number): void {
    this.limit.set(l);
    this.page.set(1);
    this.load();
  }

  confirmDelete(routine: RoutineGroup): void {
    this.deleteTarget.set(routine);
  }

  deleteRoutine(): void {
    const target = this.deleteTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    this.routineService.deleteRoutine(target.sectionId).subscribe({
      next: () => {
        this.toast.success('Routine deleted');
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.load();
      },
      error: () => {
        this.deleteTarget.set(null);
        this.deleting.set(false);
      },
    });
  }
}
