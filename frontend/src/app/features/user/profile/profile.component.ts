import { AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { OrdersService, type Order } from '../../../core/services/orders.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, DatePipe, NgFor, NgIf, RouterLink, TitleCasePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ordersService = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly user$ = this.auth.currentUser$;
  protected orders: Order[] = [];
  protected isOrdersLoading = true;
  protected ordersErrorMessage = '';

  ngOnInit(): void {
    this.user$
      .pipe(
        switchMap((user) => {
          if (!user) {
            this.orders = [];
            this.isOrdersLoading = false;
            this.ordersErrorMessage = '';
            this.cdr.detectChanges();
            return of<Order[]>([]);
          }

          this.isOrdersLoading = true;
          this.ordersErrorMessage = '';
          return this.ordersService.getMyOrders();
        })
      )
      .subscribe({
        next: (orders) => {
          this.orders = [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
          this.isOrdersLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.orders = [];
          this.ordersErrorMessage = 'Unable to load order activity.';
          this.isOrdersLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  protected get totalOrders(): number {
    return this.orders.length;
  }

  protected get totalSpent(): number {
    return this.orders.reduce((sum, order) => sum + order.totalPrice, 0);
  }

  protected get recentOrders(): Order[] {
    return this.orders.slice(0, 5);
  }

  protected get initials(): string {
    const user = this.auth.currentUser;
    if (!user) {
      return 'U';
    }

    const first = user.name?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
}
