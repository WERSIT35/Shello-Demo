import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../../core/services/cart.service';
import { ContentService } from '../../../core/services/content.service';
import { ProductsService, type Product } from '../../../core/services/products.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss'
})
export class ProductListComponent implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly contentService = inject(ContentService);
  private readonly cartService = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected products: Product[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected cartEnabled = true;

  ngOnInit(): void {
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.cartEnabled = toggles.cart;
      this.cdr.detectChanges();
    });
    this.productsService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load products.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected addToCart(product: Product): void {
    this.cartService.addItem(product, 1);
  }

  protected getMeta(product: Product): string[] {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) {
      return [];
    }

    const tags = [] as string[];
    const category = meta['category'];
    const caseType = meta['caseType'];
    const brand = meta['brand'];
    const color = meta['color'];
    const model = meta['model'];

    if (typeof category === 'string') tags.push(category);
    if (typeof caseType === 'string') tags.push(caseType);
    if (typeof brand === 'string') tags.push(brand);
    if (typeof color === 'string') tags.push(color);
    if (typeof model === 'string') tags.push(model);

    return tags.slice(0, 3);
  }

  protected getPrimaryImage(product: Product): string | null {
    if (!product.images?.length) {
      return null;
    }

    const first = product.images[0]?.trim();
    return first ? first : null;
  }
}
