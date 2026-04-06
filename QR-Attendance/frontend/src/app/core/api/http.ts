import { HttpErrorResponse } from '@angular/common/http';

export function getErrorMessage(err: unknown) {
  const anyErr = err as Partial<HttpErrorResponse> & { error?: any };
  const msg = anyErr?.error?.message;
  if (typeof msg === 'string') return msg;
  if (typeof anyErr?.message === 'string') return anyErr.message;
  return 'Request failed';
}

