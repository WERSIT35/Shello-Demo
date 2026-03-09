import { Router } from "express";

import { authRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import {
	googleCallback,
	googleStart,
	login,
	logout,
	me,
	refresh,
	register,
	twoFactorStatus,
	twoFactorSetup,
	twoFactorEnable,
	twoFactorDisable,
	twoFactorLogin
} from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import {
	loginSchema,
	registerSchema,
	twoFactorCodeSchema,
	twoFactorLoginSchema
} from "./auth.validation";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.get("/google", googleStart);
router.get("/google/callback", googleCallback);
router.post("/2fa/login", authRateLimiter, validateBody(twoFactorLoginSchema), twoFactorLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.get("/2fa/status", requireAuth, requireAdmin, twoFactorStatus);
router.post("/2fa/setup", requireAuth, requireAdmin, twoFactorSetup);
router.post("/2fa/enable", requireAuth, requireAdmin, validateBody(twoFactorCodeSchema), twoFactorEnable);
router.post("/2fa/disable", requireAuth, requireAdmin, validateBody(twoFactorCodeSchema), twoFactorDisable);

export default router;
