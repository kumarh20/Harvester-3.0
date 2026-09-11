import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Global HTTP Interceptor for API calls (e.g. WhatsApp OTP, External Endpoints).
 * Follows Single Responsibility Principle (SRP) for request enhancement & error normalization.
 */
export const apiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Clone request to set default headers if not present
  const modifiedReq = req.clone({
    setHeaders: {
      'Accept': 'application/json'
    }
  });

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected network error occurred. Please check your connection.';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side / Network error
        errorMessage = `Network Error: ${error.error.message}`;
      } else {
        // Server-side response error
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Server is unreachable. Please check your internet connection.';
        } else if (error.status === 401 || error.status === 403) {
          errorMessage = 'Authentication failed. Please verify your credentials.';
        } else if (error.status >= 500) {
          errorMessage = 'Server error occurred. Please try again in a moment.';
        }
      }

      console.warn(`[HTTP ${req.method} ${req.url}] Error:`, errorMessage, error);
      return throwError(() => error);
    })
  );
};
