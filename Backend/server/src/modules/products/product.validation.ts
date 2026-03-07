import { z } from "zod";

const imageSchema = z.string().trim().min(1);

export const createProductSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  images: z.array(imageSchema).optional().default([]),
  isActive: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional().nullable()
});

export const updateProductSchema = createProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" }
);

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
