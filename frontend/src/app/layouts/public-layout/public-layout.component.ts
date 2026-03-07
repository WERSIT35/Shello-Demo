import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected readonly user$ = this.auth.currentUser$;
  protected readonly cartCount$ = this.cart.items$.pipe(
    map((items) => items.reduce((total, item) => total + item.quantity, 0))
  );

  ngOnInit(): void {
    this.auth.ensureSession().subscribe();
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
