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
  suggestedProductIds: string[];
  categories: string[];
};

const defaultHero: HeroContent = {
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
    return existing;
  }

  return SiteContentModel.create({
    hero: defaultHero,
    suggestedProductIds: [],
    categories: defaultCategories
  });
}

export async function getPublicContent(): Promise<PublicContentResponse> {
  const content = await getOrCreateContent();
  const suggestedIds = (content.suggestedProductIds ?? []).map((id) => id.toString());

  if (suggestedIds.length === 0) {
    return {
      hero: toHero(content),
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
    hero: toHero(content),
    suggestedProducts: orderedProducts
  };
}

export async function getAdminContent(): Promise<AdminContentResponse> {
  const content = await getOrCreateContent();
  return {
    hero: toHero(content),
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

  if (input.suggestedProductIds !== undefined) {
    const uniqueIds = Array.from(new Set(input.suggestedProductIds));
    content.suggestedProductIds = uniqueIds.map((id) => new Types.ObjectId(id));
  }

  if (input.categories !== undefined) {
    const uniqueCategories = Array.from(new Set(input.categories));
    content.categories = uniqueCategories;
  }

  await content.save();

  return {
    hero: toHero(content),
    suggestedProductIds: (content.suggestedProductIds ?? []).map((id) => id.toString()),
    categories: (content.categories && content.categories.length > 0)
      ? content.categories
      : defaultCategories
  };
}
