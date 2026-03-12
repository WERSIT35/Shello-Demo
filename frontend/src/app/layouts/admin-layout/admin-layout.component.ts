import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ContentService, type PageToggles } from '../../core/services/content.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly contentService = inject(ContentService);
  protected pageToggles: PageToggles | null = null;
  protected isAdmin = false;
  private authSub?: Subscription;

  ngOnInit(): void {
    this.auth.ensureSession().subscribe();
    this.authSub = this.auth.currentUser$.subscribe((user) => {
      this.isAdmin = user?.role === 'admin';
    });
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.pageToggles = toggles;
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}
