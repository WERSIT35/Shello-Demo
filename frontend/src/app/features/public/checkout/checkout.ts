import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CartService } from '../../../core/services/cart.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class CheckoutComponent {
  private fb = inject(FormBuilder);
  checkoutForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  private cartService = inject(CartService);
  private router = inject(Router);

  constructor() { }

  placeOrder() {
    if (this.checkoutForm.valid) {
      // Implement order placement logic here
      console.log('Placing order', this.checkoutForm.value);

      // For now, just clear the cart and navigate to a confirmation page
      this.cartService.clearCart();
      this.router.navigate(['/order-confirmation']);
    }
  }
}
