import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import {
  ContentService,
  type HeroContent,
  type HeroTranslations,
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
  protected heroFilterText = '';
  protected suggestedFilterText = '';
  protected showHeroSelectedOnly = false;
  protected showSuggestedOnly = false;
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
  protected heroDrafts: HeroTranslations = { ka: { ...this.heroDraft }, en: { ...this.heroDraft } };
  protected heroLocale: 'ka' | 'en' = 'ka';
  protected selectedHeroIds = new Set<string>();
  protected selectedSuggestedIds = new Set<string>();
  protected readonly maxHeroFeatured = 4;
  protected readonly maxSuggested = 12;
  protected pageToggles: Record<string, boolean> = {};
  protected pageToggleGroups: Array<{
    title: string;
    items: Array<{ key: string; label: string }>;
  }> = [
    {
      title: 'Storefront',
      items: [
        { key: 'home', label: 'Home' },
        { key: 'shop', label: 'Shop' },
        { key: 'product', label: 'Product detail' },
        { key: 'cart', label: 'Cart' },
        { key: 'checkout', label: 'Checkout' }
      ]
    },
    {
      title: 'Customer',
      items: [
        { key: 'login', label: 'Login' },
        { key: 'register', label: 'Register' },
        { key: 'orders', label: 'Orders' },
        { key: 'profile', label: 'Profile' }
      ]
    },
    {
      title: 'Admin',
      items: [
        { key: 'admin', label: 'Admin shell' },
        { key: 'adminProducts', label: 'Admin Products' },
        { key: 'adminContent', label: 'Admin Content' },
        { key: 'adminOrders', label: 'Admin Orders' },
        { key: 'adminUsers', label: 'Admin Users' },
        { key: 'adminSecurity', label: 'Admin Security' }
      ]
    }
  ];

  ngOnInit(): void {
    this.loadContent();
  }

  protected get filteredHeroProducts(): AdminProduct[] {
    if (this.products.length === 0) {
      return [];
    }

    const query = this.heroFilterText.trim().toLowerCase();
    const selectedOnly = this.showHeroSelectedOnly;

    return this.products.filter((product) => {
      if (selectedOnly && !this.selectedHeroIds.has(product.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const meta = product.metadata as Record<string, unknown> | null;
      const metaValues = meta
        ? Object.values(meta)
            .map((value) => (typeof value === 'string' ? value : ''))
            .join(' ')
        : '';

      const haystack = `${product.title} ${metaValues}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  protected get filteredSuggestedProducts(): AdminProduct[] {
    if (this.products.length === 0) {
      return [];
    }

    const query = this.suggestedFilterText.trim().toLowerCase();
    const selectedOnly = this.showSuggestedOnly;

    return this.products.filter((product) => {
      if (selectedOnly && !this.selectedSuggestedIds.has(product.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const meta = product.metadata as Record<string, unknown> | null;
      const metaValues = meta
        ? Object.values(meta)
            .map((value) => (typeof value === 'string' ? value : ''))
            .join(' ')
        : '';

      const haystack = `${product.title} ${metaValues}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  protected isSelected(productId: string): boolean {
    return this.selectedSuggestedIds.has(productId);
  }

  protected isHeroSelected(productId: string): boolean {
    return this.selectedHeroIds.has(productId);
  }

  protected toggleHeroFeatured(productId: string): void {
    if (this.selectedHeroIds.has(productId)) {
      this.selectedHeroIds.delete(productId);
      this.saveMessage = '';
      return;
    }

    if (this.selectedHeroCount >= this.heroLimit) {
      this.errorMessage = `Select up to ${this.heroLimit} hero cards.`;
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.selectedHeroIds.add(productId);
  }

  protected toggleSuggested(productId: string): void {
    if (this.selectedSuggestedIds.has(productId)) {
      this.selectedSuggestedIds.delete(productId);
      this.saveMessage = '';
      return;
    }

    if (this.selectedSuggestedCount >= this.suggestedLimit) {
      this.errorMessage = `Select up to ${this.suggestedLimit} suggested cases.`;
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

    this.syncHeroDraft();

    const payload: UpdateContentPayload = {
      hero: this.heroDrafts.ka
        ? {
            ...this.heroDrafts.ka,
            highlights: this.heroDrafts.ka.highlights ?? []
          }
        : undefined,
      heroTranslations: {
        ka: this.heroDrafts.ka
          ? { ...this.heroDrafts.ka, highlights: this.heroDrafts.ka.highlights ?? [] }
          : undefined,
        en: this.heroDrafts.en
          ? { ...this.heroDrafts.en, highlights: this.heroDrafts.en.highlights ?? [] }
          : undefined
      },
      heroProductIds: Array.from(this.selectedHeroIds),
      suggestedProductIds: Array.from(this.selectedSuggestedIds),
      categories: this.categoriesDraft,
      pageToggles: this.pageToggles
    };

    this.contentService.updateContent(payload).subscribe({
      next: (content) => {
        this.applyHeroTranslations(content.hero, content.heroTranslations);
        this.selectedHeroIds = new Set(content.heroProductIds ?? []);
        this.selectedSuggestedIds = new Set(content.suggestedProductIds);
        this.categoriesDraft = [...content.categories];
        this.pageToggles = { ...content.pageToggles };
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

  protected get suggestedLimit(): number {
    if (this.products.length === 0) {
      return 0;
    }

    return Math.min(this.maxSuggested, this.products.length);
  }

  protected get heroLimit(): number {
    if (this.products.length === 0) {
      return 0;
    }

    return Math.min(this.maxHeroFeatured, this.products.length);
  }

  protected get selectedSuggestedCount(): number {
    if (this.products.length === 0) {
      return 0;
    }

    let count = 0;
    for (const product of this.products) {
      if (this.selectedSuggestedIds.has(product.id)) {
        count += 1;
      }
    }

    return count;
  }

  protected get selectedHeroCount(): number {
    if (this.products.length === 0) {
      return 0;
    }

    let count = 0;
    for (const product of this.products) {
      if (this.selectedHeroIds.has(product.id)) {
        count += 1;
      }
    }

    return count;
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
          this.applyHeroTranslations(content.hero, content.heroTranslations);
          const productIdSet = new Set(products.map((product) => product.id));
          this.selectedHeroIds = new Set(
            (content.heroProductIds ?? []).filter((id) => productIdSet.has(id))
          );
          this.selectedSuggestedIds = new Set(
            content.suggestedProductIds.filter((id) => productIdSet.has(id))
          );
          this.categoriesDraft = [...content.categories];
          this.pageToggles = { ...content.pageToggles };
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

  protected setHeroLocale(locale: 'ka' | 'en'): void {
    if (this.heroLocale === locale) {
      return;
    }

    this.syncHeroDraft();
    this.heroLocale = locale;
    this.loadHeroLocaleDraft(locale);
  }

  private syncHeroDraft(): void {
    const nextHero: HeroContent = {
      ...this.heroDraft,
      highlights: this.parseHighlights(this.highlightsText)
    };

    if (this.heroLocale === 'ka') {
      this.heroDrafts.ka = nextHero;
    } else {
      this.heroDrafts.en = nextHero;
    }
  }

  private loadHeroLocaleDraft(locale: 'ka' | 'en'): void {
    const fallback = locale === 'ka' ? this.heroDrafts.ka : this.heroDrafts.en;
    const nextHero = fallback ?? this.heroDraft;
    this.heroDraft = { ...nextHero };
    this.highlightsText = (nextHero.highlights ?? []).join('\n');
  }

  private applyHeroTranslations(hero: HeroContent, translations: HeroTranslations | undefined): void {
    const kaHero = translations?.ka ?? hero;
    const enHero = translations?.en ?? hero;
    this.heroDrafts = {
      ka: { ...kaHero },
      en: { ...enHero }
    };
    this.loadHeroLocaleDraft(this.heroLocale);
  }

  private parseHighlights(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
}
