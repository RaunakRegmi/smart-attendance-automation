import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStore, type AuthUser } from './auth.store';

function hasRole(user: AuthUser | null, roles: string[]) {
  if (!user) return false;
  return roles.includes(user.role);
}

export const roleGuard =
  (...roles: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>): CanActivateFn =>
  () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    const user = auth.user();
    if (hasRole(user, roles)) return true;
    return router.parseUrl('/dashboard');
  };

