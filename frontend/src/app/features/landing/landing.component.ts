import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, timeout } from 'rxjs';
import Splide from '@splidejs/splide';

import { CartService } from '../../core/services/cart.service';
import { ContentService, type HeroContent } from '../../core/services/content.service';
import type { Product } from '../../core/services/products.service';

declare const $localize: { locale?: string };

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CurrencyPipe, NgFor, NgIf, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('caseSplide')
  protected caseSplide?: ElementRef<HTMLDivElement>;

  private readonly contentService = inject(ContentService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private suggestedSplide: Splide | null = null;
  private readonly lang: 'ka' | 'en' = this.resolveLang();

  protected isLoading = true;
  protected errorMessage = '';
  protected hero: HeroContent = this.buildDefaultHero();
  protected heroImageStyle = this.buildHeroImageStyle(this.hero.imageUrl);
  protected heroProducts: Product[] = [];
  protected suggestedProducts: Product[] = [];
  protected pageToggles: { cart: boolean } | null = null;

  protected panelProducts: Product[] = [];
  protected featuredProduct: Product | null = null;
  protected miniProducts: Product[] = [];

  protected getBrandModel(product: Product): string {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) {
      return '';
    }
    const brand = this.getLocalizedMetaValue(meta, 'brand');
    const model = this.getLocalizedMetaValue(meta, 'model');
    const parts: string[] = [];
    if (typeof brand === 'string') parts.push(brand);
    if (typeof model === 'string') parts.push(model);
    return parts.join(' · ');
  }
  private buildDefaultHero(): HeroContent {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || 'ka';
    const lang = locale.startsWith('en') ? 'en' : 'ka';

    if (lang === 'en') {
      return {
        title: 'Cases that feel tailored, not templated.',
        subtitle:
          'Designed for confident protection and expressive color stories. Built to take hits, made to look intentional.',
        primaryCtaText: 'Explore cases',
        primaryCtaLink: '/shop',
        secondaryCtaText: 'Join the drop',
        secondaryCtaLink: '/register',
        imageUrl: null,
        highlights: ['Drop tested', 'Grip textured', '3-layer shell', 'Matte finish']
      };
    }

    return {
      title: 'ქეისები, რომლებიც შენს სტილს ერგება და არა შაბლონს.',
      subtitle:
        'დაცვასა და სტილს შორის არჩევანი აღარ გჭირდება. ეს ქეისი დარტყმას უძლებს და ყოველდღე გამორჩეულ იერს ინარჩუნებს.',
      primaryCtaText: 'ქეისების დათვალიერება',
      primaryCtaLink: '/shop',
      secondaryCtaText: 'დროპს შემოუერთდი',
      secondaryCtaLink: '/register',
      imageUrl: null,
      highlights: ['დროპ-ტესტით დადასტურებული', 'არასრიალა მოჭიდება', '3-ფენიანი დაცვა', 'მატე ზედაპირი']
    };
  }

  ngOnInit(): void {
    this.loadContent();
  }

  ngAfterViewInit(): void {
    this.mountSuggestedSplide();
  }

  ngOnDestroy(): void {
    this.destroySuggestedSplide();
  }

  protected addToCart(product: Product): void {
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

  protected getPanelSub(product: Product): string {
    const tags = this.getMeta(product);
    return tags.slice(0, 2).join(' / ');
  }

  protected getDisplayTitle(title: string): string {
    return title
      .replace(/^[\s\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]+/, '')
      .trim();
  }

  private loadContent(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.contentService
      .getPublicContent()
      .pipe(
        timeout(7000),
        catchError(() => {
          this.errorMessage = 'Unable to load homepage content.';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((content) => {
        if (!content) {
          return;
        }

        this.hero = content.hero;
        this.heroImageStyle = this.buildHeroImageStyle(content.hero.imageUrl);
        this.heroProducts = content.heroProducts;
        this.suggestedProducts = content.suggestedProducts;
        this.panelProducts = content.heroProducts.slice(0, 4);
        this.featuredProduct = content.heroProducts[0] ?? content.suggestedProducts[0] ?? null;
        this.miniProducts = (content.heroProducts.length > 1
          ? content.heroProducts.slice(1, 3)
          : content.suggestedProducts.slice(0, 2));
        this.pageToggles = { cart: content.pageToggles.cart };
        this.cdr.detectChanges();
        queueMicrotask(() => this.mountSuggestedSplide());
      });
  }

  private buildHeroImageStyle(imageUrl: string | null): string {
    const overlay =
      'linear-gradient(120deg, rgba(12, 13, 18, 0.7), rgba(12, 13, 18, 0.2))';
    const resolvedImageUrl = this.resolveHeroImageUrl(imageUrl);
    if (!resolvedImageUrl) {
      return overlay;
    }

    return `${overlay}, url('${resolvedImageUrl}')`;
  }

  protected getPrimaryImage(product: Product): string | null {
    if (!product.images?.length) {
      return null;
    }

    const first = product.images[0]?.trim();
    return first ? first : null;
  }

  private resolveHeroImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    const trimmed = imageUrl.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }

    return `/uploads/${trimmed}`;
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

  private mountSuggestedSplide(): void {
    const root = this.caseSplide?.nativeElement;
    if (!root || this.isLoading || this.errorMessage || this.suggestedProducts.length === 0) {
      return;
    }

    this.destroySuggestedSplide();

    this.suggestedSplide = new Splide(root, {
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

    this.suggestedSplide.mount();
  }

  private destroySuggestedSplide(): void {
    if (this.suggestedSplide) {
      this.suggestedSplide.destroy(true);
      this.suggestedSplide = null;
    }
  }
}
