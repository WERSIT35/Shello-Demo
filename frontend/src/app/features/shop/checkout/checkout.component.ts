import { AsyncPipe, CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';

import { CartService } from '../../../core/services/cart.service';
import { OrdersService } from '../../../core/services/orders.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [AsyncPipe, CurrencyPipe, NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent {
  private readonly cartService = inject(CartService);
  private readonly ordersService = inject(OrdersService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected isSubmitting = false;
  protected errorMessage = '';
  protected readonly items$ = this.cartService.items$;
  protected readonly subtotal$ = this.cartService.subtotal$;
  protected readonly shippingFee = 5;
  protected readonly total$ = combineLatest([this.subtotal$, this.items$]).pipe(
    map(([subtotal, items]) => (items.length > 0 ? subtotal + this.shippingFee : 0))
  );

  protected form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.maxLength(50)]],
    addressLine: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.maxLength(20)]],
    country: ['', [Validators.required, Validators.maxLength(100)]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    const items = this.cartService.getSnapshot();

    if (items.length === 0) {
      this.errorMessage = 'Your cart is empty.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      shippingAddress: {
        fullName: this.form.value.fullName ?? '',
        phone: this.form.value.phone ?? '',
        addressLine: this.form.value.addressLine ?? '',
        city: this.form.value.city ?? '',
        postalCode: this.form.value.postalCode ?? '',
        country: this.form.value.country ?? ''
      }
    };

    this.ordersService.createOrder(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.cartService.clear();
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Unable to place order.';
      }
    });
  }
}
