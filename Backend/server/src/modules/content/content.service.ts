import { Types } from "mongoose";

import { ProductModel } from "../products/product.model";
import type { ProductDocument } from "../products/product.model";
import { SiteContentModel, type SiteContentDocument } from "./content.model";
import type { UpdateContentInput } from "./content.validation";

export type HeroContent = {
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  imageUrl: string | null;
  highlights: string[];
};

type Locale = "ka" | "en";

export type HeroTranslations = {
  ka?: HeroContent;
  en?: HeroContent;
};

export type ContentProduct = {
  _id: string;
  title: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicContentResponse = {
  hero: HeroContent;
  suggestedProducts: ContentProduct[];
};

export type AdminContentResponse = {
  hero: HeroContent;
  heroTranslations: HeroTranslations;
  suggestedProductIds: string[];
  categories: string[];
};

const defaultHeroEn: HeroContent = {
  title: "Cases that feel tailored, not templated.",
  subtitle:
    "Designed for confident protection and expressive color stories. Built to take hits, made to look intentional.",
  primaryCtaText: "Explore cases",
  primaryCtaLink: "/shop",
  secondaryCtaText: "Join the drop",
  secondaryCtaLink: "/register",
  imageUrl: "/assets/images/Iphone 17 Pro/Hero/hero-case.png",
  highlights: ["Drop tested", "Grip textured", "3-layer shell", "Matte finish"]
};

const defaultHeroKa: HeroContent = {
  title: "ქეისები, რომლებიც შენს სტილს ერგება და არა შაბლონს.",
  subtitle:
    "დაცვასა და სტილს შორის არჩევანი აღარ გჭირდება. ეს ქეისი დარტყმას უძლებს და ყოველდღე გამორჩეულ იერს ინარჩუნებს.",
  primaryCtaText: "ქეისების დათვალიერება",
  primaryCtaLink: "/shop",
  secondaryCtaText: "დროპს შემოუერთდი",
  secondaryCtaLink: "/register",
  imageUrl: "/assets/images/Iphone 17 Pro/Hero/hero-case.png",
  highlights: ["დროპ-ტესტით დადასტურებული", "არასრიალა მოჭიდება", "3-ფენიანი დაცვა", "მატე ზედაპირი"]
};

const defaultCategories = ["Cases"];

function toHero(content: SiteContentDocument): HeroContent {
  return {
    title: content.hero.title,
    subtitle: content.hero.subtitle,
    primaryCtaText: content.hero.primaryCtaText,
    primaryCtaLink: content.hero.primaryCtaLink,
    secondaryCtaText: content.hero.secondaryCtaText,
    secondaryCtaLink: content.hero.secondaryCtaLink,
    imageUrl: content.hero.imageUrl ?? null,
    highlights: content.hero.highlights ?? []
  };
}

function getLocale(value: unknown): Locale {
  if (value === "en") {
    return "en";
  }

  return "ka";
}

type HeroCandidate = Omit<HeroContent, "imageUrl"> & { imageUrl?: string | null };

function isSameHero(a?: HeroCandidate | null, b?: HeroCandidate | null): boolean {
  if (!a || !b) {
    return false;
  }

  const aHighlights = a.highlights ?? [];
  const bHighlights = b.highlights ?? [];

  if (aHighlights.length !== bHighlights.length) {
    return false;
  }

  for (let index = 0; index < aHighlights.length; index += 1) {
    if (aHighlights[index] !== bHighlights[index]) {
      return false;
    }
  }

  return (
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.primaryCtaText === b.primaryCtaText &&
    a.primaryCtaLink === b.primaryCtaLink &&
    a.secondaryCtaText === b.secondaryCtaText &&
    a.secondaryCtaLink === b.secondaryCtaLink &&
    (a.imageUrl ?? null) === (b.imageUrl ?? null)
  );
}

function normalizeKaHeroCopy(hero: HeroCandidate): HeroContent {
  const normalizedTitle =
    hero.title === "ქეისები, რომლებიც მორგებულია, არა შაბლონური." ||
    hero.title === "ქეისები, რომლებიც შენზეა მორგებული და არა შაბლონური."
      ? defaultHeroKa.title
      : hero.title;

  const normalizedSubtitle =
    hero.subtitle ===
      "დიზაინი თავდაჯერებული დაცვისთვის და ექსპრესიული ფერებისთვის. გამძლეა დარტყმის მიმართ და გააზრებულად გამოიყურება." ||
    hero.subtitle ===
      "დიზაინი თავდაჯერებული დაცვისა და გამორჩეული ფერებისთვის. დარტყმას უძლებს და ყოველთვის გააზრებულად გამოიყურება."
      ? defaultHeroKa.subtitle
      : hero.subtitle;

  const normalizedPrimaryCtaText =
    hero.primaryCtaText === "ქეისების ნახვა" ? defaultHeroKa.primaryCtaText : hero.primaryCtaText;

  const normalizedSecondaryCtaText =
    hero.secondaryCtaText === "შეუერთდი დროპს" ? defaultHeroKa.secondaryCtaText : hero.secondaryCtaText;

  const highlightMap: Record<string, string> = {
    "დროფ-ტესტზე შემოწმებული": "დროპ-ტესტით დადასტურებული",
    "დროპ-ტესტით შემოწმებული": "დროპ-ტესტით დადასტურებული",
    "გრიპ-ტექსტურა": "არასრიალა მოჭიდება",
    "მოჭიდების ტექსტურა": "არასრიალა მოჭიდება",
    "3-ფენიანი კორპუსი": "3-ფენიანი დაცვა",
    "მატე საფარი": "მატე ზედაპირი"
  };

  const normalizedHighlights = (hero.highlights ?? []).map((item) => highlightMap[item] ?? item);

  return {
    title: normalizedTitle,
    subtitle: normalizedSubtitle,
    primaryCtaText: normalizedPrimaryCtaText,
    primaryCtaLink: hero.primaryCtaLink,
    secondaryCtaText: normalizedSecondaryCtaText,
    secondaryCtaLink: hero.secondaryCtaLink,
    imageUrl: hero.imageUrl ?? null,
    highlights: normalizedHighlights
  };
}

function resolveHero(content: SiteContentDocument, locale: Locale): HeroContent {
  const translations = content.heroTranslations as HeroTranslations | undefined;
  if (locale === "en") {
    return translations?.en ?? translations?.ka ?? toHero(content) ?? defaultHeroEn;
  }

  return translations?.ka ?? defaultHeroKa;
}

async function ensureHeroTranslations(content: SiteContentDocument): Promise<void> {
  let updated = false;

  if (!content.heroTranslations) {
    content.heroTranslations = {};
    updated = true;
  }

  const currentHero = toHero(content);

  if (!content.heroTranslations.en) {
    content.heroTranslations.en = currentHero;
    updated = true;
  }

  if (!content.heroTranslations.ka) {
    content.heroTranslations.ka = defaultHeroKa;
    updated = true;
  }

  if (
    content.heroTranslations.ka &&
    (isSameHero(content.heroTranslations.ka, content.heroTranslations.en) ||
      isSameHero(content.heroTranslations.ka, defaultHeroEn))
  ) {
    content.heroTranslations.ka = defaultHeroKa;
    updated = true;
  }

  if (content.heroTranslations.ka) {
    const normalizedKa = normalizeKaHeroCopy(content.heroTranslations.ka);
    if (!isSameHero(content.heroTranslations.ka, normalizedKa)) {
      content.heroTranslations.ka = normalizedKa;
      updated = true;
    }
  }

  if (content.heroTranslations.ka) {
    content.hero = content.heroTranslations.ka;
    updated = true;
  }

  if (updated) {
    await content.save();
  }
}

function toProductResponse(doc: ProductDocument): ContentProduct {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    price: doc.price,
    stock: doc.stock,
    images: doc.images ?? [],
    isActive: doc.isActive,
    metadata: doc.metadata ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

async function getOrCreateContent(): Promise<SiteContentDocument> {
  const existing = await SiteContentModel.findOne();

  if (existing) {
    await ensureHeroTranslations(existing);
    return existing;
  }

  return SiteContentModel.create({
    hero: defaultHeroKa,
    heroTranslations: {
      ka: defaultHeroKa,
      en: defaultHeroEn
    },
    suggestedProductIds: [],
    categories: defaultCategories
  });
}

export async function getPublicContent(locale?: unknown): Promise<PublicContentResponse> {
  const content = await getOrCreateContent();
  const selectedLocale = getLocale(locale);
  const suggestedIds = (content.suggestedProductIds ?? []).map((id) => id.toString());

  if (suggestedIds.length === 0) {
    return {
      hero: resolveHero(content, selectedLocale),
      suggestedProducts: []
    };
  }

  const products = await ProductModel.find({
    _id: { $in: suggestedIds },
    isActive: true
  });

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const orderedProducts = suggestedIds
    .map((id) => productMap.get(id))
    .filter((product): product is ProductDocument => Boolean(product))
    .map(toProductResponse);

  return {
    hero: resolveHero(content, selectedLocale),
    suggestedProducts: orderedProducts
  };
}

export async function getAdminContent(locale?: unknown): Promise<AdminContentResponse> {
  const content = await getOrCreateContent();
  const selectedLocale = getLocale(locale);
  const translations = (content.heroTranslations || {}) as HeroTranslations;
  return {
    hero: resolveHero(content, selectedLocale),
    heroTranslations: {
      ka: translations.ka ?? toHero(content),
      en: translations.en ?? defaultHeroEn
    },
    suggestedProductIds: (content.suggestedProductIds ?? []).map((id) => id.toString()),
    categories: (content.categories && content.categories.length > 0)
      ? content.categories
      : defaultCategories
  };
}

export async function updateContent(input: UpdateContentInput): Promise<AdminContentResponse> {
  const content = await getOrCreateContent();

  if (input.hero) {
    if (input.hero.title !== undefined) content.hero.title = input.hero.title;
    if (input.hero.subtitle !== undefined) content.hero.subtitle = input.hero.subtitle;
    if (input.hero.primaryCtaText !== undefined) content.hero.primaryCtaText = input.hero.primaryCtaText;
    if (input.hero.primaryCtaLink !== undefined) content.hero.primaryCtaLink = input.hero.primaryCtaLink;
    if (input.hero.secondaryCtaText !== undefined) content.hero.secondaryCtaText = input.hero.secondaryCtaText;
    if (input.hero.secondaryCtaLink !== undefined) content.hero.secondaryCtaLink = input.hero.secondaryCtaLink;
    if (input.hero.imageUrl !== undefined) content.hero.imageUrl = input.hero.imageUrl;
    if (input.hero.highlights !== undefined) content.hero.highlights = input.hero.highlights;
  }

  if (input.heroTranslations) {
    if (!content.heroTranslations) {
      content.heroTranslations = {};
    }

    const updateLocale = (locale: Locale, patch?: Partial<HeroContent>) => {
      if (!patch) {
        return;
      }

      const current = content.heroTranslations?.[locale] ?? toHero(content);
      content.heroTranslations[locale] = {
        ...current,
        ...patch
      };

      if (locale === "ka") {
        content.hero = content.heroTranslations[locale] as HeroContent;
      }
    };

    updateLocale("ka", input.heroTranslations.ka);
    updateLocale("en", input.heroTranslations.en);
  }

  if (input.suggestedProductIds !== undefined) {
    const uniqueIds = Array.from(new Set(input.suggestedProductIds));
    content.suggestedProductIds = uniqueIds.map((id) => new Types.ObjectId(id));
  }

  if (input.categories !== undefined) {
    const uniqueCategories = Array.from(new Set(input.categories));
    content.categories = uniqueCategories;
  }

  await content.save();

  const translations = (content.heroTranslations || {}) as HeroTranslations;
  return {
    hero: toHero(content),
    heroTranslations: {
      ka: translations.ka ?? toHero(content),
      en: translations.en ?? defaultHeroEn
    },
    suggestedProductIds: (content.suggestedProductIds ?? []).map((id) => id.toString()),
    categories: (content.categories && content.categories.length > 0)
      ? content.categories
      : defaultCategories
  };
}
