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

const pageTogglesSchema = z.object({
  home: z.boolean().optional(),
  shop: z.boolean().optional(),
  product: z.boolean().optional(),
  cart: z.boolean().optional(),
  checkout: z.boolean().optional(),
  login: z.boolean().optional(),
  register: z.boolean().optional(),
  orders: z.boolean().optional(),
  profile: z.boolean().optional(),
  admin: z.boolean().optional(),
  adminProducts: z.boolean().optional(),
  adminContent: z.boolean().optional(),
  adminOrders: z.boolean().optional(),
  adminUsers: z.boolean().optional(),
  adminSecurity: z.boolean().optional()
});

export const updateContentSchema = z.object({
  hero: heroSchema.partial().optional(),
  heroTranslations: z
    .object({
      ka: heroSchema.partial().optional(),
      en: heroSchema.partial().optional()
    })
    .optional(),
  suggestedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).max(12).optional(),
  categories: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  pageToggles: pageTogglesSchema.optional()
});

export type UpdateContentInput = z.infer<typeof updateContentSchema>;
