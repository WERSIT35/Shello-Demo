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
    itemCode: string;
    quantity: number;
    priceAtPurchase: number;
    product: {
      _id: string;
      title: string;
      code: string;
    } | null;
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

export type AdminOrderResponse = OrderResponse & {
  user: {
    _id: string;
    name: string;
    lastName: string;
    email: string;
    pinCode: string;
  } | null;
  items: OrderResponse["items"];
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
      itemCode: resolveOrderItemCode(item.itemCode, item.productId.toString()),
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      product: null
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

function fallbackProductCodeFromId(productId: string): string {
  return `PRD-${productId.slice(-6).toUpperCase()}`;
}

function resolveProductCodeFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const rawCode = record["code"] ?? record["sku"] ?? null;
  if (typeof rawCode !== "string") {
    return null;
  }

  const normalized = rawCode.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function resolveProductCode(product: {
  _id?: unknown;
  code?: unknown;
  metadata?: unknown;
}): string | null {
  const directCode =
    typeof product.code === "string" && product.code.trim().length > 0
      ? product.code.trim().toUpperCase()
      : null;

  if (directCode) {
    return directCode;
  }

  const metadataCode = resolveProductCodeFromMetadata(product.metadata);
  if (metadataCode) {
    return metadataCode;
  }

  if (product._id) {
    return fallbackProductCodeFromId(String(product._id));
  }

  return null;
}

function resolveOrderItemCode(itemCode: unknown, productId: string): string {
  if (typeof itemCode === "string" && itemCode.trim().length > 0) {
    return itemCode.trim().toUpperCase();
  }

  return fallbackProductCodeFromId(productId);
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
    itemCode: string;
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
      itemCode: resolveProductCode({
        _id: product._id,
        code: (product as unknown as { code?: unknown }).code,
        metadata: product.metadata
      }) ?? fallbackProductCodeFromId(product._id.toString()),
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
  const orders = await OrderModel.find({ userId })
    .populate("items.productId", "title code metadata")
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => ({
    _id: order._id.toString(),
    userId: order.userId.toString(),
    items: order.items.map((item) => {
      const productDoc = item.productId as unknown;
      const productData = productDoc as {
        _id?: unknown;
        title?: unknown;
        code?: unknown;
        metadata?: unknown;
      };

      const product =
        typeof productData?.title === "string" && productData._id
          ? {
              _id: String(productData._id),
              title: productData.title,
              code: resolveProductCode(productData) ?? fallbackProductCodeFromId(String(productData._id))
            }
          : null;

      const productId = product?._id ?? item.productId.toString();

      return {
        productId,
        itemCode: resolveOrderItemCode(item.itemCode, productId),
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        product
      };
    }),
    totalPrice: order.totalPrice,
    shippingAddress: {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      addressLine: order.shippingAddress.addressLine,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country
    },
    status: order.status,
    paymentInfo: (order.paymentInfo as Record<string, unknown> | null) ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
}

export async function listAllOrders(): Promise<AdminOrderResponse[]> {
  const orders = await OrderModel.find()
    .populate("userId", "name lastName email pinCode")
    .populate("items.productId", "title code metadata")
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => {
    const userDoc = order.userId as unknown;
    const userData = userDoc as {
      _id?: unknown;
      name?: unknown;
      lastName?: unknown;
      email?: unknown;
      pinCode?: unknown;
    };

    const user =
      typeof userData?.name === "string" &&
      typeof userData?.lastName === "string" &&
      typeof userData?.email === "string" &&
      typeof userData?.pinCode === "string" &&
      userData._id
        ? {
            _id: String(userData._id),
            name: userData.name,
            lastName: userData.lastName,
            email: userData.email,
            pinCode: userData.pinCode
          }
        : null;

    return {
      _id: order._id.toString(),
      userId: user?._id ?? order.userId.toString(),
      items: order.items.map((item) => {
        const productDoc = item.productId as unknown;
        const productData = productDoc as {
          _id?: unknown;
          title?: unknown;
          code?: unknown;
          metadata?: unknown;
        };

        const product =
          typeof productData?.title === "string" && productData._id
            ? {
                _id: String(productData._id),
                title: productData.title,
                code: resolveProductCode(productData) ?? fallbackProductCodeFromId(String(productData._id))
              }
            : null;

        const productId = product?._id ?? item.productId.toString();

        return {
          productId,
          itemCode: resolveOrderItemCode(item.itemCode, productId),
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          product
        };
      }),
      totalPrice: order.totalPrice,
      shippingAddress: {
        fullName: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        addressLine: order.shippingAddress.addressLine,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country
      },
      status: order.status,
      paymentInfo: (order.paymentInfo as Record<string, unknown> | null) ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user
    } satisfies AdminOrderResponse;
  });
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

export async function deleteOrderByAdmin(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  const order = await OrderModel.findById(id);

  if (!order) {
    throw new HttpError(404, "NOT_FOUND", "Order not found");
  }

  await OrderModel.deleteOne({ _id: order._id });
}
