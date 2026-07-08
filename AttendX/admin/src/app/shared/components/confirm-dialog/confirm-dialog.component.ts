import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal__header">
          <h2>{{ title }}</h2>
        </div>
        <div class="modal__body">
          <p>{{ message }}</p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--secondary" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="btn btn--danger" (click)="confirm.emit()" [disabled]="loading">
            @if (loading) { <span class="loading-spinner"></span> {{ loadingLabel }} }
            @else { {{ confirmLabel }} }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Delete';
  @Input() loading = false;
  @Input() loadingLabel = 'Deleting...';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
