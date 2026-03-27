import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { retry, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AdminOrdersService, type AdminOrder } from '../../../core/services/admin-orders.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, NgFor, NgIf, RouterLink],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class AdminOrdersComponent implements OnInit {
  private readonly ordersService = inject(AdminOrdersService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected orders: AdminOrder[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected statusSelections: Record<string, AdminOrder['status']> = {};
  protected deletingOrderIds = new Set<string>();

  protected readonly statusOptions: AdminOrder['status'][] = [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled'
  ];

  ngOnInit(): void {
    this.refreshOrders();
  }

  private refreshOrders(): void {
    this.isLoading = true;

    this.auth
      .ensureSession()
      .pipe(switchMap(() => this.ordersService.getOrders().pipe(retry({ count: 1, delay: 300 }))))
      .subscribe({
      next: (orders) => {
        this.orders = orders;
        this.statusSelections = {};
        orders.forEach((order) => {
          this.statusSelections[order.id] = order.status;
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load orders.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected updateStatus(order: AdminOrder): void {
    const nextStatus = this.statusSelections[order.id];

    if (!nextStatus || nextStatus === order.status) {
      return;
    }

    this.ordersService.updateStatus(order.id, nextStatus).subscribe({
      next: (updated) => {
        this.refreshOrders();
      },
      error: () => {
        this.errorMessage = 'Unable to update order status.';
        this.cdr.detectChanges();
      }
    });
  }

  protected deleteOrder(order: AdminOrder): void {
    if (this.deletingOrderIds.has(order.id)) {
      return;
    }

    const confirmed = window.confirm(
      `Delete order ${order.id}? This is intended for testing and cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingOrderIds.add(order.id);
    this.errorMessage = '';

    this.ordersService.deleteOrder(order.id).subscribe({
      next: () => {
        this.deletingOrderIds.delete(order.id);
        this.refreshOrders();
      },
      error: () => {
        this.deletingOrderIds.delete(order.id);
        this.errorMessage = 'Unable to delete order.';
        this.cdr.detectChanges();
      }
    });
  }

  protected formatAddress(order: AdminOrder): string {
    return `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`;
  }

  protected paymentSummary(order: AdminOrder): string {
    if (!order.paymentInfo) {
      return 'N/A';
    }

    const paymentMethod = order.paymentInfo['method'];
    if (typeof paymentMethod === 'string' && paymentMethod.trim().length > 0) {
      return paymentMethod;
    }

    const method = order.paymentInfo['type'];
    if (typeof method === 'string' && method.trim().length > 0) {
      return method;
    }

    return 'Captured';
  }

  protected orderItemCount(order: AdminOrder): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }
}
