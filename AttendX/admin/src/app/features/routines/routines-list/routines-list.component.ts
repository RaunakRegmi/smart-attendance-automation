import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RoutineService, RoutineGroup } from '../../../core/services/routine.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-routines-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './routines-list.component.html',
  styleUrl: './routines-list.component.scss',
})
export class RoutinesListComponent implements OnInit {
  private readonly routineService = inject(RoutineService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly routines = signal<RoutineGroup[]>([]);
  readonly deleting = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.routineService.listRoutines().subscribe({
      next: (res) => {
        this.routines.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load routines');
      },
    });
  }

  deleteRoutine(sectionId: string): void {
    if (!confirm('Delete all routine entries for this section?')) return;
    this.deleting.set(sectionId);
    this.routineService.deleteRoutine(sectionId).subscribe({
      next: () => {
        this.toast.success('Routine deleted');
        this.load();
      },
      error: () => {
        this.toast.error('Delete failed');
        this.deleting.set(null);
      },
    });
  }
}
