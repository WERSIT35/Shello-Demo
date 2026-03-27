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
  accessToken?: string;
  expiresIn?: number;
  user: ApiUser;
  twoFactorRequired?: boolean;
  twoFactorToken?: string;
};

type TwoFactorStatusResponse = {
  enabled: boolean;
};

type TwoFactorSetupResponse = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
};

type TwoFactorLoginPayload = {
  token: string;
  code: string;
};

type GoogleStorageOutcome =
  | { status: 'none' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'two-factor-required'; user: AuthUser; token: string }
  | { status: 'error'; message: string };

type GoogleAuthMessage = {
  type: 'google-auth';
  data?: GoogleAuthPayload;
  error?: string;
};

type GoogleBridgePayload = GoogleAuthPayload | { error: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly sessionReadySubject = new BehaviorSubject<boolean>(false);
  private accessTokenValue: string | null = null;
  private accessTokenExpiresAt: number | null = null;
  private restoreSession$?: ReturnType<AuthService['refreshSession']>;
  private readonly googleAuthStorageKey = 'shello_google_auth';
  private readonly googleAuthHashKey = 'google-auth';

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get accessToken(): string | null {
    return this.accessTokenValue;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAccessTokenValid();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  login(payload: LoginPayload) {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.setSession(response.accessToken, response.user, response.expiresIn);
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

    const oauthUrl = `${API_BASE_URL}/auth/google?returnTo=${encodeURIComponent(window.location.href)}`;
    const popup = window.open(
      oauthUrl,
      'google-auth',
      'width=520,height=640,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no'
    );

    if (!popup) {
      window.location.assign(oauthUrl);
      return new Observable<AuthUser>(() => undefined);
    }

    popup.focus();

    return new Observable<AuthUser>((observer) => {
      let handled = false;
      let popupClosedAt: number | null = null;
      let recoveryStarted = false;
      const popupGraceMs = 5000;
      const isAbsoluteApiBase = API_BASE_URL.startsWith('http');
      const expectedOrigin = isAbsoluteApiBase
        ? new URL(API_BASE_URL).origin
        : window.location.origin;

      const handlePayload = (payload: GoogleAuthPayload) => {
        if (payload.twoFactorRequired && payload.twoFactorToken) {
          handled = true;
          cleanup();
          observer.error({
            code: 'TWO_FACTOR_REQUIRED',
            details: {
              twoFactorToken: payload.twoFactorToken,
              user: payload.user
            }
          });
          return;
        }

        if (!payload.accessToken) {
          handled = true;
          cleanup();
          observer.error(new Error('Google login failed.'));
          return;
        }

        this.setSession(payload.accessToken, payload.user, payload.expiresIn);
        this.sessionReadySubject.next(true);
        handled = true;
        cleanup();
        observer.next(this.mapUser(payload.user));
        observer.complete();
      };

      const handleMessage = (event: MessageEvent) => {
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

        handlePayload(message.data);
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

        if (this.isGoogleBridgeErrorPayload(storedPayload)) {
          handled = true;
          cleanup();
          observer.error(new Error(storedPayload.error));
          return;
        }

        handlePayload(storedPayload);
      };

      const poll = window.setInterval(() => {
        if (handled) {
          return;
        }

        const storedPayload = this.readGoogleAuthPayload();
        if (storedPayload) {
          if (!popup.closed) {
            popup.close();
          }

          if (this.isGoogleBridgeErrorPayload(storedPayload)) {
            handled = true;
            cleanup();
            observer.error(new Error(storedPayload.error));
            return;
          }

          handlePayload(storedPayload);
          return;
        }

        if (popup.closed) {
          if (popupClosedAt === null) {
            popupClosedAt = Date.now();
          }

          if (Date.now() - popupClosedAt >= popupGraceMs && !recoveryStarted) {
            recoveryStarted = true;
            this.refreshSession().subscribe({
              next: (restored) => {
                if (handled) {
                  return;
                }

                if (restored && this.currentUser) {
                  handled = true;
                  cleanup();
                  observer.next(this.currentUser);
                  observer.complete();
                  return;
                }

                handled = true;
                cleanup();
                observer.error(new Error('Login cancelled.'));
              },
              error: () => {
                if (handled) {
                  return;
                }

                handled = true;
                cleanup();
                observer.error(new Error('Login cancelled.'));
              }
            });
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
        if (this.isGoogleBridgeErrorPayload(immediatePayload)) {
          handled = true;
          cleanup();
          observer.error(new Error(immediatePayload.error));
          return;
        }

        handlePayload(immediatePayload);
      }

      return () => cleanup();
    });
  }

  ensureSession() {
    if (!this.isBrowser) {
      this.sessionReadySubject.next(true);
      return of(true);
    }

    const hasValidToken = this.isAccessTokenValid();
    if (this.sessionReadySubject.value && (hasValidToken || !this.accessTokenValue)) {
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

  getTwoFactorStatus() {
    return this.http.get<TwoFactorStatusResponse>(`${API_BASE_URL}/auth/2fa/status`);
  }

  setupTwoFactor() {
    return this.http.post<TwoFactorSetupResponse>(`${API_BASE_URL}/auth/2fa/setup`, {});
  }

  enableTwoFactor(code: string) {
    return this.http.post<TwoFactorStatusResponse>(`${API_BASE_URL}/auth/2fa/enable`, { code });
  }

  disableTwoFactor(code: string) {
    return this.http.post<TwoFactorStatusResponse>(`${API_BASE_URL}/auth/2fa/disable`, { code });
  }

  verifyTwoFactorLogin(token: string, code: string) {
    const payload: TwoFactorLoginPayload = { token, code };

    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/2fa/login`, payload).pipe(
      tap((response) => {
        this.setSession(response.accessToken, response.user, response.expiresIn);
        this.sessionReadySubject.next(true);
      }),
      map((response) => this.mapUser(response.user))
    );
  }

  consumeGoogleStoragePayload(): GoogleStorageOutcome {
    const hashPayload = this.readGoogleAuthPayloadFromHash();
    if (hashPayload) {
      this.persistGoogleBridgePayload(hashPayload);
    }

    const payload = this.readGoogleAuthPayload();
    if (!payload) {
      return { status: 'none' };
    }

    if (this.isGoogleBridgeErrorPayload(payload)) {
      return { status: 'error', message: payload.error };
    }

    const authPayload = payload;

    if (authPayload.twoFactorRequired && authPayload.twoFactorToken) {
      return {
        status: 'two-factor-required',
        token: authPayload.twoFactorToken,
        user: this.mapUser(authPayload.user)
      };
    }

    if (!authPayload.accessToken) {
      return { status: 'none' };
    }

    this.setSession(authPayload.accessToken, authPayload.user, authPayload.expiresIn);
    this.sessionReadySubject.next(true);
    return { status: 'authenticated', user: this.mapUser(authPayload.user) };
  }

  private refreshSession() {
    return this.http
      .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.setSession(response.accessToken, response.user, response.expiresIn)),
        map(() => true),
        catchError(() => {
          // Avoid clearing a freshly established in-memory session (e.g. Google popup)
          // when an earlier concurrent refresh request fails.
          if (!this.isAccessTokenValid()) {
            this.clearSession();
            return of(false);
          }

          return of(true);
        }),
        finalize(() => {
          this.restoreSession$ = undefined;
          this.sessionReadySubject.next(true);
        })
      );
  }

  private setSession(accessToken: string, user: ApiUser, expiresIn?: number): void {
    this.accessTokenValue = accessToken;
    this.accessTokenExpiresAt = typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : null;
    this.currentUserSubject.next(this.mapUser(user));
  }

  private clearSession(): void {
    this.accessTokenValue = null;
    this.accessTokenExpiresAt = null;
    this.currentUserSubject.next(null);
  }

  private isAccessTokenValid(): boolean {
    if (!this.accessTokenValue || !this.accessTokenExpiresAt) {
      return false;
    }

    const skewMs = 30 * 1000;
    return Date.now() < this.accessTokenExpiresAt - skewMs;
  }

  private readGoogleAuthPayloadFromHash(): GoogleAuthMessage | null {
    if (!this.isBrowser) {
      return null;
    }

    const rawHash = window.location.hash?.replace(/^#/, '');
    if (!rawHash) {
      return null;
    }

    const params = new URLSearchParams(rawHash);
    const rawPayload = params.get(this.googleAuthHashKey);
    if (!rawPayload) {
      return null;
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(rawPayload)) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const message = parsed as GoogleAuthMessage;
      if (message.type !== 'google-auth') {
        return null;
      }

      params.delete(this.googleAuthHashKey);
      const nextHash = params.toString();
      if (typeof window.history?.replaceState === 'function') {
        const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`;
        window.history.replaceState(window.history.state, '', nextUrl);
      }

      return message;
    } catch {
      return null;
    }
  }

  private persistGoogleBridgePayload(payload: GoogleAuthMessage): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      const store = { type: payload.type, data: payload.data, error: payload.error, createdAt: Date.now() };
      window.localStorage.setItem(this.googleAuthStorageKey, JSON.stringify(store));
    } catch {
      // Ignore storage failures and let message flow continue.
    }
  }

  private readGoogleAuthPayload(): GoogleBridgePayload | null {
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

      const wrapper = parsed as { data?: unknown; error?: unknown; createdAt?: number };
      if (typeof wrapper.error === 'string') {
        return { error: wrapper.error };
      }

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
    const hasUser = Boolean(payload.user);
    const hasAccessToken = typeof payload.accessToken === 'string';
    const hasTwoFactor = payload.twoFactorRequired === true && typeof payload.twoFactorToken === 'string';

    return hasUser && (hasAccessToken || hasTwoFactor);
  }

  private isGoogleBridgeErrorPayload(value: GoogleBridgePayload): value is { error: string } {
    return 'error' in value && typeof value.error === 'string';
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
