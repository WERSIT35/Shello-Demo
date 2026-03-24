import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged } from 'rxjs';
import Splide from '@splidejs/splide';

import { CartService } from '../../../core/services/cart.service';
import { ContentService } from '../../../core/services/content.service';
import { ProductsService, type Product } from '../../../core/services/products.service';

declare const $localize: { locale?: string };

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss'
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gallerySplide')
  private readonly gallerySplideRef?: ElementRef<HTMLDivElement>;
  @ViewChild('galleryThumbsSplide')
  private readonly galleryThumbsSplideRef?: ElementRef<HTMLDivElement>;
  @ViewChild('suggestedSlider')
  private readonly suggestedSliderRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly contentService = inject(ContentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly lang: 'ka' | 'en' = this.resolveLang();

  protected product: Product | null = null;
  protected isLoading = true;
  protected errorMessage = '';
  protected suggestedProducts: Product[] = [];
  protected isSuggestionsLoading = true;
  protected suggestionsErrorMessage = '';
  protected cartEnabled = true;

  private gallerySplide: Splide | null = null;
  private galleryThumbsSplide: Splide | null = null;
  private suggestionsSplide: Splide | null = null;

  ngOnInit(): void {
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.cartEnabled = toggles.cart;
      this.cdr.detectChanges();
    });

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

  ngAfterViewInit(): void {
    this.mountGallerySplide();
    this.mountSuggestionsSplide();
  }

  ngOnDestroy(): void {
    this.destroySliders();
  }

  private loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productsService.getProduct(id).subscribe({
      next: (product) => {
        this.product = product;
        this.isLoading = false;
        this.cdr.detectChanges();
        queueMicrotask(() => this.mountGallerySplide());
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
        queueMicrotask(() => this.mountSuggestionsSplide());
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

  protected goToProduct(productId: string): void {
    void this.router.navigate(['/products', productId]);
  }

  protected getMeta(product: Product): string[] {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) {
      return [];
    }

    const tags = [] as string[];
    const caseType = this.getLocalizedMetaValue(meta, 'caseType');
    const brand = this.getLocalizedMetaValue(meta, 'brand');
    const color = this.getLocalizedMetaValue(meta, 'color');
    const model = this.getLocalizedMetaValue(meta, 'model');

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
    const category = this.getLocalizedMetaValue(meta, 'category');
    const caseType = this.getLocalizedMetaValue(meta, 'caseType');
    const brand = this.getLocalizedMetaValue(meta, 'brand');
    const color = this.getLocalizedMetaValue(meta, 'color');
    const model = this.getLocalizedMetaValue(meta, 'model');

    if (typeof category === 'string') tags.push(category);
    if (typeof caseType === 'string') tags.push(caseType);
    if (typeof brand === 'string') tags.push(brand);
    if (typeof color === 'string') tags.push(color);
    if (typeof model === 'string') tags.push(model);

    return tags.slice(0, 3);
  }

  private resolveLang(): 'ka' | 'en' {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
    if (locale.startsWith('ka')) {
      return 'ka';
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ka')) {
      return 'ka';
    }
    return 'en';
  }

  private getLocalizedMetaValue(meta: Record<string, unknown>, key: string): unknown {
    const localizedKey = this.lang === 'ka' ? `${key}Ka` : `${key}En`;
    return meta[localizedKey] ?? meta[key];
  }

  private mountGallerySplide(): void {
    const root = this.gallerySplideRef?.nativeElement;
    if (!root || !this.product || this.product.images.length === 0 || this.isLoading) {
      return;
    }

    this.destroyGallerySplide();

    const thumbsRoot = this.galleryThumbsSplideRef?.nativeElement;
    if (thumbsRoot && this.product.images.length > 1) {
      this.galleryThumbsSplide = new Splide(thumbsRoot, {
        fixedWidth: 84,
        fixedHeight: 84,
        gap: '0.5rem',
        rewind: true,
        pagination: false,
        isNavigation: true,
        arrows: false,
        focus: 'center',
        dragMinThreshold: { mouse: 4, touch: 10 }
      });
    }

    this.gallerySplide = new Splide(root, {
      type: 'slide',
      rewind: true,
      arrows: this.product.images.length > 1,
      pagination: false,
      drag: this.product.images.length > 1,
      speed: 420
    });

    if (this.galleryThumbsSplide) {
      this.gallerySplide.sync(this.galleryThumbsSplide);
      this.galleryThumbsSplide.mount();
    }

    this.gallerySplide.mount();
  }

  private mountSuggestionsSplide(): void {
    const root = this.suggestedSliderRef?.nativeElement;
    if (!root || this.isSuggestionsLoading || this.suggestionsErrorMessage || this.suggestedProducts.length === 0) {
      return;
    }

    this.destroySuggestionsSplide();

    this.suggestionsSplide = new Splide(root, {
      type: 'slide',
      rewind: true,
      arrows: true,
      pagination: false,
      drag: true,
      gap: '1rem',
      perPage: 3,
      perMove: 1,
      breakpoints: {
        1100: { perPage: 2 },
        900: { perPage: 1 }
      }
    });

    this.suggestionsSplide.mount();
  }

  private destroyGallerySplide(): void {
    if (this.gallerySplide) {
      this.gallerySplide.destroy(true);
      this.gallerySplide = null;
    }

    if (this.galleryThumbsSplide) {
      this.galleryThumbsSplide.destroy(true);
      this.galleryThumbsSplide = null;
    }
  }

  private destroySuggestionsSplide(): void {
    if (this.suggestionsSplide) {
      this.suggestionsSplide.destroy(true);
      this.suggestionsSplide = null;
    }
  }

  private destroySliders(): void {
    this.destroyGallerySplide();
    this.destroySuggestionsSplide();
  }
}
