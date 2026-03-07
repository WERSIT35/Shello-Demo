import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import {
	createUserHandler,
	deleteUserHandler,
	getUsers,
	resetUserPasswordHandler,
	updateUserHandler,
	updateUserRoleHandler
} from "./user.controller";
import { createUserSchema, updateUserRoleSchema, updateUserSchema } from "./user.validation";

const router = Router();

router.get("/", requireAuth, requireAdmin, getUsers);
router.post("/", requireAuth, requireAdmin, validateBody(createUserSchema), createUserHandler);
router.patch("/:id", requireAuth, requireAdmin, validateBody(updateUserSchema), updateUserHandler);
router.patch("/:id/role", requireAuth, requireAdmin, validateBody(updateUserRoleSchema), updateUserRoleHandler);
router.post("/:id/reset-password", requireAuth, requireAdmin, resetUserPasswordHandler);
router.delete("/:id", requireAuth, requireAdmin, deleteUserHandler);

export default router;
