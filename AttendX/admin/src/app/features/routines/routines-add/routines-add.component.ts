import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RoutineService } from '../../../core/services/routine.service';
import { BatchService } from '../../../core/services/batch.service';
import { SectionService } from '../../../core/services/section.service';
import { ToastService } from '../../../core/services/toast.service';
import { Batch, Section } from '../../../core/models/api.models';

@Component({
  selector: 'app-routines-add',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './routines-add.component.html',
  styleUrl: './routines-add.component.scss',
})
export class RoutinesAddComponent implements OnInit {
  private readonly routineService = inject(RoutineService);
  private readonly batchService = inject(BatchService);
  private readonly sectionService = inject(SectionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly batches = signal<Batch[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly selectedBatchId = signal('');
  readonly selectedSectionId = signal('');
  readonly selectedFile = signal<File | null>(null);
  readonly dragOver = signal(false);
  readonly saving = signal(false);

  downloadRoutineSample(): void {
    window.open('/api/samples/routine', '_blank');
  }

  ngOnInit(): void {
    this.batchService.getAll().subscribe((r) => this.batches.set(r.data ?? []));
  }

  onBatchChange(batchId: string): void {
    this.selectedBatchId.set(batchId);
    this.selectedSectionId.set('');
    if (batchId) {
      this.sectionService.getAll(batchId).subscribe((res) => this.sections.set(res.data ?? []));
    } else {
      this.sections.set([]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files.length) {
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  clearFile(): void {
    this.selectedFile.set(null);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) { this.toast.warning('Select a file'); return; }
    if (!this.selectedBatchId()) { this.toast.warning('Select a batch'); return; }
    if (!this.selectedSectionId()) { this.toast.warning('Select a section'); return; }

    this.saving.set(true);
    this.routineService.uploadRoutine(file, this.selectedBatchId(), this.selectedSectionId()).subscribe({
      next: (res) => {
        this.toast.success(res.message ?? 'Routine uploaded');
        this.router.navigate(['/routines']);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
