import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged } from 'rxjs';

import { CartService } from '../../../core/services/cart.service';
import { ContentService } from '../../../core/services/content.service';
import { ProductsService, type Product } from '../../../core/services/products.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly contentService = inject(ContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected product: Product | null = null;
  protected selectedImage: string | null = null;
  protected isLoading = true;
  protected errorMessage = '';
  protected suggestedProducts: Product[] = [];
  protected isSuggestionsLoading = true;
  protected suggestionsErrorMessage = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(distinctUntilChanged()).subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.errorMessage = 'Product not found.';
        this.isLoading = false;
        return;
      }

      this.loadProduct(id);
      this.loadSuggestions(id);
    });
  }

  private loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productsService.getProduct(id).subscribe({
      next: (product) => {
        this.product = product;
        this.selectedImage = product.images[0] ?? null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load product.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadSuggestions(id: string): void {
    this.isSuggestionsLoading = true;
    this.suggestionsErrorMessage = '';

    this.contentService.getPublicContent().subscribe({
      next: (content) => {
        this.suggestedProducts = content.suggestedProducts
          .filter((product) => product.id !== id)
          .slice(0, 3);
        this.isSuggestionsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.suggestionsErrorMessage = 'Unable to load suggestions.';
        this.isSuggestionsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected addToCart(): void {
    if (this.product) {
      this.cartService.addItem(this.product, 1);
    }
  }

  protected addSuggestedToCart(product: Product): void {
    this.cartService.addItem(product, 1);
  }

  protected selectImage(url: string): void {
    this.selectedImage = url;
  }

  protected getMeta(product: Product): string[] {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) {
      return [];
    }

    const tags = [] as string[];
    const caseType = meta['caseType'];
    const brand = meta['brand'];
    const color = meta['color'];
    const model = meta['model'];

    if (typeof caseType === 'string') tags.push(caseType);
    if (typeof brand === 'string') tags.push(brand);
    if (typeof color === 'string') tags.push(color);
    if (typeof model === 'string') tags.push(model);

    return tags;
  }

  protected getSuggestedMeta(product: Product): string[] {
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
}
