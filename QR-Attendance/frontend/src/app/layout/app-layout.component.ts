import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../core/auth/auth.store';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatDividerModule],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
})
export class AppLayoutComponent {
  private router = inject(Router);
  protected auth = inject(AuthStore);

  protected user = computed(() => this.auth.user());

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

