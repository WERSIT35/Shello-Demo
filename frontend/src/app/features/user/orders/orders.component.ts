import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';

import { OrdersService, type Order } from '../../../core/services/orders.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected orders: Order[] = [];
  protected isLoading = true;
  protected errorMessage = '';

  ngOnInit(): void {
    this.ordersService.getMyOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
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
}
