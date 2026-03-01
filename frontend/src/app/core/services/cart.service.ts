import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../../shared/models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSource = new BehaviorSubject<CartItem[]>([]);

  constructor() {
    const cart = localStorage.getItem('cart');
    if (cart) {
      this.cartItemsSource.next(JSON.parse(cart));
    }
  }

  getCartItems(): Observable<CartItem[]> {
    return this.cartItemsSource.asObservable();
  }

  addToCart(product: Product) {
    const currentItems = this.cartItemsSource.getValue();
    const existingItem = currentItems.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      currentItems.push({ product, quantity: 1 });
    }

    this.cartItemsSource.next(currentItems);
    this.updateLocalStorage();
  }

  removeFromCart(productId: string) {
    const currentItems = this.cartItemsSource.getValue().filter(item => item.product.id !== productId);
    this.cartItemsSource.next(currentItems);
    this.updateLocalStorage();
  }

  clearCart() {
    this.cartItemsSource.next([]);
    this.updateLocalStorage();
  }

  private updateLocalStorage() {
    localStorage.setItem('cart', JSON.stringify(this.cartItemsSource.getValue()));
  }
}
