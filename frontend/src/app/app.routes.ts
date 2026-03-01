import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { Home } from './features/public/home/home';
import { Cases } from './features/public/cases/cases';
import { ContactComponent } from './features/public/contact/contact';
import { Products } from './features/public/products/products';
import { CartComponent } from './features/public/cart/cart';

export const routes: Routes = [
    {
        path: '',
        component: PublicLayout,
        children: [
            { path: '', component: Home },
            { path: 'products', component: Products },
            { path: 'cases', component: Cases },
            { path: 'contact', component: ContactComponent },
            { path: 'cart', component: CartComponent },
        ]
    },
];
