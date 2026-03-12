import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const heroSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    primaryCtaText: { type: String, required: true, trim: true },
    primaryCtaLink: { type: String, required: true, trim: true },
    secondaryCtaText: { type: String, required: true, trim: true },
    secondaryCtaLink: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    highlights: { type: [String], default: [] }
  },
  { _id: false }
);

const siteContentSchema = new Schema(
  {
    hero: { type: heroSchema, required: true },
    heroTranslations: {
      type: {
        ka: { type: heroSchema, required: false },
        en: { type: heroSchema, required: false }
      },
      default: {}
    },
    pageToggles: {
      type: {
        home: { type: Boolean, default: true },
        shop: { type: Boolean, default: true },
        product: { type: Boolean, default: true },
        cart: { type: Boolean, default: true },
        checkout: { type: Boolean, default: true },
        login: { type: Boolean, default: true },
        register: { type: Boolean, default: true },
        orders: { type: Boolean, default: true },
        profile: { type: Boolean, default: true },
        admin: { type: Boolean, default: true },
        adminProducts: { type: Boolean, default: true },
        adminContent: { type: Boolean, default: true },
        adminOrders: { type: Boolean, default: true },
        adminUsers: { type: Boolean, default: true },
        adminSecurity: { type: Boolean, default: true }
      },
      default: {}
    },
    suggestedProductIds: { type: [Schema.Types.ObjectId], default: [] },
    categories: { type: [String], default: ["Cases"] }
  },
  { timestamps: true }
);

export type SiteContent = InferSchemaType<typeof siteContentSchema>;
export type SiteContentDocument = HydratedDocument<SiteContent> & {
  createdAt: Date;
  updatedAt: Date;
};

export const SiteContentModel = model<SiteContent>("SiteContent", siteContentSchema);
