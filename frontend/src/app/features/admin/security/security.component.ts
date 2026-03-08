import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss'
})
export class AdminSecurityComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected isEnabled = false;
  protected errorMessage = '';
  protected setupErrorMessage = '';
  protected actionMessage = '';
  protected setupData: { secret: string; otpauthUrl: string; qrCodeDataUrl: string } | null = null;
  protected verificationCode = '';
  protected disableCode = '';

  ngOnInit(): void {
    this.loadStatus();
  }

  protected startSetup(): void {
    this.setupErrorMessage = '';
    this.actionMessage = '';

    this.auth.setupTwoFactor().subscribe({
      next: (data) => {
        this.setupData = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.setupErrorMessage = 'Unable to start authenticator setup.';
        this.cdr.detectChanges();
      }
    });
  }

  protected enableTwoFactor(): void {
    const code = this.verificationCode.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      this.setupErrorMessage = 'Enter the 6-digit code from your authenticator app.';
      return;
    }

    this.setupErrorMessage = '';
    this.auth.enableTwoFactor(code).subscribe({
      next: (status) => {
        this.isEnabled = status.enabled;
        this.setupData = null;
        this.verificationCode = '';
        this.actionMessage = 'Authenticator enabled for admins.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.setupErrorMessage = 'Unable to verify the code.';
        this.cdr.detectChanges();
      }
    });
  }

  protected disableTwoFactor(): void {
    const code = this.disableCode.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      this.errorMessage = 'Enter the 6-digit code to disable authenticator.';
      return;
    }

    this.errorMessage = '';
    this.auth.disableTwoFactor(code).subscribe({
      next: (status) => {
        this.isEnabled = status.enabled;
        this.disableCode = '';
        this.actionMessage = 'Authenticator disabled for admins.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to disable authenticator.';
        this.cdr.detectChanges();
      }
    });
  }

  private loadStatus(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auth.getTwoFactorStatus().subscribe({
      next: (status) => {
        this.isEnabled = status.enabled;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load authenticator status.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
