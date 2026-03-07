import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { retry, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AdminOrdersService, type AdminOrder } from '../../../core/services/admin-orders.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, NgFor, NgIf],
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
}
