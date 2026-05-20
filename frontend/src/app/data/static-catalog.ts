import type { Product } from '../core/services/products.service';
import {
  STATIC_HERO_EN,
  STATIC_HERO_KA,
  STATIC_HERO_PRODUCT_IDS,
  STATIC_PRODUCTS,
  STATIC_SUGGESTED_PRODUCT_IDS,
  type StaticHero,
  type StaticProduct
} from './products.static';

declare const $localize: { locale?: string };

type Lang = 'ka' | 'en';

function resolveLang(): Lang {
  const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
  if (locale.startsWith('ka')) return 'ka';
  if (locale.startsWith('en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ka')) return 'ka';
  return 'en';
}

function pick(source: StaticProduct, key: 'name' | 'description' | 'brand' | 'model' | 'category' | 'caseType' | 'color', lang: Lang): string {
  const suffix = lang === 'ka' ? 'Ka' : 'En';
  const value = (source as unknown as Record<string, string | undefined>)[`${key}${suffix}`];
  return typeof value === 'string' ? value : '';
}

function toProduct(source: StaticProduct): Product {
  const lang = resolveLang();
  const images = [source.image, ...(source.extraImages ?? [])].filter(
    (image): image is string => typeof image === 'string' && image.trim().length > 0
  );

  // Keep both EN and KA variants in metadata so component-level helpers
  // (getLocalizedMetaValue reading `${key}Ka` or `${key}En`) keep working
  // for meta pills, spec rows, and the admin shape of the data.
  const metadata: Record<string, unknown> = {
    titleEn: source.nameEn,
    titleKa: source.nameKa,
    descriptionEn: source.descriptionEn,
    descriptionKa: source.descriptionKa,
    brand: pick(source, 'brand', lang),
    brandEn: source.brandEn,
    brandKa: source.brandKa,
    model: pick(source, 'model', lang),
    modelEn: source.modelEn,
    modelKa: source.modelKa,
    category: pick(source, 'category', lang),
    categoryEn: source.categoryEn,
    categoryKa: source.categoryKa,
    caseType: pick(source, 'caseType', lang),
    caseTypeEn: source.caseTypeEn,
    caseTypeKa: source.caseTypeKa,
    color: pick(source, 'color', lang),
    colorEn: source.colorEn,
    colorKa: source.colorKa,
    inStock: source.inStock
  };

  return {
    id: source.id,
    title: pick(source, 'name', lang) || source.nameEn,
    description: pick(source, 'description', lang) || source.descriptionEn || null,
    price: source.price,
    stock: source.inStock ? 99 : 0,
    images,
    isActive: true,
    metadata,
    createdAt: new Date(0).toISOString()
  };
}

export function getStaticProducts(): Product[] {
  return STATIC_PRODUCTS.map(toProduct);
}

export function getStaticProduct(id: string): Product | null {
  const match = STATIC_PRODUCTS.find((product) => product.id === id);
  return match ? toProduct(match) : null;
}

export function getStaticHero(lang: 'ka' | 'en'): StaticHero {
  return lang === 'en' ? STATIC_HERO_EN : STATIC_HERO_KA;
}

export function getStaticHeroProducts(): Product[] {
  return pickByIds(STATIC_HERO_PRODUCT_IDS);
}

export function getStaticSuggestedProducts(): Product[] {
  return pickByIds(STATIC_SUGGESTED_PRODUCT_IDS);
}

function pickByIds(ids: string[]): Product[] {
  const allById = new Map(STATIC_PRODUCTS.map((product) => [product.id, product]));
  const result: Product[] = [];
  for (const id of ids) {
    const match = allById.get(id);
    if (match) result.push(toProduct(match));
  }
  return result;
}
