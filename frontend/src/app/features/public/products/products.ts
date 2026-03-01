import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../shared/models/product.model';
import { ProductsService } from '../../../core/services/products.service';
import { CartService } from '../../../core/services/cart.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.html',
  styleUrls: ['./products.scss']
})
export class Products implements OnInit {
  products$!: Observable<Product[] | undefined>;

  private productsService = inject(ProductsService);
  private cartService = inject(CartService);

  ngOnInit() {
    this.products$ = this.productsService.getProducts();
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }
}
