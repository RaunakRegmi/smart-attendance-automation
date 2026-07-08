import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" role="alert" (click)="toastService.dismiss(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
