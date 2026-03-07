import { Router } from "express";

import { authRateLimiter } from "../../middleware/rate-limit.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { googleCallback, googleStart, login, logout, me, refresh, register } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

router.post("/register", authRateLimiter, validateBody(registerSchema), register);
router.post("/login", authRateLimiter, validateBody(loginSchema), login);
router.get("/google", googleStart);
router.get("/google/callback", googleCallback);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
