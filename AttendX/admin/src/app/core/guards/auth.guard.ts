import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  // A logged-in teacher belongs in the teacher portal — redirect, don't nuke the session.
  if (auth.isTeacher()) {
    return router.createUrlTree(['/teacher']);
  }
  auth.clearSession();
  return router.createUrlTree(['/login']);
};

export const teacherGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isTeacher()) {
    return true;
  }
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  // Admins keep their own console; anyone else has no business here.
  if (auth.isAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }
  auth.clearSession();
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return true;
  }
  if (auth.isAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }
  if (auth.isTeacher()) {
    return router.createUrlTree(['/teacher']);
  }
  // Logged in as non-admin: allow login page (do not bounce to /dashboard)
  return true;
};
