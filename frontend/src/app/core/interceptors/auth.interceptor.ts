import { HttpHandler, HttpInterceptor, HttpRequest, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { IS_STATIC_MODE } from '../config/static-mode.config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(API_BASE_URL)) {
      return next.handle(req);
    }

    if (IS_STATIC_MODE) {
      return throwError(() => new Error(`Backend request blocked in static mode: ${req.method} ${req.url}`));
    }

    const token = this.auth.accessToken;
    let request = req.clone({ withCredentials: true });

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}
