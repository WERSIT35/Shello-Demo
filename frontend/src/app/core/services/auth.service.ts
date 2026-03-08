import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type UserRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  lastName: string;
  email: string;
  password: string;
};

type ApiUser = {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: UserRole;
};

type LoginResponse = {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
};

type RefreshResponse = {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
};

type RegisterResponse = {
  user: ApiUser;
};

type GoogleAuthPayload = {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
};

type GoogleAuthMessage = {
  type: 'google-auth';
  data?: GoogleAuthPayload;
  error?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly sessionReadySubject = new BehaviorSubject<boolean>(false);
  private accessTokenValue: string | null = null;
  private restoreSession$?: ReturnType<AuthService['refreshSession']>;
  private readonly googleAuthStorageKey = 'shello_google_auth';

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get accessToken(): string | null {
    return this.accessTokenValue;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return Boolean(this.accessTokenValue);
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  login(payload: LoginPayload) {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.setSession(response.accessToken, response.user);
          this.sessionReadySubject.next(true);
        }),
        map((response) => this.mapUser(response.user))
      );
  }

  register(payload: RegisterPayload) {
    return this.http
      .post<RegisterResponse>(`${API_BASE_URL}/auth/register`, payload, { withCredentials: true })
      .pipe(map((response) => this.mapUser(response.user)));
  }

  loginWithGooglePopup(): Observable<AuthUser> {
    if (!this.isBrowser) {
      return throwError(() => new Error('Google login is only available in the browser.'));
    }

    window.localStorage.removeItem(this.googleAuthStorageKey);

    const popup = window.open(
      `${API_BASE_URL}/auth/google`,
      'google-auth',
      'width=520,height=640,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no'
    );

    if (!popup) {
      return throwError(() => new Error('Popup blocked. Please allow popups and try again.'));
    }

    popup.focus();

    return new Observable<AuthUser>((observer) => {
      let handled = false;
      let popupClosedAt: number | null = null;
      const popupGraceMs = 5000;
      const isAbsoluteApiBase = API_BASE_URL.startsWith('http');
      const expectedOrigin = isAbsoluteApiBase
        ? new URL(API_BASE_URL).origin
        : window.location.origin;

      const handleMessage = (event: MessageEvent) => {
        if (event.source && event.source !== popup) {
          return;
        }

        if (isAbsoluteApiBase && event.origin !== expectedOrigin && event.origin !== window.location.origin) {
          return;
        }

        const message = event.data as GoogleAuthMessage | null;

        if (!message || message.type !== 'google-auth') {
          return;
        }

        if (message.error) {
          handled = true;
          cleanup();
          observer.error(new Error(message.error));
          return;
        }

        if (!message.data) {
          handled = true;
          cleanup();
          observer.error(new Error('Google login failed.'));
          return;
        }

        this.setSession(message.data.accessToken, message.data.user);
        this.sessionReadySubject.next(true);
        handled = true;
        cleanup();
        observer.next(this.mapUser(message.data.user));
        observer.complete();
      };

      const handleStorage = (event: StorageEvent) => {
        if (handled) {
          return;
        }

        if (event.key !== this.googleAuthStorageKey) {
          return;
        }

        const storedPayload = this.readGoogleAuthPayload();
        if (!storedPayload) {
          return;
        }

        handled = true;
        cleanup();
        this.setSession(storedPayload.accessToken, storedPayload.user);
        this.sessionReadySubject.next(true);
        observer.next(this.mapUser(storedPayload.user));
        observer.complete();
      };

      const poll = window.setInterval(() => {
        if (handled) {
          return;
        }

        const storedPayload = this.readGoogleAuthPayload();
        if (storedPayload) {
          handled = true;
          cleanup();
          if (!popup.closed) {
            popup.close();
          }
          this.setSession(storedPayload.accessToken, storedPayload.user);
          this.sessionReadySubject.next(true);
          observer.next(this.mapUser(storedPayload.user));
          observer.complete();
          return;
        }

        if (popup.closed) {
          if (popupClosedAt === null) {
            popupClosedAt = Date.now();
          }

          if (Date.now() - popupClosedAt >= popupGraceMs) {
            handled = true;
            cleanup();
            observer.error(new Error('Login cancelled.'));
          }
        }
      }, 400);

      const cleanup = () => {
        window.clearInterval(poll);
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('storage', handleStorage);
      };

      window.addEventListener('message', handleMessage);
      window.addEventListener('storage', handleStorage);

      const immediatePayload = this.readGoogleAuthPayload();
      if (immediatePayload) {
        handled = true;
        cleanup();
        this.setSession(immediatePayload.accessToken, immediatePayload.user);
        this.sessionReadySubject.next(true);
        observer.next(this.mapUser(immediatePayload.user));
        observer.complete();
      }

      return () => cleanup();
    });
  }

  ensureSession() {
    if (!this.isBrowser) {
      this.sessionReadySubject.next(true);
      return of(true);
    }

    if (this.sessionReadySubject.value) {
      return of(true);
    }

    if (!this.restoreSession$) {
      this.restoreSession$ = this.refreshSession().pipe(shareReplay(1));
    }

    return this.restoreSession$;
  }

  logout() {
    if (!this.isBrowser) {
      this.clearSession();
      return of(null);
    }

    return this.http.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true }).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession())
    );
  }

  consumeGoogleStoragePayload(): boolean {
    const payload = this.readGoogleAuthPayload();
    if (!payload) {
      return false;
    }

    this.setSession(payload.accessToken, payload.user);
    this.sessionReadySubject.next(true);
    return true;
  }

  private refreshSession() {
    return this.http
      .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.setSession(response.accessToken, response.user)),
        map(() => true),
        catchError(() => {
          this.clearSession();
          return of(false);
        }),
        finalize(() => this.sessionReadySubject.next(true))
      );
  }

  private setSession(accessToken: string, user: ApiUser): void {
    this.accessTokenValue = accessToken;
    this.currentUserSubject.next(this.mapUser(user));
  }

  private clearSession(): void {
    this.accessTokenValue = null;
    this.currentUserSubject.next(null);
  }

  private readGoogleAuthPayload(): GoogleAuthPayload | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.googleAuthStorageKey);
      if (!raw) {
        return null;
      }

      window.localStorage.removeItem(this.googleAuthStorageKey);
      const parsed = JSON.parse(raw) as unknown;

      if (this.isGoogleAuthPayload(parsed)) {
        return parsed;
      }

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const wrapper = parsed as { data?: unknown; createdAt?: number };
      if (!this.isGoogleAuthPayload(wrapper.data)) {
        return null;
      }

      const maxAgeMs = 2 * 60 * 1000;
      if (typeof wrapper.createdAt === 'number' && Date.now() - wrapper.createdAt > maxAgeMs) {
        return null;
      }

      return wrapper.data;
    } catch (error) {
      return null;
    }
  }

  private isGoogleAuthPayload(value: unknown): value is GoogleAuthPayload {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as GoogleAuthPayload;
    return typeof payload.accessToken === 'string' && Boolean(payload.user);
  }

  private mapUser(user: ApiUser): AuthUser {
    return {
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role
    };
  }
}
