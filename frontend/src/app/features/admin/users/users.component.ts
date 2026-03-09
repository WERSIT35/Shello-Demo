import { isPlatformBrowser, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { retry, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { UsersService, type AdminUser } from '../../../core/services/users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);

  protected users: AdminUser[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected updatingIds = new Set<string>();
  protected editingId: string | null = null;
  protected draft = {
    name: '',
    lastName: '',
    email: '',
    pinCode: '',
    role: 'user' as AdminUser['role'],
    isActive: true
  };
  protected createDraft = {
    name: '',
    lastName: '',
    email: '',
    password: '',
    pinCode: '',
    role: 'user' as AdminUser['role'],
    isActive: true
  };
  protected createErrorMessage = '';
  protected showCreate = false;
  protected isCreating = false;

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.isLoading = false;
      return;
    }

    this.refreshUsers();
  }

  private refreshUsers(): void {
    this.isLoading = true;

    this.auth
      .ensureSession()
      .pipe(switchMap(() => this.usersService.getUsers().pipe(retry({ count: 1, delay: 300 }))))
      .subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveError(error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private resolveError(error: unknown): string {
    const fallback = 'Unable to load users.';

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const status = (error as { status?: number }).status;

    if (status === 401 || status === 403) {
      return 'Admin access required.';
    }

    const message = (error as { error?: { error?: { message?: string } } }).error?.error?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    return fallback;
  }

  protected toggleRole(user: AdminUser): void {
    this.startEdit(user);
  }

  protected startEdit(user: AdminUser): void {
    this.editingId = user.id;
    this.errorMessage = '';
    this.draft = {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pinCode: user.pinCode,
      role: user.role,
      isActive: user.isActive
    };
  }

  protected cancelEdit(): void {
    this.editingId = null;
  }

  protected saveEdit(user: AdminUser): void {
    if (this.updatingIds.has(user.id)) {
      return;
    }

    this.updatingIds.add(user.id);

    this.usersService
      .updateUser(user.id, {
        name: this.draft.name.trim(),
        lastName: this.draft.lastName.trim(),
        email: this.draft.email.trim(),
        pinCode: this.draft.pinCode.trim(),
        role: this.draft.role,
        isActive: this.draft.isActive
      })
      .subscribe({
        next: (updated) => {
          this.editingId = null;
          this.updatingIds.delete(user.id);
          this.refreshUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
          this.updatingIds.delete(user.id);
          this.cdr.detectChanges();
        }
      });
  }

  protected resetPassword(user: AdminUser): void {
    if (this.updatingIds.has(user.id)) {
      return;
    }

    const confirmed = window.confirm(
      `Reset password for ${user.email} to the admin reset password?`
    );

    if (!confirmed) {
      return;
    }

    this.updatingIds.add(user.id);

    this.usersService.resetPassword(user.id).subscribe({
      next: (updated) => {
        this.updatingIds.delete(user.id);
        this.refreshUsers();
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveError(error);
        this.updatingIds.delete(user.id);
        this.cdr.detectChanges();
      }
    });
  }

  protected toggleActive(user: AdminUser): void {
    if (this.updatingIds.has(user.id)) {
      return;
    }

    const nextState = user.isActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(
      `Are you sure you want to ${nextState} ${user.email}?`
    );

    if (!confirmed) {
      return;
    }

    this.updatingIds.add(user.id);

    this.usersService
      .updateUser(user.id, {
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        pinCode: user.pinCode,
        role: user.role,
        isActive: !user.isActive
      })
      .subscribe({
        next: () => {
          this.updatingIds.delete(user.id);
          this.refreshUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
          this.updatingIds.delete(user.id);
          this.cdr.detectChanges();
        }
      });
  }

  protected deleteUser(user: AdminUser): void {
    if (this.updatingIds.has(user.id)) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.email}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.updatingIds.add(user.id);

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.updatingIds.delete(user.id);
        this.refreshUsers();
      },
      error: (error: unknown) => {
        this.errorMessage = this.resolveError(error);
        this.updatingIds.delete(user.id);
        this.cdr.detectChanges();
      }
    });
  }

  protected createUser(): void {
    if (this.isCreating) {
      return;
    }

    this.errorMessage = '';
    this.createErrorMessage = '';

    const name = this.createDraft.name.trim();
    const lastName = this.createDraft.lastName.trim();
    const email = this.createDraft.email.trim();
    const password = this.createDraft.password;
    const pinCode = this.createDraft.pinCode.trim();

    if (!name || !lastName) {
      this.createErrorMessage = 'First name and last name are required.';
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.createErrorMessage = 'Enter a valid email address.';
      return;
    }

    if (password.length < 8) {
      this.createErrorMessage = 'Password must be at least 8 characters.';
      return;
    }

    if (!/^\d{6}$/.test(pinCode)) {
      this.createErrorMessage = 'Pin code must be 6 digits.';
      return;
    }

    this.isCreating = true;

    this.usersService
      .createUser({
        name,
        lastName,
        email,
        password,
        pinCode,
        role: this.createDraft.role,
        isActive: this.createDraft.isActive
      })
      .subscribe({
        next: (user) => {
          this.createDraft = {
            name: '',
            lastName: '',
            email: '',
            password: '',
            pinCode: '',
            role: 'user',
            isActive: true
          };
          this.createErrorMessage = '';
          this.showCreate = false;
          this.isCreating = false;
          this.refreshUsers();
        },
        error: (error: unknown) => {
          this.createErrorMessage = this.resolveError(error);
          this.isCreating = false;
          this.cdr.detectChanges();
        }
      });
  }
}
