import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1)
});

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(50),
  addressLine: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(100)
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.record(z.unknown()).optional().nullable()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"])
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
