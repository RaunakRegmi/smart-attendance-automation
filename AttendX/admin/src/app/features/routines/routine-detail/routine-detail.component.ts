import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RoutineService, RoutineEntry } from '../../../core/services/routine.service';
import { ToastService } from '../../../core/services/toast.service';

const DAY_ORDER: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

const timeToMinutes = (t: string): number | null => {
  const parts = t.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export function timeOrderValidator(g: AbstractControl): ValidationErrors | null {
  const start = g.get('startTime')?.value;
  const end = g.get('endTime')?.value;
  if (start && end) {
    const sm = timeToMinutes(start);
    const em = timeToMinutes(end);
    if (sm !== null && em !== null && em <= sm) {
      g.get('endTime')?.setErrors({ timeOrder: true });
      return { timeOrder: true };
    }
  }
  return null;
}

@Component({
  selector: 'app-routine-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './routine-detail.component.html',
  styleUrl: './routine-detail.component.scss',
})
export class RoutineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly routineService = inject(RoutineService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly entries = signal<RoutineEntry[]>([]);
  readonly sectionId = signal('');
  readonly editMode = signal(false);
  readonly editTarget = signal<RoutineEntry | null>(null);
  readonly saving = signal(false);

  readonly groupedEntries = signal<{ day: string; classes: RoutineEntry[] }[]>([]);

  readonly editForm = this.fb.nonNullable.group({
    dayOfWeek: ['', Validators.required],
    subjectCode: ['', Validators.required],
    subjectName: ['', Validators.required],
    startTime: ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    endTime: ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    block: [''],
    room: [''],
    teacher: [''],
  }, { validators: timeOrderValidator });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sectionId');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.sectionId.set(id);
    this.editMode.set(this.route.snapshot.queryParams['edit'] === 'true');
    this.fetchRoutine();
  }

  private fetchRoutine(): void {
    this.routineService.getRoutineBySection(this.sectionId()).subscribe({
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

  fieldError(field: string): string {
    const ctrl = this.editForm.get(field);
    if (!ctrl || !ctrl.errors || !ctrl.touched) return '';
    if (ctrl.errors['required']) return 'This field is required';
    if (ctrl.errors['pattern']) return 'Use HH:MM format (e.g. 09:00)';
    if (ctrl.errors['timeOrder']) return 'End time must be later than start time';
    return '';
  }

  startEdit(entry: RoutineEntry): void {
    const block = entry.block ?? '';
    this.editForm.patchValue({
      dayOfWeek: entry.dayOfWeek,
      subjectCode: entry.subjectCode,
      subjectName: entry.subjectName,
      startTime: entry.startTime,
      endTime: entry.endTime,
      block: block && !block.startsWith('Block ') ? `Block ${block}` : block,
      room: entry.room ?? '',
      teacher: entry.teacher ?? '',
    });
    this.editForm.markAsUntouched();
    this.editTarget.set(entry);
  }

  cancelEdit(): void {
    this.editTarget.set(null);
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target || this.saving()) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const data = this.editForm.getRawValue();
    this.routineService.updateRoutine(target.id, data).subscribe({
      next: () => {
        this.toast.success('Routine entry updated');
        this.editTarget.set(null);
        this.saving.set(false);
        this.fetchRoutine();
      },
      error: (err) => {
        const msg = err.error?.message ?? 'Failed to update routine entry';
        this.toast.error(msg);
        this.saving.set(false);
      },
    });
  }
}