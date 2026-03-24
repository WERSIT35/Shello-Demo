import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, of, retry, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ContentService } from '../../../core/services/content.service';
import { AdminProductsService, type AdminProduct } from '../../../core/services/admin-products.service';

type ProductFormDraft = {
  title: string;
  titleKa: string;
  titleEn: string;
  description: string;
  descriptionKa: string;
  descriptionEn: string;
  price: number;
  stock: number;
  isActive: boolean;
  category: string;
  caseType: string;
  brand: string;
  color: string;
  model: string;
  modelKa: string;
  modelEn: string;
};

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

  protected showCreate = false;
  protected isCreating = false;
  protected createErrorMessage = '';
  protected createDraft: ProductFormDraft = this.buildEmptyDraft();
  protected selectedFiles: File[] = [];

  protected showEdit = false;
  protected isSavingEdit = false;
  protected editErrorMessage = '';
  protected editingProduct: AdminProduct | null = null;
  protected editDraft: ProductFormDraft = this.buildEmptyDraft();
  protected editImageOrderDraft: string[] = [];
  protected selectedEditFiles: File[] = [];

  protected categories: string[] = [];

  protected readonly caseTypes = ['Slim', 'MagSafe', 'Bumper', 'Wallet'];
  protected readonly brands = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'];
  protected readonly colors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Clear'];

  ngOnInit(): void {
    this.refreshProducts();
    this.loadCategories();
  }

  private buildEmptyDraft(): ProductFormDraft {
    return {
      title: '',
      titleKa: '',
      titleEn: '',
      description: '',
      descriptionKa: '',
      descriptionEn: '',
      price: 0,
      stock: 0,
      isActive: true,
      category: '',
      caseType: 'Slim',
      brand: 'Apple',
      color: 'Black',
      model: '',
      modelKa: '',
      modelEn: ''
    };
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
          if (!this.editDraft.category && this.categories.length > 0) {
            this.editDraft.category = this.categories[0];
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.categories = ['Cases'];
          if (!this.createDraft.category) {
            this.createDraft.category = 'Cases';
          }
          if (!this.editDraft.category) {
            this.editDraft.category = 'Cases';
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
        error: (error: unknown) => {
          this.errorMessage = this.resolveError(error);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private resolveError(error: unknown): string {
    const fallback = 'Unable to process request.';

    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const message = (error as { error?: { error?: { message?: string } } }).error?.error?.message;

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    return fallback;
  }

  private getMetadataValue(product: AdminProduct, key: string): string {
    const metadata = product.metadata as Record<string, unknown> | null;
    if (!metadata) {
      return '';
    }

    const value = metadata[key];
    if (typeof value === 'string') {
      return value;
    }

    return '';
  }

  private buildDraftFromProduct(product: AdminProduct): ProductFormDraft {
    return {
      title: product.title,
      titleKa: this.getMetadataValue(product, 'titleKa'),
      titleEn: this.getMetadataValue(product, 'titleEn'),
      description: product.description ?? '',
      descriptionKa: this.getMetadataValue(product, 'descriptionKa'),
      descriptionEn: this.getMetadataValue(product, 'descriptionEn'),
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
      category: this.getMetadataValue(product, 'category') || this.categories[0] || 'Cases',
      caseType: this.getMetadataValue(product, 'caseType') || 'Slim',
      brand: this.getMetadataValue(product, 'brand') || 'Apple',
      color: this.getMetadataValue(product, 'color') || 'Black',
      model: this.getMetadataValue(product, 'model'),
      modelKa: this.getMetadataValue(product, 'modelKa'),
      modelEn: this.getMetadataValue(product, 'modelEn')
    };
  }

  private buildMetadataFromDraft(draft: ProductFormDraft): Record<string, unknown> {
    return {
      category: draft.category.trim(),
      caseType: draft.caseType,
      brand: draft.brand,
      color: draft.color,
      model: draft.model.trim(),
      titleKa: draft.titleKa.trim() || undefined,
      titleEn: draft.titleEn.trim() || undefined,
      descriptionKa: draft.descriptionKa.trim() || undefined,
      descriptionEn: draft.descriptionEn.trim() || undefined,
      modelKa: draft.modelKa.trim() || undefined,
      modelEn: draft.modelEn.trim() || undefined
    };
  }

  protected openEdit(product: AdminProduct): void {
    this.editingProduct = product;
    this.editDraft = this.buildDraftFromProduct(product);
    this.editImageOrderDraft = [...(product.images ?? [])];
    this.selectedEditFiles = [];
    this.editErrorMessage = '';
    this.showEdit = true;
  }

  protected closeEdit(): void {
    this.showEdit = false;
    this.isSavingEdit = false;
    this.editErrorMessage = '';
    this.editingProduct = null;
    this.editDraft = this.buildEmptyDraft();
    this.editImageOrderDraft = [];
    this.selectedEditFiles = [];
  }

  protected onEditFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const maxTotalFiles = 8;
    const availableSlots = Math.max(0, maxTotalFiles - this.editImageOrderDraft.length);

    if (files.length > availableSlots) {
      this.editErrorMessage = `You can add up to ${availableSlots} more image(s).`;
      this.selectedEditFiles = files.slice(0, availableSlots);
    } else {
      this.editErrorMessage = '';
      this.selectedEditFiles = files;
    }

    input.value = '';
  }

  protected moveEditImage(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= this.editImageOrderDraft.length) {
      return;
    }

    const nextDraft = [...this.editImageOrderDraft];
    [nextDraft[index], nextDraft[nextIndex]] = [nextDraft[nextIndex], nextDraft[index]];
    this.editImageOrderDraft = nextDraft;
  }

  protected removeEditImage(index: number): void {
    this.editImageOrderDraft = this.editImageOrderDraft.filter((_, i) => i !== index);
  }

  protected saveEdit(): void {
    if (!this.editingProduct || this.isSavingEdit) {
      return;
    }

    this.editErrorMessage = '';

    const title = this.editDraft.title.trim();
    const description = this.editDraft.description.trim();
    const price = this.editDraft.price;
    const stock = this.editDraft.stock;
    const model = this.editDraft.model.trim();
    const category = this.editDraft.category.trim();

    if (!title) {
      this.editErrorMessage = 'Title is required.';
      return;
    }

    if (price < 0) {
      this.editErrorMessage = 'Price must be 0 or more.';
      return;
    }

    if (stock < 0) {
      this.editErrorMessage = 'Stock must be 0 or more.';
      return;
    }

    if (!category) {
      this.editErrorMessage = 'Category is required.';
      return;
    }

    if (!model) {
      this.editErrorMessage = 'Model is required.';
      return;
    }

    if (this.editImageOrderDraft.length === 0 && this.selectedEditFiles.length === 0) {
      this.editErrorMessage = 'Add at least one image.';
      return;
    }

    this.isSavingEdit = true;
    const filesToUpload = [...this.selectedEditFiles];
    const upload$ = filesToUpload.length > 0 ? this.productsService.uploadImages(filesToUpload) : of<string[]>([]);

    upload$
      .pipe(
        switchMap((uploadedImages) => {
          const nextImages = [...this.editImageOrderDraft, ...uploadedImages];
          return this.productsService.updateProduct(this.editingProduct!.id, {
            title,
            description: description.length > 0 ? description : null,
            price,
            stock,
            isActive: this.editDraft.isActive,
            images: nextImages,
            metadata: this.buildMetadataFromDraft(this.editDraft)
          });
        }),
        finalize(() => {
          this.isSavingEdit = false;
        })
      )
      .subscribe({
        next: () => {
          this.closeEdit();
          this.refreshProducts();
        },
        error: (error: unknown) => {
          this.editErrorMessage = this.resolveError(error);
          this.cdr.detectChanges();
        }
      });
  }

  protected toggleActive(product: AdminProduct): void {
    const nextState = product.isActive ? 'deactivate' : 'activate';
    const confirmed = window.confirm(`Are you sure you want to ${nextState} ${product.title}?`);

    if (!confirmed) {
      return;
    }

    this.productsService.updateProduct(product.id, { isActive: !product.isActive }).subscribe({
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
    const confirmed = window.confirm(`Are you sure you want to delete ${product.title}? This cannot be undone.`);

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
            metadata: this.buildMetadataFromDraft(this.createDraft)
          })
        ),
        finalize(() => {
          this.isCreating = false;
        })
      )
      .subscribe({
        next: () => {
          this.createDraft = this.buildEmptyDraft();
          this.createDraft.category = this.categories[0] ?? '';
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
      input.value = '';
      return;
    }

    this.createErrorMessage = '';
    this.selectedFiles = files;
  }
}
