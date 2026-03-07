import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, required: true, default: false },
    replacedByHash: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    lastUsedAt: { type: Date, default: null }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    googleId: { type: String, default: null },
    pinCode: { type: String, required: true, unique: true, match: /^\d{6}$/ },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastPasswordChangeAt: { type: Date, default: null },
    refreshTokens: { type: [refreshTokenSchema], default: [] }
  },
  {
    timestamps: true
  }
);


export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User> & {
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = model<User>("User", userSchema);
