import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL, resolveAssetUrl } from '../config/api.config';

export type ProductMetadata = Record<string, unknown> | null;
declare const $localize: { locale?: string };

export type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  metadata: ProductMetadata;
  createdAt: string;
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
};

type ProductListResponse = {
  data: ApiProduct[];
};

@Injectable({ providedIn: 'root' })
export class ProductsService {
  constructor(private readonly http: HttpClient) {}

  getProducts() {
    return this.http.get<ProductListResponse>(`${API_BASE_URL}/products`).pipe(
      map((response) => response.data.map((product) => this.mapProduct(product)))
    );
  }

  getProduct(id: string) {
    return this.http.get<ApiProduct>(`${API_BASE_URL}/products/${id}`).pipe(
      map((product) => this.mapProduct(product))
    );
  }

  private mapProduct(product: ApiProduct): Product {
    const metadata = product.metadata ?? null;
    const lang = this.resolveLang();
    const localizedTitle = this.getLocalizedMetadataValue(metadata, 'title', lang);
    const localizedDescription = this.getLocalizedMetadataValue(metadata, 'description', lang);

    return {
      id: product._id,
      title: localizedTitle ?? product.title,
      description: localizedDescription ?? product.description ?? null,
      price: product.price,
      stock: product.stock,
      images: (product.images ?? []).map((image) => resolveAssetUrl(image)).filter((image): image is string => !!image),
      isActive: product.isActive,
      metadata,
      createdAt: product.createdAt
    };
  }

  private resolveLang(): 'ka' | 'en' {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
    if (locale.startsWith('ka')) {
      return 'ka';
    }
    if (locale.startsWith('en')) {
      return 'en';
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ka')) {
      return 'ka';
    }
    return 'en';
  }

  private getLocalizedMetadataValue(
    metadata: ProductMetadata,
    key: 'title' | 'description',
    lang: 'ka' | 'en'
  ): string | null {
    if (!metadata) {
      return null;
    }

    const meta = metadata as Record<string, unknown>;
    const keyByLang = lang === 'ka' ? `${key}Ka` : `${key}En`;
    const value = meta[keyByLang];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    return null;
  }
}
