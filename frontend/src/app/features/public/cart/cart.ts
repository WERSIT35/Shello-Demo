import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartComponent {
  cartItems$: Observable<CartItem[]>;

  constructor(private cartService: CartService, private router: Router) {
    this.cartItems$ = this.cartService.getCartItems();
  }

  removeFromCart(productId: string) {
    this.cartService.removeFromCart(productId);
  }

  calculateTotal(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  checkout() {
    this.router.navigate(['/checkout']);
  }
}
