import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const productSchema = new Schema(
  {
    code: { type: String, trim: true, uppercase: true, default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: null }
  },
  {
    timestamps: true
  }
);

productSchema.index({ title: "text" });
productSchema.index({ isActive: 1 });
productSchema.index({ code: 1 }, { unique: true, sparse: true });

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<Product> & {
  createdAt: Date;
  updatedAt: Date;
};

export const ProductModel = model<Product>("Product", productSchema);
