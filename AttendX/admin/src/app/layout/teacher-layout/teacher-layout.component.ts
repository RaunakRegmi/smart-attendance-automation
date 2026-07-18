import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { NavSection } from '../admin-layout/admin-layout.component';

/**
 * Teacher portal shell. Mirrors the admin layout (same SCSS) with a
 * teacher-scoped nav and an unread-messages badge (fetched on load — async
 * messaging, no sockets).
 */
@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './teacher-layout.component.html',
  styleUrl: '../admin-layout/admin-layout.component.scss',
})
export class TeacherLayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly messaging = inject(MessagingService);

  readonly sidebarCollapsed = signal(false);
  readonly userMenuOpen = signal(false);
  readonly unreadCount = signal(0);

  readonly navSections: NavSection[] = [
    {
      title: null,
      items: [
        { label: 'My Dashboard', route: '/teacher', icon: 'dashboard' },
        { label: 'My Classes', route: '/teacher/classes', icon: 'section' },
        { label: 'Attendance', route: '/teacher/attendance', icon: 'student' },
        { label: 'Reports', route: '/teacher/reports', icon: 'reports' },
        { label: 'At-risk Students', route: '/teacher/at-risk', icon: 'student' },
        { label: 'Messages', route: '/teacher/messages', icon: 'chatbot' },
        { label: 'Profile', route: '/teacher/profile', icon: 'profile' },
      ],
    },
  ];

  ngOnInit(): void {
    this.messaging.getUnreadCount().subscribe({
      next: (res) => this.unreadCount.set(res.data?.unreadCount ?? 0),
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
    const email = this.auth.user()?.email ?? 'T';
    return email.charAt(0).toUpperCase();
  }

  userName(): string {
    const email = this.auth.user()?.email ?? 'Teacher';
    const part = email.split('@')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }
}
