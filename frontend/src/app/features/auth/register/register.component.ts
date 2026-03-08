import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService, type RegisterPayload } from '../../../core/services/auth.service';

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

  protected form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
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
        const message = this.resolveError(error);
        if (message.toLowerCase().includes('login cancelled')) {
          return;
        }
        this.errorMessage = message;
      }
    });
  }

  private resolveError(error: unknown): string {
    const fallback = 'Unable to create account. Please try again.';

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeMessage = (error as { error?: { error?: { message?: string } }; message?: string })
      .error?.error?.message;

    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
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

      if (this.auth.consumeGoogleStoragePayload()) {
        this.stopGoogleStoragePoll();
        this.isSubmitting = false;
        this.router.navigate(['/']);
      }
    }, 500);
  }

  private stopGoogleStoragePoll(): void {
    if (this.googlePollId !== null) {
      window.clearInterval(this.googlePollId);
      this.googlePollId = null;
    }
  }
}
