import type { RequestHandler } from "express";

import {
  createProduct,
  deactivateProduct,
  deleteProductPermanently,
  getActiveProductById,
  listActiveProducts,
  listAllProducts,
  updateProduct
} from "./product.service";

export const listProducts: RequestHandler = async (_req, res, next) => {
  try {
    const products = await listActiveProducts();
    return res.status(200).json({ data: products });
  } catch (error) {
    return next(error);
  }
};

export const listAllProductsHandler: RequestHandler = async (_req, res, next) => {
  try {
    const products = await listAllProducts();
    return res.status(200).json({ data: products });
  } catch (error) {
    return next(error);
  }
};

export const getProduct: RequestHandler = async (req, res, next) => {
  try {
    const product = await getActiveProductById(req.params.id);
    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

export const createProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
};

export const updateProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
};

export const deleteProductHandler: RequestHandler = async (req, res, next) => {
  try {
    await deactivateProduct(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const hardDeleteProductHandler: RequestHandler = async (req, res, next) => {
  try {
    await deleteProductPermanently(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
