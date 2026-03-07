import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

import type { Product } from './products.service';

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  image: string | null;
  quantity: number;
  metadata: Record<string, unknown> | null;
};

const STORAGE_KEY = 'shello_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);

  readonly items$ = this.itemsSubject.asObservable();
  readonly subtotal$ = this.items$.pipe(
    map((items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0))
  );

  constructor() {
    if (this.isBrowser) {
      const stored = this.safeParse(localStorage.getItem(STORAGE_KEY));
      if (stored) {
        this.itemsSubject.next(stored);
      }

      this.items$.subscribe((items) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      });
    }
  }

  addItem(product: Product, quantity = 1): void {
    const items = this.itemsSubject.value;
    const existing = items.find((item) => item.productId === product.id);

    if (existing) {
      this.updateQuantity(product.id, existing.quantity + quantity);
      return;
    }

    const next: CartItem = {
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.images?.[0] ?? null,
      quantity,
      metadata: product.metadata ?? null
    };

    this.itemsSubject.next([next, ...items]);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const items = this.itemsSubject.value.map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    );

    this.itemsSubject.next(items);
  }

  removeItem(productId: string): void {
    const items = this.itemsSubject.value.filter((item) => item.productId !== productId);
    this.itemsSubject.next(items);
  }

  clear(): void {
    this.itemsSubject.next([]);
  }

  getSnapshot(): CartItem[] {
    return this.itemsSubject.value;
  }

  private safeParse(value: string | null): CartItem[] | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as CartItem[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
