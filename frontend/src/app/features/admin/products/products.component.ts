import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, retry, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ContentService } from '../../../core/services/content.service';
import { AdminProductsService, type AdminProduct } from '../../../core/services/admin-products.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, NgFor, NgIf],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class AdminProductsComponent implements OnInit {
  private readonly productsService = inject(AdminProductsService);
  private readonly auth = inject(AuthService);
  private readonly contentService = inject(ContentService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected products: AdminProduct[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected editingId: string | null = null;
  protected draft = {
    title: '',
    price: 0,
    stock: 0,
    isActive: true
  };
  protected showCreate = false;
  protected isCreating = false;
  protected createErrorMessage = '';
  protected createDraft = {
    title: '',
    description: '',
    price: 0,
    stock: 0,
    isActive: true,
    mainImage: '',
    extraImages: '',
    category: '',
    caseType: 'Slim',
    brand: 'Apple',
    color: 'Black',
    model: ''
  };
  protected selectedFiles: File[] = [];

  protected categories: string[] = [];

  protected readonly caseTypes = ['Slim', 'MagSafe', 'Bumper', 'Wallet'];
  protected readonly brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'];
  protected readonly colors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Clear'];

  ngOnInit(): void {
    this.refreshProducts();
    this.loadCategories();
  }
  private loadCategories(): void {
    this.auth
      .ensureSession()
      .pipe(switchMap(() => this.contentService.getAdminContent()))
      .subscribe({
        next: (content) => {
          this.categories = content.categories;
          if (!this.createDraft.category && this.categories.length > 0) {
            this.createDraft.category = this.categories[0];
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.categories = ['Cases'];
          if (!this.createDraft.category) {
            this.createDraft.category = 'Cases';
          }
          this.cdr.detectChanges();
        }
      });
  }

  private refreshProducts(): void {
    this.isLoading = true;

    this.auth
      .ensureSession()
      .pipe(switchMap(() => this.productsService.getProducts().pipe(retry({ count: 1, delay: 300 }))))
      .subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load products.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private resolveError(error: unknown): string {
    const fallback = 'Unable to load products.';

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const message = (error as { error?: { error?: { message?: string } } }).error?.error?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    return fallback;
  }

  protected startEdit(product: AdminProduct): void {
    this.editingId = product.id;
    this.draft = {
      title: product.title,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive
    };
  }

  protected cancelEdit(): void {
    this.editingId = null;
  }

  protected saveEdit(product: AdminProduct): void {
    if (!this.editingId) {
      return;
    }

    this.productsService
      .updateProduct(product.id, {
        title: this.draft.title.trim(),
        price: this.draft.price,
        stock: this.draft.stock,
        isActive: this.draft.isActive
      })
      .subscribe({
        next: (updated) => {
          this.editingId = null;
          this.refreshProducts();
        },
        error: () => {
          this.errorMessage = 'Unable to update product.';
          this.cdr.detectChanges();
        }
      });
  }

  protected toggleActive(product: AdminProduct): void {
    const nextState = product.isActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(
      `Are you sure you want to ${nextState} ${product.title}?`
    );

    if (!confirmed) {
      return;
    }

    this.productsService
      .updateProduct(product.id, { isActive: !product.isActive })
      .subscribe({
        next: () => {
          this.refreshProducts();
        },
        error: () => {
          this.errorMessage = `Unable to ${nextState} product.`;
          this.cdr.detectChanges();
        }
      });
  }

  protected deleteProduct(product: AdminProduct): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${product.title}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.productsService.deleteProduct(product.id).subscribe({
      next: () => {
        this.refreshProducts();
      },
      error: () => {
        this.errorMessage = 'Unable to delete product.';
        this.cdr.detectChanges();
      }
    });
  }

  protected createProduct(): void {
    if (this.isCreating) {
      return;
    }

    this.createErrorMessage = '';

    const title = this.createDraft.title.trim();
    const description = this.createDraft.description.trim();
    const price = this.createDraft.price;
    const stock = this.createDraft.stock;
    const category = this.createDraft.category.trim();
    const model = this.createDraft.model.trim();
    const caseType = this.createDraft.caseType;
    const brand = this.createDraft.brand;
    const color = this.createDraft.color;

    if (!title) {
      this.createErrorMessage = 'Title is required.';
      return;
    }

    if (price < 0) {
      this.createErrorMessage = 'Price must be 0 or more.';
      return;
    }

    if (stock < 0) {
      this.createErrorMessage = 'Stock must be 0 or more.';
      return;
    }

    if (!category) {
      this.createErrorMessage = 'Category is required.';
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.createErrorMessage = 'Add at least one image.';
      return;
    }

    if (!model) {
      this.createErrorMessage = 'Model is required.';
      return;
    }

    this.isCreating = true;

    this.productsService
      .uploadImages(this.selectedFiles)
      .pipe(
        switchMap((images) =>
          this.productsService.createProduct({
            title,
            description: description.length > 0 ? description : null,
            price,
            stock,
            isActive: this.createDraft.isActive,
            images,
            metadata: {
              category,
              caseType,
              brand,
              color,
              model
            }
          })
        ),
        finalize(() => {
          this.isCreating = false;
        })
      )
      .subscribe({
        next: () => {
          this.createDraft = {
            title: '',
            description: '',
            price: 0,
            stock: 0,
            isActive: true,
            mainImage: '',
            extraImages: '',
            category: this.categories[0] ?? '',
            caseType: 'Slim',
            brand: 'Apple',
            color: 'Black',
            model: ''
          };
          this.selectedFiles = [];
          this.showCreate = false;
          this.refreshProducts();
        },
        error: (error: unknown) => {
          this.createErrorMessage = this.resolveError(error);
          this.cdr.detectChanges();
        }
      });
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const maxFiles = 8;

    if (files.length > maxFiles) {
      this.createErrorMessage = `Select up to ${maxFiles} images.`;
      this.selectedFiles = files.slice(0, maxFiles);
      if (input) {
        input.value = '';
      }
      return;
    }

    this.createErrorMessage = '';
    this.selectedFiles = files;
  }
}
