import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { createProductSchema, updateProductSchema } from "./product.validation";
import {
  createProductHandler,
  deleteProductHandler,
  hardDeleteProductHandler,
  getProduct,
  listAllProductsHandler,
  listProducts,
  updateProductHandler
} from "./product.controller";

const router = Router();

router.get("/", listProducts);
router.get("/admin", requireAuth, requireAdmin, listAllProductsHandler);
router.get("/:id", getProduct);

router.post("/", requireAuth, requireAdmin, validateBody(createProductSchema), createProductHandler);
router.patch("/:id", requireAuth, requireAdmin, validateBody(updateProductSchema), updateProductHandler);
router.patch("/:id/deactivate", requireAuth, requireAdmin, deleteProductHandler);
router.delete("/:id", requireAuth, requireAdmin, hardDeleteProductHandler);

export default router;
