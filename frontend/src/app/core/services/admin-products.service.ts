import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type AdminProduct = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  images: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type ApiProduct = {
  _id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  images: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type ProductListResponse = {
  data: ApiProduct[];
};

type UploadResponse = {
  images: Array<{ url: string; filename: string }>;
};

type CreateProductPayload = {
  title: string;
  description?: string | null;
  price: number;
  stock: number;
  isActive?: boolean;
  images?: string[];
  metadata?: Record<string, unknown> | null;
};

type UpdateProductPayload = {
  title?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  isActive?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  constructor(private readonly http: HttpClient) {}

  getProducts() {
    return this.http.get<ProductListResponse>(`${API_BASE_URL}/products/admin`).pipe(
      map((response) =>
        response.data.map((product) => ({
          id: product._id,
          title: product.title,
          description: product.description ?? null,
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          images: product.images ?? [],
          metadata: product.metadata ?? null,
          createdAt: product.createdAt
        }))
      )
    );
  }

  updateProduct(id: string, payload: UpdateProductPayload) {
    return this.http.patch<ApiProduct>(`${API_BASE_URL}/products/${id}`, payload).pipe(
      map((product) => ({
        id: product._id,
        title: product.title,
        description: product.description ?? null,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
        images: product.images ?? [],
        metadata: product.metadata ?? null,
        createdAt: product.createdAt
      }))
    );
  }

  createProduct(payload: CreateProductPayload) {
    return this.http.post<ApiProduct>(`${API_BASE_URL}/products`, payload).pipe(
      map((product) => ({
        id: product._id,
        title: product.title,
        description: product.description ?? null,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
        images: product.images ?? [],
        metadata: product.metadata ?? null,
        createdAt: product.createdAt
      }))
    );
  }

  uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    return this.http.post<UploadResponse>(`${API_BASE_URL}/uploads/images`, formData).pipe(
      map((response) => response.images.map((image) => image.url))
    );
  }

  deactivateProduct(id: string) {
    return this.http.patch(`${API_BASE_URL}/products/${id}/deactivate`, {});
  }

  deleteProduct(id: string) {
    return this.http.delete(`${API_BASE_URL}/products/${id}`);
  }
}
