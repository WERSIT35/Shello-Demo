import mongoose, { Types } from "mongoose";

import { env } from "../../config/env";
import { ProductModel } from "../products/product.model";
import { HttpError } from "../../utils/http-error";
import type { CreateOrderInput, UpdateOrderStatusInput } from "./order.validation";
import { OrderModel, type OrderDocument } from "./order.model";

export type OrderResponse = {
  _id: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
  totalPrice: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    postalCode: string;
    country: string;
  };
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  paymentInfo: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrderResult = {
  orderId: string;
  status: OrderResponse["status"];
  totalPrice: number;
  createdAt: Date;
};

function toOrderResponse(doc: OrderDocument): OrderResponse {
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    items: doc.items.map((item) => ({
      productId: item.productId.toString(),
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase
    })),
    totalPrice: doc.totalPrice,
    shippingAddress: {
      fullName: doc.shippingAddress.fullName,
      phone: doc.shippingAddress.phone,
      addressLine: doc.shippingAddress.addressLine,
      city: doc.shippingAddress.city,
      postalCode: doc.shippingAddress.postalCode,
      country: doc.shippingAddress.country
    },
    status: doc.status,
    paymentInfo: (doc.paymentInfo as Record<string, unknown> | null) ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

function isTransactionsNotSupported(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Transaction numbers are only allowed on a replica set member or mongos");
}

async function createOrderInternal(
  userId: string,
  input: CreateOrderInput,
  session?: mongoose.ClientSession
): Promise<OrderDocument> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new HttpError(400, "INVALID_USER", "Invalid user id");
  }

  const items: Array<{
    productId: Types.ObjectId;
    quantity: number;
    priceAtPurchase: number;
  }> = [];
  let totalPrice = 0;

  for (const item of input.items) {
    if (!Types.ObjectId.isValid(item.productId)) {
      throw new HttpError(400, "INVALID_PRODUCT_ID", "Invalid product id");
    }

    const product = await ProductModel.findOne({
      _id: item.productId,
      isActive: true
    }).session(session ?? null);

    if (!product) {
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found");
    }

    if (product.stock < item.quantity) {
      throw new HttpError(409, "INSUFFICIENT_STOCK", "Not enough stock", {
        productId: product._id.toString(),
        available: product.stock,
        requested: item.quantity
      });
    }

    const updateResult = await ProductModel.updateOne(
      { _id: product._id, stock: { $gte: item.quantity }, isActive: true },
      { $inc: { stock: -item.quantity } },
      { session }
    );

    if (updateResult.modifiedCount === 0) {
      throw new HttpError(409, "INSUFFICIENT_STOCK", "Not enough stock", {
        productId: product._id.toString(),
        available: product.stock,
        requested: item.quantity
      });
    }

    items.push({
      productId: product._id,
      quantity: item.quantity,
      priceAtPurchase: product.price
    });

    totalPrice += product.price * item.quantity;
  }

  const orderDocs = await OrderModel.create(
    [
      {
        userId: new Types.ObjectId(userId),
        items,
        totalPrice,
        shippingAddress: input.shippingAddress,
        status: "pending",
        paymentInfo: input.paymentMethod ?? null
      }
    ],
    session ? { session } : undefined
  );

  return orderDocs[0];
}

export async function createOrder(userId: string, input: CreateOrderInput): Promise<CreateOrderResult> {
  const session = await mongoose.startSession();

  try {
    const order = await session.withTransaction(async () =>
      createOrderInternal(userId, input, session)
    );

    if (!order) {
      throw new HttpError(500, "ORDER_CREATE_FAILED", "Failed to create order");
    }

    return {
      orderId: order._id.toString(),
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt
    };
  } catch (error) {
    if (env.NODE_ENV !== "production" && isTransactionsNotSupported(error)) {
      const order = await createOrderInternal(userId, input);
      return {
        orderId: order._id.toString(),
        status: order.status,
        totalPrice: order.totalPrice,
        createdAt: order.createdAt
      };
    }

    throw error;
  } finally {
    session.endSession();
  }
}

export async function listOrdersForUser(userId: string): Promise<OrderResponse[]> {
  const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 });
  return orders.map(toOrderResponse);
}

export async function listAllOrders(): Promise<OrderResponse[]> {
  const orders = await OrderModel.find().sort({ createdAt: -1 });
  return orders.map(toOrderResponse);
}

export async function getOrderById(id: string): Promise<OrderResponse> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  const order = await OrderModel.findById(id);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  return toOrderResponse(order);
}

export async function getOrderForUser(
  id: string,
  requester: { id: string; role: "user" | "admin" }
): Promise<OrderResponse> {
  const order = await getOrderById(id);

  if (requester.role !== "admin" && order.userId !== requester.id) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  return order;
}

export async function updateOrderStatus(
  id: string,
  input: UpdateOrderStatusInput
): Promise<OrderResponse> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  const order = await OrderModel.findById(id);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  order.status = input.status;
  await order.save();

  return toOrderResponse(order);
}
