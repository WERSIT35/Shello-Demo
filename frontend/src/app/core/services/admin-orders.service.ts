import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type AdminOrder = {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    pinCode: string;
  } | null;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  totalPrice: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentInfo: Record<string, unknown> | null;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
};

type ApiOrder = {
  _id: string;
  userId: string;
  user: {
    _id: string;
    name: string;
    lastName: string;
    email: string;
    pinCode: string;
  } | null;
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: number;
    product: {
      _id: string;
      title: string;
    } | null;
  }>;
  totalPrice: number;
  shippingAddress: AdminOrder['shippingAddress'];
  paymentInfo: Record<string, unknown> | null;
  status: AdminOrder['status'];
  createdAt: string;
};

type ApiOrderStatusResponse = {
  _id: string;
  userId: string;
  totalPrice: number;
  status: AdminOrder['status'];
  createdAt: string;
};

type OrdersResponse = {
  data: ApiOrder[];
};

@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  constructor(private readonly http: HttpClient) {}

  getOrders() {
    return this.http.get<OrdersResponse>(`${API_BASE_URL}/orders/admin`).pipe(
      map((response) =>
        response.data.map((order) => ({
          id: order._id,
          userId: order.userId,
          user: order.user
            ? {
                id: order.user._id,
                fullName: `${order.user.name} ${order.user.lastName}`.trim(),
                email: order.user.email,
                pinCode: order.user.pinCode
              }
            : null,
          items: order.items.map((item) => ({
            productId: item.productId,
            title: item.product?.title ?? `Product ${item.productId}`,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase
          })),
          totalPrice: order.totalPrice,
          shippingAddress: order.shippingAddress,
          paymentInfo: order.paymentInfo,
          status: order.status,
          createdAt: order.createdAt
        }))
      )
    );
  }

  updateStatus(id: string, status: AdminOrder['status']) {
    return this.http.patch<ApiOrderStatusResponse>(`${API_BASE_URL}/orders/${id}/status`, { status }).pipe(
      map((order) => ({
        id: order._id,
        userId: order.userId,
        user: null,
        items: [],
        totalPrice: order.totalPrice,
        shippingAddress: {
          fullName: '',
          phone: '',
          addressLine: '',
          city: '',
          postalCode: '',
          country: ''
        },
        paymentInfo: null,
        status: order.status,
        createdAt: order.createdAt
      }))
    );
  }

  deleteOrder(id: string) {
    return this.http.delete<void>(`${API_BASE_URL}/orders/${id}`);
  }
}
