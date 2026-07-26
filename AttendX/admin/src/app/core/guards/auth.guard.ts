import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Send an unauthenticated visitor to the login page without losing where they
 * were going — `state.url` keeps the query string, which matters for the QR
 * deep link (`/student?token=…&sessionId=…`). Redirecting to a bare '/login'
 * silently dropped those params, which is why a scanned code used to land the
 * student on an empty manual-entry form.
 */
const loginWithReturn = (router: Router, state: RouterStateSnapshot) =>
  router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return loginWithReturn(router, state);
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }
  if (!auth.isAuthenticated()) {
    return loginWithReturn(router, state);
  }
  // A logged-in teacher belongs in the teacher portal — redirect, don't nuke the session.
  if (auth.isTeacher()) {
    return router.createUrlTree(['/teacher']);
  }
  auth.clearSession();
  return router.createUrlTree(['/login']);
};

export const teacherGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isTeacher()) {
    return true;
  }
  if (!auth.isAuthenticated()) {
    return loginWithReturn(router, state);
  }
  // Admins keep their own console; anyone else has no business here.
  if (auth.isAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }
  auth.clearSession();
  return router.createUrlTree(['/login']);
};

export const studentGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isStudent()) {
    return true;
  }
  if (!auth.isAuthenticated()) {
    return loginWithReturn(router, state);
  }
  if (auth.isAdmin()) {
    return router.createUrlTree(['/dashboard']);
  }
  if (auth.isTeacher()) {
    return router.createUrlTree(['/teacher']);
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
  if (auth.isStudent()) {
    return router.createUrlTree(['/student']);
  }
  return true;
};
