import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AdminOrdersService, type AdminOrder } from '../../../core/services/admin-orders.service';
import { AdminProductsService } from '../../../core/services/admin-products.service';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, NgFor, NgIf, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productsService = inject(AdminProductsService);
  private readonly ordersService = inject(AdminOrdersService);
  private readonly usersService = inject(UsersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected errorMessage = '';

  protected totalOrders = 0;
  protected ordersToday = 0;
  protected totalRevenue = 0;
  protected revenueToday = 0;

  protected activeProducts = 0;
  protected totalProducts = 0;
  protected outOfStockProducts = 0;
  protected lowStockProducts = 0;

  protected totalUsers = 0;
  protected activeUsers = 0;
  protected offlineUsers = 0;
  protected adminUsers = 0;

  protected pendingShipments = 0;
  protected paidOrders = 0;
  protected shippedOrders = 0;
  protected deliveredOrders = 0;
  protected cancelledOrders = 0;
  protected recentOrders: AdminOrder[] = [];

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
            orders: this.ordersService.getOrders(),
            users: this.usersService.getUsers()
          })
        )
      )
      .subscribe({
        next: ({ products, orders, users }) => {
          const now = new Date();
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);

          this.totalOrders = orders.length;
          this.totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
          this.ordersToday = orders.filter((order) => {
            const createdAt = new Date(order.createdAt);
            return createdAt >= startOfDay && createdAt <= endOfDay;
          }).length;
          this.revenueToday = orders
            .filter((order) => {
              const createdAt = new Date(order.createdAt);
              return createdAt >= startOfDay && createdAt <= endOfDay;
            })
            .reduce((sum, order) => sum + order.totalPrice, 0);

          this.totalProducts = products.length;
          this.activeProducts = products.filter((product) => product.isActive).length;
          this.outOfStockProducts = products.filter((product) => product.stock === 0).length;
          this.lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 5).length;

          this.totalUsers = users.length;
          this.activeUsers = users.filter((user) => user.isActive).length;
          this.offlineUsers = users.filter((user) => !user.isActive).length;
          this.adminUsers = users.filter((user) => user.role === 'admin').length;

          this.pendingShipments = orders.filter(
            (order) => order.status === 'pending' || order.status === 'paid'
          ).length;
          this.paidOrders = orders.filter((order) => order.status === 'paid').length;
          this.shippedOrders = orders.filter((order) => order.status === 'shipped').length;
          this.deliveredOrders = orders.filter((order) => order.status === 'delivered').length;
          this.cancelledOrders = orders.filter((order) => order.status === 'cancelled').length;

          this.recentOrders = [...orders].slice(0, 5);

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
