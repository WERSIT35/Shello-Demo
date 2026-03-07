import { z } from "zod";

const heroSchema = z.object({
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().min(1).max(400),
  primaryCtaText: z.string().trim().min(1).max(60),
  primaryCtaLink: z.string().trim().min(1).max(200),
  secondaryCtaText: z.string().trim().min(1).max(60),
  secondaryCtaLink: z.string().trim().min(1).max(200),
  imageUrl: z.string().trim().min(1).nullable(),
  highlights: z.array(z.string().trim().min(1).max(40)).max(10)
});

export const updateContentSchema = z.object({
  hero: heroSchema.partial().optional(),
  suggestedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).max(12).optional(),
  categories: z.array(z.string().trim().min(1).max(40)).max(20).optional()
});

export type UpdateContentInput = z.infer<typeof updateContentSchema>;
