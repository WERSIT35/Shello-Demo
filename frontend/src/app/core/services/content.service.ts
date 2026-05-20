import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, of, switchMap, throwError } from 'rxjs';

import { API_BASE_URL, resolveAssetUrl } from '../config/api.config';
import { IS_STATIC_MODE } from '../config/static-mode.config';
import {
  getStaticHero,
  getStaticHeroProducts,
  getStaticSuggestedProducts
} from '../../data/static-catalog';
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

const staticModePageToggles: PageToggles = {
  home: true,
  shop: true,
  product: true,
  cart: false,
  checkout: false,
  login: false,
  register: false,
  orders: false,
  profile: false,
  admin: false,
  adminProducts: false,
  adminContent: false,
  adminOrders: false,
  adminUsers: false,
  adminSecurity: false
};

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly pageTogglesSubject = new BehaviorSubject<PageToggles>(
    IS_STATIC_MODE ? staticModePageToggles : defaultPageToggles
  );
  private togglesLoaded = IS_STATIC_MODE;

  constructor(private readonly http: HttpClient) {}

  getPublicContent() {
    if (IS_STATIC_MODE) {
      const params = this.getLocaleParams();
      const content: PublicContent = {
        hero: this.mapHero(getStaticHero(params.lang as 'ka' | 'en') as ApiHero),
        heroProducts: getStaticHeroProducts(),
        suggestedProducts: getStaticSuggestedProducts(),
        pageToggles: staticModePageToggles
      };
      this.pageTogglesSubject.next(staticModePageToggles);
      this.togglesLoaded = true;
      return of(content);
    }

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
    if (IS_STATIC_MODE) {
      return throwError(() => new Error('Admin content is disabled in static mode.'));
    }

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
    if (IS_STATIC_MODE) {
      return throwError(() => new Error('Content updates are disabled in static mode.'));
    }

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
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
    let lang: 'ka' | 'en' = 'en';

    if (locale.startsWith('ka')) {
      lang = 'ka';
    } else if (locale.startsWith('en')) {
      lang = 'en';
    } else if (typeof window !== 'undefined') {
      lang = window.location.pathname.startsWith('/ka') ? 'ka' : 'en';
    }

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
      imageUrl: resolveAssetUrl(hero.imageUrl),
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
      images: (product.images ?? []).map((image) => resolveAssetUrl(image)).filter((image): image is string => !!image),
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
