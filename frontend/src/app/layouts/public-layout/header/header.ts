import { Component, inject, HostListener, ElementRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  @ViewChild('cartPopup') cartPopup!: ElementRef;
  @ViewChild('cartButton') cartButton!: ElementRef;

  cartItemCount$!: Observable<number>;
  cartItems$!: Observable<CartItem[]>;
  total$!: Observable<number>;
  isCartVisible = false;

  private cartService = inject(CartService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isCartVisible && !this.cartPopup.nativeElement.contains(event.target) && !this.cartButton.nativeElement.contains(event.target)) {
      this.isCartVisible = false;
    }
  }

  ngOnInit() {
    this.cartItems$ = this.cartService.getCartItems();
    this.cartItemCount$ = this.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + item.quantity, 0))
    );
    this.total$ = this.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + item.product.price * item.quantity, 0))
    );
  }

  toggleCart() {
    this.isCartVisible = !this.isCartVisible;
  }
}
