import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import {
  createOrderHandler,
  getOrderHandler,
  listAllOrdersHandler,
  listMyOrders,
  updateOrderStatusHandler
} from "./order.controller";
import { createOrderSchema, updateOrderStatusSchema } from "./order.validation";

const router = Router();

router.post("/", requireAuth, validateBody(createOrderSchema), createOrderHandler);
router.get("/", requireAuth, listMyOrders);
router.get("/admin", requireAuth, requireAdmin, listAllOrdersHandler);
router.get("/:id", requireAuth, getOrderHandler);
router.patch(
  "/:id/status",
  requireAuth,
  requireAdmin,
  validateBody(updateOrderStatusSchema),
  updateOrderStatusHandler
);

export default router;
