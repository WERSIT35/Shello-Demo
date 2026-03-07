import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Product } from './products.service';

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
  suggestedProductIds: string[];
  categories: string[];
};

export type UpdateContentPayload = {
  hero?: Partial<HeroContent>;
  suggestedProductIds?: string[];
  categories?: string[];
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
  suggestedProductIds: string[];
  categories: string[];
};

@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(private readonly http: HttpClient) {}

  getPublicContent() {
    return this.http.get<PublicContentResponse>(`${API_BASE_URL}/content`).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        suggestedProducts: response.suggestedProducts.map((product) => this.mapProduct(product))
      }))
    );
  }

  getAdminContent() {
    return this.http.get<AdminContentResponse>(`${API_BASE_URL}/content/admin`).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? []
      }))
    );
  }

  updateContent(payload: UpdateContentPayload) {
    return this.http.patch<AdminContentResponse>(`${API_BASE_URL}/content`, payload).pipe(
      map((response) => ({
        hero: this.mapHero(response.hero),
        suggestedProductIds: response.suggestedProductIds,
        categories: response.categories ?? []
      }))
    );
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
