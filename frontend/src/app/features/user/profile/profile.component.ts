import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);

  protected readonly user$ = this.auth.currentUser$;
}
