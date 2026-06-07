import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RoutineService, RoutineEntry } from '../../../core/services/routine.service';
import { ToastService } from '../../../core/services/toast.service';

const DAY_ORDER: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

@Component({
  selector: 'app-routine-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './routine-detail.component.html',
  styleUrl: './routine-detail.component.scss',
})
export class RoutineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly routineService = inject(RoutineService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly entries = signal<RoutineEntry[]>([]);
  readonly sectionId = signal('');

  readonly groupedEntries = signal<{ day: string; classes: RoutineEntry[] }[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sectionId');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.sectionId.set(id);
    this.routineService.getRoutineBySection(id).subscribe({
      next: (res) => {
        const all = res.data ?? [];
        this.entries.set(all);
        this.groupEntries(all);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private groupEntries(entries: RoutineEntry[]): void {
    const map: Record<string, RoutineEntry[]> = {};
    for (const e of entries) {
      if (!map[e.dayOfWeek]) map[e.dayOfWeek] = [];
      map[e.dayOfWeek].push(e);
    }
    const sorted = Object.entries(map).sort((a, b) => (DAY_ORDER[a[0]] ?? 99) - (DAY_ORDER[b[0]] ?? 99));
    const result = sorted.map(([day, classes]) => ({
      day,
      classes: classes.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
    this.groupedEntries.set(result);
  }
}
