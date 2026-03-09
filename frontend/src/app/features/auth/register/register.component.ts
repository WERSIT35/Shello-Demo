import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, type RegisterPayload, type AuthUser } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private googlePollId: number | null = null;

  protected isSubmitting = false;
  protected errorMessage = '';
  protected twoFactorRequired = false;
  protected twoFactorToken = '';
  protected twoFactorUser: AuthUser | null = null;

  protected form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  protected twoFactorForm = this.formBuilder.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    this.auth.ensureSession().subscribe(() => {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopGoogleStoragePoll();
  }

  protected submit(): void {
    if (this.twoFactorRequired) {
      this.submitTwoFactor();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all fields with valid values.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = this.form.getRawValue() as RegisterPayload;

    this.auth.register(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        if (this.auth.isAuthenticated()) {
          this.router.navigate(['/']);
          return;
        }
        const challenge = this.extractTwoFactorChallenge(error);
        if (challenge) {
          this.startTwoFactorChallenge(challenge);
          return;
        }

        this.errorMessage = this.resolveError(error);
      }
    });
  }

  protected signUpWithGoogle(): void {
    this.isSubmitting = true;
    this.errorMessage = '';
    this.startGoogleStoragePoll();

    this.auth.loginWithGooglePopup().subscribe({
      next: () => {
        this.stopGoogleStoragePoll();
        this.isSubmitting = false;
        this.router.navigate(['/']);
      },
      error: (error: unknown) => {
        this.stopGoogleStoragePoll();
        this.isSubmitting = false;
        if (this.auth.isAuthenticated()) {
          this.router.navigate(['/']);
          return;
        }
        const challenge = this.extractTwoFactorChallenge(error);
        if (challenge) {
          this.startTwoFactorChallenge(challenge);
          return;
        }
        const message = this.resolveError(error);
        if (message.toLowerCase().includes('login cancelled')) {
          return;
        }
        this.errorMessage = message;
      }
    });
  }

  protected submitTwoFactor(): void {
    const rawCode = this.twoFactorForm.value.code ?? '';
    const code = rawCode.replace(/\s+/g, '');

    if (rawCode !== code) {
      this.twoFactorForm.controls.code.setValue(code);
    }

    if (!/^\d{6}$/.test(code)) {
      this.twoFactorForm.markAllAsTouched();
      this.errorMessage = 'Enter the 6-digit code from your authenticator app.';
      return;
    }

    if (!this.twoFactorToken) {
      this.errorMessage = 'Two-factor session expired. Please sign in again.';
      this.twoFactorRequired = false;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.verifyTwoFactorLogin(this.twoFactorToken, code).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.clearTwoFactorChallenge();
        this.router.navigate(['/']);
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        const errorCode = this.extractErrorCode(error);
        if (
          errorCode === 'TWO_FACTOR_NOT_ENABLED' ||
          errorCode === 'INVALID_TWO_FACTOR_TOKEN' ||
          errorCode === 'TOKEN_REVOKED'
        ) {
          this.clearTwoFactorChallenge();
          this.errorMessage = 'Two-factor session expired. Please sign in again.';
          return;
        }

        this.errorMessage = this.resolveError(error);
      }
    });
  }

  protected cancelTwoFactor(): void {
    this.clearTwoFactorChallenge();
  }

  private resolveError(error: unknown): string {
    const fallback = 'Unable to create account. Please try again.';

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeMessage = (error as {
      error?: { error?: { message?: string }; message?: string };
      message?: string;
    }).error?.error?.message;

    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const apiMessage = (error as { error?: { message?: string } }).error?.message;

    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    const directMessage = (error as { message?: string }).message;

    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage;
    }

    return fallback;
  }

  private startGoogleStoragePoll(): void {
    if (typeof window === 'undefined' || this.googlePollId !== null) {
      return;
    }

    this.googlePollId = window.setInterval(() => {
      if (!this.isSubmitting) {
        return;
      }

      const outcome = this.auth.consumeGoogleStoragePayload();
      if (outcome.status === 'authenticated') {
        this.stopGoogleStoragePoll();
        this.isSubmitting = false;
        this.router.navigate(['/']);
      }

      if (outcome.status === 'two-factor-required') {
        this.stopGoogleStoragePoll();
        this.isSubmitting = false;
        this.startTwoFactorChallenge({ token: outcome.token, user: outcome.user });
      }
    }, 500);
  }

  private stopGoogleStoragePoll(): void {
    if (this.googlePollId !== null) {
      window.clearInterval(this.googlePollId);
      this.googlePollId = null;
    }
  }

  private startTwoFactorChallenge(challenge: { token: string; user?: AuthUser | null }): void {
    this.isSubmitting = false;
    this.twoFactorRequired = true;
    this.twoFactorToken = challenge.token;
    this.twoFactorUser = challenge.user ?? null;
    this.twoFactorForm.reset();
    this.errorMessage = '';
  }

  private clearTwoFactorChallenge(): void {
    this.twoFactorRequired = false;
    this.twoFactorToken = '';
    this.twoFactorUser = null;
    this.twoFactorForm.reset();
  }

  private extractTwoFactorChallenge(error: unknown): { token: string; user?: AuthUser } | null {
    const payload = this.getErrorPayload(error);
    const code = payload?.code;
    if (code !== 'TWO_FACTOR_REQUIRED') {
      return null;
    }

    const details = payload?.details as { twoFactorToken?: string; user?: unknown } | undefined;
    const token = details?.twoFactorToken;

    if (!token) {
      return null;
    }

    const user = this.mapChallengeUser(details?.user);
    return { token, user };
  }

  private extractErrorCode(error: unknown): string | null {
    return this.getErrorPayload(error)?.code ?? null;
  }

  private getErrorPayload(error: unknown): { code?: string; message?: string; details?: unknown } | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const errorObj = error as { error?: unknown; code?: string; message?: string; details?: unknown };
    let payload: unknown = errorObj.error ?? null;

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        payload = null;
      }
    }

    if (payload && typeof payload === 'object') {
      const wrapper = payload as { error?: unknown; code?: string; message?: string; details?: unknown };
      if (wrapper.error && typeof wrapper.error === 'object') {
        return wrapper.error as { code?: string; message?: string; details?: unknown };
      }

      return {
        code: wrapper.code,
        message: wrapper.message,
        details: wrapper.details
      };
    }

    if (errorObj.code || errorObj.message || errorObj.details) {
      return { code: errorObj.code, message: errorObj.message, details: errorObj.details };
    }

    return null;
  }

  private mapChallengeUser(value: unknown): AuthUser | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const user = value as { _id?: string; id?: string; name?: string; lastName?: string; email?: string; pinCode?: string; role?: AuthUser['role'] };

    return {
      id: user._id ?? user.id ?? '',
      name: user.name ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      pinCode: user.pinCode ?? '',
      role: user.role ?? 'admin'
    };
  }
}
