import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { pageToggleGuard } from './core/guards/page-toggle.guard';
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
				canActivate: [pageToggleGuard],
				data: { pageKey: 'home' },
				component: LandingComponent
			},
			{
				path: 'shop',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'shop' },
				loadComponent: () =>
					import('./features/shop/product-list/product-list.component').then(
						(m) => m.ProductListComponent
					)
			},
			{
				path: 'products/:id',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'product' },
				loadComponent: () =>
					import('./features/shop/product-detail/product-detail.component').then(
						(m) => m.ProductDetailComponent
					)
			},
			{
				path: 'cart',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'cart' },
				loadComponent: () =>
					import('./features/shop/cart/cart.component').then((m) => m.CartComponent)
			},
			{
				path: 'checkout',
				canActivate: [authGuard, pageToggleGuard],
				data: { pageKey: 'checkout' },
				loadComponent: () =>
					import('./features/shop/checkout/checkout.component').then(
						(m) => m.CheckoutComponent
					)
			},
			{
				path: 'login',
				canActivate: [guestGuard, pageToggleGuard],
				data: { pageKey: 'login' },
				loadComponent: () =>
					import('./features/auth/login/login.component').then((m) => m.LoginComponent)
			},
			{
				path: 'register',
				canActivate: [guestGuard, pageToggleGuard],
				data: { pageKey: 'register' },
				loadComponent: () =>
					import('./features/auth/register/register.component').then(
						(m) => m.RegisterComponent
					)
			},
			{
				path: 'orders',
				canActivate: [authGuard, pageToggleGuard],
				data: { pageKey: 'orders' },
				loadComponent: () =>
					import('./features/user/orders/orders.component').then((m) => m.OrdersComponent)
			},
			{
				path: 'profile',
				canActivate: [authGuard, pageToggleGuard],
				data: { pageKey: 'profile' },
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
				canActivate: [pageToggleGuard],
				data: { pageKey: 'admin' },
				loadComponent: () =>
					import('./features/admin/dashboard/dashboard.component').then(
						(m) => m.AdminDashboardComponent
					)
			},
			{
				path: 'products',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'adminProducts' },
				loadComponent: () =>
					import('./features/admin/products/products.component').then(
						(m) => m.AdminProductsComponent
					)
			},
			{
				path: 'content',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'adminContent' },
				loadComponent: () =>
					import('./features/admin/content/content.component').then(
						(m) => m.AdminContentComponent
					)
			},
			{
				path: 'orders',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'adminOrders' },
				loadComponent: () =>
					import('./features/admin/orders/orders.component').then(
						(m) => m.AdminOrdersComponent
					)
			},
			{
				path: 'users',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'adminUsers' },
				loadComponent: () =>
					import('./features/admin/users/users.component').then((m) => m.AdminUsersComponent)
			},
			{
				path: 'security',
				canActivate: [pageToggleGuard],
				data: { pageKey: 'adminSecurity' },
				loadComponent: () =>
					import('./features/admin/security/security.component').then(
						(m) => m.AdminSecurityComponent
					)
			}
		]
	},
	{
		path: '**',
		redirectTo: ''
	}
];
