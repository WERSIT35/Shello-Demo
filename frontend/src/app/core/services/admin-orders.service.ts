import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type AdminOrder = {
  id: string;
  userId: string;
  totalPrice: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
};

type ApiOrder = {
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
          totalPrice: order.totalPrice,
          status: order.status,
          createdAt: order.createdAt
        }))
      )
    );
  }

  updateStatus(id: string, status: AdminOrder['status']) {
    return this.http.patch<ApiOrder>(`${API_BASE_URL}/orders/${id}/status`, { status }).pipe(
      map((order) => ({
        id: order._id,
        userId: order.userId,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt
      }))
    );
  }
}
