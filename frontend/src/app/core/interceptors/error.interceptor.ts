import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const errorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isLoginOrRegister = req.url.includes('/login') || req.url.includes('/register') || req.url.includes('/refresh');

      console.log(`[ErrorInterceptor] HTTP ${err.status} on ${req.url}`, isLoginOrRegister ? '(auth endpoint, skip refresh)' : '');

      if (err.status === 401 && !isLoginOrRegister && !req.url.includes('/landing/public')) {
        const refreshToken = auth.refreshTokenValue;

        // If we have a refresh token and are not already refreshing, attempt token refresh
        if (refreshToken && !isRefreshing) {
          isRefreshing = true;
          console.log('[ErrorInterceptor] 401 detected — attempting token refresh...');

          return auth.doRefreshToken().pipe(
            switchMap((res) => {
              isRefreshing = false;
              console.log('[ErrorInterceptor] Token refreshed successfully, retrying:', req.url);
              // Retry the original request with the new access token
              const retried = req.clone({
                setHeaders: { Authorization: `Bearer ${res.accessToken}` },
              });
              return next(retried);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              console.error('[ErrorInterceptor] Token refresh FAILED — logging out', refreshErr);
              auth.logout();
              router.navigate(['/login']);
              return throwError(() => refreshErr);
            }),
          );
        } else if (!refreshToken) {
          console.warn('[ErrorInterceptor] No refresh token available — logging out');
          auth.logout();
          router.navigate(['/login']);
        }
      }

      return throwError(() => err);
    }),
  );
};
