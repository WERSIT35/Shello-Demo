import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { LandingComponent } from './features/landing/landing.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

export const routes: Routes = [
	{
		path: '',
		component: PublicLayoutComponent,
		children: [
			{
				path: '',
				component: LandingComponent
			},
			{
				path: 'shop',
				loadComponent: () =>
					import('./features/shop/product-list/product-list.component').then(
						(m) => m.ProductListComponent
					)
			},
			{
				path: 'products/:id',
				loadComponent: () =>
					import('./features/shop/product-detail/product-detail.component').then(
						(m) => m.ProductDetailComponent
					)
			},
			{
				path: 'cart',
				loadComponent: () =>
					import('./features/shop/cart/cart.component').then((m) => m.CartComponent)
			},
			{
				path: 'checkout',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/shop/checkout/checkout.component').then(
						(m) => m.CheckoutComponent
					)
			},
			{
				path: 'login',
				canActivate: [guestGuard],
				loadComponent: () =>
					import('./features/auth/login/login.component').then((m) => m.LoginComponent)
			},
			{
				path: 'register',
				canActivate: [guestGuard],
				loadComponent: () =>
					import('./features/auth/register/register.component').then(
						(m) => m.RegisterComponent
					)
			},
			{
				path: 'orders',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/user/orders/orders.component').then((m) => m.OrdersComponent)
			}
			,
			{
				path: 'profile',
				canActivate: [authGuard],
				loadComponent: () =>
					import('./features/user/profile/profile.component').then((m) => m.ProfileComponent)
			}
		]
	},
	{
		path: 'admin',
		component: AdminLayoutComponent,
		canActivate: [adminGuard],
		children: [
			{
				path: '',
				loadComponent: () =>
					import('./features/admin/dashboard/dashboard.component').then(
						(m) => m.AdminDashboardComponent
					)
			},
			{
				path: 'products',
				loadComponent: () =>
					import('./features/admin/products/products.component').then(
						(m) => m.AdminProductsComponent
					)
			},
			{
				path: 'content',
				loadComponent: () =>
					import('./features/admin/content/content.component').then(
						(m) => m.AdminContentComponent
					)
			},
			{
				path: 'orders',
				loadComponent: () =>
					import('./features/admin/orders/orders.component').then(
						(m) => m.AdminOrdersComponent
					)
			},
			{
				path: 'users',
				loadComponent: () =>
					import('./features/admin/users/users.component').then((m) => m.AdminUsersComponent)
			}
		]
	},
	{
		path: '**',
		redirectTo: ''
	}
];
