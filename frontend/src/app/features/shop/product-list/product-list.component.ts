import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CartService } from '../../../core/services/cart.service';
import { ContentService } from '../../../core/services/content.service';
import { ProductsService, type Product } from '../../../core/services/products.service';

declare const $localize: { locale?: string };

const ALL_CATEGORY = '__all__';

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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang: 'ka' | 'en' = this.resolveLang();

  protected allProducts: Product[] = [];
  protected products: Product[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected cartEnabled = true;
  protected categories: string[] = [];
  protected activeCategory: string = ALL_CATEGORY;
  protected readonly ALL_CATEGORY = ALL_CATEGORY;

  ngOnInit(): void {
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.cartEnabled = toggles.cart;
      this.cdr.detectChanges();
    });
    this.productsService.getProducts().subscribe({
      next: (products) => {
        this.allProducts = products;
        this.categories = this.collectCategories(products);
        this.applyFilter();
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

  protected goToProduct(productId: string): void {
    void this.router.navigate(['/products', productId]);
  }

  protected setCategory(category: string): void {
    this.activeCategory = category;
    this.applyFilter();
  }

  protected getBrandModel(product: Product): string {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) return '';
    const brand = this.getLocalizedMetaValue(meta, 'brand');
    const model = this.getLocalizedMetaValue(meta, 'model');
    const parts: string[] = [];
    if (typeof brand === 'string') parts.push(brand);
    if (typeof model === 'string') parts.push(model);
    return parts.join(' · ');
  }

  protected getCategory(product: Product): string | null {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) return null;
    const category = this.getLocalizedMetaValue(meta, 'category');
    return typeof category === 'string' ? category : null;
  }

  protected getPrimaryImage(product: Product): string | null {
    if (!product.images?.length) return null;
    const first = product.images[0]?.trim();
    return first ? first : null;
  }

  private collectCategories(products: Product[]): string[] {
    const found = new Set<string>();
    for (const product of products) {
      const category = this.getCategory(product);
      if (category) found.add(category);
    }
    return Array.from(found);
  }

  private applyFilter(): void {
    if (this.activeCategory === ALL_CATEGORY) {
      this.products = this.allProducts;
      return;
    }
    this.products = this.allProducts.filter((product) => this.getCategory(product) === this.activeCategory);
  }

  private resolveLang(): 'ka' | 'en' {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
    if (locale.startsWith('ka')) return 'ka';
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ka')) return 'ka';
    return 'en';
  }

  private getLocalizedMetaValue(meta: Record<string, unknown>, key: string): unknown {
    const localizedKey = this.lang === 'ka' ? `${key}Ka` : `${key}En`;
    return meta[localizedKey] ?? meta[key];
  }
}
