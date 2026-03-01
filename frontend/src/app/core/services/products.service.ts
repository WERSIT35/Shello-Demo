import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Product } from '../../shared/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private products: Product[] = [
    {
      id: '1',
      name: 'Midnight',
      price: 90,
      imageUrl: 'assets/images/cases/1.jpeg',
      material: 'Carbon Fiber'
    },
    {
      id: '2',
      name: 'Natural Stone',
      price: 90,
      imageUrl: 'assets/images/cases/2.jpeg',
      material: 'Natural Stone'
    },
    {
      id: '3',
      name: 'Pure Arctic',
      price: 90,
      imageUrl: 'assets/images/cases/3.jpeg',
      material: 'Kevlar'
    }
  ];

  getProducts() {
    return of(this.products);
  }

  getProduct(id: string) {
    return of(this.products.find(p => p.id === id));
  }
}
