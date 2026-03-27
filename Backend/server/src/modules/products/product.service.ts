import { Types } from "mongoose";

import { HttpError } from "../../utils/http-error";
import type { CreateProductInput, UpdateProductInput } from "./product.validation";
import { ProductModel } from "./product.model";
import type { ProductDocument } from "./product.model";

export type ProductResponse = {
  _id: string;
  code: string;
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

function toProductResponse(doc: ProductDocument): ProductResponse {
  return {
    _id: doc._id.toString(),
    code: resolveProductCode(doc.code, doc._id.toString()),
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

function sanitizeProductCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  return normalized;
}

function resolveProductCode(code: string | null | undefined, id: string): string {
  const normalized = sanitizeProductCode(code);
  if (normalized) {
    return normalized;
  }

  return `PRD-${id.slice(-6).toUpperCase()}`;
}

async function assertUniqueProductCode(code: string, excludeProductId?: string): Promise<void> {
  const conflict = await ProductModel.findOne({
    code,
    ...(excludeProductId ? { _id: { $ne: excludeProductId } } : {})
  })
    .select("_id")
    .lean();

  if (conflict) {
    throw new HttpError(409, "DUPLICATE_PRODUCT_CODE", "Product code already exists");
  }
}

export async function createProduct(input: CreateProductInput): Promise<ProductResponse> {
  const product = new ProductModel({
    title: input.title,
    description: input.description ?? null,
    price: input.price,
    stock: input.stock,
    images: input.images ?? [],
    isActive: input.isActive ?? true,
    metadata: input.metadata ?? null
  });

  const code = resolveProductCode(input.code ?? null, product._id.toString());
  await assertUniqueProductCode(code);
  product.code = code;
  await product.save();

  return toProductResponse(product);
}

export async function listActiveProducts(): Promise<ProductResponse[]> {
  const products = await ProductModel.find({ isActive: true }).sort({ createdAt: -1 });
  return products.map(toProductResponse);
}

export async function listAllProducts(): Promise<ProductResponse[]> {
  const products = await ProductModel.find().sort({ createdAt: -1 });
  return products.map(toProductResponse);
}

export async function getActiveProductById(id: string): Promise<ProductResponse> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  const product = await ProductModel.findOne({ _id: id, isActive: true });

  if (!product) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  return toProductResponse(product);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductResponse> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  const product = await ProductModel.findById(id);

  if (!product) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  if (input.title !== undefined) product.title = input.title;
  if (input.code !== undefined) {
    const nextCode = resolveProductCode(input.code ?? null, product._id.toString());
    await assertUniqueProductCode(nextCode, product._id.toString());
    product.code = nextCode;
  }
  if (input.description !== undefined) product.description = input.description ?? null;
  if (input.price !== undefined) product.price = input.price;
  if (input.stock !== undefined) product.stock = input.stock;
  if (input.images !== undefined) product.images = input.images ?? [];
  if (input.isActive !== undefined) product.isActive = input.isActive;
  if (input.metadata !== undefined) product.metadata = input.metadata ?? null;

  await product.save();

  return toProductResponse(product);
}

export async function deactivateProduct(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  const product = await ProductModel.findById(id);

  if (!product) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  product.isActive = false;
  await product.save();
}

export async function deleteProductPermanently(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }

  const result = await ProductModel.deleteOne({ _id: id });

  if (result.deletedCount === 0) {
    throw new HttpError(404, "NOT_FOUND", "Product not found");
  }
}
