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
  protected readonly totalItems$ = this.items$.pipe(
    map((items) => items.reduce((sum, item) => sum + item.quantity, 0))
  );

  protected updateQuantity(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Math.max(1, Number(input.value) || 1);
    this.cartService.updateQuantity(item.productId, value);
  }

  protected increaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.productId, item.quantity + 1);
  }

  protected decreaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item.productId, Math.max(1, item.quantity - 1));
  }

  protected removeItem(item: CartItem): void {
    this.cartService.removeItem(item.productId);
  }
}
