import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AdminOrdersService } from '../../../core/services/admin-orders.service';
import { AdminProductsService } from '../../../core/services/admin-products.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [NgIf],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productsService = inject(AdminProductsService);
  private readonly ordersService = inject(AdminOrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected errorMessage = '';
  protected activeProducts = 0;
  protected ordersToday = 0;
  protected pendingShipments = 0;

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auth
      .ensureSession()
      .pipe(
        switchMap(() =>
          forkJoin({
            products: this.productsService.getProducts(),
            orders: this.ordersService.getOrders()
          })
        )
      )
      .subscribe({
        next: ({ products, orders }) => {
          const now = new Date();
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);

          this.activeProducts = products.filter((product) => product.isActive).length;
          this.ordersToday = orders.filter((order) => {
            const createdAt = new Date(order.createdAt);
            return createdAt >= startOfDay && createdAt <= endOfDay;
          }).length;
          this.pendingShipments = orders.filter(
            (order) => order.status === 'pending' || order.status === 'paid'
          ).length;

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load admin stats.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }
}
