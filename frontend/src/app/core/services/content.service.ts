import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Product } from './products.service';

declare const $localize: { locale?: string };

export type HeroContent = {
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  imageUrl: string | null;
  highlights: string[];
};

export type PublicContent = {
  hero: HeroContent;
  heroProducts: Product[];
  suggestedProducts: Product[];
  pageToggles: PageToggles;
};

export type AdminContent = {
  hero: HeroContent;
  heroTranslations: HeroTranslations;
  heroProductIds: string[];
  suggestedProductIds: string[];
  categories: string[];
  pageToggles: PageToggles;
};

export type PageToggles = {
  home: boolean;
  shop: boolean;
  product: boolean;
  cart: boolean;
  checkout: boolean;
  login: boolean;
  register: boolean;
  orders: boolean;
  profile: boolean;
  admin: boolean;
  adminProducts: boolean;
  adminContent: boolean;
  adminOrders: boolean;
  adminUsers: boolean;
  adminSecurity: boolean;
};

export type UpdateContentPayload = {
  hero?: Partial<HeroContent>;
  heroTranslations?: HeroTranslations;
  heroProductIds?: string[];
  suggestedProductIds?: string[];
  categories?: string[];
  pageToggles?: Partial<PageToggles>;
};

export type HeroTranslations = {
  ka?: HeroContent;
  en?: HeroContent;
};

type ApiHero = {
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  imageUrl: string | null;
  highlights: string[];
};

type ApiProduct = {
  _id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
};

type PublicContentResponse = {
  hero: ApiHero;
  heroProducts: ApiProduct[];
  suggestedProducts: ApiProduct[];
  pageToggles: PageToggles;
};

type AdminContentResponse = {
  hero: ApiHero;
  heroTranslations?: HeroTranslations;
  heroProductIds?: string[];
  suggestedProductIds: string[];
  categories: string[];
  pageToggles?: PageToggles;
};

const defaultPageToggles: PageToggles = {
  home: true,
  shop: true,
  product: true,
  cart: true,
  checkout: true,
  login: true,
  register: true,
  orders: true,
  profile: true,
  admin: true,
  adminProducts: true,
  adminContent: true,
  adminOrders: true,
  adminUsers: true,
  adminSecurity: true
};

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly pageTogglesSubject = new BehaviorSubject<PageToggles>(defaultPageToggles);
  private togglesLoaded = false;

  constructor(private readonly http: HttpClient) {}

  getPublicContent() {
    const params = this.getLocaleParams();
    return this.http.get<PublicContentResponse>(`${API_BASE_URL}/content`, { params }).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        heroProducts: response.heroProducts.map((product) => this.mapProduct(product)),
        suggestedProducts: response.suggestedProducts.map((product) => this.mapProduct(product)),
        pageToggles: this.mergePageToggles(response.pageToggles)
      })),
      catchError(() => {
        const fallback = this.buildFallbackPublicContent(params.lang);
        this.pageTogglesSubject.next(fallback.pageToggles);
        this.togglesLoaded = true;
        return of(fallback);
      }),
      map((content) => {
        this.pageTogglesSubject.next(content.pageToggles);
        this.togglesLoaded = true;
        return content;
      })
    );
  }

  getAdminContent() {
    const params = this.getLocaleParams();
    return this.http.get<AdminContentResponse>(`${API_BASE_URL}/content/admin`, { params }).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        heroTranslations: this.mapHeroTranslations(response.heroTranslations),
        heroProductIds: response.heroProductIds ?? [],
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? [],
        pageToggles: this.mergePageToggles(response.pageToggles)
      })),
      map((content) => {
        this.pageTogglesSubject.next(content.pageToggles);
        this.togglesLoaded = true;
        return content;
      })
    );
  }

  updateContent(payload: UpdateContentPayload) {
    return this.http.patch<AdminContentResponse>(`${API_BASE_URL}/content`, payload).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        heroTranslations: this.mapHeroTranslations(response.heroTranslations),
        heroProductIds: response.heroProductIds ?? [],
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? [],
        pageToggles: this.mergePageToggles(response.pageToggles)
      })),
      map((content) => {
        this.pageTogglesSubject.next(content.pageToggles);
        this.togglesLoaded = true;
        return content;
      })
    );
  }

  getPageToggles() {
    if (this.togglesLoaded) {
      return this.pageTogglesSubject.asObservable();
    }

    return this.getPublicContent().pipe(
      map((content) => content.pageToggles),
      switchMap(() => this.pageTogglesSubject.asObservable())
    );
  }

  private getLocaleParams(): { lang: string } {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || 'ka';
    const lang = locale.startsWith('en') ? 'en' : 'ka';
    return { lang };
  }

  private mapHero(hero: ApiHero): HeroContent {
    return {
      title: hero.title,
      subtitle: hero.subtitle,
      primaryCtaText: hero.primaryCtaText,
      primaryCtaLink: hero.primaryCtaLink,
      secondaryCtaText: hero.secondaryCtaText,
      secondaryCtaLink: hero.secondaryCtaLink,
      imageUrl: hero.imageUrl ?? null,
      highlights: hero.highlights ?? []
    };
  }

  private mapHeroTranslations(translations?: HeroTranslations): HeroTranslations {
    if (!translations) {
      return {};
    }

    return {
      ka: translations.ka ? this.mapHero(translations.ka) : undefined,
      en: translations.en ? this.mapHero(translations.en) : undefined
    };
  }

  private mapProduct(product: ApiProduct): Product {
    return {
      id: product._id,
      title: product.title,
      description: product.description ?? null,
      price: product.price,
      stock: product.stock,
      images: product.images ?? [],
      isActive: product.isActive,
      metadata: product.metadata ?? null,
      createdAt: product.createdAt
    };
  }

  private mergePageToggles(toggles?: PageToggles): PageToggles {
    return { ...defaultPageToggles, ...(toggles ?? {}) };
  }

  private buildFallbackPublicContent(lang: string): PublicContent {
    const heroEn: HeroContent = {
      title: 'Cases that feel tailored, not templated.',
      subtitle: 'The API is coming online soon. You can still browse the storefront preview now.',
      primaryCtaText: 'Explore cases',
      primaryCtaLink: '/shop',
      secondaryCtaText: 'Join the drop',
      secondaryCtaLink: '/register',
      imageUrl: null,
      highlights: ['Drop tested', 'Grip textured', '3-layer shell', 'Matte finish']
    };

    const heroKa: HeroContent = {
      title: 'ქეისები, რომლებიც შენს სტილს ერგება და არა შაბლონს.',
      subtitle: 'API მალე ჩაირთვება. მანამდე შეგიძლია ვიტრინის პრევიუ ნახო.',
      primaryCtaText: 'ქეისების დათვალიერება',
      primaryCtaLink: '/shop',
      secondaryCtaText: 'დროპს შემოუერთდი',
      secondaryCtaLink: '/register',
      imageUrl: null,
      highlights: ['დროპ-ტესტით დადასტურებული', 'არასრიალა მოჭიდება', '3-ფენიანი დაცვა', 'მატე ზედაპირი']
    };

    return {
      hero: lang === 'en' ? heroEn : heroKa,
      heroProducts: [],
      suggestedProducts: [],
      pageToggles: defaultPageToggles
    };
  }
}
