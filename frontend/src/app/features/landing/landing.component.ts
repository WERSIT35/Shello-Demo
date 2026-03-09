import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of, timeout } from 'rxjs';

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
export class LandingComponent implements OnInit {
  @ViewChild('caseSlider')
  protected caseSlider?: ElementRef<HTMLDivElement>;

  private readonly contentService = inject(ContentService);
  private readonly cartService = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected errorMessage = '';
  protected hero: HeroContent = this.buildDefaultHero();
  protected heroImageStyle = this.buildHeroImageStyle(this.hero.imageUrl);
  protected suggestedProducts: Product[] = [];

  protected panelProducts: Product[] = [];
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

  protected scrollCases(direction: 'left' | 'right'): void {
    const slider = this.caseSlider?.nativeElement;

    if (!slider) {
      return;
    }

    const shift = direction === 'left' ? -320 : 320;
    slider.scrollBy({ left: shift, behavior: 'smooth' });
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

  protected getPanelSub(product: Product): string {
    const tags = this.getMeta(product);
    return tags.slice(0, 2).join(' / ');
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
        this.suggestedProducts = content.suggestedProducts;
        this.panelProducts = content.suggestedProducts.slice(0, 3);
      });
  }

  private buildHeroImageStyle(imageUrl: string | null): string {
    const overlay =
      'linear-gradient(120deg, rgba(12, 13, 18, 0.7), rgba(12, 13, 18, 0.2))';
    if (!imageUrl) {
      return overlay;
    }

    return `${overlay}, url('${imageUrl}')`;
  }
}
