import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  items: Array<{
    productId: string;
    title: string;
    code: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
};

type ApiOrder = {
  _id: string;
  items: Array<{
    productId: string;
    itemCode: string;
    quantity: number;
    priceAtPurchase: number;
    product: {
      _id: string;
      title: string;
      code: string;
    } | null;
  }>;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
};

type OrdersResponse = {
  data: ApiOrder[];
};

type CreateOrderPayload = {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod?: Record<string, unknown> | null;
};

type CreateOrderResponse = {
  orderId: string;
  status: OrderStatus;
  totalPrice: number;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private readonly http: HttpClient) {}

  getMyOrders() {
    return this.http.get<OrdersResponse>(`${API_BASE_URL}/orders`).pipe(
      map((response) => response.data.map((order) => this.mapOrder(order)))
    );
  }

  createOrder(payload: CreateOrderPayload) {
    return this.http.post<CreateOrderResponse>(`${API_BASE_URL}/orders`, payload).pipe(
      map((order) => ({
        id: order.orderId,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt
      }))
    );
  }

  private mapOrder(order: ApiOrder): Order {
    return {
      id: order._id,
      items: order.items.map((item) => ({
        productId: item.product?._id ?? item.productId,
        title: item.product?.title ?? `Product ${item.productId}`,
        code: item.product?.code ?? item.itemCode,
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase
      })),
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt
    };
  }
}
