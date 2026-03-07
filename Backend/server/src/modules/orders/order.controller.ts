import type { RequestHandler } from "express";

import {
  createOrder,
  getOrderForUser,
  listAllOrders,
  listOrdersForUser,
  updateOrderStatus
} from "./order.service";

export const createOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const result = await createOrder(req.user!.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

export const listMyOrders: RequestHandler = async (req, res, next) => {
  try {
    const orders = await listOrdersForUser(req.user!.id);
    return res.status(200).json({ data: orders });
  } catch (error) {
    return next(error);
  }
};

export const listAllOrdersHandler: RequestHandler = async (_req, res, next) => {
  try {
    const orders = await listAllOrders();
    return res.status(200).json({ data: orders });
  } catch (error) {
    return next(error);
  }
};

export const getOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const order = await getOrderForUser(req.params.id, {
      id: req.user!.id,
      role: req.user!.role
    });
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};

export const updateOrderStatusHandler: RequestHandler = async (req, res, next) => {
  try {
    const order = await updateOrderStatus(req.params.id, req.body);
    return res.status(200).json(order);
  } catch (error) {
    return next(error);
  }
};
