import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { NavSection } from '../admin-layout/admin-layout.component';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './student-layout.component.html',
  styleUrl: '../admin-layout/admin-layout.component.scss',
})
export class StudentLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sidebarCollapsed = signal(false);
  readonly userMenuOpen = signal(false);

  readonly navSections: NavSection[] = [
    {
      title: null,
      items: [
        { label: 'Scan Attendance', route: '/student', icon: 'student' },
        { label: 'My Profile', route: '/student/profile', icon: 'profile' },
      ],
    },
  ];

  ngOnInit(): void {
    this.auth.loadCurrentUser().subscribe({
      next: (res) => {
        if (res?.data?.user?.mustChangePassword && !this.router.url.startsWith('/student/profile')) {
          this.router.navigate(['/student/profile']);
        }
      },
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }

  userInitials(): string {
    const email = this.auth.user()?.email ?? 'S';
    return email.charAt(0).toUpperCase();
  }

  userName(): string {
    const email = this.auth.user()?.email ?? 'Student';
    const part = email.split('@')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }
}
