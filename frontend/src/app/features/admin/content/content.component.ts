import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import {
  ContentService,
  type HeroContent,
  type UpdateContentPayload
} from '../../../core/services/content.service';
import { AdminProductsService, type AdminProduct } from '../../../core/services/admin-products.service';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, NgFor, NgIf],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss'
})
export class AdminContentComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly contentService = inject(ContentService);
  private readonly productsService = inject(AdminProductsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected isLoading = true;
  protected isSaving = false;
  protected errorMessage = '';
  protected saveMessage = '';
  protected products: AdminProduct[] = [];
  protected categoriesDraft: string[] = [];
  protected newCategory = '';
  protected heroDraft: HeroContent = {
    title: '',
    subtitle: '',
    primaryCtaText: '',
    primaryCtaLink: '',
    secondaryCtaText: '',
    secondaryCtaLink: '',
    imageUrl: null,
    highlights: []
  };
  protected highlightsText = '';
  protected selectedSuggestedIds = new Set<string>();
  protected readonly maxSuggested = 8;

  ngOnInit(): void {
    this.loadContent();
  }

  protected isSelected(productId: string): boolean {
    return this.selectedSuggestedIds.has(productId);
  }

  protected toggleSuggested(productId: string): void {
    if (this.selectedSuggestedIds.has(productId)) {
      this.selectedSuggestedIds.delete(productId);
      this.saveMessage = '';
      return;
    }

    if (this.selectedSuggestedIds.size >= this.maxSuggested) {
      this.errorMessage = `Select up to ${this.maxSuggested} suggested cases.`;
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.selectedSuggestedIds.add(productId);
  }

  protected onHeroImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.productsService.uploadImages([file]).subscribe({
      next: (urls) => {
        this.heroDraft.imageUrl = urls[0] ?? this.heroDraft.imageUrl;
        this.isSaving = false;
        if (input) {
          input.value = '';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to upload hero image.';
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected addCategory(): void {
    const value = this.newCategory.trim();
    if (!value) {
      return;
    }

    if (!this.categoriesDraft.includes(value)) {
      this.categoriesDraft = [...this.categoriesDraft, value];
    }

    this.newCategory = '';
  }

  protected removeCategory(category: string): void {
    this.categoriesDraft = this.categoriesDraft.filter((item) => item !== category);
  }

  protected saveContent(): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.saveMessage = '';

    const payload: UpdateContentPayload = {
      hero: {
        ...this.heroDraft,
        highlights: this.parseHighlights(this.highlightsText)
      },
      suggestedProductIds: Array.from(this.selectedSuggestedIds),
      categories: this.categoriesDraft
    };

    this.contentService.updateContent(payload).subscribe({
      next: (content) => {
        this.heroDraft = { ...content.hero };
        this.highlightsText = content.hero.highlights.join('\n');
        this.selectedSuggestedIds = new Set(content.suggestedProductIds);
        this.categoriesDraft = [...content.categories];
        this.isSaving = false;
        this.saveMessage = 'Content updated.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to save content.';
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected getMeta(product: AdminProduct): string[] {
    const meta = product.metadata as Record<string, unknown> | null;
    if (!meta) {
      return [];
    }

    const tags = [] as string[];
    const caseType = meta['caseType'];
    const brand = meta['brand'];
    const color = meta['color'];
    const model = meta['model'];

    if (typeof caseType === 'string') tags.push(caseType);
    if (typeof brand === 'string') tags.push(brand);
    if (typeof color === 'string') tags.push(color);
    if (typeof model === 'string') tags.push(model);

    return tags;
  }

  private loadContent(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auth
      .ensureSession()
      .pipe(
        switchMap(() =>
          forkJoin({
            content: this.contentService.getAdminContent(),
            products: this.productsService.getProducts()
          })
        )
      )
      .subscribe({
        next: ({ content, products }) => {
          this.heroDraft = { ...content.hero };
          this.highlightsText = content.hero.highlights.join('\n');
          this.selectedSuggestedIds = new Set(content.suggestedProductIds);
          this.categoriesDraft = [...content.categories];
          this.products = products;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Unable to load content.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private parseHighlights(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
}
