import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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
  protected isImageLightboxOpen = false;
  protected lightboxImageIndex = 0;
  protected lightboxZoom = 1;

  private gallerySplide: Splide | null = null;
  private galleryThumbsSplide: Splide | null = null;
  private suggestionsSplide: Splide | null = null;
  private readonly minLightboxZoom = 1;
  private readonly maxLightboxZoom = 4;
  private readonly lightboxZoomStep = 0.25;

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

  protected openImageLightbox(index: number): void {
    if (!this.product || this.product.images.length === 0) {
      return;
    }
    this.lightboxImageIndex = Math.max(0, Math.min(index, this.product.images.length - 1));
    this.lightboxZoom = 1;
    this.isImageLightboxOpen = true;
    this.cdr.detectChanges();
  }

  protected closeImageLightbox(): void {
    this.isImageLightboxOpen = false;
    this.lightboxZoom = 1;
  }

  protected showPreviousLightboxImage(): void {
    if (!this.product || this.product.images.length <= 1) {
      return;
    }
    this.lightboxImageIndex =
      (this.lightboxImageIndex - 1 + this.product.images.length) % this.product.images.length;
    this.lightboxZoom = 1;
  }

  protected showNextLightboxImage(): void {
    if (!this.product || this.product.images.length <= 1) {
      return;
    }
    this.lightboxImageIndex = (this.lightboxImageIndex + 1) % this.product.images.length;
    this.lightboxZoom = 1;
  }

  protected zoomInLightbox(): void {
    this.lightboxZoom = this.clampLightboxZoom(this.lightboxZoom + this.lightboxZoomStep);
  }

  protected zoomOutLightbox(): void {
    this.lightboxZoom = this.clampLightboxZoom(this.lightboxZoom - this.lightboxZoomStep);
  }

  protected resetLightboxZoom(): void {
    this.lightboxZoom = 1;
  }

  protected onLightboxWheel(event: WheelEvent): void {
    if (!this.isImageLightboxOpen) {
      return;
    }
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomInLightbox();
      return;
    }
    this.zoomOutLightbox();
  }

  protected onLightboxDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    this.lightboxZoom = this.lightboxZoom === 1 ? 2 : 1;
  }

  protected getLightboxImage(): string {
    if (!this.product || this.product.images.length === 0) {
      return '';
    }
    return this.product.images[this.lightboxImageIndex] ?? this.product.images[0];
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isImageLightboxOpen) {
      return;
    }

    if (event.key === 'Escape') {
      this.closeImageLightbox();
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowLeft') {
      this.showPreviousLightboxImage();
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowRight') {
      this.showNextLightboxImage();
      event.preventDefault();
      return;
    }

    if (event.key === '+' || event.key === '=') {
      this.zoomInLightbox();
      event.preventDefault();
      return;
    }

    if (event.key === '-') {
      this.zoomOutLightbox();
      event.preventDefault();
      return;
    }

    if (event.key === '0') {
      this.resetLightboxZoom();
      event.preventDefault();
    }
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

  private clampLightboxZoom(next: number): number {
    return Math.max(this.minLightboxZoom, Math.min(next, this.maxLightboxZoom));
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
        dragMinThreshold: { mouse: 4, touch: 10 },
        breakpoints: {
          900: { fixedWidth: 68, fixedHeight: 68, gap: '0.4rem' },
          560: { fixedWidth: 56, fixedHeight: 56, gap: '0.35rem' }
        }
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
        1100: { perPage: 2, gap: '0.85rem' },
        900: {
          perPage: 1,
          gap: '0.7rem',
          arrows: false,
          pagination: true,
          padding: { left: '0.25rem', right: '0.25rem' }
        },
        640: {
          perPage: 1,
          gap: '0.6rem',
          arrows: false,
          pagination: true,
          padding: { left: '0', right: '0' }
        }
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
