import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type ProductMetadata = Record<string, unknown> | null;

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
