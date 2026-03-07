import type { RequestHandler } from "express";

import { getAdminContent, getPublicContent, updateContent } from "./content.service";

export const getPublicContentHandler: RequestHandler = async (_req, res, next) => {
  try {
    const content = await getPublicContent();
    return res.status(200).json(content);
  } catch (error) {
    return next(error);
  }
};

export const getAdminContentHandler: RequestHandler = async (_req, res, next) => {
  try {
    const content = await getAdminContent();
    return res.status(200).json(content);
  } catch (error) {
    return next(error);
  }
};

export const updateContentHandler: RequestHandler = async (req, res, next) => {
  try {
    const content = await updateContent(req.body);
    return res.status(200).json(content);
  } catch (error) {
    return next(error);
  }
};
