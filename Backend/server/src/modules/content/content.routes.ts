import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { getAdminContentHandler, getPublicContentHandler, updateContentHandler } from "./content.controller";
import { updateContentSchema } from "./content.validation";

const router = Router();

router.get("/", getPublicContentHandler);
router.get("/admin", requireAuth, requireAdmin, getAdminContentHandler);
router.patch("/", requireAuth, requireAdmin, validateBody(updateContentSchema), updateContentHandler);

export default router;
