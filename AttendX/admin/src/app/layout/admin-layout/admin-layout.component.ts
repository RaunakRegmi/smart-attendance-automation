import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

export interface NavSection {
  title: string | null;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly sidebarCollapsed = signal(false);
  readonly userMenuOpen = signal(false);

  readonly navSections: NavSection[] = [
    {
      title: null,
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Batches', route: '/batches', icon: 'batch' },

        { label: 'Section', route: '/sections', icon: 'section' },
        { label: 'Student', route: '/students', icon: 'student' },
        { label: 'Subject', route: '/subjects', icon: 'subject' },
        { label: 'Lecturer', route: '/lecturers', icon: 'lecturer' },
        { label: 'Faculty', route: '/faculties', icon: 'section' },
        { label: 'Reports', route: '/reports', icon: 'reports' },
        { label: 'AI Assistant', route: '/chatbot', icon: 'chatbot' },
        { label: 'Profile', route: '/profile', icon: 'profile' },
      ],
    },
    {
      title: 'Teachers',
      items: [
        { label: 'Teacher Accounts', route: '/teachers', icon: 'lecturer' },
        { label: 'Notifications', route: '/notifications', icon: 'scheduler' },
        { label: 'Messages', route: '/messages', icon: 'chatbot' },
        { label: 'Oversight', route: '/oversight', icon: 'reports' },
      ],
    },
    {
      title: 'Routine',
      items: [
        { label: 'All routines', route: '/routines', icon: 'routine' },
        { label: 'Upload routine', route: '/routines/add', icon: 'routine-add' },
      ],
    },
  ];

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
    const email = this.auth.user()?.email ?? 'A';
    return email.charAt(0).toUpperCase();
  }

  userName(): string {
    const email = this.auth.user()?.email ?? 'Admin';
    const part = email.split('@')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }
}
