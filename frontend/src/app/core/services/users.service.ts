import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { UserRole } from './auth.service';

export type AdminUser = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type ApiUser = {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type UsersResponse = {
  users: ApiUser[];
};

type UpdateRoleResponse = {
  user: ApiUser;
};

type UpdateUserPayload = {
  name: string;
  lastName: string;
  email: string;
  pinCode: string;
  role: UserRole;
  isActive: boolean;
};

type CreateUserPayload = {
  name: string;
  lastName: string;
  email: string;
  password: string;
  pinCode: string;
  role: UserRole;
  isActive: boolean;
};

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly http: HttpClient) {}

  getUsers() {
    return this.http.get<UsersResponse>(`${API_BASE_URL}/users`).pipe(
      map((response) =>
        response.users.map((user) => ({
          id: user._id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          pinCode: user.pinCode,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }))
      )
    );
  }

  updateRole(id: string, role: UserRole) {
    return this.http
      .patch<UpdateRoleResponse>(`${API_BASE_URL}/users/${id}/role`, { role })
      .pipe(
        map((response) => ({
          id: response.user._id,
          name: response.user.name,
          lastName: response.user.lastName,
          email: response.user.email,
          pinCode: response.user.pinCode,
          role: response.user.role,
          createdAt: response.user.createdAt
        }))
      );
  }

  updateUser(id: string, payload: UpdateUserPayload) {
    return this.http
      .patch<UpdateRoleResponse>(`${API_BASE_URL}/users/${id}`, payload)
      .pipe(
        map((response) => ({
          id: response.user._id,
          name: response.user.name,
          lastName: response.user.lastName,
          email: response.user.email,
          pinCode: response.user.pinCode,
          role: response.user.role,
          isActive: response.user.isActive,
          createdAt: response.user.createdAt
        }))
      );
  }

  createUser(payload: CreateUserPayload) {
    return this.http.post<UpdateRoleResponse>(`${API_BASE_URL}/users`, payload).pipe(
      map((response) => ({
        id: response.user._id,
        name: response.user.name,
        lastName: response.user.lastName,
        email: response.user.email,
        pinCode: response.user.pinCode,
        role: response.user.role,
        isActive: response.user.isActive,
        createdAt: response.user.createdAt
      }))
    );
  }

  resetPassword(id: string) {
    return this.http
      .post<UpdateRoleResponse>(`${API_BASE_URL}/users/${id}/reset-password`, {})
      .pipe(
        map((response) => ({
          id: response.user._id,
          name: response.user.name,
          lastName: response.user.lastName,
          email: response.user.email,
          pinCode: response.user.pinCode,
          role: response.user.role,
          isActive: response.user.isActive,
          createdAt: response.user.createdAt
        }))
      );
  }

  deleteUser(id: string) {
    return this.http.delete(`${API_BASE_URL}/users/${id}`);
  }
}
