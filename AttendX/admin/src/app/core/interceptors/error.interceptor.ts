import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message =
        error.error?.message ||
        error.error?.error ||
        (error.status === 0 ? 'Unable to connect to server' : 'Something went wrong');

      if (error.status === 401) {
        if (!req.url.includes('/auth/login')) {
          auth.logout();
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        // A scoping 403 (e.g. a teacher touching a non-assigned class) is not a
        // broken session — show access denied and stay in-app.
        if (!req.url.includes('/auth/login')) {
          toast.error(message || 'Access denied');
        }
      } else if (error.status !== 400) {
        toast.error(message);
      }

      return throwError(() => error);
    })
  );
};
