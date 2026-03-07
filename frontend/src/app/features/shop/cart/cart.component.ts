import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';

import { CartService, type CartItem } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent {
  private readonly cartService = inject(CartService);

  protected readonly items$ = this.cartService.items$;
  protected readonly subtotal$ = this.cartService.subtotal$;
  protected readonly shippingFee = 5;
  protected readonly total$ = combineLatest([this.subtotal$, this.items$]).pipe(
    map(([subtotal, items]) => (items.length > 0 ? subtotal + this.shippingFee : 0))
  );

  protected updateQuantity(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.cartService.updateQuantity(item.productId, value);
  }

  protected removeItem(item: CartItem): void {
    this.cartService.removeItem(item.productId);
  }
}
