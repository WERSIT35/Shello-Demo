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
