import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

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
  suggestedProducts: Product[];
};

export type AdminContent = {
  hero: HeroContent;
  heroTranslations: HeroTranslations;
  suggestedProductIds: string[];
  categories: string[];
};

export type UpdateContentPayload = {
  hero?: Partial<HeroContent>;
  heroTranslations?: HeroTranslations;
  suggestedProductIds?: string[];
  categories?: string[];
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
  suggestedProducts: ApiProduct[];
};

type AdminContentResponse = {
  hero: ApiHero;
  heroTranslations?: HeroTranslations;
  suggestedProductIds: string[];
  categories: string[];
};

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(private readonly http: HttpClient) {}

  getPublicContent() {
    const params = this.getLocaleParams();
    return this.http.get<PublicContentResponse>(`${API_BASE_URL}/content`, { params }).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        suggestedProducts: response.suggestedProducts.map((product) => this.mapProduct(product))
      }))
    );
  }

  getAdminContent() {
    const params = this.getLocaleParams();
    return this.http.get<AdminContentResponse>(`${API_BASE_URL}/content/admin`, { params }).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        heroTranslations: this.mapHeroTranslations(response.heroTranslations),
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? []
      }))
    );
  }

  updateContent(payload: UpdateContentPayload) {
    return this.http.patch<AdminContentResponse>(`${API_BASE_URL}/content`, payload).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        heroTranslations: this.mapHeroTranslations(response.heroTranslations),
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? []
      }))
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
}
